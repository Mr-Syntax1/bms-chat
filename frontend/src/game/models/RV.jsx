import './setupDraco';
import { useGLTF } from '@react-three/drei';
import { useModelClone } from './useModel';

const URL = '/game-models/opt/RV.glb';

// ون/کاروان کمپ. کلون کل صحنه تا همه‌ی قطعات مدل رندر شوند.
export function Model(props) {
  const model = useModelClone(URL);
  return (
    <group {...props} dispose={null}>
      <primitive object={model} />
    </group>
  );
}

useGLTF.preload(URL);
