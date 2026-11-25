// ---------------------------------------------------------------------------
// usePlayerMotion — فیزیک حرکت بازیکن روی زمین ناهموار
//
// جدا شده از PlayerController تا آن فایل قابل خواندن بماند. همه‌ی محاسبات
// بدون تخصیص در هر فریم انجام می‌شوند (بافرهای ماژول‌سطح).
//
// مسئولیت‌ها:
//   • ارتفاع زمین و گرانش/پرش
//   • شنا وقتی عمق آب کافی است (شناوری، سرعت کمتر، بدون پرش)
//   • پاشش ورود به آب
// (صدای قدم برداشته شد — سکوت ترجیح داده می‌شود.)
// ---------------------------------------------------------------------------

import {
  getGroundHeight,
  getGroundNormal,
  getWaterDepth,
  isInWater,
  getWalkSurfaceY,
  WATER_LEVEL,
  getGroundSlope,
} from '../terrain';
import { playPositionalOneShot } from '../audio';
import { soundUrl } from '../assetManifest';

const GRAVITY = -22;
const JUMP_SPEED = 7.2;
const STEP_HEIGHT = 0.55; // پله‌ای که بازیکن بدون پرش بالا می‌رود
const SWIM_SPEED_FACTOR = 0.62;
const SWIM_DEPTH_THRESHOLD = 1.15;
const LAND_MIN_SPEED = 4.5;

// پنجره‌ی کویوت: بعد از ترک لبه‌ی زمین، تا این مدت هنوز می‌توان پرید
const COYOTE_TIME = 0.12;
// بافر پرش: اگر کمی قبل از فرود Space زده شود، در لحظه‌ی فرود اجرا می‌شود
const JUMP_BUFFER_TIME = 0.1;
// رها کردن زودهنگام Space ارتفاع پرش را کم می‌کند
const JUMP_CUT = 0.45;
// شیب بیش از این حد = سُر خوردن (بالا رفتن سخت، سرازیری شتاب)
const SLIDE_SLOPE = 0.62;

// صداهای بازیکن — از مانیفست؛ اگر نبود audio.js synth می‌سازد
const JUMP_SOUND = soundUrl('player.jump');
const LAND_SOUND = soundUrl('player.landSoft');
const SPLASH_SOUND = soundUrl('player.splashSmall');

// ---------------------------------------------------------------------------
// تشخیص سطح زیر پا
// ---------------------------------------------------------------------------
const SAND_FROM = 26;

export function surfaceAt(x, z) {
  if (isInWater(x, z) || getGroundHeight(x, z) < WATER_LEVEL + 0.15) return 'water';
  if (getWalkSurfaceY(x, z) > getGroundHeight(x, z) + 0.15) return 'wood';
  if (x > SAND_FROM) return 'sand';
  if (getGroundSlope(x, z) > 0.34) return 'stone';
  return 'grass';
}

// ---------------------------------------------------------------------------
// شیب تند: شتاب سرازیری. خروجی در بازه‌ی ۰..۱ است (۰ = صاف، ۱ = دیوار)
// و بردار سُر خوردن را در out می‌نویسد (بدون تخصیص).
// ---------------------------------------------------------------------------
const _normal = { x: 0, y: 1, z: 0 };
export function slopeSlide(x, z, out) {
  getGroundNormal(x, z, _normal);
  const slope = 1 - Math.min(1, Math.max(0, _normal.y));
  if (slope < SLIDE_SLOPE) {
    out.x = 0;
    out.z = 0;
    return 0;
  }
  // جهت سرازیری = تصویر گرانش روی صفحه‌ی زمین = (nx, nz) نرمال افقی
  const len = Math.hypot(_normal.x, _normal.z) || 1;
  const strength = Math.min(1, (slope - SLIDE_SLOPE) / (1 - SLIDE_SLOPE));
  out.x = (_normal.x / len) * strength;
  out.z = (_normal.z / len) * strength;
  return strength;
}

// ---------------------------------------------------------------------------
// state فیزیکی — module-level، بدون re-render
// ---------------------------------------------------------------------------
const physics = {
  y: 0,
  vy: 0,
  grounded: true,
  swimming: false,
  jumpHeld: false,
  surface: 'grass',
  lastX: 0,
  lastZ: 0,
  coyote: 0,
  jumpBuffer: 0,
  jumpCut: false,
  initialized: false,
};

export function getPlayerPhysics() {
  return physics;
}

export function resetPlayerPhysics(x, z) {
  physics.y = getWalkSurfaceY(x, z);
  physics.vy = 0;
  physics.grounded = true;
  physics.swimming = false;
  physics.jumpHeld = false;
  physics.lastX = x;
  physics.lastZ = z;
  physics.coyote = 0;
  physics.jumpBuffer = 0;
  physics.jumpCut = false;
  physics.initialized = true;
  physics.surface = surfaceAt(x, z);
}

/**
 * یک گام فیزیک.
 * @returns {{ y: number, swimming: boolean, speedFactor: number, landed: boolean }}
 */
export function stepPlayerPhysics(x, z, delta, wantsJump) {
  if (!physics.initialized) resetPlayerPhysics(x, z);

  // تشخیص لبه‌ی کلید: نگه‌داشتن Space نباید باعث پرش پشت‌سرهم شود
  const jumpPressed = Boolean(wantsJump) && !physics.jumpHeld;
  const jumpReleased = !wantsJump && physics.jumpHeld;
  physics.jumpHeld = Boolean(wantsJump);

  // بافر پرش: ورودی کمی قبل از فرود ذخیره می‌شود
  if (jumpPressed) physics.jumpBuffer = JUMP_BUFFER_TIME;
  else physics.jumpBuffer = Math.max(0, physics.jumpBuffer - delta);

  // سطح ایستادن: زمین یا سکوی اسکله (که روی آب معلق است)
  const groundY = getWalkSurfaceY(x, z);
  const depth = getWaterDepth(x, z);
  const wasSwimming = physics.swimming;

  // شنا: عمق کافی + روی سکو نبودن
  const swimming = depth > SWIM_DEPTH_THRESHOLD;
  physics.swimming = swimming;

  let landed = false;

  if (swimming) {
    // شناوری آرام روی سطح آب، با پرش ملایم موج
    const targetY = WATER_LEVEL - 0.42;
    physics.vy += (targetY - physics.y) * 9 * delta;
    physics.vy *= 1 - Math.min(1, 6 * delta);
    physics.y += physics.vy * delta;
    // پایین‌تر از بستر نرو
    if (physics.y < groundY) {
      physics.y = groundY;
      physics.vy = 0;
    }
    physics.grounded = false;
    physics.coyote = 0;
  } else {
    // کویوت: بعد از ترک زمین پنجره‌ی کوتاهی برای پرش باقی می‌ماند
    if (physics.grounded) physics.coyote = COYOTE_TIME;
    else physics.coyote = Math.max(0, physics.coyote - delta);

    // گرانش
    // پرش: یا روی زمین، یا داخل پنجره‌ی کویوت — و فقط با بافر تازه
    if (physics.jumpBuffer > 0 && (physics.grounded || physics.coyote > 0)) {
      physics.vy = JUMP_SPEED;
      physics.grounded = false;
      physics.coyote = 0;
      physics.jumpBuffer = 0;
      physics.jumpCut = false;
      playPositionalOneShot(JUMP_SOUND, [x, physics.y + 1, z], { volume: 0.55 });
    }

    // ارتفاع متغیر: اگر وسط بالا رفتن Space رها شود، سرعت بالا رفتن کم می‌شود
    if (jumpReleased && physics.vy > 0 && !physics.jumpCut) {
      physics.vy *= JUMP_CUT;
      physics.jumpCut = true;
    }

    physics.vy += GRAVITY * delta;
    physics.y += physics.vy * delta;

    // نشستن روی زمین یا پله
    if (physics.y <= groundY) {
      const fallSpeed = -physics.vy;
      if (!physics.grounded && fallSpeed > LAND_MIN_SPEED) {
        landed = true;
        playPositionalOneShot(LAND_SOUND, [x, groundY + 0.4, z], {
          volume: Math.min(0.75, 0.3 + fallSpeed * 0.05),
        });
      }
      physics.y = groundY;
      physics.vy = 0;
      physics.grounded = true;
      physics.jumpCut = false;
    } else if (physics.grounded && physics.y - groundY < STEP_HEIGHT) {
      // پله‌های کوچک را بدون پرش بالا/پایین می‌رود
      physics.y = groundY;
      physics.vy = 0;
    } else {
      physics.grounded = false;
    }
  }

  // ورود به آب: پاشش
  if (swimming && !wasSwimming) {
    playPositionalOneShot(SPLASH_SOUND, [x, WATER_LEVEL, z], { volume: 0.7 });
    physics.vy = 0;
  }

  physics.lastX = x;
  physics.lastZ = z;

  return {
    y: physics.y,
    swimming,
    speedFactor: swimming ? SWIM_SPEED_FACTOR : 1,
    landed,
    grounded: physics.grounded,
  };
}

export const MOTION_CONSTANTS = {
  GRAVITY,
  JUMP_SPEED,
  SWIM_DEPTH_THRESHOLD,
  SWIM_SPEED_FACTOR,
};
