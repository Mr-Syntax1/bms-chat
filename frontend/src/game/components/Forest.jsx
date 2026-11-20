import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { TREES } from '../sceneLayout';

// رنگ‌های برگ: تنوع سبز تیره تا فیروزه‌ای برای حالت «جنگل شبانه»
const FOLIAGE_COLORS = ['#1f4d3a', '#255c44', '#2f6b4b', '#1b3f36', '#356f52'];

export default function Forest() {
  const trunkRef = useRef(null);
  const foliageRef = useRef(null);

  // ماتریس‌های نمونه‌ها یک بار ساخته می‌شوند
  const { trunkMatrices, foliageMatrices, colors } = useMemo(() => {
    const dummy = new THREE.Object3D();
    const tMatrices = [];
    const fMatrices = [];
    const cols = [];

    for (const tree of TREES) {
      // تنه
      dummy.position.set(tree.x, tree.scale * 0.9, tree.z);
      dummy.rotation.set(0, tree.rotation, 0);
      dummy.scale.set(tree.scale, tree.scale, tree.scale);
      dummy.updateMatrix();
      tMatrices.push(dummy.matrix.clone());

      // تاج مخروطی (سه ردیف برای ظاهر Low-poly)
      for (let layer = 0; layer < 3; layer += 1) {
        const layerScale = tree.scale * (1 - layer * 0.22);
        dummy.position.set(tree.x, tree.scale * (1.85 + layer * 0.85), tree.z);
        dummy.rotation.set(0, tree.rotation + layer * 0.6, 0);
        dummy.scale.set(layerScale, tree.scale * 0.95, layerScale);
        dummy.updateMatrix();
        fMatrices.push(dummy.matrix.clone());
        cols.push(FOLIAGE_COLORS[(Math.floor(tree.tint * FOLIAGE_COLORS.length) + layer) % FOLIAGE_COLORS.length]);
      }
    }

    return { trunkMatrices: tMatrices, foliageMatrices: fMatrices, colors: cols };
  }, []);

  // اعمال ماتریس‌ها و رنگ‌ها روی InstancedMesh
  useEffect(() => {
    const trunk = trunkRef.current;
    const foliage = foliageRef.current;
    if (!trunk || !foliage) return;

    trunkMatrices.forEach((matrix, i) => trunk.setMatrixAt(i, matrix));
    trunk.instanceMatrix.needsUpdate = true;

    const color = new THREE.Color();
    foliageMatrices.forEach((matrix, i) => {
      foliage.setMatrixAt(i, matrix);
      color.set(colors[i]);
      foliage.setColorAt(i, color);
    });
    foliage.instanceMatrix.needsUpdate = true;
    if (foliage.instanceColor) foliage.instanceColor.needsUpdate = true;
  }, [trunkMatrices, foliageMatrices, colors]);

  // درختان فقط برای کالیژن و دکوراسیون‌اند؛ Raycast تعامل روی آتش/ون انجام می‌شود
  return (
    <group>
      <instancedMesh
        ref={trunkRef}
        args={[undefined, undefined, trunkMatrices.length]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[0.16, 0.24, 2.2, 6]} />
        <meshStandardMaterial color="#3b2a20" roughness={0.95} flatShading />
      </instancedMesh>

      <instancedMesh
        ref={foliageRef}
        args={[undefined, undefined, foliageMatrices.length]}
        castShadow
      >
        <coneGeometry args={[1.15, 1.7, 7]} />
        <meshStandardMaterial roughness={0.85} flatShading />
      </instancedMesh>
    </group>
  );
}
