// ---------------------------------------------------------------------------
// world/StreamedWorld.jsx — جنگل و فلور ثابت (Phase 5)
//
//  • کل جنگل و فلور یک‌بار ساخته و برای همیشه رندر می‌شوند؛ هیچ چیز با
//    جابه‌جایی بازیکن ناپدید یا بازسازی نمی‌شود (نه درخت، نه سنگ/چمن/گل/قارچ).
//  • دنیا به سلول‌های فضایی ۸۰ واحدی تقسیم می‌شود؛ هر سلول InstancedMesh
//    مستقل دارد تا frustum culling هر سلول کار کند و draw call ها سبک بمانند.
// ---------------------------------------------------------------------------
import { useEffect, useMemo } from 'react';
import { useQualityPreset } from '../stores/useSettingsStore';
import ChunkCell from './Chunk';
import { placeTrees } from './chunkModel';
import { buildTrees } from '../sceneLayout';
import { setActiveTrees } from '../activeTrees';
import { getChunkFlora } from './chunkGen';
import { chunkStats } from './ChunkManager';

const CELL_SIZE = 80; // اندازه‌ی سلول فضایی (فقط برای culling)
const TREE_MAX = 2600;

// محدوده‌ی چانک‌های فلور: کل نقشه (۴۰۰×۴۰۰) به‌علاوه‌ی حاشیه.
const FLORA_CX_MIN = -7;
const FLORA_CX_MAX = 3;
const FLORA_CZ_MIN = -7;
const FLORA_CZ_MAX = 6;

const cellKey = (x, z) => `${Math.floor(x / CELL_SIZE)},${Math.floor(z / CELL_SIZE)}`;

export default function StreamedWorld() {
  const preset = useQualityPreset();
  const density = Math.min(TREE_MAX, Math.round(preset.treeDensity * 3.25));

  // درختان + فلور: هر دو یک‌بار ساخته و بر اساس سلول فضایی گروه‌بندی می‌شوند.
  const { cells, treeCount, floraCount } = useMemo(() => {
    const buckets = new Map();
    const ensure = (x, z) => {
      const key = cellKey(x, z);
      let cell = buckets.get(key);
      if (!cell) {
        cell = {
          trees: [],
          flora: { grass: [], flowers: [], rocks: [], mushrooms: [] },
        };
        buckets.set(key, cell);
      }
      return cell;
    };

    const trees = placeTrees(buildTrees(density));
    for (const tree of trees) ensure(tree.x, tree.z).trees.push(tree);

    let floraTotal = 0;
    for (let cz = FLORA_CZ_MIN; cz <= FLORA_CZ_MAX; cz += 1) {
      for (let cx = FLORA_CX_MIN; cx <= FLORA_CX_MAX; cx += 1) {
        const f = getChunkFlora(cx, cz, preset.grassDensity);
        for (let i = 0; i < f.grass.length; i += 1) {
          const it = f.grass[i];
          ensure(it.x, it.z).flora.grass.push(it);
        }
        for (let i = 0; i < f.flowers.length; i += 1) {
          const it = f.flowers[i];
          ensure(it.x, it.z).flora.flowers.push(it);
        }
        for (let i = 0; i < f.rocks.length; i += 1) {
          const it = f.rocks[i];
          ensure(it.x, it.z).flora.rocks.push(it);
        }
        for (let i = 0; i < f.mushrooms.length; i += 1) {
          const it = f.mushrooms[i];
          ensure(it.x, it.z).flora.mushrooms.push(it);
        }
        floraTotal += f.grass.length + f.flowers.length + f.rocks.length + f.mushrooms.length;
      }
    }

    return { cells: Array.from(buckets.values()), treeCount: trees.length, floraCount: floraTotal };
  }, [density, preset.grassDensity]);

  useEffect(() => {
    setActiveTrees(cells.flatMap((c) => c.trees));
    chunkStats.chunks = cells.length;
    chunkStats.trees = treeCount;
    chunkStats.lod0 = treeCount;
    chunkStats.lod1 = 0;
    chunkStats.lod2 = 0;
    chunkStats.flora = floraCount;
  }, [cells, treeCount, floraCount]);

  return (
    <group name="streamed-world">
      {cells.map((cell, i) => (
        <ChunkCell key={i} cell={cell} />
      ))}
    </group>
  );
}
