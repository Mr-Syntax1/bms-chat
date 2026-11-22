import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { TREES } from '../sceneLayout';
import { usePineModel } from '../models/pineParts';

const TARGET_HEIGHT = 7.6;

// سه گونه درخت: opt/Pine + trees/Pine + trees/Pine2
const URLS = [
  '/game-models/opt/Pine.glb',
  '/game-models/trees/Pine2.glb',
  '/game-models/trees/Pine.glb',
];

// درختان با InstancedMesh (یک InstancedMesh به‌ازای هر sub-mesh)
export default function Forest() {
  const pineOpt = usePineModel(URLS[0]);
  const pine2 = usePineModel(URLS[1]);
  const pine = usePineModel(URLS[2]);

  const v0 = useMemo(() => TREES.filter((t) => t.variant === 0), []);
  const v1 = useMemo(() => TREES.filter((t) => t.variant === 1), []);
  const v2 = useMemo(() => TREES.filter((t) => t.variant === 2), []);

  return (
    <group>
      <TreeSet model={pineOpt} trees={v0} />
      <TreeSet model={pine2} trees={v1} />
      <TreeSet model={pine} trees={v2} />
    </group>
  );
}

function TreeSet({ model, trees }) {
  const refs = useRef([]);
  const { parts, height, baseY, centerX, centerZ } = model;
  const baseScale = TARGET_HEIGHT / height;

  const matrices = useMemo(() => {
    const dummy = new THREE.Object3D();
    return trees.map((tree) => {
      const s = tree.scale * baseScale;
      // نرمال‌سازی XZ تا تنه‌ی درخت دقیقاً روی نقطه‌ی تولیدشده بایستد
      dummy.position.set(tree.x - centerX * s, baseY * s, tree.z - centerZ * s);
      dummy.rotation.set(0, tree.rotation, 0);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      return dummy.matrix.clone();
    });
  }, [trees, baseScale, baseY, centerX, centerZ]);

  const leafColors = useMemo(() => {
    const tint = new THREE.Color();
    return trees.map((tree) => {
      tint.setHSL(0.27 + tree.tint * 0.08, 0.1 + tree.tint * 0.18, 0.82 + tree.tint * 0.18);
      return tint.clone();
    });
  }, [trees]);

  useEffect(() => {
    const combined = new THREE.Matrix4();
    refs.current.forEach((mesh, index) => {
      if (!mesh) return;
      const offset = parts[index].matrix;
      matrices.forEach((matrix, i) => {
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

  if (!parts.length || !matrices.length) return null;

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
