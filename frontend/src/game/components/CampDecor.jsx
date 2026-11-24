import { useEffect, useRef } from 'react';
import { CAMP_RADIUS, REST_SPOTS } from '../sceneLayout';
import InstancedGLB from '../models/InstancedGLB';
import Fitted from '../models/Fitted';
import { modelUrl } from '../assetManifest';
import { registerInteractable, registerRestSpot } from '../interactionRegistry';
import {
  PicnicTableModel,
  BackpackModel,
  GuitarPropModel,
  MarshmallowsModel,
} from '../models/props';

// تولید موقعیت ثابت پراکنده در نیمه‌ی غربی/کمپ
function scatter(seed, count, minR, maxR, maxX = 28) {
  let a = seed >>> 0;
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const list = [];
  let guard = 0;
  while (list.length < count && guard < count * 40) {
    guard += 1;
    const angle = rand() * Math.PI * 2;
    const radius = minR + rand() * (maxR - minR);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (x > maxX) continue;
    if (Math.hypot(x, z) < CAMP_RADIUS - 1) continue;
    if (list.some((it) => Math.hypot(it.x - x, it.z - z) < 2.6)) continue;
    list.push({ x, z, scale: 0.85 + rand() * 0.5, rotation: rand() * Math.PI * 2 });
  }
  return list;
}

const BUSHES = scatter(1001, 60, 6, 60);
const FLOWERS = scatter(2002, 80, 5, 55);
const MUSHROOMS = scatter(3003, 45, 8, 55);
const ROCKS2 = scatter(4004, 50, 6, 60);

// لوازم کمپ: میز پیک‌نیک، کوله، گیتار، مارشمالو، چادرهای اضافه، فانوس آویزان
function CampProps() {
  return (
    <group>
      <group position={[-6.2, 0, 6.4]} rotation={[0, 0.5, 0]}>
        <PicnicTableModel scale={1.15} />
      </group>
      {/* میز پیک‌نیک دوم کنار چادرها */}
      <group position={[-13.4, 0, -2.2]} rotation={[0, -1.35, 0]}>
        <Fitted url={modelUrl('structures.picnicTable2')} height={0.95} />
      </group>
      <group position={[3.4, 0.1, 5.2]} rotation={[0, -0.9, 0]}>
        <BackpackModel scale={0.55} />
      </group>
      <group position={[1.9, 0.35, -3.6]} rotation={[0, 0.3, 0.15]}>
        <GuitarPropModel scale={1.1} />
      </group>
      <group position={[-2.6, 0.2, 3.2]} rotation={[0, 1.1, 0]}>
        <MarshmallowsModel scale={0.7} />
      </group>

      {/* چادرها: Tent2/Tent3 در واحدهای بسیار بزرگ ذخیره شده‌اند؛ Fitted نرمال می‌کند */}
      <group position={[8.5, 0, -8.2]} rotation={[0, 1.6, 0]}>
        <Fitted url={modelUrl('structures.tent2')} height={2.4} />
      </group>
      <group position={[-9.5, 0, 10.5]} rotation={[0, -0.4, 0]}>
        <Fitted url={modelUrl('structures.tent3')} height={2.6} />
      </group>

      {/* فانوس‌های تزئینی کمپ — Lantern.glb تکراری است، فقط Decorations نسخه‌ی رسمی است */}
      <group position={[-5.1, 1.5, 5.6]}>
        <Fitted url={modelUrl('structures.lantern')} height={0.7} />
        <pointLight color="#ffb84d" intensity={3.2} distance={7} decay={2} />
      </group>
      <group position={[-7.8, 0, 8.9]} rotation={[0, 0.9, 0]}>
        <Fitted url={modelUrl('structures.lantern')} height={1.1} />
        <pointLight color="#ffc46b" intensity={4} distance={8} decay={2} />
      </group>
    </group>
  );
}

// نقاط استراحت: هاموک، کیسه‌خواب، کنده‌های نشیمن — ثبت در interactionRegistry
function RestSpotProps() {
  const groupRefs = useRef({});

  useEffect(() => {
    const unsubs = REST_SPOTS.map((spot) =>
      registerRestSpot({
        key: spot.key,
        label: spot.label,
        x: spot.x,
        z: spot.z,
        seatIndex: spot.seatIndex,
        rest: spot.rest,
        radius: spot.radius,
      })
    );
    const objectUnsubs = REST_SPOTS.map((spot) =>
      registerInteractable(spot.key, groupRefs.current[spot.key])
    );
    return () => {
      unsubs.forEach((fn) => fn());
      objectUnsubs.forEach((fn) => fn());
    };
  }, []);

  const hammock = REST_SPOTS.find((s) => s.key === 'rest-hammock');
  const bedroll = REST_SPOTS.find((s) => s.key === 'rest-bedroll');
  const stumps = REST_SPOTS.filter((s) => s.key.startsWith('rest-stump'));

  return (
    <group>
      {/* هاموک بین دو درخت کمپ */}
      <group
        ref={(el) => {
          groupRefs.current[hammock.key] = el;
        }}
        position={[hammock.x, 0, hammock.z]}
        rotation={[0, hammock.rotation, 0]}
      >
        <mesh position={[-1.25, 1.15, 0]} castShadow>
          <cylinderGeometry args={[0.13, 0.17, 2.3, 8]} />
          <meshStandardMaterial color="#5a4030" roughness={0.95} />
        </mesh>
        <mesh position={[1.25, 1.15, 0]} castShadow>
          <cylinderGeometry args={[0.13, 0.17, 2.3, 8]} />
          <meshStandardMaterial color="#5a4030" roughness={0.95} />
        </mesh>
        <group position={[0, 0.9, 0]}>
          <Fitted url={modelUrl('comfort.hammock')} height={0.7} rotation={[0, Math.PI / 2, 0]} />
        </group>
      </group>

      {/* کیسه‌خواب روی زمین */}
      <group
        ref={(el) => {
          groupRefs.current[bedroll.key] = el;
        }}
        position={[bedroll.x, 0.02, bedroll.z]}
        rotation={[0, bedroll.rotation, 0]}
      >
        <Fitted url={modelUrl('comfort.bedroll')} height={0.18} />
      </group>

      {/* دو کنده‌ی نشیمن */}
      {stumps.map((spot) => (
        <group
          key={spot.key}
          ref={(el) => {
            groupRefs.current[spot.key] = el;
          }}
          position={[spot.x, 0, spot.z]}
          rotation={[0, spot.rotation, 0]}
        >
          <Fitted url={modelUrl('rocks.stump')} height={0.55} />
        </group>
      ))}
    </group>
  );
}

export default function CampDecor() {
  return (
    <group>
      <CampProps />
      <RestSpotProps />

      <InstancedGLB
        url={modelUrl('undergrowth.bush')}
        items={BUSHES}
        targetHeight={1.15}
      />
      <InstancedGLB
        url={modelUrl('undergrowth.flowers')}
        items={FLOWERS}
        targetHeight={0.5}
        castShadow={false}
      />
      <InstancedGLB
        url={modelUrl('undergrowth.mushrooms')}
        items={MUSHROOMS}
        targetHeight={0.35}
        castShadow={false}
      />
      <InstancedGLB
        url={modelUrl('rocks.rocks2')}
        items={ROCKS2}
        targetHeight={0.22}
        y={0.01}
      />
    </group>
  );
}
