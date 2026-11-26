// ---------------------------------------------------------------------------
// Bugs.jsx — حشرات رویه‌ای (پروانه/سوسک/کرم شب‌تاب) با InstancedMesh.
//
//  • هیچ GLB نداریم؛ هندسه‌ها procedural هستند.
//  • AI ساده با sine/random است و فقط ۱۲ بار در ثانیه آپدیت می‌شود.
//  • موقعیت زنده در bugWorld.pos نوشته می‌شود تا «گرفتن با F» دقیق باشد.
// ---------------------------------------------------------------------------
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeBufferGeometries } from 'three-stdlib';
import { getGroundHeight } from '../terrain';
import { useQualityPreset } from '../stores/useSettingsStore';
import { getBugList, bugWorld } from '../bugData';

const AI_STEP = 1 / 12; // ۱۲ هرتز

function wingGeometry() {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    'position',
    new THREE.BufferAttribute(
      new Float32Array([
        0, 0, 0, 0.16, 0.1, 0, 0.03, 0.2, 0,
        0, 0, 0, -0.16, 0.1, 0, -0.03, 0.2, 0,
      ]),
      3
    )
  );
  geo.computeVertexNormals();
  // بدن کوچک زیر بال‌ها
  let body = new THREE.CylinderGeometry(0.018, 0.026, 0.16, 5);
  body.rotateX(Math.PI / 2);
  body.translate(0, 0.08, 0);
  body = body.toNonIndexed();
  body.deleteAttribute('uv');
  return mergeBufferGeometries([geo, body], false);
}

function beetleGeometry() {
  const parts = [];
  const body = new THREE.SphereGeometry(0.1, 8, 6);
  body.scale(1, 0.72, 1.3);
  body.translate(0, 0.08, 0);
  parts.push(body);

  for (let i = 0; i < 3; i += 1) {
    for (const side of [-1, 1]) {
      const leg = new THREE.CylinderGeometry(0.012, 0.01, 0.16, 4);
      const m = new THREE.Matrix4()
        .makeRotationZ(side * 1.1)
        .premultiply(new THREE.Matrix4().makeTranslation(side * 0.11, 0.06, -0.08 + i * 0.08));
      leg.applyMatrix4(m);
      parts.push(leg);
    }
  }
  return mergeBufferGeometries(parts, false);
}

function fireflyGeometry() {
  const geo = new THREE.SphereGeometry(0.055, 8, 6);
  geo.translate(0, 0, 0);
  return geo;
}

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

function TypeMesh({ type, list, indices, geometry, extra }) {
  const meshRef = useRef(null);

  // رنگ هر instance یک‌بار قبل از اولین فریم ست می‌شود (program با instanceColor کامپایل شود)
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    indices.forEach((idx, i) => mesh.setColorAt(i, _color.set(list[idx].color)));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    // shader باید با USE_INSTANCING_COLOR دوباره کامپایل شود
    if (mesh.material) mesh.material.needsUpdate = true;
  }, [indices, list]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const t = clock.elapsedTime;
    for (let i = 0; i < indices.length; i += 1) {
      const idx = indices[i];
      const bug = list[idx];
      if (bugWorld.caught[idx]) {
        _dummy.position.set(0, -999, 0);
        _dummy.scale.setScalar(0.0001);
        _dummy.rotation.set(0, 0, 0);
        _dummy.updateMatrix();
        mesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }
      const pos = bugWorld.pos;
      const x = pos[idx * 3];
      const z = pos[idx * 3 + 2];
      const ground = getGroundHeight(x, z);
      let y = ground + bug.y;
      let rotZ = 0;
      let yaw;

      if (type === 'butterfly') {
        y += Math.sin(t * 3 + bug.phase) * 0.18;
        rotZ = Math.sin(t * 14 + bug.phase) * 0.7;
        yaw = Math.atan2(
          Math.cos(t * bug.speed + bug.phase) * bug.radius,
          Math.sin(t * bug.speed * 0.8 + bug.phase) * bug.radius
        );
      } else if (type === 'beetle') {
        y = ground + 0.05;
        yaw = t * 0.8 + bug.phase;
      } else {
        y += Math.sin(t * 1.6 + bug.phase) * 0.45;
        yaw = t * 0.5 + bug.phase;
      }

      _dummy.position.set(x, y, z);
      _dummy.rotation.set(0, yaw, rotZ);
      _dummy.scale.setScalar(bug.scale);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (!indices.length) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, indices.length]}
      frustumCulled={false}
      castShadow={type === 'beetle'}
    >
      <meshStandardMaterial
        roughness={0.7}
        metalness={0}
        side={type === 'butterfly' ? THREE.DoubleSide : THREE.FrontSide}
        emissive={extra?.emissive || '#000000'}
        emissiveIntensity={extra?.emissiveIntensity || 0}
        transparent={Boolean(extra?.transparent)}
        opacity={extra?.opacity ?? 1}
      />
    </instancedMesh>
  );
}

export default function Bugs() {
  const preset = useQualityPreset();
  const tier = preset.treeDensity > 700 ? 'high' : preset.treeDensity > 500 ? 'medium' : 'low';
  const list = useMemo(() => getBugList(tier), [tier]);

  const groups = useMemo(() => {
    const butterflies = [];
    const beetles = [];
    const fireflies = [];
    list.forEach((b, i) => {
      if (b.type === 'butterfly') butterflies.push(i);
      else if (b.type === 'beetle') beetles.push(i);
      else fireflies.push(i);
    });
    return { butterflies, beetles, fireflies };
  }, [list]);

  const wingGeo = useMemo(() => wingGeometry(), []);
  const beetleGeo = useMemo(() => beetleGeometry(), []);
  const fireflyGeo = useMemo(() => fireflyGeometry(), []);

  // حرکت آرام wandering: موقعیت زنده را ۱۲ هرتز در bugWorld.pos می‌نویسیم
  const aiTime = useRef(0);
  useFrame(({ clock }, delta) => {
    aiTime.current += Math.min(delta, 0.05);
    if (aiTime.current < AI_STEP) return;
    aiTime.current = 0;
    const t = clock.elapsedTime;
    const pos = bugWorld.pos;
    for (let i = 0; i < list.length; i += 1) {
      if (bugWorld.caught[i]) continue;
      const bug = list[i];
      const wobbleX = Math.sin(t * bug.speed + bug.phase) * bug.radius;
      const wobbleZ = Math.cos(t * bug.speed * 0.8 + bug.phase) * bug.radius;
      pos[i * 3] = bug.x + wobbleX;
      pos[i * 3 + 1] = bug.y;
      pos[i * 3 + 2] = bug.z + wobbleZ;
    }
  });

  if (!list.length) return null;

  return (
    <group>
      <TypeMesh
        key={`butterfly-${tier}`}
        type="butterfly"
        list={list}
        indices={groups.butterflies}
        geometry={wingGeo}
        extra={{ transparent: true, opacity: 0.92 }}
      />
      <TypeMesh
        key={`beetle-${tier}`}
        type="beetle"
        list={list}
        indices={groups.beetles}
        geometry={beetleGeo}
      />
      <TypeMesh
        key={`firefly-${tier}`}
        type="firefly"
        list={list}
        indices={groups.fireflies}
        geometry={fireflyGeo}
        extra={{ emissive: '#ffe07a', emissiveIntensity: 1.4 }}
      />
    </group>
  );
}
