// The security cameras: fixed to the walls, sweeping their cones back and
// forth on a steady rhythm the thief can learn and time.
import { CAMERA } from './config.js';
import { lineBlocked, pointInSmoke, segmentThroughSmoke } from './world.js';

export function makeCamera(name, x, y, baseAngle) {
  return {
    name,
    x,
    y,
    baseAngle,
    angle: baseAngle,
    disabledUntil: 0, // EMP or smoke-out: not used by the smoke bomb, kept
    // so a future tool can switch a camera off the same way.
    sweepPhase: Math.random() * Math.PI * 2,
  };
}

export function makeCameras() {
  return [
    // Over the north wall, sweeping the hall's top half.
    makeCamera('Cam North', 640, 26, Math.PI / 2),
    // On the east wall, sweeping the vault approach.
    makeCamera('Cam East', 1254, 430, Math.PI),
  ];
}

export function updateCamera(camera, dt, now) {
  const sweep = Math.sin(now * CAMERA.sweepSpeed + camera.sweepPhase);
  camera.angle = camera.baseAngle + sweep * CAMERA.sweepArc;
}

export function cameraSeesThief(camera, thief, world, smokes, now) {
  if (now < camera.disabledUntil) return false;
  const dx = thief.x - camera.x;
  const dy = thief.y - camera.y;
  const dist = Math.hypot(dx, dy);
  if (dist > CAMERA.viewRange || dist < 1) return false;
  let diff = Math.atan2(dy, dx) - camera.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > CAMERA.halfAngle) return false;
  if (pointInSmoke(smokes, thief.x, thief.y)) return false;
  if (segmentThroughSmoke(smokes, camera.x, camera.y, thief.x, thief.y)) return false;
  if (lineBlocked(world.solids, camera.x, camera.y, thief.x, thief.y)) return false;
  return true;
}
