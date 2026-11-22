import './setupDraco';
import { useGLTF } from '@react-three/drei';
import { useModelClone } from './useModel';

// کارخانه‌ی کامپوننت مدل: هر GLB → یک کامپوننت Model با props
function makeModel(url) {
  function Model(props) {
    const model = useModelClone(url);
    return (
      <group {...props} dispose={null}>
        <primitive object={model} />
      </group>
    );
  }
  useGLTF.preload(url);
  return Model;
}

const BASE = '/game-models';

// ---- ساحل ----
export const PalmTreeModel = makeModel(`${BASE}/beach/trees/PalmTree.glb`);
export const PalmTree2Model = makeModel(`${BASE}/beach/trees/PalmTree2.glb`);
export const CoconutPalmModel = makeModel(`${BASE}/beach/trees/CoconutPalmTree.glb`);
export const PortModel = makeModel(`${BASE}/beach/port/Port.glb`);
export const BoatModel = makeModel(`${BASE}/beach/boat/BoatbyPoly.glb`);
export const RowboatModel = makeModel(`${BASE}/beach/boat/RowboatbyPoly.glb`);
export const LighthouseModel = makeModel(`${BASE}/beach/LighthousebyPoly.glb`);
export const ClamModel = makeModel(`${BASE}/beach/ClambyPoly.glb`);
export const SeashellModel = makeModel(`${BASE}/beach/SeashellbyPoly.glb`);
export const StarfishModel = makeModel(`${BASE}/beach/StarfishbyPoly.glb`);
export const RockPathModel = makeModel(`${BASE}/beach/RockPathRoundSmall.glb`);

// ---- کمپ ----
export const PicnicTableModel = makeModel(`${BASE}/ExtraCozyProps/PicnicTable.glb`);
export const BackpackModel = makeModel(`${BASE}/ExtraCozyProps/Backpack.glb`);
export const GuitarPropModel = makeModel(`${BASE}/ExtraCozyProps/Guitar.glb`);
export const MarshmallowsModel = makeModel(`${BASE}/ExtraCozyProps/Marshmallows.glb`);
export const BushModel = makeModel(`${BASE}/Decorations/BushbyQuaternius.glb`);
export const FlowersModel = makeModel(`${BASE}/Decorations/Flowers.glb`);
export const MushroomsModel = makeModel(`${BASE}/Decorations/Mushrooms.glb`);
export const Rocks2Model = makeModel(`${BASE}/Decorations/Rocks2.glb`);
export const Tent2Model = makeModel(`${BASE}/Decorations/Tent2.glb`);
export const Tent3Model = makeModel(`${BASE}/Decorations/Tent3.glb`);

// ---- مأموریت ----
export const ParchmentModel = makeModel(`${BASE}/missions/ParchamentOpen.glb`);
export const PostLanternModel = makeModel(`${BASE}/missions/PostLantern.glb`);
export const FishingRodModel = makeModel(`${BASE}/missions/FishingRod.glb`);
export const KeyModel = makeModel(`${BASE}/missions/Key.glb`);
export const TreasureChestModel = makeModel(`${BASE}/missions/TreasureChest.glb`);
export const WoodenSignModel = makeModel(`${BASE}/missions/WoodenSign.glb`);
