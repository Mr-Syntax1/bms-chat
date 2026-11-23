import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { buildTrees } from '../sceneLayout';
import { usePineModel } from '../models/pineParts';
import { useQualityPreset } from '../stores/useSettingsStore';
import { setActiveTrees } from '../activeTrees';
import { modelUrl } from '../assetManifest';
import { getGroundHeight, getGroundSlope } from '../terrain';

// فاصله‌ای که بعد از آن درخت با سیلوئت ارزان رندر می‌شود (بر اساس کیفیت)
// GLB کامل فقط نزدیک بازیکن؛ بقیه سیلوئت — بودجه‌ی مثلث را چند برابر کم می‌کند
const LOD_DISTANCE_BY_QUALITY = { low: 22, medium: 30, high: 38 };

// سه گونه درخت: opt/Pine + trees/Pine2 + trees/Pine (کلید manifest)
const URLS = [
  modelUrl('trees.pineOpt'),
  modelUrl('trees.pine2'),
  modelUrl('trees.pine'),
];

/**
 * جنگل چندلایه:
 *  - هر درخت ارتفاع هدف مستقل دارد (understory/mid/canopy/giant)
 *  - لایه‌ی دور: سیلوئت دو-مخروطی ارزان
 *  - حلقه‌ی backdrop: درختان بسیار بلند در افق که فقط سیلوئت‌اند
 * همه با InstancedMesh و چیدمان seed ثابت.
 */
export default function Forest() {
  const preset = useQualityPreset();
  const pineOpt = usePineModel(URLS[0]);
  const pine2 = usePineModel(URLS[1]);
  const pine = usePineModel(URLS[2]);

  const models = useMemo(() => [pineOpt, pine2, pine], [pineOpt, pine2, pine]);

  const lodDistance = LOD_DISTANCE_BY_QUALITY[preset.treeDensity > 700 ? 'high' : preset.treeDensity > 500 ? 'medium' : 'low'];

  // چگالی درختان بر اساس کیفیت — seed ثابت، پس چیدمان پایدار است
  const trees = useMemo(() => buildTrees(preset.treeDensity), [preset.treeDensity]);

  // برخورد بازیکن باید فقط با درختان واقعاً رندرشده باشد
  useEffect(() => {
    setActiveTrees(trees);
  }, [trees]);

  // غنی‌سازی هر درخت با ارتفاع زمین
  const placed = useMemo(() => {
    return trees.map((tree) => {
      const groundY = getGroundHeight(tree.x, tree.z);
      // درختان روی شیب تند کمی کج می‌شوند (طبیعی‌تر)
      const tilt = getGroundSlope(tree.x, tree.z) * 0.35;
      return { ...tree, y: groundY, tilt };
    });
  }, [trees]);

  const byVariant = useMemo(() => {
    const groups = [[], [], []];
    placed.forEach((t) => groups[t.variant].push(t));
    return groups;
  }, [placed]);

  // LOD فضایی: درختان دورتر از آستانه با سیلوئت کم‌پالی‌گان رندر می‌شوند
  const { nearGroups, farTrees } = useMemo(() => {
    const near = [[], [], []];
    const far = [];
    for (let v = 0; v < 3; v += 1) {
      for (const t of byVariant[v]) {
        // درختان غول‌پیکر همیشه GLB کامل می‌گیرند (سیلوئت آن‌ها دیده می‌شود)
        if (t.tier !== 'giant' && Math.hypot(t.x, t.z) > lodDistance) far.push(t);
        else near[v].push(t);
      }
    }
    return { nearGroups: near, farTrees: far };
  }, [byVariant, lodDistance]);

  return (
    <group>
      <TreeSet model={models[0]} trees={nearGroups[0]} />
      <TreeSet model={models[1]} trees={nearGroups[1]} />
      <TreeSet model={models[2]} trees={nearGroups[2]} />
      <FarTreeSet trees={farTrees} />
    </group>
  );
}

function TreeSet({ model, trees }) {
  const refs = useRef([]);
  const { parts, height, baseY, centerX, centerZ } = model;

  const matrices = useMemo(() => {
    if (!trees.length) return [];
    const dummy = new THREE.Object3D();
    return trees.map((tree) => {
      // ارتفاع هدف مستقیماً به مقیاس عمودی تبدیل می‌شود
      const sy = tree.targetHeight / height;
      // XZ باریک‌تر از ارتفاع — سرو/کاج بلند
      const s = tree.xzScale;
      // نرمال‌سازی XZ تا تنه‌ی درخت دقیقاً روی نقطه‌ی تولیدشده بایستد
      dummy.position.set(tree.x - centerX * s, tree.y + baseY * sy, tree.z - centerZ * s);
      dummy.rotation.set(tree.tilt * 0.6, tree.rotation, tree.tilt * 0.4);
      dummy.scale.set(s, sy, s);
      dummy.updateMatrix();
      return dummy.matrix.clone();
    });
  }, [trees, height, baseY, centerX, centerZ]);

  const leafColors = useMemo(() => {
    if (!trees.length) return [];
    const tint = new THREE.Color();
    return trees.map((tree) => {
      // درختان دورتر تیره‌تر و سردتر (عمق اتمسفری)
      const darken = tree.tier === 'canopy' ? -0.04 : tree.tier === 'giant' ? -0.06 : 0.02;
      tint.setHSL(
        0.28 + tree.tint * 0.07,
        0.12 + tree.tint * 0.16,
        0.66 + tree.tint * 0.16 + darken
      );
      return tint.clone();
    });
  }, [trees]);

  useEffect(() => {
    const combined = new THREE.Matrix4();
    refs.current.forEach((mesh, index) => {
      if (!mesh) return;
      const offset = parts[index].matrix;
      matrices.forEach((matrix, i) => {
        combined.multiplyMatrices(matrix, offset);
        mesh.setMatrixAt(i, combined);
      });
      mesh.instanceMatrix.needsUpdate = true;

      if (index === parts.length - 1) {
        leafColors.forEach((color, i) => mesh.setColorAt(i, color));
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
      mesh.computeBoundingSphere();
    });
  }, [matrices, leafColors, parts]);

  if (!parts.length || !matrices.length) return null;

  return (
    <group name={`trees-near-${trees.length}`}>
      {parts.map((part, index) => (
        <instancedMesh
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          args={[part.geometry, part.material, matrices.length]}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// FarTreeSet: درختان دور با دو مخروط ساده (تنه + تاج) — یک draw call
// ---------------------------------------------------------------------------
function FarTreeSet({ trees }) {
  const trunkRef = useRef(null);
  const crownRef = useRef(null);

  const trunkGeo = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.09, 0.14, 0.42, 5, 1);
    geo.translate(0, 0.21, 0);
    return geo;
  }, []);

  const crownGeo = useMemo(() => {
    const geo = new THREE.ConeGeometry(0.52, 1, 5, 1);
    geo.translate(0, 0.5, 0);
    return geo;
  }, []);

  useEffect(() => {
    const trunk = trunkRef.current;
    const crown = crownRef.current;
    if (!trunk || !crown || !trees.length) return;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    trees.forEach((t, i) => {
      // سیلوئت از همان ارتفاع هدف درخت ساخته می‌شود.
      // تنه از ۰ تا ۰.۳۴H و تاج از ۰.۳۰H تا ۱.۰۰H — بدون شکاف هوایی.
      const H = t.targetHeight;
      const trunkSY = 0.81 * H; // 0.42 * 0.81H = 0.34H
      const trunkSXZ = 0.35 * H;
      const crownSY = 0.7 * H;
      const crownSXZ = 0.42 * H; // شعاع = 0.52 * 0.42H ≈ 0.22H

      // تنه
      dummy.position.set(t.x, t.y, t.z);
      dummy.rotation.set(0, t.rotation, 0);
      dummy.scale.set(trunkSXZ, trunkSY, trunkSXZ);
      dummy.updateMatrix();
      trunk.setMatrixAt(i, dummy.matrix);

      // تاج
      dummy.position.set(t.x, t.y + 0.3 * H, t.z);
      dummy.scale.set(crownSXZ, crownSY, crownSXZ);
      dummy.updateMatrix();
      crown.setMatrixAt(i, dummy.matrix);

      color.setHSL(0.29 + t.tint * 0.06, 0.16 + t.tint * 0.12, 0.3 + t.tint * 0.12);
      crown.setColorAt(i, color);
    });

    trunk.instanceMatrix.needsUpdate = true;
    crown.instanceMatrix.needsUpdate = true;
    if (crown.instanceColor) crown.instanceColor.needsUpdate = true;
    trunk.computeBoundingSphere();
    crown.computeBoundingSphere();
  }, [trees]);

  if (!trees.length) return null;

  return (
    <group name={`far-trees-${trees.length}`}>
      <instancedMesh ref={trunkRef} args={[trunkGeo, undefined, trees.length]} frustumCulled>
        <meshStandardMaterial color="#4a3a2c" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={crownRef} args={[crownGeo, undefined, trees.length]} frustumCulled>
        <meshStandardMaterial roughness={1} />
      </instancedMesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// حلقه‌ی backdrop: غیرفعال شد.
// دلیل: ۱۷۱ از ۲۲۰ مخروط بیرون از صفحه‌ی ۲۰۰×۲۰۰ زمین قرار می‌گرفتند و پایه‌شان
// روی ارتفاع نامعتبر می‌نشست → دیوار/مخروط شناور در آسمان.
// (نسخه‌ی قبلی برای مرجع در git باقی است)
// ---------------------------------------------------------------------------
export function BackdropForest() {
  return null;
}
