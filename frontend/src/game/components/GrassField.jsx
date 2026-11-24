import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import '../models/setupDraco';
import { CAMP_RADIUS, SAND_START_X, VAN, SPAWN, FIRE_KEEPOUT } from '../sceneLayout';
import { getGroundHeight, getGroundSlope, WATER_LEVEL } from '../terrain';
import { useQualityPreset } from '../stores/useSettingsStore';
import { modelUrl } from '../assetManifest';

// مولد عدد با seed ثابت
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// تعداد بوته بر اساس کیفیت — همیشه GLB، هیچ تیغه‌ی رویه‌ای
const COUNT_BY_QUALITY = { low: 700, medium: 1200, high: 2000 };
const TARGET_HEIGHT = 0.5;
const GRASS_URL = modelUrl('undergrowth.grass');

// ۱۴۷ زیرمش مدل بر اساس متریال ادغام می‌شوند → ۳ InstancedMesh
function useMergedGrass() {
  const { scene } = useGLTF(GRASS_URL);

  return useMemo(() => {
    scene.updateWorldMatrix(true, true);

    const byMaterial = new Map();
    const box = new THREE.Box3();
    const tmp = new THREE.Box3();

    scene.traverse((child) => {
      if (!child.isMesh || !child.geometry) return;
      child.geometry.computeBoundingBox();
      tmp.copy(child.geometry.boundingBox).applyMatrix4(child.matrixWorld);
      box.union(tmp);

      const key = child.material?.uuid ?? 'default';
      if (!byMaterial.has(key)) byMaterial.set(key, { material: child.material, geos: [] });
      // ترانسفورم گره در هندسه اعمال می‌شود، وگرنه ۱۴۷ زیرمش روی هم می‌افتند
      byMaterial.get(key).geos.push(child.geometry.clone().applyMatrix4(child.matrixWorld));
    });

    const groups = [];
    for (const { material, geos } of byMaterial.values()) {
      const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
      if (merged) groups.push({ geometry: merged, material });
    }

    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    return { groups, height: size.y || 0.295, baseY: -box.min.y, centerX: center.x, centerZ: center.z };
  }, [scene]);
}

/**
 * بوته‌های جنگل از GLB واقعی (grassyellowing.glb) — instanced.
 * موقعیت Y از getGroundHeight؛ چگالی از preset.
 */
export default function GrassField() {
  const preset = useQualityPreset();
  const { groups, height, baseY, centerX, centerZ } = useMergedGrass();
  const refs = useRef([]);

  const count = COUNT_BY_QUALITY[
    preset.grassDensity > 0.8 ? 'high' : preset.grassDensity > 0.45 ? 'medium' : 'low'
  ];

  const matrices = useMemo(() => {
    const rand = mulberry32(918273);
    const dummy = new THREE.Object3D();
    const list = [];
    const scale = TARGET_HEIGHT / height;
    let guard = 0;

    while (list.length < count && guard < count * 12) {
      guard += 1;
      const x = -92 + rand() * 118; // فقط سمت جنگل (x < 26)
      const z = -92 + rand() * 184;

      // کمپ مرکزی، ون، نقطه‌ی اسپاون و گودال آتش بدون بوته
      if (Math.hypot(x, z) < CAMP_RADIUS - 2) continue;
      if (Math.hypot(x - VAN.x, z - VAN.z) < 4.4) continue;
      if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 2.6) continue;
      if (Math.hypot(x, z) < FIRE_KEEPOUT + 2) continue;
      // مسیر باز کمپ→اسکله
      if (Math.abs(z) < 3.2 && x > 6 && x < SAND_START_X) continue;

      // روی آب و شن و شیب تند بوته نمی‌روید
      const gy = getGroundHeight(x, z);
      if (gy < WATER_LEVEL + 0.4) continue;
      if (x > SAND_START_X - 2) continue;
      if (getGroundSlope(x, z) > 0.4) continue;

      const s = scale * (0.7 + rand() * 0.9);
      dummy.position.set(x - centerX * s, gy + 0.01 + baseY * s, z - centerZ * s);
      dummy.rotation.set(0, rand() * Math.PI * 2, 0);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      list.push(dummy.matrix.clone());
    }
    return list;
  }, [count, height, baseY, centerX, centerZ]);

  useEffect(() => {
    refs.current.forEach((mesh) => {
      if (!mesh) return;
      matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
  }, [matrices]);

  if (!groups.length || !matrices.length) return null;

  return (
    <group name={`grass-${matrices.length}`}>
      {groups.map((group, index) => (
        <instancedMesh
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          args={[group.geometry, group.material, matrices.length]}
          receiveShadow={false}
          castShadow={false}
          frustumCulled
        />
      ))}
    </group>
  );
}
