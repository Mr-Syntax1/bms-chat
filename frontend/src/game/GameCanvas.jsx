import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { KeyboardControls, AdaptiveDpr, Preload } from '@react-three/drei';
import * as THREE from 'three';
import CozyScene from './components/CozyScene';
import PlayerController from './components/PlayerController';
import RemotePlayers from './components/RemotePlayers';
import AudioRoot from './components/AudioRoot';
import { useGameSync } from './hooks/useGameSync';
import { KEY_MAP } from './controls';

export default function GameCanvas({ roomId, user, look, active = true }) {
  // سینک Ably در بالاترین سطح کامپوننت بازی
  useGameSync({ roomId, user, enabled: Boolean(roomId && user?.id) });

  return (
    <KeyboardControls map={KEY_MAP}>
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [0, 2.2, 4], fov: 62, near: 0.1, far: 500 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor('#070d1c');
        }}
      >
        {/* AudioListener باید قبل از افکت‌های صدای محیطی ساخته شود */}
        <AudioRoot />
        <Suspense fallback={null}>
          <CozyScene />
          <PlayerController roomId={roomId} user={user} look={look} active={active} />
          <RemotePlayers />
          <Preload all />
        </Suspense>
        <AdaptiveDpr pixelated />
      </Canvas>
    </KeyboardControls>
  );
}
