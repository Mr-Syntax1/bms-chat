import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { VAN } from '../sceneLayout';
import { registerInteractable } from '../interactionRegistry';
import { usePlayerStore } from '../stores/usePlayerStore';
import { Model as RVModel } from '../models/RV';

// جعبه‌ی مدل RV (واحدهای خودش): x 0.18..4.71 ، y 0.64..2.70 ، z -2.57..0.81
// مدل را وسط‌چین و روی زمین می‌نشانیم
const RV_SCALE = 1.1;
const RV_OFFSET = [-2.445 * RV_SCALE, -0.64 * RV_SCALE, 0.88 * RV_SCALE];
const RV_FRONT_X = (4.71 - 2.445) * RV_SCALE;
const RV_HALF_WIDTH = 1.69 * RV_SCALE;

// ون کمپ با مدل واقعی RV + چراغ‌های قابل کنترل
export default function Van() {
  const groupRef = useRef(null);
  const headlightLeft = useRef(null);
  const headlightRight = useRef(null);
  const headlights = usePlayerStore((s) => s.headlights);
  const hovered = usePlayerStore((s) => s.hovered);

  useEffect(() => {
    const unsubscribe = registerInteractable('van', groupRef.current);
    return unsubscribe;
  }, []);

  // هدف نورافکن‌ها باید آبجکت مستقل در صحنه باشد
  const targets = useMemo(() => {
    const left = new THREE.Object3D();
    const right = new THREE.Object3D();
    left.position.set(18, 0.1, -1.4);
    right.position.set(18, 0.1, 1.4);
    return { left, right };
  }, []);

  // تپش ملایم چراغ‌ها وقتی روشن‌اند
  useFrame(({ clock }) => {
    if (!headlights) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 3.1) * 0.05;
    if (headlightLeft.current) headlightLeft.current.intensity = 30 * pulse;
    if (headlightRight.current) headlightRight.current.intensity = 30 * pulse;
  });

  return (
    <group ref={groupRef} position={[VAN.x, 0, VAN.z]} rotation={[0, VAN.rotation, 0]}>
      {/* بدنه‌ی مدل واقعی، تراز شده با زمین و مرکز */}
      <group position={RV_OFFSET} scale={RV_SCALE}>
        <RVModel />
      </group>

      {/* نورافکن‌های جلو */}
      <primitive object={targets.left} />
      <primitive object={targets.right} />

      {[-RV_HALF_WIDTH * 0.42, RV_HALF_WIDTH * 0.42].map((z, i) => (
        <group key={z} position={[RV_FRONT_X, 0.95, z]}>
          <mesh>
            <cylinderGeometry args={[0.14, 0.14, 0.08, 12]} />
            <meshStandardMaterial
              color={headlights ? '#fff6cf' : '#8f8878'}
              emissive={headlights ? '#ffe9a8' : '#000000'}
              emissiveIntensity={headlights ? 2.2 : 0}
              roughness={0.4}
            />
          </mesh>
          {headlights && (
            <spotLight
              ref={i === 0 ? headlightLeft : headlightRight}
              color="#ffe4b0"
              intensity={12}
              distance={22}
              angle={0.55}
              penumbra={0.9}
              position={[0.25, 0, 0]}
              target={i === 0 ? targets.left : targets.right}
            />
          )}
        </group>
      ))}

      {/* چراغ سقفی گرم بالای ون */}
      <pointLight position={[0, 2.6, 0]} color="#ffd18a" intensity={9} distance={13} decay={1.9} />

      {/* فانوس آویزان کنار درِ ون */}
      <group position={[-1.5, 1.5, 1.35]}>
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.44, 4]} />
          <meshStandardMaterial color="#3a3327" />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.09, 0.09, 0.18, 8]} />
          <meshStandardMaterial color="#ffdf9e" emissive="#ffb84d" emissiveIntensity={1.6} />
        </mesh>
        <pointLight color="#ffb84d" intensity={2.4} distance={6} decay={2} />
      </group>

      {/* سطح خاکی زیر ون */}
      <mesh position={[0, 0.016, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[3.6, 18]} />
        <meshStandardMaterial color="#3a3226" roughness={1} />
      </mesh>

      {/* نشانگر تعامل چراغ ون */}
      {hovered === 'van' && (
        <Html center position={[0, 3.5, 0]} distanceFactor={11} zIndexRange={[30, 0]}>
          <div className="px-2 py-0.5 rounded-full bg-surface-950/85 border border-white/20 text-[10px] text-surface-50 whitespace-nowrap pointer-events-none select-none">
            چراغ‌ها — F
          </div>
        </Html>
      )}
    </group>
  );
}
