import './setupDraco';
import { useGLTF } from '@react-three/drei';
import { useModelClone } from './useModel';

const URL = '/game-models/opt/LogAxe.glb';

// کنده‌ی چوب با تبر
export function Model(props) {
  const model = useModelClone(URL);
  return (
    <group {...props} dispose={null}>
      <primitive object={model} />
    </group>
  );
}

useGLTF.preload(URL);
