// ---------------------------------------------------------------------------
// world/Chunk.jsx — رندر محتوای چانک‌ها (Phase 5 + پاس کارایی ۵.۱)
//
//  • محتوا از چانک‌های فعال می‌آید (استریمینگ)، ولی برای کم‌کردن draw call
//    همه‌ی چانک‌های فعال در یک مجموعه InstancedMesh تجمیع می‌شوند و با تغییر
//    مجموعه‌ی چانک‌ها بازسازی می‌شوند (به‌جای یک مش به‌ازای هر چانک).
//  • تک‌مدل درخت: همه‌ی LODها از PineTrees.glb می‌آیند.
//      LOD0: ۰..۴۰   — کامل، با تینت برگ
//      LOD1: ۴۰..۸۰  — همان مدل، بدون تینت
//      LOD2: ۸۰..۱۲۰ — همان مدل، مقیاس ماتریس ساده‌تر
//    همه‌ی لایه‌ها همیشه رندر می‌شوند تا با جابه‌جایی بازیکن «درخت ناپدید»
//    نشود؛ فقط تینت/سایه عوض می‌شود.
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
      const sy = tree.targetHeight / height;
      const s = tree.xzScale;
      dummy.position.set(tree.x - centerX * s, tree.y + baseY * sy, tree.z - centerZ * s);
      dummy.rotation.set(tree.tilt * 0.6, tree.rotation, tree.tilt * 0.4);
      dummy.scale.set(s, sy, s);
      dummy.updateMatrix();
      return dummy.matrix.clone();
    });
  }, [items, height, baseY, centerX, centerZ]);

  const leafColors = useMemo(() => {
    if (!leafTint || !items.length) return null;
    const tint = new THREE.Color();
    return items.map((tree) => {
      const darken = tree.tier === 'canopy' ? -0.04 : tree.tier === 'giant' ? -0.06 : 0.02;
      tint.setHSL(0.28 + tree.tint * 0.07, 0.12 + tree.tint * 0.16, 0.66 + tree.tint * 0.16 + darken);
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

  const split = useMemo(
    () => ({
      lod0: groups.near || [],
      lod1: groups.far || [],
      lod2: groups.far2 || [],
    }),
    [groups]
  );

  return (
    <group name="chunk-trees">
      <TreeParts model={pine} items={split.lod0} castShadow={castShadow} />
      <TreeParts model={pine} items={split.lod1} castShadow={false} />
      <TreeParts model={pine} items={split.lod2} castShadow={false} />
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
