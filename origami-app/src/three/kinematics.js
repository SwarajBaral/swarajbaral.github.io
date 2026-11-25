// Turns an engine "atomic" (one fold) into per-frame 3D face transforms.
import * as THREE from 'three';
import { det, sharedEdge, sameT, centroid } from '../engine/geom.js';

export const GAP = 0.0028; // distance between stacked layers

export const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

const tmpA = new THREE.Matrix4();
const tmpB = new THREE.Matrix4();
const tmpC = new THREE.Matrix4();
const axis = new THREE.Vector3();

function embed(F, z, out) {
  return out.set(F.a, F.b, 0, F.e, F.c, F.d, 0, F.f, 0, 0, det(F), z, 0, 0, 0, 1);
}

function groupMatrix(g, theta, out) {
  if (g.type === 'z') {
    tmpA.makeTranslation(g.c[0], g.c[1], 0);
    tmpB.makeRotationZ(theta);
    tmpC.makeTranslation(-g.c[0], -g.c[1], 0);
  } else {
    const h = g.h * GAP;
    axis.set(g.q[0] - g.p[0], g.q[1] - g.p[1], 0).normalize();
    tmpA.makeTranslation(g.p[0], g.p[1], h);
    tmpB.makeRotationAxis(axis, theta);
    tmpC.makeTranslation(-g.p[0], -g.p[1], -h);
  }
  return out.copy(tmpA).multiply(tmpB).multiply(tmpC);
}

// precompute geometry, edges and residuals for an atomic
export function prepare(atomic) {
  const faces = atomic.faces;
  const chains = faces.map((f) => {
    const c = [];
    let g = f.group;
    while (g !== undefined && g !== null && g >= 0) { c.push(g); g = atomic.groups[g].parent; }
    return c.reverse(); // outermost first
  });
  let triCount = 0;
  faces.forEach((f) => { triCount += f.poly.length - 2; });
  // edges to draw: paper boundary and real creases
  const edges = [];
  faces.forEach((f, i) => {
    const n = f.poly.length;
    for (let e = 0; e < n; e++) {
      const a = f.poly[e], b = f.poly[(e + 1) % n];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      let covered = false, shared = false;
      for (let j = 0; j < faces.length && !covered; j++) {
        if (j === i) continue;
        const seg = sharedEdge([a, b], faces[j].poly);
        if (!seg) continue;
        shared = true;
        const sl = Math.hypot(seg[1][0] - seg[0][0], seg[1][1] - seg[0][1]);
        if (sl > len - 1e-5 && sameT(f.F, faces[j].F) && f.group === faces[j].group) covered = true;
        // avoid drawing a shared crease twice
        if (sl > len - 1e-5 && j < i) covered = true;
      }
      if (!covered) edges.push({ face: i, a, b, boundary: !shared });
    }
  });
  // residual z correction so each face ends exactly at its new layer height
  const mats = faces.map(() => new THREE.Matrix4());
  const residual = faces.map((f, i) => {
    if (!chains[i].length || atomic.groups[chains[i][0]].noResidual) return 0;
    const m = faceMatrix(atomic, chains, i, 1, mats[i], true);
    const c = centroid(f.poly);
    const p = new THREE.Vector3(c[0], c[1], 0).applyMatrix4(m);
    return f.z1 * GAP - p.z;
  });
  return { atomic, chains, triCount, edges, residual, mats };
}

function faceMatrix(atomic, chains, i, u, out, noRes, residual) {
  const f = atomic.faces[i];
  const chain = chains[i];
  if (!chain.length) {
    return embed(f.F, (f.z0 + (f.z1 - f.z0) * u) * GAP, out);
  }
  embed(f.F, f.z0 * GAP, out);
  const mm = new THREE.Matrix4();
  const g = new THREE.Matrix4();
  for (const k of chain) {
    groupMatrix(atomic.groups[k], atomic.groups[k].angle * u, g);
    mm.multiply(g);
  }
  out.premultiply(mm);
  if (!noRes && residual) out.elements[14] += residual[i] * u;
  return out;
}

export function computeMatrices(prep, u) {
  const { atomic, chains, mats, residual } = prep;
  for (let i = 0; i < atomic.faces.length; i++) faceMatrix(atomic, chains, i, u, mats[i], false, residual);
  return mats;
}
