// ---------------------------------------------------------------------------
// FishingBobber.jsx — سطل روی خشکی + بابِر رویه‌ای روی آب.
// حرکت بابِر در useFrame با ref آپدیت می‌شود (بدون re-render هر فریم).
// ---------------------------------------------------------------------------
import '../models/setupDraco';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { modelUrl } from '../assetManifest';
import Fitted from '../models/Fitted';
import { isInWater, WATER_LEVEL, getWalkSurfaceY } from '../terrain';
import { fishing, subscribeFishing, REEL_HOLD_TIME } from '../fishData';

const BUCKET_URL = modelUrl('fishing.bucket');
if (BUCKET_URL) useGLTF.preload(BUCKET_URL);

// نزدیک‌ترین جهت پرتاب به سمت آب از نقطه‌ی ایستادن
function findCastDirection(x, z) {
  let bestAngle = 0;
  let bestDist = 3.4;
  let bestScore = -Infinity;
  for (let i = 0; i < 28; i += 1) {
    const angle = (i / 28) * Math.PI * 2;
    const dx = Math.sin(angle);
    const dz = Math.cos(angle);
    for (let d = 2.4; d <= 6.6; d += 0.6) {
      if (isInWater(x + dx * d, z + dz * d)) {
        if (d > bestScore) {
          bestScore = d;
          bestAngle = angle;
          bestDist = d;
        }
        break;
      }
    }
  }
  return { angle: bestAngle, distance: bestDist };
}

const _up = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _tip = new THREE.Vector3();
const _bob = new THREE.Vector3();

// بابِر قرمز/سفید + نخ + حلقه‌ی موج؛ فقط وقتی ماهیگیری فعال است دیده می‌شود
function Bobber({ index, spot }) {
  const groupRef = useRef(null);
  const lineRef = useRef(null);
  const rippleRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const castDir = useMemo(() => findCastDirection(spot.x, spot.z), [spot.x, spot.z]);
  const state = useRef({
    x: spot.x,
    z: spot.z,
    active: false,
    dip: 0,
  });

  useEffect(
    () =>
      subscribeFishing((type) => {
        if (fishing.spotIndex !== index) return;
        const s = state.current;
        if (type === 'cast') {
          const dist = 2.4 + fishing.power * 3.4;
          s.x = spot.x + Math.sin(castDir.angle) * dist;
          s.z = spot.z + Math.cos(castDir.angle) * dist;
          s.active = true;
          setVisible(true);
        } else if (type === 'bite') {
          s.dip = 1;
        } else if (type === 'reset' || type === 'result') {
          s.active = false;
          s.dip = 0;
          setVisible(false);
        }
      }),
    [index, spot, castDir.angle]
  );

  useFrame(({ clock }, delta) => {
    const group = groupRef.current;
    const s = state.current;
    if (!group || !s.active) return;

    const dt = Math.min(delta, 0.05);
    const t = clock.elapsedTime;
    if (s.dip > 0) s.dip = Math.max(0, s.dip - dt * 1.4);

    // در فاز کشش، بابِر آرام به سمت خشکی می‌آید
    if (fishing.phase === 'reeling') {
      const pull = Math.min(1, Math.max(0, fishing.keepTime) / REEL_HOLD_TIME);
      s.x += (spot.x - s.x) * Math.min(1, dt * (0.5 + pull * 1.2));
      s.z += (spot.z - s.z) * Math.min(1, dt * (0.5 + pull * 1.2));
    }

    const dipY = fishing.phase === 'bite' ? 0.16 : s.dip * 0.08;
    const bobY = WATER_LEVEL + 0.06 + Math.sin(t * 2.2) * 0.035 - dipY;

    group.position.set(s.x, bobY, s.z);
    group.rotation.z = Math.sin(t * 1.7) * 0.12;

    if (lineRef.current) {
      _tip.set(spot.x, WATER_LEVEL + 1.6, spot.z);
      _bob.set(s.x, bobY + 0.1, s.z);
      _dir.subVectors(_bob, _tip);
      const len = _dir.length() || 0.001;
      _mid.addVectors(_tip, _bob).multiplyScalar(0.5);
      lineRef.current.position.copy(_mid);
      lineRef.current.quaternion.setFromUnitVectors(_up, _dir.normalize());
      lineRef.current.scale.set(1, len, 1);
    }

    if (rippleRef.current) {
      const wave = (t * 0.5) % 1;
      rippleRef.current.scale.setScalar(0.4 + wave * 1.6);
      rippleRef.current.position.set(s.x, WATER_LEVEL + 0.02, s.z);
      rippleRef.current.material.opacity = Math.max(0, 0.32 * (1 - wave));
    }
  });

  return (
    <group>
      <group ref={groupRef} visible={visible}>
        <mesh castShadow>
          <sphereGeometry args={[0.09, 12, 10]} />
          <meshStandardMaterial color="#e5484d" roughness={0.55} />
        </mesh>
        <mesh position={[0, -0.07, 0]}>
          <sphereGeometry args={[0.075, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
          <meshStandardMaterial color="#f5f1e8" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.11, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 0.12, 5]} />
          <meshStandardMaterial color="#2a2a30" roughness={0.6} />
        </mesh>
      </group>

      <mesh ref={lineRef} visible={visible}>
        <cylinderGeometry args={[0.006, 0.006, 1, 4]} />
        <meshBasicMaterial color="#d8e4f0" transparent opacity={0.55} depthWrite={false} />
      </mesh>

      <mesh ref={rippleRef} rotation={[-Math.PI / 2, 0, 0]} visible={visible}>
        <ringGeometry args={[0.62, 0.78, 28]} />
        <meshBasicMaterial color="#bfe6ff" transparent opacity={0.3} depthWrite={false} />
      </mesh>
    </group>
  );
}

// سطل + بابِر برای یک نقطه‌ی ماهیگیری
export default function FishingSpot({ index, spot }) {
  const bucketRef = useRef(null);
  const bucketY = getWalkSurfaceY(spot.x + spot.offset[0], spot.z + spot.offset[1]);

  useFrame(({ clock }) => {
    if (!bucketRef.current) return;
    bucketRef.current.position.y = bucketY + Math.sin(clock.elapsedTime * 1.1 + index) * 0.01;
  });

  return (
    <group>
      {BUCKET_URL && (
        <group ref={bucketRef} position={[spot.x + spot.offset[0], bucketY, spot.z + spot.offset[1]]}>
          <Fitted url={BUCKET_URL} height={0.42} rotation={[0, index * 0.9, 0]} />
        </group>
      )}
      <Bobber index={index} spot={spot} />
    </group>
  );
}

export function FishingSpots({ spots }) {
  return (
    <group>
      {spots.map((spot, i) => (
        <FishingSpot key={i} index={i} spot={spot} />
      ))}
    </group>
  );
}
