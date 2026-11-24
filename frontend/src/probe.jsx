/* eslint-disable react-refresh/only-export-components */
// فایل موقت تست بصری — بعد از تأیید حذف می‌شود
import { Suspense, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import CozyScene from './game/components/CozyScene';
import AudioRoot from './game/components/AudioRoot';
import { useSettingsStore } from './game/stores/useSettingsStore';

const q = new URLSearchParams(location.search);
const num = (s, d) => {
  const v = (s || '').split(',').map(Number).filter((n) => !Number.isNaN(n));
  return v.length === 3 ? v : d;
};
const CAM = num(q.get('cam'), [0, 2.2, 4]);
const LOOK = num(q.get('look'), [0, 1.2, 0]);

useSettingsStore.getState().setQuality(q.get('q') || 'high');

function Rig() {
  const { camera, gl, scene } = useThree();

  useEffect(() => {
    camera.position.set(CAM[0], CAM[1], CAM[2]);
    camera.lookAt(new THREE.Vector3(LOOK[0], LOOK[1], LOOK[2]));
    camera.updateMatrixWorld(true);
    window.__probe = { camera, gl, scene, THREE };
  }, [camera, gl, scene]);

  return null;
}

function App() {
  return (
    <Canvas
      shadows
      dpr={1}
      gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
      camera={{ position: CAM, fov: 62, near: 0.1, far: 400 }}
      onCreated={({ gl }) => {
        gl.setClearColor('#070d1c');
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <AudioRoot />
      <Rig />
      <Suspense fallback={null}>
        <CozyScene />
      </Suspense>
    </Canvas>
  );
}

createRoot(document.getElementById('root')).render(<App />);
