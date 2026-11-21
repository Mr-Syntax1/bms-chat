import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { TREES } from '../sceneLayout';
import { usePineModel } from '../models/pineParts';

const TARGET_HEIGHT = 7.6; // ارتفاع نهایی درخت مرجع در صحنه

/**
 * درختان Pine با InstancedMesh.
 * مدل از چند sub-mesh تشکیل شده؛ برای هر کدام یک InstancedMesh می‌سازیم
 * و ماتریس درخت‌ها را بین آن‌ها به اشتراک می‌گذاریم.
 * نتیجه: فقط چند draw call برای کل جنگل.
 */
export default function Forest() {
  const { parts, height, baseY } = usePineModel();
  const refs = useRef([]);

  const baseScale = TARGET_HEIGHT / height;

  // ماتریس نهایی هر درخت (یک‌بار محاسبه می‌شود)
  const matrices = useMemo(() => {
    const dummy = new THREE.Object3D();
    return TREES.map((tree) => {
      const s = tree.scale * baseScale;
      // مدل کمی زیر مبدأ است؛ با این آفست تنه دقیقاً روی زمین می‌نشیند
      dummy.position.set(tree.x, baseY * s, tree.z);
      dummy.rotation.set(0, tree.rotation, 0);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      return dummy.matrix.clone();
    });
  }, [baseScale, baseY]);

  // تنوع رنگی ملایم برگ‌ها (فقط قطعه‌ی برگ = آخرین مش)
  // رنگ‌ها نزدیک سفید هستند چون instanceColor در رنگ پایه ضرب می‌شود
  const leafColors = useMemo(() => {
    const tint = new THREE.Color();
    return TREES.map((tree) => {
      tint.setHSL(0.27 + tree.tint * 0.08, 0.1 + tree.tint * 0.18, 0.82 + tree.tint * 0.18);
      return tint.clone();
    });
  }, []);

  useEffect(() => {
    const combined = new THREE.Matrix4();
    refs.current.forEach((mesh, index) => {
      if (!mesh) return;
      const offset = parts[index].matrix;
      matrices.forEach((matrix, i) => {
        // ماتریس نهایی = ماتریس درخت × ماتریس محلی قطعه
        combined.multiplyMatrices(matrix, offset);
        mesh.setMatrixAt(i, combined);
      });
      mesh.instanceMatrix.needsUpdate = true;

      if (index === parts.length - 1) {
        leafColors.forEach((color, i) => mesh.setColorAt(i, color));
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
      mesh.computeBoundingSphere();
    });
  }, [matrices, leafColors, parts]);

  if (!parts.length) return null;

  return (
    <group>
      {parts.map((part, index) => (
        <instancedMesh
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          args={[part.geometry, part.material, matrices.length]}
          castShadow
          receiveShadow
          frustumCulled={false}
        />
      ))}
    </group>
  );
}
