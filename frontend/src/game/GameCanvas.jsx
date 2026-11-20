import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { KeyboardControls, AdaptiveDpr, Preload } from '@react-three/drei';
import * as THREE from 'three';
import CozyScene from './components/CozyScene';
import PlayerController from './components/PlayerController';
import RemotePlayers from './components/RemotePlayers';
import { useGameSync } from './hooks/useGameSync';
import { KEY_MAP } from './controls';

export default function GameCanvas({ roomId, user }) {
  // سینک Ably در بالاترین سطح کامپوننت بازی
  useGameSync({ roomId, user, enabled: Boolean(roomId && user?.id) });

  return (
    <KeyboardControls map={KEY_MAP}>
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [0, 4.6, 8.5], fov: 52, near: 0.1, far: 220 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor('#0b1020');
        }}
      >
        <Suspense fallback={null}>
          <CozyScene />
          <PlayerController />
          <RemotePlayers />
          <Preload all />
        </Suspense>
        <AdaptiveDpr pixelated />
      </Canvas>
    </KeyboardControls>
  );
}
