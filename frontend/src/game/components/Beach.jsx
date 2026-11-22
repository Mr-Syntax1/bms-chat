import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  PALMS,
  BEACH_SHELLS,
  ROCK_PATH,
  DOCK,
  LIGHTHOUSE,
  BOATS,
  WATER_START_X,
} from '../sceneLayout';
import InstancedGLB from '../models/InstancedGLB';
import {
  PortModel,
  BoatModel,
  RowboatModel,
  LighthouseModel,
} from '../models/props';

// نخل‌ها بر اساس نوع مدل گروه‌بندی می‌شوند (هر گروه یک InstancedMesh)
const PALM_URLS = [
  '/game-models/beach/trees/PalmTree.glb',
  '/game-models/beach/trees/PalmTree2.glb',
  '/game-models/beach/trees/CoconutPalmTree.glb',
];
const PALM_TARGET_HEIGHT = [7, 9, 12];

function Palms() {
  const groups = useMemo(() => {
    const byVariant = [[], [], []];
    PALMS.forEach((palm) => byVariant[palm.variant % 3].push(palm));
    return byVariant;
  }, []);

  return (
    <group>
      {groups.map((items, i) => (
        <InstancedGLB
          key={i}
          url={PALM_URLS[i]}
          items={items}
          targetHeight={PALM_TARGET_HEIGHT[i]}
        />
      ))}
    </group>
  );
}

// صدف/ستاره/صدف دوکفه‌ای روی شن
const SHELL_URLS = [
  '/game-models/beach/ClambyPoly.glb',
  '/game-models/beach/SeashellbyPoly.glb',
  '/game-models/beach/StarfishbyPoly.glb',
];

function BeachShells() {
  const groups = useMemo(() => {
    const byVariant = [[], [], []];
    BEACH_SHELLS.forEach((shell) => byVariant[shell.variant % 3].push(shell));
    return byVariant;
  }, []);

  return (
    <group>
      {groups.map((items, i) => (
        <InstancedGLB key={i} url={SHELL_URLS[i]} items={items} targetHeight={0.28} y={0.02} />
      ))}
    </group>
  );
}

// مسیر سنگی از کمپ تا اسکله
function RockPath() {
  return (
    <InstancedGLB
      url="/game-models/beach/RockPathRoundSmall.glb"
      items={ROCK_PATH}
      targetHeight={0.12}
      y={0.01}
      castShadow={false}
    />
  );
}

// اسکله‌ی چوبی: مدل Port + تخته‌های اضافی
// تخته‌ها نزدیک سطح زمین‌اند تا بازیکن (y=0) روی آن‌ها بایستد نه زیرشان
const DECK_Y = 0.07;

function Dock() {
  const planks = useMemo(() => {
    const list = [];
    for (let i = 0; i < DOCK.length; i += 1) {
      list.push({ x: DOCK.x + i - 2, z: DOCK.z });
    }
    return list;
  }, []);

  return (
    <group>
      <group position={[DOCK.x + 4, 0.1, DOCK.z]} rotation={[0, Math.PI / 2, 0]}>
        <PortModel scale={1.6} />
      </group>
      {planks.map((p, i) => (
        <mesh key={i} position={[p.x, DECK_Y, p.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow castShadow>
          <boxGeometry args={[0.92, DOCK.width, 0.14]} />
          <meshStandardMaterial color="#6b5136" roughness={0.92} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[DOCK.x + DOCK.length - 3, -0.35, DOCK.z + side * DOCK.width * 0.42]}
          castShadow
        >
          <cylinderGeometry args={[0.15, 0.15, 1.4, 8]} />
          <meshStandardMaterial color="#4a3826" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

// فانوس دریایی با نور چشمک‌زن
function Lighthouse() {
  const lightRef = useRef(null);

  useFrame(({ clock }) => {
    if (!lightRef.current) return;
    const pulse = Math.pow(Math.max(0, Math.sin(clock.elapsedTime * 1.4)), 8);
    lightRef.current.intensity = 6 + pulse * 90;
  });

  return (
    <group position={[LIGHTHOUSE.x, 0, LIGHTHOUSE.z]}>
      <LighthouseModel scale={1.2} />
      <pointLight
        ref={lightRef}
        position={[0, 13, 0]}
        color="#ffe9a8"
        intensity={8}
        distance={80}
        decay={1.4}
      />
    </group>
  );
}

// قایق‌ها کنار اسکله با تکان ملایم روی آب
function Boats() {
  const refs = useRef([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    refs.current.forEach((group, i) => {
      if (!group) return;
      group.position.y = Math.sin(t * 0.9 + i * 1.7) * 0.09;
      group.rotation.z = Math.sin(t * 0.7 + i) * 0.04;
    });
  });

  const Components = [BoatModel, RowboatModel];

  return (
    <group>
      {BOATS.map((boat, i) => {
        const Component = Components[i % Components.length];
        return (
          <group
            key={i}
            ref={(node) => {
              refs.current[i] = node;
            }}
            position={[boat.x, 0, boat.z]}
            rotation={[0, boat.rotation, 0]}
            scale={boat.scale}
          >
            <Component />
          </group>
        );
      })}
    </group>
  );
}

export default function Beach() {
  return (
    <group>
      <Palms />
      <BeachShells />
      <RockPath />
      <Dock />
      <Boats />
      <Lighthouse />
      {/* آب کم‌عمق نزدیک ساحل */}
      <mesh position={[WATER_START_X - 2, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[6, 190]} />
        <meshStandardMaterial color="#3fa8a0" transparent opacity={0.45} roughness={0.3} />
      </mesh>
    </group>
  );
}