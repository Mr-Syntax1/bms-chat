import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { buildTrees } from '../sceneLayout';
import { usePineModel } from '../models/pineParts';
import { useQualityPreset } from '../stores/useSettingsStore';
import { setActiveTrees } from '../activeTrees';
import { modelUrl } from '../assetManifest';
import { getGroundHeight, getGroundSlope } from '../terrain';

// فقط GLB واقعی — هیچ سیلوئت مخروطی/استوانه‌ای در این فایل وجود ندارد.
// چگالی از preset می‌آید (۴۲۰/۶۲۰/۸۰۰)؛ هرگز به مخروط سقوط نمی‌کند.
const URLS = [modelUrl('trees.pineOpt'), modelUrl('trees.pine2')];

/**
 * جنگل: همه‌ی درخت‌ها GLB کامل و instanced.
 * چیدمان seed ثابت از buildTrees؛ ارتفاع هر درخت مستقل است.
 */
export default function Forest() {
  const preset = useQualityPreset();
  const pine = usePineModel(URLS[0]);
  const pine2 = usePineModel(URLS[1]);

  // چگالی بر اساس کیفیت — seed ثابت، پس چیدمان پایدار است
  const trees = useMemo(() => buildTrees(preset.treeDensity), [preset.treeDensity]);

  // برخورد بازیکن باید فقط با درختان واقعاً رندرشده باشد
  useEffect(() => {
    setActiveTrees(trees);
  }, [trees]);

  // y هر درخت از ارتفاع زمین؛ شیب تند → کج شدن ملایم
  const placed = useMemo(
    () =>
      trees.map((tree) => ({
        ...tree,
        y: getGroundHeight(tree.x, tree.z),
        tilt: getGroundSlope(tree.x, tree.z) * 0.35,
      })),
    [trees]
  );

  const groupA = useMemo(() => placed.filter((t) => t.variant !== 1), [placed]);
  const groupB = useMemo(() => placed.filter((t) => t.variant === 1), [placed]);

  return (
    <group>
      <TreeSet model={pine} trees={groupA} />
      <TreeSet model={pine2} trees={groupB} />
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
      // درختان بلندتر تیره‌تر و سردتر (عمق اتمسفری)
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
// حلقه‌ی backdrop غیرفعال است: مخروط‌ها بیرون از صفحه‌ی زمین کاشته می‌شدند.
// (GLB-only: هیچ سیلوئت رویه‌ای در افق ساخته نمی‌شود)
// ---------------------------------------------------------------------------
export function BackdropForest() {
  return null;
}
