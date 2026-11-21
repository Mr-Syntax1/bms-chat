import { DECORATIONS } from '../sceneLayout';
import { Model as TentModel } from '../models/Tent';
import { Model as RocksModel } from '../models/Rocks';
import { Model as LogFungusModel } from '../models/LogFungus';
import { Model as LogAxeModel } from '../models/LogAxe';

// تزئینات جنگل: چادر، سنگ، کنده‌ی قارچ‌دار و کنده‌ی تبر
const COMPONENTS = {
  tent: TentModel,
  rocks: RocksModel,
  logFungus: LogFungusModel,
  logAxe: LogAxeModel,
};

// مقیاس پایه‌ی هر مدل تا اندازه‌ی واقعی و متناسب با قد بازیکن (۱.۷۵) داشته باشد
const TYPE_SCALE = {
  tent: 1.9, // عرض مدل ۱.۲۹ → ~۲.۵
  rocks: 1.05, // عرض ۱.۵۵ → ~۱.۶
  logFungus: 1.35, // طول ۱.۱۲ → ~۱.۵
  logAxe: 4.2, // عرض ۰.۲۷ → ~۱.۱
};

// پایین‌ترین نقطه‌ی هر مدل در واحدهای خودش؛ برای نشاندن دقیق روی زمین
const GROUND_LIFT = {
  tent: 0.26,
  rocks: 0.25,
  logFungus: 0.14,
  logAxe: 0.07,
};

export default function Decorations() {
  return (
    <group>
      {DECORATIONS.map((item, i) => {
        const Component = COMPONENTS[item.type];
        if (!Component) return null;
        const scale = item.scale * (TYPE_SCALE[item.type] ?? 1);
        const lift = GROUND_LIFT[item.type] ?? 0;

        return (
          <group
            key={`${item.type}-${i}`}
            position={[item.x, 0, item.z]}
            rotation={[0, item.rotation, 0]}
            scale={scale}
          >
            {/* بالابر در فضای مدل اعمال می‌شود تا با مقیاس هم‌خوان بماند */}
            <group position={[0, lift, 0]}>
              <Component />
            </group>
          </group>
        );
      })}
    </group>
  );
}
