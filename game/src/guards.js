// The guards: patrol routes, vision cones, the fair warning before the
// alarm spikes, the chase when they are sure, and the coin lure that pulls
// them off their route.
import { GUARD } from './config.js';
import { lineBlocked, pointInSmoke, resolveCircle, segmentThroughSmoke } from './world.js';

export function makeGuard(name, waypoints, pauseSeconds = 1.6) {
  return {
    name,
    waypoints,
    waypointIndex: 0,
    x: waypoints[0].x,
    y: waypoints[0].y,
    angle: 0,
    pause: 0,
    pauseSeconds,
    radius: GUARD.radius,
    // 0 = calm, rising toward 1 while the thief is in sight. At 1 the guard
    // is sure, chases, and drives the alarm up fast.
    alert: 0,
    chasing: false,
    chaseLost: 0,
    investigating: null, // {x, y, until} while a thrown coin holds attention
    lastSeen: null,
  };
}

export function makeGuards() {
  return [
    // Marco walks the west corridor — the left-hand route to the vault.
    makeGuard('Marco', [
      { x: 180, y: 260 },
      { x: 180, y: 540 },
    ]),
    // Rosa crosses the middle between the two long display cases.
    makeGuard('Rosa', [
      { x: 480, y: 300 },
      { x: 800, y: 300 },
      { x: 800, y: 520 },
      { x: 480, y: 520 },
    ]),
    // Viktor guards the vault door itself, short patrol, long pauses.
    makeGuard('Viktor', [
      { x: 1010, y: 300 },
      { x: 1010, y: 470 },
    ], 2.4),
  ];
}

// Can this guard see the thief right now? Range, cone angle, walls and
// smoke all count; a thief standing in smoke is invisible.
export function guardSeesThief(guard, thief, world, smokes) {
  const dx = thief.x - guard.x;
  const dy = thief.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD.viewRange || dist < 1) return false;
  let diff = Math.atan2(dy, dx) - guard.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > GUARD.halfAngle) return false;
  if (pointInSmoke(smokes, thief.x, thief.y)) return false;
  if (segmentThroughSmoke(smokes, guard.x, guard.y, thief.x, thief.y)) return false;
  if (lineBlocked(world.solids, guard.x, guard.y, thief.x, thief.y)) return false;
  return true;
}

export function updateGuard(guard, dt, thief, world, smokes, now, sneakFactor = 1) {
  const sees = guardSeesThief(guard, thief, world, smokes);

  if (sees) {
    // A sneaking thief is harder to be sure about: the warning lasts longer.
    guard.alert = Math.min(1, guard.alert + (dt * sneakFactor) / GUARD.spotTime);
    guard.lastSeen = { x: thief.x, y: thief.y };
    guard.chaseLost = 0;
  } else {
    guard.alert = Math.max(0, guard.alert - dt / 1.4);
    if (guard.chasing) guard.chaseLost += dt;
  }

  // A coin lure beats a patrol: walk to the coin, look around, go back.
  if (guard.investigating) {
    if (now > guard.investigating.until || guard.alert >= 1) {
      guard.investigating = null;
    } else {
      walkToward(guard, guard.investigating.x, guard.investigating.y, GUARD.patrolSpeed, dt, world);
      return;
    }
  }

  // Fully alerted and the thief in sight: chase. Lose the trail for two
  // seconds and the guard gives up and returns to the patrol.
  if (guard.alert >= 1 && sees) {
    guard.chasing = true;
    walkToward(guard, thief.x, thief.y, GUARD.chaseSpeed, dt, world);
    return;
  }
  if (guard.chasing) {
    if (guard.chaseLost > 2 || guard.alert <= 0) {
      guard.chasing = false;
    } else if (guard.lastSeen) {
      walkToward(guard, guard.lastSeen.x, guard.lastSeen.y, GUARD.chaseSpeed, dt, world);
      return;
    }
  }

  // Patrol: walk to the next waypoint, pause and look around, move on.
  if (guard.pause > 0) {
    guard.pause -= dt;
    guard.angle += Math.sin(now * 0.9 + guard.waypoints.length) * dt * 0.45;
    return;
  }
  const target = guard.waypoints[guard.waypointIndex];
  const arrived = walkToward(guard, target.x, target.y, GUARD.patrolSpeed, dt, world);
  if (arrived) {
    guard.pause = guard.pauseSeconds;
    guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
  }
}

function walkToward(guard, tx, ty, speed, dt, world) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return true;
  const step = Math.min(dist, speed * dt);
  guard.x += (dx / dist) * step;
  guard.y += (dy / dist) * step;
  guard.angle = Math.atan2(dy, dx);
  // Guards slide around cover the same way the thief does.
  resolveCircle(world.solids, guard);
  return dist - step < 4;
}

// A thrown coin lands: the nearest guard in range abandons the patrol.
export function lureGuards(guards, x, y, now, lureRange, investigateSeconds) {
  let best = null;
  let bestDist = lureRange;
  for (const g of guards) {
    const d = Math.hypot(g.x - x, g.y - y);
    if (d < bestDist) {
      best = g;
      bestDist = d;
    }
  }
  if (!best) return null;
  best.investigating = { x, y, until: now + investigateSeconds };
  best.chasing = false;
  return best;
}
