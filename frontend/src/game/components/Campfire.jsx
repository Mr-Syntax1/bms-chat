import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { FIRE_KEEPOUT, FIRE_STONES, SEAT_SPOTS } from '../sceneLayout';
import { registerInteractable } from '../interactionRegistry';
import { usePlayerStore } from '../stores/usePlayerStore';
import { Model as BonfireModel } from '../models/Bonfire';
import { Model as ChoppedLogModel } from '../models/ChoppedLog';

// کنده‌ی نشستن: جعبه‌ی مدل x -0.65..2.03 (مرکز ۰.۶۹) و پایین‌ترین y = -۰.۵۱
const SEAT_LOG_SCALE = 0.55;
const SEAT_LOG_OFFSET_X = -0.69; // مرکز طول کنده روی مبدأ
const SEAT_LOG_OFFSET_Y = 0.51; // پایین‌ترین نقطه‌ی مدل روی زمین

export default function Campfire() {
  const lightRef = useRef(null);
  const emberRef = useRef(null);
  const glowRef = useRef(null);
  const fireGroupRef = useRef(null);
  const stoneRef = useRef(null);
  const marshmallowRef = useRef(null);
  const marshmallow = usePlayerStore((s) => s.marshmallow);
  const action = usePlayerStore((s) => s.action);

  useEffect(() => {
    const unsubscribe = registerInteractable('campfire', fireGroupRef.current);
    return unsubscribe;
  }, []);

  // ماتریس سنگ‌های دور گودال (یک‌بار)
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

  // تپش نور و درخشش آتش + چرخش آرام هسته‌ی نارنجی
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

    // مارشمالوی روی سیخ: کمی تکان می‌خورد
    if (marshmallowRef.current && marshmallow === 'roasting') {
      marshmallowRef.current.rotation.z = Math.sin(t * 2.2) * 0.12;
    }
  });

  const marshmallowColor =
    marshmallow === 'ready' ? '#b5763c' : marshmallow === 'burnt' ? '#2b1d15' : '#fff6e0';

  return (
    <group>
      {/* گودال آتش */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[FIRE_KEEPOUT, FIRE_KEEPOUT * 1.08, 0.1, 24]} />
        <meshStandardMaterial color="#2a221c" roughness={1} />
      </mesh>

      {/* سنگ‌های دور گودال */}
      <instancedMesh ref={stoneRef} args={[undefined, undefined, FIRE_STONES.length]} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.2, 0]} />
        <meshStandardMaterial color="#4a4a52" roughness={0.92} flatShading />
      </instancedMesh>

      {/* مدل واقعی Bonfire */}
      <group ref={fireGroupRef} position={[0, 0, 0]}>
        <BonfireModel scale={0.55} />
      </group>

      {/* نور اصلی و شعاع گرم */}
      <pointLight
        ref={lightRef}
        color="#ff8a3d"
        intensity={38}
        distance={30}
        decay={1.6}
        castShadow
        shadow-bias={-0.0015}
        shadow-mapSize={[1024, 1024]}
      />
      {/* نور کمکی نزدیک زمین برای روشن کردن کنده‌ها */}
      <pointLight ref={emberRef} position={[0, 0.5, 0]} color="#ff6b2c" intensity={9} distance={11} decay={2} />

      {/* هاله‌ی نوری روی زمین */}
      <mesh ref={glowRef} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[FIRE_KEEPOUT + 2.4, 32]} />
        <meshBasicMaterial color="#ff8c42" transparent opacity={0.13} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* جرقه‌ها */}
      <Sparkles count={38} scale={[2, 2.8, 2]} position={[0, 1.5, 0]} size={2.8} speed={0.35} opacity={0.85} color="#ffb066" />

      {/* کنده‌های نشستن دور آتش؛ محور طولی کنده مماس بر دایره است */}
      {SEAT_SPOTS.map((spot, i) => (
        <group key={i} position={[spot.x, 0, spot.z]} rotation={[0, spot.rotation, 0]} scale={SEAT_LOG_SCALE}>
          <ChoppedLogModel position={[SEAT_LOG_OFFSET_X, SEAT_LOG_OFFSET_Y, 0]} />
        </group>
      ))}

      {/* سیخ مارشمالو وقتی اکشن فعال است */}
      {action === 'marshmallow' && (
        <group position={[0.75, 0.2, 0.55]} rotation={[0, -0.5, 0]}>
          <mesh position={[0, 0.9, 0]} rotation={[0, 0, 0.35]}>
            <cylinderGeometry args={[0.022, 0.022, 1.9, 5]} />
            <meshStandardMaterial color="#8a6b4a" roughness={0.9} />
          </mesh>
          <mesh ref={marshmallowRef} position={[0.32, 1.62, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 0.14, 10]} />
            <meshStandardMaterial
              color={marshmallowColor}
              emissive={marshmallow === 'ready' ? '#c97b34' : '#000000'}
              emissiveIntensity={marshmallow === 'ready' ? 0.35 : 0}
              roughness={0.85}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}
