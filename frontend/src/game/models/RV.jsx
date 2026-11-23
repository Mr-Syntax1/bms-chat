import './setupDraco';
import { useGLTF } from '@react-three/drei';
import { useModelClone } from './useModel';
import { modelUrl } from '../assetManifest';

const URL = modelUrl('structures.rvOpt');

// ون/کاروان کمپ. کلون کل صحنه تا همه‌ی قطعات مدل رندر شوند.
export function Model(props) {
  const model = useModelClone(URL);
  return (
    <group {...props} dispose={null}>
      <primitive object={model} />
    </group>
  );
}

if (URL) useGLTF.preload(URL);
