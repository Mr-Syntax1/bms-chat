import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { remoteMap, usePlayerStore } from '../stores/usePlayerStore';
import { SEAT_SPOTS } from '../sceneLayout';
import { getWalkSurfaceY } from '../terrain';
import Character from './Character';
import { DEFAULT_CHARACTER } from '../models/characterConfig';
import NameTag from './NameTag';
import ChatBubble from './ChatBubble';

const PALETTE = ['#8ab4f8', '#f28b82', '#fdd663', '#81c995', '#c58af9', '#78d9ec', '#f6aea9', '#b6e3a8'];

function colorForId(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 997;
  return PALETTE[hash % PALETTE.length];
}

const LERP_FACTOR = 0.16;
const ROT_LERP = 0.2;
// فاصله‌ی قطع رندر بازیکنان ریموت (واحد) — فراتر از مه صحنه (۱۵۰)
const LOD_FAR = 70;
const LOD_FAR_SQ = LOD_FAR * LOD_FAR;

function RemoteAvatar({ id }) {
  const groupRef = useRef(null);
  const color = colorForId(id);
  const movingRef = useRef(false);
  const runningRef = useRef(false);
  const seatedRef = useRef(false);
  const restRef = useRef(null);
  const wardrobeRef = useRef(null);
  // کمد ریموت فقط وقتی عوض شود re-render می‌دهد (نه هر فریم)
  const [wardrobe, setWardrobe] = useState(() => remoteMap.get(id)?.wardrobe || null);

  useFrame(({ camera }, rawDelta) => {
    const entry = remoteMap.get(id);
    const group = groupRef.current;
    if (!entry || !group || !group.visible) return;

    // LOD: بازیکنان دورتر از ۷۰ واحد هیچ محاسبه‌ای نمی‌گیرند (نه لرپ، نه
    // سرچ و نه آپدیت اسکلت). با ۲+ نفر این بخش بزرگ‌ترین هزینه‌ی فریم بود.
    const dxCam = camera.position.x - entry.current.x;
    const dzCam = camera.position.z - entry.current.z;
    if (dxCam * dxCam + dzCam * dzCam > LOD_FAR_SQ) {
      if (group.visible) group.visible = false;
      return;
    }
    if (!group.visible) group.visible = true;

    // مقایسه با مرجع شیء (نه JSON.stringify هر فریم) — ارسال موقعیت ۱۵ بار در
    // ثانیه شیء تازه نمی‌سازد، پس این بررسی تقریباً همیشه false است.
    const nextWardrobe = entry.wardrobe || null;
    if (nextWardrobe !== wardrobeRef.current) {
      wardrobeRef.current = nextWardrobe;
      setWardrobe(nextWardrobe);
    }

    const delta = Math.min(rawDelta, 0.05);
    // میرایی مستقل از نرخ فریم (۶۰fps ≈ همان مقادیر قبلی)
    const posLerp = 1 - Math.pow(1 - LERP_FACTOR, delta * 60);
    const rotLerp = 1 - Math.pow(1 - ROT_LERP, delta * 60);

    const now = Date.now();
    if (entry.emoteUntil && now > entry.emoteUntil) {
      entry.emote = null;
      entry.emoteUntil = 0;
    }
    if (entry.actionUntil && now > entry.actionUntil) {
      entry.action = null;
      entry.actionUntil = 0;
      entry.marshmallowStage = null;
    }

    const seatSpot =
      entry.seat !== null && entry.seat !== undefined ? SEAT_SPOTS[entry.seat] : null;

    if (seatSpot) {
      entry.current.x += (seatSpot.x - entry.current.x) * posLerp;
      entry.current.z += (seatSpot.z - entry.current.z) * posLerp;
      let rotDelta = seatSpot.rotation - entry.rot;
      while (rotDelta > Math.PI) rotDelta -= Math.PI * 2;
      while (rotDelta < -Math.PI) rotDelta += Math.PI * 2;
      entry.rot += rotDelta * rotLerp;
      movingRef.current = false;
      runningRef.current = false;
    } else {
      const prevX = entry.current.x;
      const prevZ = entry.current.z;
      entry.current.x += (entry.target.x - entry.current.x) * posLerp;
      entry.current.z += (entry.target.z - entry.current.z) * posLerp;

      // چرخش را از جهت واقعی حرکت استخراج کن تا هرگز پشت‌به‌جلو راه نرود
      const movedX = entry.current.x - prevX;
      const movedZ = entry.current.z - prevZ;
      const stepLen = Math.hypot(movedX, movedZ);
      if (stepLen > 0.0025) {
        entry.targetRot = Math.atan2(movedX, movedZ);
      }

      let rotDelta = entry.targetRot - entry.rot;
      while (rotDelta > Math.PI) rotDelta -= Math.PI * 2;
      while (rotDelta < -Math.PI) rotDelta += Math.PI * 2;
      entry.rot += rotDelta * rotLerp;

      const remaining = Math.hypot(entry.target.x - entry.current.x, entry.target.z - entry.current.z);
      movingRef.current = remaining > 0.03 || stepLen > 0.004;
      runningRef.current = remaining > 0.14 || stepLen > 0.02;
    }

    seatedRef.current = Boolean(seatSpot);
    restRef.current = seatSpot?.rest ?? null;
    group.position.set(entry.current.x, getWalkSurfaceY(entry.current.x, entry.current.z) + (seatSpot?.restY || 0), entry.current.z);
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
        marshmallowStage={() => remoteMap.get(id)?.marshmallowStage ?? null}
        seated={seatedRef}
        rest={restRef}
        wardrobe={wardrobe}
        castShadow
      />

      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.46, 0.56, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} depthWrite={false} />
      </mesh>

      <NameTag name={username} id={id} color={color} groupRef={groupRef} />
      <ChatBubble id={id} />
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
