import { useMemo } from 'react';
import { DECORATIONS } from '../sceneLayout';
import InstancedGLB from '../models/InstancedGLB';
import { modelUrl } from '../assetManifest';

// تزئینات جنگل با InstancedMesh (چادر، سنگ، کنده‌ی قارچ‌دار و کنده‌ی تبر)
const SOURCES = {
  tent: { url: modelUrl('structures.tentOpt'), height: 1.9 },
  rocks: { url: modelUrl('rocks.rocksOpt'), height: 0.75 },
  logFungus: { url: modelUrl('undergrowth.logFungus'), height: 0.3 },
};

export default function Decorations() {
  // گروه‌بندی بر اساس نوع تا هر نوع یک InstancedMesh داشته باشد
  const groups = useMemo(() => {
    const byType = { tent: [], rocks: [], logFungus: [], logAxe: [] };
    DECORATIONS.forEach((item) => {
      if (byType[item.type]) byType[item.type].push(item);
    });
    return byType;
  }, []);

  return (
    <group>
      {Object.entries(SOURCES).map(([type, source]) => (
        <InstancedGLB
          key={type}
          url={source.url}
          items={groups[type]}
          targetHeight={source.height}
          groundAlign
        />
      ))}

      {/* کنده‌ی زیر تبر + تبر روی آن */}
      <InstancedGLB
        url={modelUrl('rocks.choppedLogOpt')}
        items={groups.logAxe}
        targetHeight={0.5}
        groundAlign
      />
      <InstancedGLB
        url={modelUrl('rocks.logAxeOpt')}
        items={groups.logAxe}
        targetHeight={0.4}
        y={0.48}
        groundAlign
      />
    </group>
  );
}
