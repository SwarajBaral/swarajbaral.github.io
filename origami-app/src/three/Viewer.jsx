import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import PaperModel from './PaperModel.jsx';
import { player, stepIndexAt } from '../store.js';

const DUR = { fold: 1.5, valley: 1.5, mountain: 1.5, inside: 1.9, outside: 1.9, petal: 2.6, flip: 1.3, rotate: 1.1, shape: 2.2 };

// advances the playback clock
function Driver({ built }) {
  useFrame((_, dt) => {
    const st = player.get();
    const n = built.atomics.length;
    dt = Math.min(dt, 0.05);
    const ai = Math.min(Math.floor(st.t), n - 1);
    const kind = built.atomics[ai]?.kind || 'fold';
    const rate = (st.speed || 1) / (DUR[kind] || 1.5);
    if (st.target !== null && st.target !== undefined) {
      const dir = Math.sign(st.target - st.t);
      const back = dir < 0 ? 2.2 : 1;
      let t = st.t + dir * rate * back * dt;
      // never skip past an atomic boundary in one frame
      if ((dir > 0 && t >= st.target) || (dir < 0 && t <= st.target)) {
        player.set({ t: st.target, target: null });
      } else player.set({ t });
      return;
    }
    if (st.playing) {
      if (st.hold > 0) { player.set({ hold: st.hold - dt }); return; }
      const steps = built.steps;
      const si = stepIndexAt(steps, st.t);
      if (si >= steps.length) { player.set({ playing: false }); return; }
      const end = steps[si].end;
      let t = st.t + rate * dt;
      if (t >= end) { t = end; player.set({ t, hold: si + 1 < steps.length ? 0.7 : 0, playing: si + 1 < steps.length }); }
      else player.set({ t });
    }
  });
  return null;
}

const Viewer = forwardRef(function Viewer({ built, color, showCreases, autoRotate }, ref) {
  const controls = useRef();
  useImperativeHandle(ref, () => ({
    reset() { controls.current?.reset(); },
  }));
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 0.5, 4.8], fov: 38 }}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1.05 }}
    >
      <hemisphereLight args={['#eef4ff', '#2a3430', 1.5]} />
      <directionalLight position={[2.5, 3.5, 4]} intensity={2.2} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.015} />
      <directionalLight position={[-3, -1, -3]} intensity={0.9} color="#bfe4ff" />
      <pointLight position={[0, 0.5, 3]} intensity={0.25} />
      <group rotation={[-0.42, 0.32, 0]}>
        <PaperModel built={built} color={color} showCreases={showCreases} />
      </group>
      <ContactShadows position={[0, -1.55, 0]} opacity={0.45} scale={7} blur={2.6} far={3} color="#000000" />
      <Driver built={built} />
      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={2}
        maxDistance={9}
        autoRotate={autoRotate}
        autoRotateSpeed={1.6}
      />
    </Canvas>
  );
});

export default Viewer;
