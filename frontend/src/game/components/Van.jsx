import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { VAN } from '../sceneLayout';
import { registerInteractable } from '../interactionRegistry';
import { usePlayerStore } from '../stores/usePlayerStore';

// ون کمپ: بدنه‌ی Low-poly + چراغ‌های قابل روشن/خاموش
export default function Van() {
  const groupRef = useRef(null);
  const headlightLeft = useRef(null);
  const headlightRight = useRef(null);
  const headlights = usePlayerStore((s) => s.headlights);

  // هدف نورافکن‌ها باید آبجکت مستقل در صحنه باشد
  const targets = useMemo(() => {
    const left = new THREE.Object3D();
    const right = new THREE.Object3D();
    left.position.set(14, -1, -0.6);
    right.position.set(14, -1, 0.6);
    return { left, right };
  }, []);

  useEffect(() => {
    const unsubscribe = registerInteractable('van', groupRef.current);
    return unsubscribe;
  }, []);

  // تپش ملایم چراغ‌ها وقتی روشن‌اند
  useFrame(({ clock }) => {
    if (!headlights) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 3.1) * 0.06;
    if (headlightLeft.current) headlightLeft.current.intensity = 3.4 * pulse;
    if (headlightRight.current) headlightRight.current.intensity = 3.4 * pulse;
  });

  return (
    <group ref={groupRef} position={[VAN.x, 0, VAN.z]} rotation={[0, VAN.rotation, 0]}>
      {/* بدنه‌ی اصلی */}
      <RoundedBox args={[4.6, 1.9, 2.25]} radius={0.22} smoothness={2} position={[0, 1.35, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#e8e3d8" roughness={0.62} metalness={0.05} flatShading />
      </RoundedBox>

      {/* نوار پایین بدنه */}
      <mesh position={[0, 0.62, 0]} castShadow>
        <boxGeometry args={[4.66, 0.5, 2.3]} />
        <meshStandardMaterial color="#7c8a6f" roughness={0.8} />
      </mesh>

      {/* کابین جلو */}
      <mesh position={[1.64, 1.5, 0]} castShadow>
        <boxGeometry args={[1.36, 1.15, 2.16]} />
        <meshStandardMaterial color="#cfe8ef" roughness={0.22} metalness={0.32} />
      </mesh>

      {/* شیشه‌های کناری */}
      {[-1.03, 1.03].map((z) => (
        <mesh key={z} position={[-0.72, 1.62, z]}>
          <boxGeometry args={[2.1, 0.72, 0.06]} />
          <meshStandardMaterial color="#3d5a6c" roughness={0.25} metalness={0.45} />
        </mesh>
      ))}

      {/* درِ پشتی و دستگیره */}
      <mesh position={[-2.31, 1.3, 0]}>
        <boxGeometry args={[0.06, 1.5, 1.7]} />
        <meshStandardMaterial color="#d9d3c6" roughness={0.7} />
      </mesh>
      <mesh position={[-2.36, 1.15, 0.62]}>
        <boxGeometry args={[0.07, 0.1, 0.24]} />
        <meshStandardMaterial color="#5b5b60" metalness={0.7} roughness={0.35} />
      </mesh>

      {/* چرخ‌ها */}
      {[
        [1.5, 1.12],
        [1.5, -1.12],
        [-1.55, 1.12],
        [-1.55, -1.12],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.42, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.42, 0.42, 0.28, 12]} />
          <meshStandardMaterial color="#20242a" roughness={0.95} />
        </mesh>
      ))}

      {/* چراغ‌های جلو */}
      <primitive object={targets.left} />
      <primitive object={targets.right} />

      {[-0.62, 0.62].map((z, i) => (
        <group key={z} position={[2.31, 1.04, z]}>
          <mesh>
            <cylinderGeometry args={[0.17, 0.17, 0.09, 12]} />
            <meshStandardMaterial
              color={headlights ? '#fff6cf' : '#8f8878'}
              emissive={headlights ? '#ffe9a8' : '#000000'}
              emissiveIntensity={headlights ? 1.6 : 0}
            />
          </mesh>
          {headlights && (
            <spotLight
              ref={i === 0 ? headlightLeft : headlightRight}
              color="#ffe9b0"
              intensity={3.4}
              distance={20}
              angle={0.6}
              penumbra={0.7}
              position={[0.3, 0, 0]}
              target={i === 0 ? targets.left : targets.right}
            />
          )}
        </group>
      ))}

      {/* نور بالای ون (چراغ سقفی) */}
      <mesh position={[0, 2.3, 0.62]}>
        <boxGeometry args={[0.5, 0.1, 0.24]} />
        <meshStandardMaterial color="#2b2f35" />
      </mesh>
      <mesh position={[0, 2.42, 0.62]}>
        <boxGeometry args={[0.3, 0.06, 0.14]} />
        <meshBasicMaterial color="#ffd98f" transparent opacity={0.75} />
      </mesh>

      {/* چادر کنار ون */}
      <mesh position={[-3.3, 0.92, 1.1]} rotation={[0, Math.PI / 5, 0]} castShadow>
        <coneGeometry args={[1.15, 1.85, 4]} />
        <meshStandardMaterial color="#c96a4a" roughness={0.85} flatShading />
      </mesh>

      {/* سطح چمن زیر ون */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[3.4, 16]} />
        <meshStandardMaterial color="#2a3b2f" roughness={1} />
      </mesh>
    </group>
  );
}
