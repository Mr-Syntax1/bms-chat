// ---------------------------------------------------------------------------
// world/chunkModel.js — کمک‌های مدل/چیدمان چانک (خارج از کامپوننت‌ها)
// ---------------------------------------------------------------------------
import { useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import '../models/setupDraco';
import { getGroundHeight, getGroundSlope } from '../terrain';

const mergedCache = new Map();

function mergeScene(scene) {
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
    byMaterial.get(key).geos.push(child.geometry.clone().applyMatrix4(child.matrixWorld));
  });

  const parts = [];
  for (const { material, geos } of byMaterial.values()) {
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    if (merged) parts.push({ geometry: merged, material, matrix: new THREE.Matrix4() });
  }

  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  return { parts, height: size.y || 1, baseY: -box.min.y, centerX: center.x, centerZ: center.z };
}

/** مدل ادغام‌شده بر اساس متریال (کش ماژول‌سطح، مشترک بین همه‌ی چانک‌ها). */
export function useMergedModel(url) {
  const { scene } = useGLTF(url);
  return useMemo(() => {
    const hit = mergedCache.get(url);
    if (hit) return hit;
    const data = mergeScene(scene);
    mergedCache.set(url, data);
    return data;
  }, [scene, url]);
}

/** ارتفاع/شیب زمین برای درختان (یک‌بار هنگام تولید داده‌ی رندر). */
export function placeTrees(trees) {
  return trees.map((tree) => ({
    ...tree,
    y: getGroundHeight(tree.x, tree.z),
    tilt: getGroundSlope(tree.x, tree.z) * 0.35,
  }));
}
