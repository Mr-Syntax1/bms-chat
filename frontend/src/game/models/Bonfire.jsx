import './setupDraco';
import { useGLTF } from '@react-three/drei';
import { useModelClone } from './useModel';
import { modelUrl } from '../assetManifest';

const URL = modelUrl('structures.bonfireOpt');

// آتش کمپ با مدل واقعی Bonfire
export function Model(props) {
  const model = useModelClone(URL);
  return (
    <group {...props} dispose={null}>
      <primitive object={model} />
    </group>
  );
}

if (URL) useGLTF.preload(URL);
