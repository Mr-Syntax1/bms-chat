// ---------------------------------------------------------------------------
// waterQueries.js — پرس‌وجوهای مکانی آب (بدون JSX تا Fast Refresh سالم بماند)
// ---------------------------------------------------------------------------
import { WATERFALL, POND, WATER_LEVEL, getGroundHeight, riverDistance } from './terrain';

export function waterfallLandingPoint() {
  return { x: WATERFALL.x, z: WATERFALL.z + 1.4, y: WATER_LEVEL };
}

export function nearWaterfall(x, z, radius = 14) {
  return Math.hypot(x - WATERFALL.x, z - WATERFALL.z) < radius;
}

export function nearRiver(x, z, radius = 5) {
  return riverDistance(x, z) < radius;
}

export function nearPond(x, z, radius = POND.radius) {
  return Math.hypot(x - POND.x, z - POND.z) < radius;
}

export function waterfallHeightAt(x, z) {
  return getGroundHeight(x, z);
}

export { WATERFALL, POND, WATER_LEVEL };
