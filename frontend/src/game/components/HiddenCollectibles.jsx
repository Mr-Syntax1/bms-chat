import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import { usePlayerStore } from '../stores/usePlayerStore';
import { HIDDEN_ACORNS } from '../npcData';
import { getGroundHeight } from '../terrain';
import { registerQuestItem } from '../questRegistry';
import { playPositionalOneShot } from '../audio';
import { QUEST_ACCEPT_SOUND } from '../sounds';
import { kickPunch, kickShake } from '../juice';
import { PARTICLE_BUDGET } from '../fxBudget';
import { emitPickup } from '../pickupFX';

// بلوط طلایی پنهان: درخشش ملایم + چرخش آرام + تعامل E
function GoldenAcorn({ index, spot }) {
  const collected = usePlayerStore((s) => s.goldenAcorns.includes(index));
  const groupRef = useRef(null);
  const spinRef = useRef(null);
  const groundY = getGroundHeight(spot.x, spot.z);

  // ثبت به‌عنوان آیتم تعاملی (E)
  useEffect(() => {
    return registerQuestItem({
      key: `acorn-${index}`,
      label: 'برداشتن بلوط طلایی',
      x: spot.x,
      z: spot.z,
      radius: 2.4,
      done: () => usePlayerStore.getState().goldenAcorns.includes(index),
      action: () => {
        if (!usePlayerStore.getState().collectGoldenAcorn(index)) return;
        playPositionalOneShot(QUEST_ACCEPT_SOUND, [spot.x, 1, spot.z], { volume: 0.7 });
        emitPickup(spot.x, 0.9, spot.z, '#ffd24d');
        kickPunch(0.18);
        kickShake(0.26);
      },
    });
  }, [index, spot.x, spot.z]);

  useFrame(({ clock }) => {
    if (!spinRef.current || collected) return;
    spinRef.current.rotation.y = clock.elapsedTime * 1.1;
    spinRef.current.position.y = 0.55 + Math.sin(clock.elapsedTime * 1.8 + index) * 0.08;
  });

  if (collected) return null;

  return (
    <group ref={groupRef} position={[spot.x, groundY, spot.z]}>
      <group ref={spinRef} position={[0, 0.55, 0]}>
        {/* بدنه‌ی بلوط طلایی (primitive — مدل موجود نیست) */}
        <mesh castShadow>
          <sphereGeometry args={[0.13, 12, 10]} />
          <meshStandardMaterial
            color="#ffd24d"
            emissive="#ffb300"
            emissiveIntensity={0.55}
            roughness={0.35}
            metalness={0.55}
          />
        </mesh>
        <mesh position={[0, 0.11, 0]} castShadow>
          <sphereGeometry args={[0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#b8860b" roughness={0.7} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.012, 0.018, 0.06, 6]} />
          <meshStandardMaterial color="#8a6d1a" roughness={0.8} />
        </mesh>
      </group>
      {/* درخشش نامحسوس (راهنمای بصری) */}
      <pointLight color="#ffd24d" intensity={2.4} distance={4} decay={2} position={[0, 0.7, 0]} />
      <Sparkles
        count={PARTICLE_BUDGET.acorn}
        scale={[0.7, 0.7, 0.7]}
        position={[0, 0.6, 0]}
        size={2}
        speed={0.2}
        color="#ffe6a8"
      />
    </group>
  );
}

export default function HiddenCollectibles() {
  return (
    <group>
      {HIDDEN_ACORNS.map((spot, i) => (
        <GoldenAcorn key={`acorn-${i}`} index={i} spot={spot} />
      ))}
    </group>
  );
}
