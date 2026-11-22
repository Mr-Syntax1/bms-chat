import { useMemo } from 'react';
import { DECORATIONS } from '../sceneLayout';
import InstancedGLB from '../models/InstancedGLB';

// تزئینات جنگل با InstancedMesh (چادر، سنگ، کنده‌ی قارچ‌دار و کنده‌ی تبر)
const SOURCES = {
  tent: { url: '/game-models/opt/Tent.glb', height: 1.9 },
  rocks: { url: '/game-models/opt/Rocks.glb', height: 0.75 },
  logFungus: { url: '/game-models/opt/LogFungus.glb', height: 0.3 },
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
        />
      ))}

      {/* کنده‌ی زیر تبر + تبر روی آن */}
      <InstancedGLB
        url="/game-models/opt/ChoppedLog.glb"
        items={groups.logAxe}
        targetHeight={0.5}
      />
      <InstancedGLB
        url="/game-models/opt/LogAxe.glb"
        items={groups.logAxe}
        targetHeight={0.4}
        y={0.48}
      />
    </group>
  );
}
