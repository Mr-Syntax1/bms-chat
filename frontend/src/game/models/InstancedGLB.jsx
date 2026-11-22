import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useModelParts } from './useModelParts';

function PartMesh({ geometry, material, offset, matrices, castShadow }) {
  const ref = useRef(null);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const combined = new THREE.Matrix4();
    matrices.forEach((matrix, i) => {
      combined.multiplyMatrices(matrix, offset);
      mesh.setMatrixAt(i, combined);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [matrices, offset]);

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, matrices.length]}
      castShadow={castShadow}
      receiveShadow
      frustumCulled={false}
    />
  );
}

/**
 * نمونه‌سازی یک GLB با InstancedMesh.
 * items: [{ x, z, scale, rotation }]
 * targetHeight: اگر داده شود، ارتفاع نهایی مدل نرمال می‌شود.
 */
export default function InstancedGLB({ url, items, targetHeight = null, y = 0, castShadow = true }) {
  const { parts, height, baseY, centerX, centerZ } = useModelParts(url);
  const baseScale = targetHeight ? targetHeight / height : 1;

  const matrices = useMemo(() => {
    const dummy = new THREE.Object3D();
    return items.map((item) => {
      const s = (item.scale ?? 1) * baseScale;
      // مدل حول مرکز XZ نرمال می‌شود تا شیء دقیقاً روی نقطه‌ی هدف بنشیند
      dummy.position.set(item.x - centerX * s, y + baseY * s, item.z - centerZ * s);
      dummy.rotation.set(0, item.rotation || 0, 0);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      return dummy.matrix.clone();
    });
  }, [items, baseScale, baseY, y, centerX, centerZ]);

  if (!parts.length || !matrices.length) return null;

  return (
    <group>
      {parts.map((part, i) => (
        <PartMesh
          key={i}
          geometry={part.geometry}
          material={part.material}
          offset={part.matrix}
          matrices={matrices}
          castShadow={castShadow}
        />
      ))}
    </group>
  );
}
