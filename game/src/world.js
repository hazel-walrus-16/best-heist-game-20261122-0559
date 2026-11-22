// The vault hall: walls, display cases, pillars, the vault alcove, the loot
// and the exit. Also the geometry helpers every other module uses: circle
// against rectangles, and line of sight through the room's cover.
import { VIEW, WALL } from './config.js';

// Every solid rectangle in the room: {x, y, w, h, kind}.
// kind is 'wall' | 'case' | 'pillar' | 'vault'. Cases and pillars are the
// safe cover the thief hides behind; the vault walls fence the loot in.
export function buildWorld() {
  const solids = [];
  const add = (x, y, w, h, kind) => solids.push({ x, y, w, h, kind });

  // Outer walls, with a gap on the left wall for the exit door.
  add(0, 0, VIEW.w, WALL, 'wall'); // top
  add(0, VIEW.h - WALL, VIEW.w, WALL, 'wall'); // bottom
  add(0, 0, WALL, 640, 'wall'); // left, above the door
  add(0, 720, WALL, VIEW.h - 720, 'wall'); // left, below the door
  add(VIEW.w - WALL, 0, WALL, VIEW.h, 'wall'); // right

  // Vault alcove, top right: three walls fencing the diamond in, open at
  // the bottom so there is exactly one way in and one way out.
  add(980, 60, 260, WALL, 'vault');
  add(980, 60, WALL, 170, 'vault');
  add(1218, 60, WALL, 170, 'vault');

  // Marble pillars — tall cover that breaks every sight line.
  add(350, 190, 42, 42, 'pillar');
  add(888, 190, 42, 42, 'pillar');
  add(350, 568, 42, 42, 'pillar');
  add(888, 568, 42, 42, 'pillar');

  // Glass display cases — low cover, two routes run between them.
  add(300, 360, 180, 52, 'case');
  add(800, 360, 180, 52, 'case');
  add(560, 118, 160, 52, 'case');
  add(560, 630, 160, 52, 'case');

  return {
    solids,
    loot: { x: 1110, y: 145, radius: 20 },
    exit: { x: 0, y: 640, w: 34, h: 80 }, // the open door in the left wall
    thiefStart: { x: 72, y: 680 },
    // Velvet rope line across the middle, purely visual, drawn by render.
    ropeY: 412,
  };
}

// Push a circle out of every solid rectangle it overlaps. Returns true when
// the circle was moved (it hit something).
export function resolveCircle(solids, body) {
  let hit = false;
  for (const s of solids) {
    const cx = Math.max(s.x, Math.min(body.x, s.x + s.w));
    const cy = Math.max(s.y, Math.min(body.y, s.y + s.h));
    const dx = body.x - cx;
    const dy = body.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= body.radius * body.radius) continue;
    hit = true;
    if (d2 > 0.0001) {
      const d = Math.sqrt(d2);
      body.x = cx + (dx / d) * body.radius;
      body.y = cy + (dy / d) * body.radius;
    } else {
      // Centre inside the rectangle: push out along the shallowest side.
      const left = body.x - s.x;
      const right = s.x + s.w - body.x;
      const top = body.y - s.y;
      const bottom = s.y + s.h - body.y;
      const m = Math.min(left, right, top, bottom);
      if (m === left) body.x = s.x - body.radius;
      else if (m === right) body.x = s.x + s.w + body.radius;
      else if (m === top) body.y = s.y - body.radius;
      else body.y = s.y + s.h + body.radius;
    }
  }
  return hit;
}

// Does the segment (x1,y1)-(x2,y2) cross any solid rectangle? Used for
// vision: a guard or camera cannot see through cases, pillars or walls.
export function lineBlocked(solids, x1, y1, x2, y2) {
  for (const s of solids) {
    if (segmentHitsRect(x1, y1, x2, y2, s)) return true;
  }
  return false;
}

function segmentHitsRect(x1, y1, x2, y2, r) {
  // Quick reject: both ends on the same outside side.
  if (x1 < r.x && x2 < r.x) return false;
  if (x1 > r.x + r.w && x2 > r.x + r.w) return false;
  if (y1 < r.y && y2 < r.y) return false;
  if (y1 > r.y + r.h && y2 > r.y + r.h) return false;
  // An endpoint inside the rectangle means the segment enters it.
  if (pointInRect(x1, y1, r) || pointInRect(x2, y2, r)) return true;
  // Otherwise test the four edges.
  return (
    segmentsCross(x1, y1, x2, y2, r.x, r.y, r.x + r.w, r.y) ||
    segmentsCross(x1, y1, x2, y2, r.x + r.w, r.y, r.x + r.w, r.y + r.h) ||
    segmentsCross(x1, y1, x2, y2, r.x + r.w, r.y + r.h, r.x, r.y + r.h) ||
    segmentsCross(x1, y1, x2, y2, r.x, r.y + r.h, r.x, r.y)
  );
}

function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function segmentsCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  const d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

// Is the point inside a smoke cloud? Smoke blocks sight the same way a
// wall does, but only while it lasts.
export function pointInSmoke(smokes, x, y) {
  for (const s of smokes) {
    const dx = x - s.x;
    const dy = y - s.y;
    if (dx * dx + dy * dy < s.radius * s.radius) return true;
  }
  return false;
}

// Does the segment pass through any smoke cloud?
export function segmentThroughSmoke(smokes, x1, y1, x2, y2) {
  for (const s of smokes) {
    if (segmentThroughCircle(x1, y1, x2, y2, s.x, s.y, s.radius)) return true;
  }
  return false;
}

function segmentThroughCircle(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((cx - x1) * dx + (cy - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const px = x1 + dx * t;
  const py = y1 + dy * t;
  const ddx = px - cx;
  const ddy = py - cy;
  return ddx * ddx + ddy * ddy < r * r;
}
