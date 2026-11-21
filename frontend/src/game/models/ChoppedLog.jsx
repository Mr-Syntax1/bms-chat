import './setupDraco';
import { useGLTF } from '@react-three/drei';
import { useModelClone } from './useModel';

const URL = '/game-models/opt/ChoppedLog.glb';

// کنده‌ی بریده‌شده (صندلی دور آتش)
export function Model(props) {
  const model = useModelClone(URL);
  return (
    <group {...props} dispose={null}>
      <primitive object={model} />
    </group>
  );
}

useGLTF.preload(URL);
