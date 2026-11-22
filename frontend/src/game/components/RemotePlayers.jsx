import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { remoteMap, usePlayerStore } from '../stores/usePlayerStore';
import { SEAT_SPOTS } from '../sceneLayout';
import Character from './Character';
import { DEFAULT_CHARACTER } from '../models/characterConfig';

const PALETTE = ['#8ab4f8', '#f28b82', '#fdd663', '#81c995', '#c58af9', '#78d9ec', '#f6aea9', '#b6e3a8'];

function colorForId(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 997;
  return PALETTE[hash % PALETTE.length];
}

const LERP_FACTOR = 0.16;
const ROT_LERP = 0.2;

function RemoteAvatar({ id }) {
  const groupRef = useRef(null);
  const color = colorForId(id);
  const movingRef = useRef(false);
  const runningRef = useRef(false);
  const seatedRef = useRef(false);

  useFrame(() => {
    const entry = remoteMap.get(id);
    const group = groupRef.current;
    if (!entry || !group) return;

    const now = Date.now();
    if (entry.emoteUntil && now > entry.emoteUntil) {
      entry.emote = null;
      entry.emoteUntil = 0;
    }
    if (entry.actionUntil && now > entry.actionUntil) {
      entry.action = null;
      entry.actionUntil = 0;
    }

    const seatSpot =
      entry.seat !== null && entry.seat !== undefined ? SEAT_SPOTS[entry.seat] : null;

    if (seatSpot) {
      entry.current.x += (seatSpot.x - entry.current.x) * LERP_FACTOR;
      entry.current.z += (seatSpot.z - entry.current.z) * LERP_FACTOR;
      let rotDelta = seatSpot.rotation - entry.rot;
      while (rotDelta > Math.PI) rotDelta -= Math.PI * 2;
      while (rotDelta < -Math.PI) rotDelta += Math.PI * 2;
      entry.rot += rotDelta * ROT_LERP;
      movingRef.current = false;
      runningRef.current = false;
    } else {
      entry.current.x += (entry.target.x - entry.current.x) * LERP_FACTOR;
      entry.current.z += (entry.target.z - entry.current.z) * LERP_FACTOR;

      let rotDelta = entry.targetRot - entry.rot;
      while (rotDelta > Math.PI) rotDelta -= Math.PI * 2;
      while (rotDelta < -Math.PI) rotDelta += Math.PI * 2;
      entry.rot += rotDelta * ROT_LERP;

      const speed = Math.hypot(entry.target.x - entry.current.x, entry.target.z - entry.current.z);
      movingRef.current = speed > 0.03;
      runningRef.current = speed > 0.14;
    }

    seatedRef.current = Boolean(seatSpot);
    group.position.set(entry.current.x, 0, entry.current.z);
    group.rotation.y = entry.rot;
  });

  const entry = remoteMap.get(id);
  const username = entry?.username || 'مهمان';
  const character = entry?.character || DEFAULT_CHARACTER;

  return (
    <group ref={groupRef}>
      <Character
        model={character}
        moving={movingRef}
        running={runningRef}
        emote={() => remoteMap.get(id)?.emote ?? null}
        action={() => remoteMap.get(id)?.action ?? null}
        seated={seatedRef}
        castShadow
      />

      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.46, 0.56, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} depthWrite={false} />
      </mesh>

      <Html center position={[0, 2.15, 0]} distanceFactor={14} occlude={false} zIndexRange={[20, 0]}>
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
