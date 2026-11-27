// ---------------------------------------------------------------------------
// world/StreamedWorld.jsx — جنگل ثابت + فلور اطراف (Phase 5)
//
//  • درختان یک‌بار و کامل رندر می‌شوند (بدون شعاع چانک)؛ هیچ درختی با
//    جابه‌جایی بازیکن ناپدید نمی‌شود.
//  • برای حفظ کارایی، جنگل به سلول‌های فضایی ۸۰ واحدی تقسیم می‌شود؛ هر سلول
//    InstancedMesh جدا دارد تا frustum culling هر سلول مستقل کار کند.
//  • فقط فلور ریز (چمن/گل/سنگ/قارچ) هر ۰.۵ ثانیه بر اساس موقعیت بازیکن
//    به‌روز می‌شود (این‌ها کوچک‌اند و تغییرشان دیده نمی‌شود).
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { usePlayerStore } from '../stores/usePlayerStore';
import { useQualityPreset } from '../stores/useSettingsStore';
import { computeFloraSet, resetChunkState, chunkStats } from './ChunkManager';
import { ChunkTrees, ChunkFlora } from './Chunk';
import { placeTrees } from './chunkModel';
import { buildTrees } from '../sceneLayout';
import { setActiveTrees } from '../activeTrees';

const CHECK_INTERVAL = 0.5; // ثانیه
const CELL_SIZE = 80; // اندازه‌ی سلول فضایی رندر درختان (فقط برای culling)
const TREE_MAX = 2600;

export default function StreamedWorld() {
  const preset = useQualityPreset();
  const density = Math.min(TREE_MAX, Math.round(preset.treeDensity * 3.25));

  // کل جنگل یک‌بار ساخته می‌شود — بدون وابستگی به موقعیت بازیکن.
  const cells = useMemo(() => {
    const trees = placeTrees(buildTrees(density));
    const map = new Map();
    for (const tree of trees) {
      const key = `${Math.floor(tree.x / CELL_SIZE)},${Math.floor(tree.z / CELL_SIZE)}`;
      let bucket = map.get(key);
      if (!bucket) {
        bucket = [];
        map.set(key, bucket);
      }
      bucket.push(tree);
    }
    return { trees, groups: Array.from(map.values()) };
  }, [density]);

  useEffect(() => {
    setActiveTrees(cells.trees);
    chunkStats.trees = cells.trees.length;
    chunkStats.lod0 = cells.trees.length;
    chunkStats.lod1 = 0;
    chunkStats.lod2 = 0;
  }, [cells]);

  const [floraSet, setFloraSet] = useState(() => {
    resetChunkState();
    const { local } = usePlayerStore.getState();
    const next = computeFloraSet(local.x, local.z, preset.grassDensity);
    return next ? next.flora : null;
  });
  const timer = useRef(0);

  useEffect(() => {
    resetChunkState();
  }, [preset.grassDensity]);

  useFrame((_, delta) => {
    timer.current += Math.min(delta, 0.1);
    if (timer.current < CHECK_INTERVAL) return;
    timer.current = 0;

    const { local } = usePlayerStore.getState();
    const next = computeFloraSet(local.x, local.z, preset.grassDensity);
    if (next) setFloraSet(next.flora);
  });

  const flora = floraSet ?? { grass: [], flowers: [], rocks: [], mushrooms: [] };

  return (
    <group name="streamed-world">
      {cells.groups.map((items, i) => (
        <ChunkTrees key={i} groups={{ near: items, far: [], far2: [] }} />
      ))}
      <ChunkFlora flora={flora} />
    </group>
  );
}
