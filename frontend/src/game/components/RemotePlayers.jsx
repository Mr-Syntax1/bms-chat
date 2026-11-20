import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { remoteMap, usePlayerStore } from '../stores/usePlayerStore';
import { SEAT_SPOTS, SEAT_HEIGHT } from '../sceneLayout';

// رنگ آواتار بر اساس شناسه‌ی کاربر (پایدار و یکتا)
const PALETTE = ['#8ab4f8', '#f28b82', '#fdd663', '#81c995', '#c58af9', '#78d9ec', '#f6aea9', '#b6e3a8'];

function colorForId(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 997;
  return PALETTE[hash % PALETTE.length];
}

// interpolation: حرکت نرم بین پکت‌های دریافتی
const LERP_FACTOR = 0.16;
const ROT_LERP = 0.2;

function RemoteAvatar({ id }) {
  const groupRef = useRef(null);
  const bodyRef = useRef(null);
  const color = useMemo(() => colorForId(id), [id]);

  useFrame(() => {
    const entry = remoteMap.get(id);
    const group = groupRef.current;
    if (!entry || !group) return;

    // اگر روی صندلی نشسته، موقعیت ثابت صندلی
    if (entry.seat !== null && entry.seat !== undefined && SEAT_SPOTS[entry.seat]) {
      const spot = SEAT_SPOTS[entry.seat];
      entry.current.x += (spot.x - entry.current.x) * LERP_FACTOR;
      entry.current.z += (spot.z - entry.current.z) * LERP_FACTOR;
      entry.rot += (spot.rotation - entry.rot) * ROT_LERP;
      if (bodyRef.current) bodyRef.current.position.y += (SEAT_HEIGHT - bodyRef.current.position.y) * 0.2;
    } else {
      entry.current.x += (entry.target.x - entry.current.x) * LERP_FACTOR;
      entry.current.z += (entry.target.z - entry.current.z) * LERP_FACTOR;

      let rotDelta = entry.targetRot - entry.rot;
      while (rotDelta > Math.PI) rotDelta -= Math.PI * 2;
      while (rotDelta < -Math.PI) rotDelta += Math.PI * 2;
      entry.rot += rotDelta * ROT_LERP;

      if (bodyRef.current) bodyRef.current.position.y += (0 - bodyRef.current.position.y) * 0.2;
    }

    group.position.set(entry.current.x, 0, entry.current.z);
    group.rotation.y = entry.rot;

    // بوب ملایم راه رفتن بر اساس فاصله تا هدف
    if (bodyRef.current && (entry.seat === null || entry.seat === undefined)) {
      const speed = Math.hypot(entry.target.x - entry.current.x, entry.target.z - entry.current.z);
      bodyRef.current.position.y = speed > 0.02 ? Math.sin(performance.now() * 0.012) * 0.045 : 0;
    }
  });

  const entry = remoteMap.get(id);
  const username = entry?.username || 'مهمان';

  return (
    <group ref={groupRef}>
      <group ref={bodyRef}>
        <mesh position={[0, 0.85, 0]} castShadow>
          <capsuleGeometry args={[0.32, 0.86, 4, 10]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.72, 0]} castShadow>
          <sphereGeometry args={[0.26, 14, 12]} />
          <meshStandardMaterial color="#ffd9b3" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.92, 0]} castShadow>
          <cylinderGeometry args={[0.36, 0.42, 0.68, 10]} />
          <meshStandardMaterial color={color} roughness={0.85} flatShading />
        </mesh>
        <mesh position={[0.1, 1.76, 0.22]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshStandardMaterial color="#20202a" />
        </mesh>
        <mesh position={[-0.1, 1.76, 0.22]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshStandardMaterial color="#20202a" />
        </mesh>
      </group>

      {/* حلقه‌ی نشانگر بازیکن ریموت */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.46, 0.56, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>

      {/* نام بازیکن */}
      <Html center position={[0, 2.35, 0]} distanceFactor={14} occlude={false} zIndexRange={[20, 0]}>
        <div className="px-2 py-0.5 rounded-full bg-surface-950/75 border border-white/15 text-[11px] text-surface-50 whitespace-nowrap backdrop-blur-sm">
          {username}
        </div>
      </Html>
    </group>
  );
}

export default function RemotePlayers() {
  const remoteIds = usePlayerStore((s) => s.remoteIds);

  return (
    <group>
      {remoteIds.map((id) => (
        <RemoteAvatar key={id} id={id} />
      ))}
    </group>
  );
}
