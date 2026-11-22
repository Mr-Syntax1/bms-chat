import './models/setupDraco';
import { useGLTF } from '@react-three/drei';
import { CHARACTER_FILES, characterUrl } from './models/characterConfig';

// ---------------------------------------------------------------------------
// پیش‌بارگذاری مدل‌های ضروری بازی.
// همه مسیرها واقعی‌اند (موجود در public/game-models) و از preload خود
// کامپوننت‌ها جدا نگه داشته شده‌اند تا progress در useProgress واقعی بماند.
// ---------------------------------------------------------------------------
const TREE_URLS = [
  '/game-models/opt/Pine.glb',
  '/game-models/trees/Pine.glb',
  '/game-models/trees/Pine2.glb',
];

const ENV_URLS = [
  '/game-models/opt/Bonfire.glb',
  '/game-models/opt/RV.glb',
  '/game-models/opt/ChoppedLog.glb',
  '/game-models/opt/Tent.glb',
  '/game-models/opt/Rocks.glb',
  '/game-models/opt/LogFungus.glb',
  '/game-models/opt/LogAxe.glb',
  '/game-models/ExtraCozyProps/PicnicTable.glb',
  '/game-models/ExtraCozyProps/Backpack.glb',
  '/game-models/ExtraCozyProps/Guitar.glb',
  '/game-models/ExtraCozyProps/Marshmallows.glb',
  '/game-models/Decorations/BushbyQuaternius.glb',
  '/game-models/Decorations/Flowers.glb',
  '/game-models/Decorations/Mushrooms.glb',
  '/game-models/Decorations/Rocks2.glb',
];

const BEACH_URLS = [
  '/game-models/beach/port/Port.glb',
  '/game-models/beach/boat/BoatbyPoly.glb',
  '/game-models/beach/boat/RowboatbyPoly.glb',
  '/game-models/beach/LighthousebyPoly.glb',
  '/game-models/beach/trees/PalmTree.glb',
  '/game-models/beach/trees/PalmTree2.glb',
  '/game-models/beach/trees/CoconutPalmTree.glb',
];

const MISSION_URLS = [
  '/game-models/missions/ParchamentOpen.glb',
  '/game-models/missions/PostLantern.glb',
  '/game-models/missions/FishingRod.glb',
  '/game-models/missions/Key.glb',
  '/game-models/missions/TreasureChest.glb',
  '/game-models/missions/WoodenSign.glb',
];

let started = false;

/**
 * شروع پیش‌بارگذاری همه‌ی مدل‌های ضروری.
 * ایدمپوتنت است؛ در StrictMode دو بار مشکلی ایجاد نمی‌کند.
 */
export function preloadAllModels() {
  if (started) return;
  started = true;

  // کاراکترها (۹ مدل) — بعضی حجیم‌اند، اما همه برای ورود چندنفره لازم‌اند
  CHARACTER_FILES.forEach((file) => useGLTF.preload(characterUrl(file)));

  [...TREE_URLS, ...ENV_URLS, ...BEACH_URLS, ...MISSION_URLS].forEach((url) => {
    useGLTF.preload(url);
  });
}

/** فقط مدل کاراکتر خود بازیکن — مسیر سریع برای ورود زودهنگام */
export function preloadCharacter(model) {
  useGLTF.preload(characterUrl(model));
}
