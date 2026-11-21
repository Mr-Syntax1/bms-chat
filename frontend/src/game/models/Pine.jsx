import './setupDraco';
import { useGLTF } from '@react-three/drei';
import { useModelClone } from './useModel';

const URL = '/game-models/opt/Pine.glb';

// درخت کاج (نسخه‌ی تک‌نمونه؛ جنگل از InstancedMesh استفاده می‌کند)
export function Model(props) {
  const model = useModelClone(URL);
  return (
    <group {...props} dispose={null}>
      <primitive object={model} />
    </group>
  );
}

useGLTF.preload(URL);
