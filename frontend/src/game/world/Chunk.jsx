// ---------------------------------------------------------------------------
// world/Chunk.jsx — رندر جنگل و فلور (Phase 5)
//
//  • کل جنگل در یک مجموعه InstancedMesh تجمیع می‌شود (یک‌بار، بدون استریمینگ)
//    تا هیچ درختی با جابه‌جایی بازیکن ناپدید نشود.
//  • تک‌مدل درخت: همه‌ی درخت‌ها از PineTrees.glb می‌آیند.
//  • سایه‌ها سراسر بازی خاموش‌اند (shadowMap.enabled=false).
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { usePineModel } from '../models/pineParts';
import { modelUrl } from '../assetManifest';
import { getGroundHeight } from '../terrain';
import { useMergedModel } from './chunkModel';

// ظرفیت را در پله‌های ثابت گرد می‌کند تا با هر تغییر کوچک مجموعه‌ی چانک،
// InstancedMesh از نو ساخته نشود (فقط count و ماتریس‌ها درجا آپدیت می‌شوند).
function capacityFor(len, bucket = 256) {
  return Math.max(1, Math.ceil(len / bucket) * bucket);
}

// ---------------------------------------------------------------------------
// درختان
// ---------------------------------------------------------------------------
function TreeParts({ model, items, castShadow, leafTint = true }) {
  const refs = useRef([]);
  const { parts, height, baseY, centerX, centerZ } = model;
  const capacity = useMemo(() => capacityFor(items.length), [items.length]);

  const matrices = useMemo(() => {
    if (!items.length) return [];
    const dummy = new THREE.Object3D();
    return items.map((tree) => {
      // مقیاس یکنواخت: ارتفاع از targetHeight و عرض با widthMul (±۱۵٪).
      // قبلاً x/z مقیاس مستقل داشتند و درخت‌های بلند «میله‌ی نازک» می‌شدند.
      const s = (tree.targetHeight / height) * (tree.widthMul ?? tree.xzScale ?? 1);
      dummy.position.set(tree.x - centerX * s, tree.y + baseY * s, tree.z - centerZ * s);
      dummy.rotation.set(tree.tilt * 0.6, tree.rotation, tree.tilt * 0.4);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      return dummy.matrix.clone();
    });
  }, [items, height, baseY, centerX, centerZ]);

  const leafColors = useMemo(() => {
    if (!leafTint || !items.length) return null;
    const tint = new THREE.Color();
    return items.map((tree) => {
      const darken = tree.tier === 'canopy' ? -0.03 : tree.tier === 'giant' ? -0.045 : 0.015;
      tint.setHSL(0.28 + tree.tint * 0.07, 0.2 + tree.tint * 0.18, 0.74 + tree.tint * 0.14 + darken);
      return tint.clone();
    });
  }, [items, leafTint]);

  useEffect(() => {
    const combined = new THREE.Matrix4();
    refs.current.forEach((mesh, index) => {
      if (!mesh) return;
      mesh.count = matrices.length;
      const offset = parts[index].matrix;
      matrices.forEach((matrix, i) => {
        combined.multiplyMatrices(matrix, offset);
        mesh.setMatrixAt(i, combined);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (leafColors && index === parts.length - 1) {
        leafColors.forEach((color, i) => mesh.setColorAt(i, color));
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
      mesh.computeBoundingSphere();
    });
  }, [matrices, leafColors, parts]);

  if (!parts.length) return null;

  return (
    <group>
      {parts.map((part, index) => (
        <instancedMesh
          key={index}
          ref={(node) => {
            refs.current[index] = node;
            if (node) node.count = 0;
          }}
          args={[part.geometry, part.material, capacity]}
          castShadow={castShadow}
          receiveShadow
          frustumCulled
          dispose={null}
        />
      ))}
    </group>
  );
}

/**
 * درختان همه‌ی چانک‌های فعال در یک مجموعه InstancedMesh تجمیع‌شده.
 * همه‌ی لایه‌ها از یک مدل (PineTrees.glb) می‌آیند.
 * @param {{near:Array, far:Array, far2?:Array}} groups
 */
export function ChunkTrees({ groups, castShadow = false }) {
  const pine = usePineModel(modelUrl('trees.pine'));

  // LOD بیلبورد/لایه‌ی سوم غیرفعال شد — در فاصله‌ی دور به «خط نازک» تبدیل
  // می‌شد. همه‌ی درخت‌های دور در همان لایه‌ی میانی رندر می‌شوند.
  const split = useMemo(
    () => ({
      lod0: groups.near || [],
      lod1: groups.far || [],
      lod2: [],
    }),
    [groups]
  );

  return (
    <group name="chunk-trees">
      {split.lod0.length > 0 && (
        <TreeParts model={pine} items={split.lod0} castShadow={castShadow} />
      )}
      {split.lod1.length > 0 && <TreeParts model={pine} items={split.lod1} castShadow={false} />}
    </group>
  );
}

// ---------------------------------------------------------------------------
// فلور: چمن / گل / سنگ / قارچ (تجمیع‌شده روی همه‌ی چانک‌های فعال)
// ---------------------------------------------------------------------------
function FloraInstances({ url, items, targetHeight, castShadow = false }) {
  const refs = useRef([]);
  const { parts, height, baseY, centerX, centerZ } = useMergedModel(url);
  const capacity = useMemo(() => capacityFor(items.length), [items.length]);

  const matrices = useMemo(() => {
    if (!items.length) return [];
    const scale = targetHeight / height;
    const dummy = new THREE.Object3D();
    return items.map((item) => {
      const s = (item.scale ?? 1) * scale;
      const gy = getGroundHeight(item.x, item.z);
      dummy.position.set(item.x - centerX * s, gy + baseY * s, item.z - centerZ * s);
      dummy.rotation.set(0, item.rotation || 0, 0);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      return dummy.matrix.clone();
    });
  }, [items, height, baseY, centerX, centerZ, targetHeight]);

  useEffect(() => {
    refs.current.forEach((mesh) => {
      if (!mesh) return;
      mesh.count = matrices.length;
      matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
  }, [matrices]);

  if (!parts.length) return null;

  return (
    <group>
      {parts.map((part, i) => (
        <instancedMesh
          key={i}
          ref={(node) => {
            refs.current[i] = node;
            if (node) node.count = 0;
          }}
          args={[part.geometry, part.material, capacity]}
          castShadow={castShadow}
          receiveShadow={false}
          frustumCulled
          dispose={null}
        />
      ))}
    </group>
  );
}

/**
 * @param {{grass:Array, flowers:Array, rocks:Array, mushrooms:Array}} flora
 */
export function ChunkFlora({ flora }) {
  return (
    <group name="chunk-flora">
      <FloraInstances url={modelUrl('undergrowth.grass')} items={flora.grass || []} targetHeight={0.55} />
      <FloraInstances url={modelUrl('undergrowth.flowers')} items={flora.flowers || []} targetHeight={0.42} />
      <FloraInstances url={modelUrl('rocks.rocksOpt')} items={flora.rocks || []} targetHeight={0.7} />
      <FloraInstances url={modelUrl('undergrowth.mushrooms')} items={flora.mushrooms || []} targetHeight={0.3} />
    </group>
  );
}
