import './setupDraco';
import { useGLTF } from '@react-three/drei';
import { useModelClone } from './useModel';
import { modelUrl } from '../assetManifest';

// کارخانه‌ی کامپوننت مدل: هر GLB → یک کامپوننت Model با props
// url از manifest خوانده می‌شود (کلید منطقی، نه مسیر خام)
function makeModel(key) {
  const url = modelUrl(key);
  function Model(props) {
    const model = useModelClone(url);
    return (
      <group {...props} dispose={null}>
        <primitive object={model} />
      </group>
    );
  }
  if (url) useGLTF.preload(url);
  return Model;
}

// ---- ساحل ----
export const PalmTreeModel = makeModel('beach.palm');
export const PalmTree2Model = makeModel('beach.palm2');
export const CoconutPalmModel = makeModel('beach.coconutPalm');
export const PortModel = makeModel('beach.port');
export const BoatModel = makeModel('beach.boat');
export const RowboatModel = makeModel('beach.rowboat');
export const LighthouseModel = makeModel('beach.lighthouse');
export const ClamModel = makeModel('beach.clam');
export const SeashellModel = makeModel('beach.seashell');
export const StarfishModel = makeModel('beach.starfish');
export const RockPathModel = makeModel('paths.stonePath');

// ---- کمپ ----
export const PicnicTableModel = makeModel('structures.picnicTable');
export const BackpackModel = makeModel('structures.backpack');
export const GuitarPropModel = makeModel('structures.guitar');
export const MarshmallowsModel = makeModel('structures.marshmallows');
export const BushModel = makeModel('undergrowth.bush');
export const FlowersModel = makeModel('undergrowth.flowers');
export const MushroomsModel = makeModel('undergrowth.mushrooms');
export const Rocks2Model = makeModel('rocks.rocks2');
export const Tent2Model = makeModel('structures.tent2');
export const Tent3Model = makeModel('structures.tent3');

// ---- مأموریت ----
export const ParchmentModel = makeModel('quest.parchment');
export const PostLanternModel = makeModel('structures.postLantern');
export const FishingRodModel = makeModel('fishing.rod');
export const KeyModel = makeModel('quest.key');
export const TreasureChestModel = makeModel('quest.chest');
export const WoodenSignModel = makeModel('structures.sign');
