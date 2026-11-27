// ---------------------------------------------------------------------------
// world/Chunk.jsx — رندر محتوای چانک‌ها (Phase 5)
//
//  • محتوا از چانک‌های فعال می‌آید (استریمینگ)، ولی برای کم‌کردن draw call
//    همه‌ی چانک‌های فعال در یک مجموعه InstancedMesh تجمیع می‌شوند و با تغییر
//    مجموعه‌ی چانک‌ها بازسازی می‌شوند (به‌جای یک مش به‌ازای هر چانک).
//  • LOD درختان: نزدیک = Pine/Pine2 کامل، دور = تک‌مدل سبک opt-Pine بدون سایه.
//  • NEVER BirchTrees — فقط Pine / Pine2 / opt-Pine.
//  • هندسه/متریال مدل‌ها بین همه‌ی چانک‌ها مشترک و کش‌شده است.
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
 * @param {{near:Array, far:Array}} groups  (near: Pine/Pine2، far: opt-Pine سبک)
 */
export function ChunkTrees({ groups, castShadow = true }) {
  const pine = usePineModel(modelUrl('trees.pineOpt'));
  const pine2 = usePineModel(modelUrl('trees.pine2'));

  const split = useMemo(() => {
    const a = [];
    const b = [];
    (groups.near || []).forEach((t) => (t.variant === 1 ? b : a).push(t));
    return { a, b, far: groups.far || [] };
  }, [groups]);

  return (
    <group name="chunk-trees">
      <TreeParts model={pine} items={split.a} castShadow={castShadow} />
      <TreeParts model={pine2} items={split.b} castShadow={castShadow} />
      <TreeParts model={pine} items={split.far} castShadow={false} leafTint={false} />
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
      <FloraInstances url={modelUrl('undergrowth.grass')} items={flora.grass || []} targetHeight={0.5} />
      <FloraInstances url={modelUrl('undergrowth.flowers')} items={flora.flowers || []} targetHeight={0.42} />
      <FloraInstances url={modelUrl('rocks.rocksOpt')} items={flora.rocks || []} targetHeight={0.7} castShadow />
      <FloraInstances url={modelUrl('undergrowth.mushrooms')} items={flora.mushrooms || []} targetHeight={0.3} />
    </group>
  );
}

// ارتفاع/شیب زمین برای درختان (یک‌بار هنگام تولید داده‌ی رندر)
