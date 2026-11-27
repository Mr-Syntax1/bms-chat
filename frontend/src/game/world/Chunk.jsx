// ---------------------------------------------------------------------------
// world/Chunk.jsx — رندر جنگل و فلور (Phase 5)
//
//  • محتوای هر سلول فضایی (درخت + فلور) یک‌بار در InstancedMesh تجمیع می‌شود و
//    برای همیشه ثابت می‌ماند؛ هیچ چیز با جابه‌جایی بازیکن ناپدید نمی‌شود.
//  • هر سلول InstancedMesh جدا دارد تا frustum culling مستقل کار کند و
//    مثلث‌های سلول‌های پشت دوربین اصلاً رندر نشوند.
//  • تک‌مدل درخت: همه‌ی درخت‌ها از PineTrees.glb می‌آیند.
//  • سایه‌ها سراسر بازی خاموش‌اند (shadowMap.enabled=false).
// ---------------------------------------------------------------------------
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { usePineModel } from '../models/pineParts';
import { modelUrl } from '../assetManifest';
import { getGroundHeight } from '../terrain';
import { useMergedModel } from './chunkModel';

// ظرفیت را در پله‌های ثابت گرد می‌کند تا InstancedMesh با تغییر کوچک
// دوباره ساخته نشود (فقط count و ماتریس‌ها درجا آپدیت می‌شوند).
function capacityFor(len, bucket = 256) {
  return Math.max(1, Math.ceil(len / bucket) * bucket);
}

// مراجع پایدار: بدون این، هر رندر یک ref callback تازه می‌ساخت و React
// مقدار count هر InstancedMesh را صفر می‌کرد → کل درخت‌ها ناپدید می‌شدند.
function useStableRefs(count) {
  const refs = useRef([]);
  const setters = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => (node) => {
        refs.current[i] = node;
      }),
    [count]
  );
  return [refs, setters];
}

// ---------------------------------------------------------------------------
// درختان
// ---------------------------------------------------------------------------
function TreeParts({ model, items, castShadow, leafTint = true }) {
  const { parts, height, baseY, centerX, centerZ } = model;
  const [refs, setters] = useStableRefs(parts.length);
  const capacity = useMemo(() => capacityFor(items.length), [items.length]);

  const matrices = useMemo(() => {
    if (!items.length) return [];
    const dummy = new THREE.Object3D();
    return items.map((tree) => {
      // مقیاس یکنواخت: ارتفاع از targetHeight و عرض با widthMul (±۱۵٪).
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
      const darken = tree.tier === 'canopy' ? -0.04 : tree.tier === 'giant' ? -0.06 : 0.01;
      tint.setHSL(
        0.28 + tree.tint * 0.07,
        0.16 + tree.tint * 0.16,
        0.68 + tree.tint * 0.14 + darken
      );
      return tint.clone();
    });
  }, [items, leafTint]);

  useLayoutEffect(() => {
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
  }, [matrices, leafColors, parts, refs]);

  if (!parts.length) return null;

  return (
    <group>
      {parts.map((part, index) => (
        <instancedMesh
          key={index}
          ref={setters[index]}
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

// ---------------------------------------------------------------------------
// فلور: چمن / گل / سنگ / قارچ
// ---------------------------------------------------------------------------
function FloraInstances({ url, items, targetHeight, castShadow = false }) {
  const { parts, height, baseY, centerX, centerZ } = useMergedModel(url);
  const [refs, setters] = useStableRefs(parts.length);
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

  useLayoutEffect(() => {
    refs.current.forEach((mesh) => {
      if (!mesh) return;
      mesh.count = matrices.length;
      matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
  }, [matrices, refs]);

  if (!parts.length) return null;

  return (
    <group>
      {parts.map((part, i) => (
        <instancedMesh
          key={i}
          ref={setters[i]}
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
 * یک سلول فضایی: درختان و فلور همان ناحیه.
 * @param {{trees:Array, flora:{grass:Array, flowers:Array, rocks:Array, mushrooms:Array}}} cell
 */
export default function ChunkCell({ cell }) {
  const pine = usePineModel(modelUrl('trees.pine'));

  return (
    <group name="chunk-cell">
      {cell.trees.length > 0 && <TreeParts model={pine} items={cell.trees} />}
      <FloraInstances url={modelUrl('undergrowth.grass')} items={cell.flora.grass} targetHeight={0.55} />
      <FloraInstances url={modelUrl('undergrowth.flowers')} items={cell.flora.flowers} targetHeight={0.42} />
      <FloraInstances url={modelUrl('rocks.rocksOpt')} items={cell.flora.rocks} targetHeight={0.7} />
      <FloraInstances url={modelUrl('undergrowth.mushrooms')} items={cell.flora.mushrooms} targetHeight={0.3} />
    </group>
  );
}
