import './setupDraco';
import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

/**
 * مدل GLB را با ارتفاع دلخواه نرمال و روی زمین/وسط XZ می‌نشاند.
 * برای مدل‌هایی که bbox بسیار بزرگ یا آفست‌دار دارند (Tent2، Lantern، Key...)
 * استفاده می‌شود تا دیگر نیازی به scale دستی نباشد.
 */
export default function Fitted({ url, height = 2, ...props }) {
  const { scene } = useGLTF(url);

  const { clone, scale, offset } = useMemo(() => {
    const copy = scene.clone(true);
    copy.updateWorldMatrix(true, true);
    copy.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });

    const box = new THREE.Box3().setFromObject(copy);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const s = height / (size.y || 1);
    return {
      clone: copy,
      scale: s,
      offset: [-center.x * s, -box.min.y * s, -center.z * s],
    };
  }, [scene, height]);

  return (
    <group {...props}>
      <group position={offset} scale={scale}>
        <primitive object={clone} />
      </group>
    </group>
  );
}
