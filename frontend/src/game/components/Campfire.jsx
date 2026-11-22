import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { FIRE_KEEPOUT, FIRE_STONES, SEAT_SPOTS } from '../sceneLayout';
import { registerInteractable } from '../interactionRegistry';
import { usePlayerStore } from '../stores/usePlayerStore';
import { useQualityPreset } from '../stores/useSettingsStore';
import { Model as BonfireModel } from '../models/Bonfire';
import { Model as ChoppedLogModel } from '../models/ChoppedLog';

// کنده‌ی نشستن
const SEAT_LOG_SCALE = 0.55;
const SEAT_LOG_OFFSET_X = -0.69;
const SEAT_LOG_OFFSET_Y = 0.51;

export default function Campfire() {
  const preset = useQualityPreset();
  const lightRef = useRef(null);
  const emberRef = useRef(null);
  const glowRef = useRef(null);
  const fireGroupRef = useRef(null);
  const stoneRef = useRef(null);
  const nearFire = usePlayerStore((s) => s.nearFire);
  const seated = usePlayerStore((s) => s.seated);

  useEffect(() => {
    const unsubscribe = registerInteractable('campfire', fireGroupRef.current);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const stones = stoneRef.current;
    if (!stones) return;
    const dummy = new THREE.Object3D();
    FIRE_STONES.forEach((stone, i) => {
      dummy.position.set(stone.x, stone.scale * 0.9, stone.z);
      dummy.rotation.set(0, stone.rotation, 0);
      dummy.scale.setScalar(stone.scale * 2.4);
      dummy.updateMatrix();
      stones.setMatrixAt(i, dummy.matrix);
    });
    stones.instanceMatrix.needsUpdate = true;
    stones.computeBoundingSphere();
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const flicker = 0.84 + Math.sin(t * 7.9) * 0.08 + Math.sin(t * 12.3 + 1.7) * 0.05;

    if (lightRef.current) {
      lightRef.current.intensity = 38 * flicker;
      lightRef.current.position.y = 1.25 + Math.sin(t * 4.7) * 0.07;
    }
    if (emberRef.current) {
      emberRef.current.intensity = 9 * flicker;
    }
    if (glowRef.current) {
      const s = 0.92 + Math.sin(t * 5.3) * 0.07;
      glowRef.current.scale.setScalar(s);
      glowRef.current.material.opacity = 0.13 * flicker;
    }
  });

  return (
    <group>
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[FIRE_KEEPOUT, FIRE_KEEPOUT * 1.08, 0.1, 24]} />
        <meshStandardMaterial color="#2a221c" roughness={1} />
      </mesh>

      <instancedMesh ref={stoneRef} args={[undefined, undefined, FIRE_STONES.length]} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.2, 0]} />
        <meshStandardMaterial color="#4a4a52" roughness={0.92} flatShading />
      </instancedMesh>

      <group ref={fireGroupRef} position={[0, 0, 0]}>
        <BonfireModel scale={0.55} />
      </group>

      <pointLight
        ref={lightRef}
        color="#ff8a3d"
        intensity={38}
        distance={30}
        decay={1.6}
        castShadow={preset.shadows}
        shadow-bias={-0.0015}
        shadow-mapSize={[preset.shadowMapSize, preset.shadowMapSize]}
      />
      <pointLight ref={emberRef} position={[0, 0.5, 0]} color="#ff6b2c" intensity={9} distance={11} decay={2} />

      <mesh ref={glowRef} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[FIRE_KEEPOUT + 2.4, 32]} />
        <meshBasicMaterial color="#ff8c42" transparent opacity={0.13} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      <Sparkles count={38} scale={[2, 2.8, 2]} position={[0, 1.5, 0]} size={2.8} speed={0.35} opacity={0.85} color="#ffb066" />

      {/* نشانگر تعامل بالای آتش */}
      {nearFire && !seated && (
        <Html center position={[0, 2.9, 0]} distanceFactor={11} zIndexRange={[30, 0]}>
          <div className="px-2 py-0.5 rounded-full bg-surface-950/85 border border-white/20 text-[10px] text-surface-50 whitespace-nowrap pointer-events-none select-none">
            نشستن دور آتش — E
          </div>
        </Html>
      )}

      {SEAT_SPOTS.map((spot, i) => (
        <group key={i} position={[spot.x, 0, spot.z]} rotation={[0, spot.rotation, 0]} scale={SEAT_LOG_SCALE}>
          <ChoppedLogModel position={[SEAT_LOG_OFFSET_X, SEAT_LOG_OFFSET_Y, 0]} />
        </group>
      ))}
    </group>
  );
}
