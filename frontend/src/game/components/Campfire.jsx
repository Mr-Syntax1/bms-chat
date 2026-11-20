import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { FIRE_KEEPOUT, FIRE_STONES, SEAT_SPOTS } from '../sceneLayout';
import { registerInteractable } from '../interactionRegistry';

export default function Campfire() {
  const flameRef = useRef(null);
  const innerFlameRef = useRef(null);
  const lightRef = useRef(null);
  const logGroupRef = useRef(null);
  const fireGroupRef = useRef(null);
  const stoneRef = useRef(null);

  useEffect(() => {
    const unsubscribe = registerInteractable('campfire', fireGroupRef.current);
    return unsubscribe;
  }, []);

  // ماتریس سنگ‌ها یک بار ست می‌شود
  useEffect(() => {
    const stones = stoneRef.current;
    if (!stones) return;
    const dummy = new THREE.Object3D();
    FIRE_STONES.forEach((stone, i) => {
      dummy.position.set(stone.x, stone.scale * 0.45, stone.z);
      dummy.rotation.set(0, stone.rotation, 0);
      dummy.scale.setScalar(stone.scale);
      dummy.updateMatrix();
      stones.setMatrixAt(i, dummy.matrix);
    });
    stones.instanceMatrix.needsUpdate = true;
  }, []);

  // نور و شعله با نویز سینوسی تپش می‌کنند (بدون setState)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const flicker = 0.82 + Math.sin(t * 8.3) * 0.09 + Math.sin(t * 13.7) * 0.06;

    if (lightRef.current) {
      lightRef.current.intensity = 9 * flicker;
      lightRef.current.position.y = 1.05 + Math.sin(t * 5.1) * 0.05;
    }

    if (flameRef.current) {
      const s = 0.94 + Math.sin(t * 7.4) * 0.09;
      flameRef.current.scale.set(s, 1.15 + Math.sin(t * 9.1) * 0.13, s);
      flameRef.current.rotation.y = t * 0.9;
    }

    if (innerFlameRef.current) {
      const s2 = 0.88 + Math.sin(t * 11.2 + 1.4) * 0.1;
      innerFlameRef.current.scale.set(s2, 1 + Math.sin(t * 8.6) * 0.12, s2);
      innerFlameRef.current.rotation.y = -t * 1.3;
    }
  });

  return (
    <group>
      {/* گودال آتش */}
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <cylinderGeometry args={[FIRE_KEEPOUT, FIRE_KEEPOUT * 1.06, 0.09, 24]} />
        <meshStandardMaterial color="#2b2320" roughness={1} flatShading />
      </mesh>

      {/* سنگ‌های دور گودال */}
      <instancedMesh
        ref={stoneRef}
        args={[undefined, undefined, FIRE_STONES.length]}
        castShadow
        receiveShadow
      >
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#4b4b52" roughness={0.9} flatShading />
      </instancedMesh>

      {/* چوب‌های هیزم چلیپایی */}
      <group ref={logGroupRef} position={[0, 0.16, 0]}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh
            key={i}
            position={[Math.cos((i / 5) * Math.PI * 2) * 0.34, 0.06 + i * 0.03, Math.sin((i / 5) * Math.PI * 2) * 0.34]}
            rotation={[Math.PI / 2.4, (i / 5) * Math.PI * 2, 0.22]}
            castShadow
          >
            <cylinderGeometry args={[0.09, 0.11, 1.25, 6]} />
            <meshStandardMaterial color={i % 2 ? '#3d2a1e' : '#4a3324'} roughness={1} flatShading />
          </mesh>
        ))}
      </group>

      {/* شعله‌ها + نور اصلی کمپ */}
      <group ref={fireGroupRef} position={[0, 0.35, 0]}>
        <mesh ref={flameRef} position={[0, 0.42, 0]}>
          <icosahedronGeometry args={[0.52, 0]} />
          <meshBasicMaterial color="#ff7a2f" transparent opacity={0.92} />
        </mesh>
        <mesh ref={innerFlameRef} position={[0, 0.3, 0]}>
          <icosahedronGeometry args={[0.3, 0]} />
          <meshBasicMaterial color="#ffd76a" />
        </mesh>
        <mesh position={[0, 0.62, 0]}>
          <icosahedronGeometry args={[0.16, 0]} />
          <meshBasicMaterial color="#fff3c4" transparent opacity={0.85} />
        </mesh>

        <pointLight
          ref={lightRef}
          color="#ff8c42"
          intensity={9}
          distance={22}
          decay={1.7}
          castShadow
          shadow-bias={-0.0012}
          shadow-mapSize={[1024, 1024]}
        />
      </group>

      {/* جرقه‌های معلق */}
      <Sparkles
        count={26}
        scale={[1.5, 2.1, 1.5]}
        position={[0, 1.25, 0]}
        size={2.4}
        speed={0.32}
        opacity={0.75}
        color="#ffb066"
      />

      {/* کنده‌های نشستن دور آتش (محور خوابیده و مماس بر دایره) */}
      {SEAT_SPOTS.map((spot, i) => (
        <group key={i} position={[spot.x, 0.34, spot.z]} rotation={[0, -spot.rotation, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
            <cylinderGeometry args={[0.3, 0.32, 1.5, 8]} />
            <meshStandardMaterial color={i % 2 ? '#5a4230' : '#4c3728'} roughness={0.95} flatShading />
          </mesh>
        </group>
      ))}

      {/* حلقه‌ی نوری گرم روی زمین */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[FIRE_KEEPOUT + 0.1, FIRE_KEEPOUT + 1.1, 32]} />
        <meshBasicMaterial color="#ff8c42" transparent opacity={0.07} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
