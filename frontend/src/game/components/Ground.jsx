import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  MAP_SIZE,
  HALF_MAP,
  WATER_LEVEL,
  POND,
  RIVER,
  SAND_START_X,
  getGroundHeight,
  groundColorAt,
} from '../terrain';
import { useQualityPreset } from '../stores/useSettingsStore';

// ---------------------------------------------------------------------------
// زمین heightmap با vertex color
// ---------------------------------------------------------------------------

// تعداد تقسیم‌بندی بر اساس کیفیت — با نقشه‌ی ۴۰۰، ~۳.۱/۲.۸/۲.۱ واحد در هر یال
const SEGMENTS = { low: 128, medium: 160, high: 192 };

function buildTerrainGeometry(segments) {
  const geo = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE, segments, segments);
  const pos = geo.attributes.position;
  const count = pos.count;
  const colors = new Float32Array(count * 3);
  const rgb = [0, 0, 0];

  for (let i = 0; i < count; i += 1) {
    const px = pos.getX(i);
    const py = pos.getY(i);
    // بعد از چرخش -۹۰ درجه حول X: (px, py) → (px, 0, -py)
    const wx = px;
    const wz = -py;
    const h = getGroundHeight(wx, wz);
    pos.setZ(i, h);

    groundColorAt(wx, wz, h, rgb);
    colors[i * 3] = rgb[0];
    colors[i * 3 + 1] = rgb[1];
    colors[i * 3 + 2] = rgb[2];
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

function Terrain() {
  const preset = useQualityPreset();
  const segments = SEGMENTS[preset.treeDensity > 700 ? 'high' : preset.treeDensity > 500 ? 'medium' : 'low'];
  const geometry = useMemo(() => buildTerrainGeometry(segments), [segments]);

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.95} metalness={0} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// شیدر آب مشترک (دریا، برکه، رودخانه)
// ---------------------------------------------------------------------------
const WATER_VERTEX = `
  uniform float uTime;
  uniform float uWaveHeight;
  attribute float aShore;
  varying float vShore;
  varying vec3 vWorld;
  void main() {
    vShore = aShore;
    vec3 p = position;
    float w = sin(p.x * 0.42 + uTime * 1.15) * 0.055
            + sin(p.z * 0.55 + uTime * 0.85) * 0.045
            + sin((p.x + p.z) * 0.9 + uTime * 1.9) * 0.018;
    p.y += w * uWaveHeight * (0.35 + 0.65 * (1.0 - aShore));
    vec4 world = modelMatrix * vec4(p, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const WATER_FRAGMENT = `
  uniform float uTime;
  uniform vec3 uShallow;
  uniform vec3 uDeep;
  uniform vec3 uFoam;
  uniform float uOpacity;
  uniform float uFlow;
  varying float vShore;
  varying vec3 vWorld;
  void main() {
    // جریان جهت‌دار (رودخانه): نوارهای در امتداد x+z که با زمان پایین می‌روند
    float flow = 0.5 + 0.5 * sin((vWorld.x * 0.7 + vWorld.z) * 2.4 - uTime * 2.6 * uFlow);
    float ripple = 0.5 + 0.5 * sin(vWorld.x * 3.1 + uTime * 1.7 + vWorld.z * 2.3);
    float ripple2 = 0.5 + 0.5 * sin(vWorld.z * 4.7 - uTime * 1.2);

    vec3 color = mix(uShallow, uDeep, smoothstep(0.12, 0.85, vShore));
    color += (ripple * 0.06 + ripple2 * 0.04) * vec3(0.55, 0.75, 0.9);
    color += flow * 0.05 * uFlow * vec3(0.6, 0.8, 0.95);

    // خط فوم نازک روی لبه‌ی ساحل
    float foam = smoothstep(0.14, 0.0, vShore);
    foam *= 0.55 + 0.45 * sin(vWorld.x * 5.0 + vWorld.z * 4.0 + uTime * 1.6);
    // فوم کشیده‌ی جریان در وسط رودخانه
    foam += flow * smoothstep(0.4, 0.0, vShore) * 0.12 * uFlow;
    color = mix(color, uFoam, clamp(foam, 0.0, 1.0) * 0.8);

    float alpha = mix(uOpacity * 0.55, uOpacity, smoothstep(0.0, 0.4, vShore));
    alpha = max(alpha, foam * 0.6);
    gl_FragColor = vec4(color, alpha);
  }
`;

// uniform مشترک در سطح ماژول — سه مش آب یک شیء را به اشتراک می‌گذارند
// (mutate کردن آن در useFrame هیچ re-render ایجاد نمی‌کند)
const WATER_UNIFORMS = {
  uTime: { value: 0 },
  uWaveHeight: { value: 1 },
  uShallow: { value: new THREE.Color('#1d4f5c') },
  uDeep: { value: new THREE.Color('#0a1c2b') },
  uFoam: { value: new THREE.Color('#9fb8c4') },
  uOpacity: { value: 0.9 },
  uFlow: { value: 0 },
};

// uniform جدا برای هر پهنه — فقط رودخانه جریان جهت‌دار دارد
const OCEAN_UNIFORMS = { ...WATER_UNIFORMS, uFlow: { value: 0 } };
const POND_UNIFORMS = { ...WATER_UNIFORMS, uFlow: { value: 0 } };
const RIVER_UNIFORMS = { ...WATER_UNIFORMS, uFlow: { value: 1 } };

function WaterMaterial({ uniforms, materialRef }) {
  return (
    <shaderMaterial
      ref={materialRef}
      uniforms={uniforms}
      vertexShader={WATER_VERTEX}
      fragmentShader={WATER_FRAGMENT}
      transparent
      depthWrite={false}
      side={THREE.DoubleSide}
    />
  );
}

// ---------------------------------------------------------------------------
// دریا: نوار ساحلی با خط ساحلی دقیق (بایسکشن روی getGroundHeight)
// ---------------------------------------------------------------------------
function findShoreX(z) {
  // از سمت خشکی به آب می‌رویم تا اولین نقطه‌ی زیر سطح آب
  let lo = SAND_START_X - 6;
  let hi = 96;
  if (getGroundHeight(lo, z) < WATER_LEVEL) return lo;
  if (getGroundHeight(hi, z) >= WATER_LEVEL) return hi;
  for (let i = 0; i < 22; i += 1) {
    const mid = (lo + hi) * 0.5;
    if (getGroundHeight(mid, z) < WATER_LEVEL) hi = mid;
    else lo = mid;
  }
  return (lo + hi) * 0.5;
}

function buildOceanGeometry() {
  const rows = 160;
  const zMin = -HALF_MAP;
  const zMax = HALF_MAP;
  const positions = [];
  const uvs = [];
  const shores = [];
  const indices = [];

  const shoreXs = new Array(rows + 1);
  for (let r = 0; r <= rows; r += 1) {
    const z = zMin + ((zMax - zMin) * r) / rows;
    shoreXs[r] = findShoreX(z);
  }

  for (let r = 0; r <= rows; r += 1) {
    const z = zMin + ((zMax - zMin) * r) / rows;
    const sx = shoreXs[r];
    // سه ستون: لبه‌ی ساحل، میانه، انتهای نقشه — برای تنوع عمق
    const cols = [sx, sx + 6, Math.max(sx + 20, HALF_MAP)];
    for (let c = 0; c < cols.length; c += 1) {
      positions.push(cols[c], WATER_LEVEL, z);
      uvs.push((cols[c] - sx) / 40, (z - zMin) / MAP_SIZE);
      shores.push(c === 0 ? 0 : c === 1 ? 0.4 : 1);
    }
  }

  const stride = 3;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < stride - 1; c += 1) {
      const a = r * stride + c;
      const b = a + 1;
      const d = (r + 1) * stride + c;
      const e = d + 1;
      indices.push(a, d, b, b, d, e);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('aShore', new THREE.Float32BufferAttribute(shores, 1));
  geo.setIndex(indices);
  geo.computeBoundingSphere();
  return geo;
}

// ---------------------------------------------------------------------------
// برکه: دیسک با شعاع دقیق محل تلاقی زمین با سطح آب در هر جهت
// ---------------------------------------------------------------------------
function buildPondGeometry() {
  const rim = 72;
  const rings = 3;
  const positions = [];
  const shores = [];
  const uvs = [];
  const indices = [];

  // مرکز
  positions.push(POND.x, WATER_LEVEL, POND.z);
  shores.push(1);
  uvs.push(0.5, 0.5);
  const radii = new Array(rim + 1);
  for (let a = 0; a <= rim; a += 1) {
    const ang = (a / rim) * Math.PI * 2;
    const dx = Math.cos(ang);
    const dz = Math.sin(ang);
    // شعاع تلاقی: از مرکز به بیرون
    let lo = 0;
    let hi = POND.radius * 1.5;
    for (let i = 0; i < 18; i += 1) {
      const mid = (lo + hi) * 0.5;
      if (getGroundHeight(POND.x + dx * mid, POND.z + dz * mid) < WATER_LEVEL) lo = mid;
      else hi = mid;
    }
    radii[a] = Math.max(lo, 0.6);
  }

  for (let ring = 1; ring <= rings; ring += 1) {
    const t = ring / rings;
    for (let a = 0; a <= rim; a += 1) {
      const ang = (a / rim) * Math.PI * 2;
      const rr = radii[a] * t;
      positions.push(POND.x + Math.cos(ang) * rr, WATER_LEVEL, POND.z + Math.sin(ang) * rr);
      // ۰ = ساحل، ۱ = عمیق (مرکز برکه عمیق‌ترین است)
      shores.push(1 - t * t);
      uvs.push(Math.cos(ang) * t * 0.5 + 0.5, Math.sin(ang) * t * 0.5 + 0.5);
    }
  }

  // مرکز → حلقه‌ی ۱
  for (let a = 0; a < rim; a += 1) {
    indices.push(0, 1 + a, 1 + a + 1);
  }
  // بین حلقه‌ها
  for (let ring = 0; ring < rings - 1; ring += 1) {
    const base = 1 + ring * (rim + 1);
    const next = base + (rim + 1);
    for (let a = 0; a < rim; a += 1) {
      indices.push(base + a, next + a, base + a + 1);
      indices.push(base + a + 1, next + a, next + a + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('aShore', new THREE.Float32BufferAttribute(shores, 1));
  geo.setIndex(indices);
  geo.computeBoundingSphere();
  return geo;
}

// ---------------------------------------------------------------------------
// رودخانه: نوار در امتداد خط مرکزی
// ---------------------------------------------------------------------------
function buildRiverGeometry() {
  const pts = RIVER.points;
  const lateral = 4;
  const halfW = RIVER.width * 0.5;
  const positions = [];
  const shores = [];
  const uvs = [];
  const indices = [];

  const samples = [];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const a = pts[i];
    const b = pts[i + 1];
    const segs = Math.max(2, Math.round(Math.hypot(b.x - a.x, b.z - a.z) / 2.4));
    for (let s = 0; s < segs; s += 1) {
      const t = s / segs;
      samples.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
    }
  }
  samples.push(pts[pts.length - 1]);

  for (let i = 0; i < samples.length; i += 1) {
    const prev = samples[Math.max(0, i - 1)];
    const next = samples[Math.min(samples.length - 1, i + 1)];
    let tx = next.x - prev.x;
    let tz = next.z - prev.z;
    const tl = Math.hypot(tx, tz) || 1;
    tx /= tl;
    tz /= tl;
    // نرمال افقی
    const nx = -tz;
    const nz = tx;

    for (let c = 0; c <= lateral; c += 1) {
      const t = c / lateral;
      const off = (t - 0.5) * 2 * halfW;
      positions.push(samples[i].x + nx * off, WATER_LEVEL, samples[i].z + nz * off);
      // ۰ = ساحل، ۱ = عمیق (وسط رودخانه)
      shores.push(1 - Math.abs(t - 0.5) * 2);
      uvs.push(t, i / samples.length);
    }
  }

  const stride = lateral + 1;
  for (let i = 0; i < samples.length - 1; i += 1) {
    for (let c = 0; c < lateral; c += 1) {
      const a = i * stride + c;
      const b = a + 1;
      const d = (i + 1) * stride + c;
      const e = d + 1;
      indices.push(a, d, b, b, d, e);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('aShore', new THREE.Float32BufferAttribute(shores, 1));
  geo.setIndex(indices);
  geo.computeBoundingSphere();
  return geo;
}

function Waters({ animate }) {
  const ocean = useMemo(() => buildOceanGeometry(), []);
  const pond = useMemo(() => buildPondGeometry(), []);
  const river = useMemo(() => buildRiverGeometry(), []);

  useFrame(({ clock }) => {
    const t = animate ? clock.elapsedTime : 0;
    WATER_UNIFORMS.uTime.value = t;
    OCEAN_UNIFORMS.uTime.value = t;
    POND_UNIFORMS.uTime.value = t;
    RIVER_UNIFORMS.uTime.value = t;
  });

  return (
    <group>
      <mesh geometry={ocean} renderOrder={1}>
        <WaterMaterial uniforms={OCEAN_UNIFORMS} />
      </mesh>
      <mesh geometry={pond} renderOrder={1}>
        <WaterMaterial uniforms={POND_UNIFORMS} />
      </mesh>
      <mesh geometry={river} renderOrder={1}>
        <WaterMaterial uniforms={RIVER_UNIFORMS} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
export default function Ground() {
  const preset = useQualityPreset();

  return (
    <group>
      <Terrain />
      <Waters animate={preset.envAnimation} />
    </group>
  );
}

// نورپردازی شب دنج — شب ثابت: ماه سرد + هاله‌ی آسمان، بدون خورشید/چرخه
// ⚠️ پاس کارایی ۵.۱: سایه‌ها کاملاً خاموش‌اند (shadowMap.enabled=false).
//    تنها منبع نور جهت‌دار، «ماه» است؛ هیچ SpotLight/light shaft وجود ندارد.
//    ردیابی دوربین سایه و shadow camera حذف شدند چون سایه رندر نمی‌شود.
function MoonLight() {
  return (
    <directionalLight position={[34, 62, 22]} intensity={1.35} color="#cddcff" castShadow={false} />
  );
}

// نور پرکننده‌ی ملایم از سمت مقابل ماه تا تنه/تاج درختان در سایه‌ی خودشان
// کاملاً سیاه نشوند (بدون سایه، هزینه‌ی ناچیز).
function FillLight() {
  return (
    <directionalLight position={[-40, 30, -24]} intensity={0.45} color="#9fb6e0" castShadow={false} />
  );
}

export function AmbientSetup() {
  return (
    <>
      <ambientLight intensity={0.62} color="#a9bde2" />
      <hemisphereLight args={['#88a6cf', '#31432f', 1.05]} />
      <MoonLight />
      <FillLight />
    </>
  );
}
