// Tuning and palette for The Gilded Vault. One place holds every number the
// other modules read, so balancing the heist never means hunting literals.
export const VIEW = { w: 1280, h: 800 };
export const WALL = 22;

export const COLORS = {
  floor: '#171722',
  floorTile: '#1c1c2b',
  carpet: '#232033',
  wall: '#3a3450',
  wallTop: '#4c4666',
  caseGlass: '#2c3e55',
  caseEdge: '#6b7fa3',
  pillar: '#453f5e',
  pillarTop: '#5a5378',
  gold: '#f5c542',
  goldGlow: '#ffe9a3',
  exit: '#39d98a',
  cone: 'rgba(255, 64, 64, 0.20)',
  coneEdge: 'rgba(255, 90, 90, 0.55)',
  camCone: 'rgba(255, 170, 40, 0.16)',
  camConeEdge: 'rgba(255, 190, 80, 0.5)',
  thief: '#7ee7ff',
  guard: '#ff6b6b',
  smoke: 'rgba(190, 190, 205, 0.55)',
  text: '#f2ead8',
  dim: '#9a94b0',
};

export const THIEF = {
  radius: 14,
  walkSpeed: 185,
  sneakSpeed: 105,
  clickSpeed: 185,
};

export const GUARD = {
  radius: 15,
  patrolSpeed: 72,
  chaseSpeed: 158,
  viewRange: 205,
  halfAngle: 0.62,
  spotTime: 0.75, // seconds of sight before the guard is fully alerted
  catchDistance: 30,
  investigateTime: 4,
};

export const CAMERA = {
  viewRange: 235,
  halfAngle: 0.5,
  sweepSpeed: 0.55, // radians per second
  sweepArc: 0.85,
};

export const ALARM = {
  guardRate: 26, // per second while a fully-alerted guard sees the thief
  cameraRate: 17, // per second while a camera sees the thief
  decayRate: 7, // per second while nobody sees the thief
  warnAt: 55, // HUD flashes and the siren starts above this
};

export const TOOLS = {
  smokeCount: 2,
  smokeRadius: 95,
  smokeSeconds: 5,
  coinCount: 3,
  coinLureRange: 320,
  coinFlySeconds: 0.45,
};

export const LOOT_VALUE = 2400000;
