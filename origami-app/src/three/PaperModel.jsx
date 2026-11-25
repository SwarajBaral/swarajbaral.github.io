import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { player } from '../store.js';
import { prepare, computeMatrices, ease, GAP } from './kinematics.js';
import { lineExtent } from '../engine/fold.js';

function paperTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, 512, 512);
  const img = g.getImageData(0, 0, 512, 512);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = 236 + Math.random() * 19;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = n;
  }
  g.putImageData(img, 0, 0);
  // washi fibres
  g.globalAlpha = 0.08;
  g.strokeStyle = '#000';
  for (let i = 0; i < 260; i++) {
    g.beginPath();
    const x = Math.random() * 512, y = Math.random() * 512, a = Math.random() * Math.PI;
    const l = 8 + Math.random() * 30;
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 4, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.lineWidth = 0.6;
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const v = new THREE.Vector3();

export default function PaperModel({ built, color, showCreases, onFrame }) {
  const { atomics } = built;
  const group = useRef();
  const meshFront = useRef();
  const meshBack = useRef();
  const lines = useRef();
  const guide = useRef();
  const cache = useRef(new Map());
  const current = useRef({ idx: -1, prep: null, geo: null, lineGeo: null });
  const tex = useMemo(paperTexture, []);
  const aspect = useThree((st) => st.viewport.aspect);
  const geo = useMemo(() => new THREE.BufferGeometry(), []);
  const lineGeo = useMemo(() => new THREE.BufferGeometry(), []);
  const softGeo = useMemo(() => new THREE.BufferGeometry(), []);
  const softLines = useRef();

  useEffect(() => { cache.current.clear(); current.current.idx = -1; }, [built]);

  const frontMat = useMemo(() => new THREE.MeshStandardMaterial({
    color, map: tex, roughness: 0.82, metalness: 0, side: THREE.FrontSide, emissive: color, emissiveIntensity: 0.08,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  }), [tex]);
  const backMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#fbf8f1', map: tex, roughness: 0.9, side: THREE.BackSide, emissive: '#fffaf0', emissiveIntensity: 0.16,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  }), [tex]);
  useEffect(() => { frontMat.color.set(color); frontMat.emissive.set(color); }, [color, frontMat]);

  const getPrep = (i) => {
    let p = cache.current.get(i);
    if (!p) { p = prepare(atomics[i]); cache.current.set(i, p); }
    return p;
  };

  const ensure = (i) => {
    const cur = current.current;
    if (cur.idx === i) return cur.prep;
    const prep = getPrep(i);
    cur.idx = i;
    cur.prep = prep;
    const n = prep.triCount * 3;
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const uv = new Float32Array(n * 2);
    let o = 0;
    for (const f of prep.atomic.faces) {
      for (let t = 1; t < f.poly.length - 1; t++) {
        for (const p of [f.poly[0], f.poly[t], f.poly[t + 1]]) {
          uv[o++] = p[0] * 0.35 + 0.5; uv[o++] = p[1] * 0.35 + 0.5;
        }
      }
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    prep.hard = prep.edges.filter((e) => !e.soft);
    prep.soft = prep.edges.filter((e) => e.soft);
    lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(prep.hard.length * 6 + 6), 3));
    softGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(prep.soft.length * 6 + 6), 3));
    return prep;
  };

  useFrame(() => {
    const t = player.get().t;
    const n = atomics.length;
    const i = Math.min(Math.floor(t), n - 1);
    const u = Math.min(1, Math.max(0, t - i));
    const e = ease(u);
    const prep = ensure(i);
    const mats = computeMatrices(prep, e);
    const pos = geo.attributes.position.array;
    let o = 0;
    prep.atomic.faces.forEach((f, k) => {
      const m = mats[k];
      for (let tr = 1; tr < f.poly.length - 1; tr++) {
        for (const p of [f.poly[0], f.poly[tr], f.poly[tr + 1]]) {
          v.set(p[0], p[1], 0).applyMatrix4(m);
          pos[o++] = v.x; pos[o++] = v.y; pos[o++] = v.z;
        }
      }
    });
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    for (const [list, g2] of [[prep.hard, lineGeo], [prep.soft, softGeo]]) {
      const lp = g2.attributes.position.array;
      o = 0;
      for (const ed of list) {
        const m = mats[ed.face];
        v.set(ed.a[0], ed.a[1], 0).applyMatrix4(m); lp[o++] = v.x; lp[o++] = v.y; lp[o++] = v.z;
        v.set(ed.b[0], ed.b[1], 0).applyMatrix4(m); lp[o++] = v.x; lp[o++] = v.y; lp[o++] = v.z;
      }
      g2.setDrawRange(0, list.length * 2);
      g2.attributes.position.needsUpdate = true;
      g2.computeBoundingSphere();
    }

    // keep the model centred and filling the view as it shrinks
    const a = prep.atomic;
    const b0 = a.bounds0, b1 = a.bounds1;
    const cx = b0.cx + (b1.cx - b0.cx) * e, cy = b0.cy + (b1.cy - b0.cy) * e;
    const size = Math.max(b0.w + (b1.w - b0.w) * e, b0.h + (b1.h - b0.h) * e);
    const fit = Math.min(1, aspect * 0.95);
    const sc = Math.min(1.6 * fit, (2.15 * fit) / Math.max(size, 0.6));
    const g = group.current;
    g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, sc, 0.08));
    g.position.x = THREE.MathUtils.lerp(g.position.x, -cx * g.scale.x, 0.12);
    g.position.y = THREE.MathUtils.lerp(g.position.y, -cy * g.scale.x, 0.12);

    // fold-line guide: visible right before and during the first part of a fold
    if (guide.current) {
      const show = a.line && u < 0.55;
      guide.current.visible = !!show;
      if (show) {
        if (!a._ext) a._ext = lineExtent(a.faces, a.line, 0.08) || a.line;
        const [p, q] = a._ext;
        const zTop = (a._zTop ??= (Math.max(...a.faces.map((f) => f.z0)) + 2) * GAP);
        guide.current.geometry.setPositions([p[0], p[1], zTop, q[0], q[1], zTop]);
        guide.current.computeLineDistances();
        guide.current.material.opacity = u < 0.02 ? 0.95 : Math.max(0, 0.95 - u * 1.8);
      }
    }
    if (lines.current) lines.current.visible = showCreases;
    if (softLines.current) softLines.current.visible = showCreases;
    onFrame && onFrame(t);
  });

  return (
    <group ref={group}>
      <mesh ref={meshFront} geometry={geo} material={frontMat} castShadow receiveShadow />
      <mesh ref={meshBack} geometry={geo} material={backMat} castShadow receiveShadow />
      <lineSegments ref={lines} geometry={lineGeo}>
        <lineBasicMaterial color="#10201c" transparent opacity={0.38} />
      </lineSegments>
      <lineSegments ref={softLines} geometry={softGeo}>
        <lineBasicMaterial color="#10201c" transparent opacity={0.16} />
      </lineSegments>
      <Line ref={guide} points={[[0, 0, 0], [1, 0, 0]]} color="#ffffff" lineWidth={2} dashed dashSize={0.06} gapSize={0.04} transparent />
    </group>
  );
}
