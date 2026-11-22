// The Gilded Vault — game loop, rules and state. One room, one thief, three
// guards, two cameras, one diamond. Grab the loot, reach the exit, and do
// not let the alarm reach 100%.
import { VIEW, WALL, THIEF, GUARD, ALARM, TOOLS } from './config.js';
import { buildWorld, resolveCircle } from './world.js';
import { makeGuards, updateGuard, guardSeesThief, lureGuards } from './guards.js';
import { makeCameras, updateCamera, cameraSeesThief } from './cameras.js';
import { makeInput } from './input.js';
import { makeAudio } from './audio.js';
import {
  drawRoom, drawLoot, drawCones, drawGuards, drawCameras, drawThief,
  drawTools, drawHud, drawTitle, drawCaught, drawWin,
} from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = makeInput(canvas);
const audio = makeAudio();

const world = buildWorld();

function freshState() {
  return {
    phase: 'title', // title | playing | caught | won
    thief: {
      x: world.thiefStart.x,
      y: world.thiefStart.y,
      radius: THIEF.radius,
      sneaking: false,
    },
    guards: makeGuards(),
    cameras: makeCameras(),
    smokes: [], // {x, y, radius, until}
    coins: [], // {x, y, fromX, fromY, t, landed}
    alarm: 0,
    alarmPeak: 0,
    lootTaken: false,
    elapsed: 0,
    smokeLeft: TOOLS.smokeCount,
    coinsLeft: TOOLS.coinCount,
    now: 0,
    winAt: 0,
  };
}

let state = freshState();

function reset() {
  state = freshState();
  state.phase = 'playing';
}

// Screenshot modes, set with ?shot=start|tense|loot|caught. Each one puts
// the real game into a real state — the same states play can reach — and
// lets it run from there, so the screenshots are the game itself.
function applyShotMode() {
  const shot = new URLSearchParams(window.location.search).get('shot');
  if (!shot) return;
  state.phase = 'playing';
  // Let the patrols settle into mid-route positions first.
  for (let i = 0; i < 150; i++) step(1 / 60, true);
  if (shot === 'start') {
    // Opening view: thief at the door, guards on patrol, cones sweeping.
  } else if (shot === 'tense') {
    // Rosa walks east along the middle row straight at the thief, who is
    // standing in her cone: the warning "!" is up and the alarm is climbing.
    state.thief.x = 700;
    state.thief.y = 300;
    state.alarm = 55;
    state.alarmPeak = 55;
    state.guards[1].x = 480;
    state.guards[1].y = 300;
    state.guards[1].waypointIndex = 1;
    state.guards[1].pause = 0;
    state.guards[1].angle = 0;
    state.guards[1].alert = 0.55;
    state.smokes.push({ x: 430, y: 430, radius: TOOLS.smokeRadius, until: state.now + 4 });
    state.smokeLeft = 1;
  } else if (shot === 'loot') {
    state.lootTaken = true;
    state.thief.x = 1108;
    state.thief.y = 300;
    state.alarm = 28;
    state.alarmPeak = 41;
    state.elapsed = 47;
  } else if (shot === 'caught') {
    state.phase = 'caught';
    state.alarm = 100;
    state.alarmPeak = 100;
    state.thief.x = 1010;
    state.thief.y = 380;
    state.guards[2].x = 1010;
    state.guards[2].y = 410;
    state.guards[2].alert = 1;
    state.guards[2].chasing = true;
    state.elapsed = 63;
  }
}

function deploySmoke() {
  if (state.smokeLeft <= 0) return;
  state.smokeLeft -= 1;
  state.smokes.push({
    x: state.thief.x,
    y: state.thief.y,
    radius: TOOLS.smokeRadius,
    until: state.now + TOOLS.smokeSeconds,
  });
  audio.blip(220, 0.25, 'sine', 0.1);
}

function tossCoin() {
  if (state.coinsLeft <= 0) return;
  state.coinsLeft -= 1;
  const tx = input.mouseX || state.thief.x + 160;
  const ty = input.mouseY || state.thief.y;
  state.coins.push({
    fromX: state.thief.x,
    fromY: state.thief.y,
    x: tx,
    y: ty,
    t: 0,
    landed: false,
  });
  audio.coin();
}

function moveThief(dt, vec) {
  const speed = state.thief.sneaking ? THIEF.sneakSpeed : THIEF.walkSpeed;
  state.thief.x += vec.x * speed * dt;
  state.thief.y += vec.y * speed * dt;
  state.thief.x = Math.max(WALL + state.thief.radius, Math.min(VIEW.w - WALL - state.thief.radius, state.thief.x));
  state.thief.y = Math.max(WALL + state.thief.radius, Math.min(VIEW.h - WALL - state.thief.radius, state.thief.y));
  resolveCircle(world.solids, state.thief);
}

function step(dt, quiet = false) {
  state.now += dt;
  if (state.phase !== 'playing') return;
  state.elapsed += dt;

  const actions = quiet ? { smoke: false, coin: false, start: false, restart: false, mute: false } : input.consume();
  if (actions.mute) audio.toggleMute();
  if (actions.restart) {
    reset();
    return;
  }
  if (actions.smoke) deploySmoke();
  if (actions.coin) tossCoin();

  // Movement: keys win over click-to-move; a keypress cancels the click.
  const vec = input.moveVector();
  state.thief.sneaking = input.sneaking();
  if (vec) {
    input.moveTarget = null;
    moveThief(dt, vec);
  } else if (input.moveTarget) {
    const dx = input.moveTarget.x - state.thief.x;
    const dy = input.moveTarget.y - state.thief.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 6) {
      input.moveTarget = null;
    } else {
      moveThief(dt, { x: dx / dist, y: dy / dist });
    }
  }

  // Coins fly, land, and pull the nearest guard off patrol.
  for (const coin of state.coins) {
    if (coin.landed) continue;
    coin.t += dt / TOOLS.coinFlySeconds;
    if (coin.t >= 1) {
      coin.landed = true;
      const lured = lureGuards(state.guards, coin.x, coin.y, state.now, TOOLS.coinLureRange, GUARD.investigateTime);
      if (lured && !quiet) audio.blip(880, 0.08, 'triangle', 0.08);
    }
  }
  // Coins stay where they land until the run ends; only three can exist.

  // Smoke fades.
  state.smokes = state.smokes.filter((s) => state.now < s.until);

  // Guards and cameras. Sneaking only slows how fast a guard gets sure of
  // what it saw — patrols keep their own pace.
  const sneakFactor = state.thief.sneaking ? 0.5 : 1;
  for (const g of state.guards) updateGuard(g, dt, state.thief, world, state.smokes, state.now, sneakFactor);
  for (const c of state.cameras) updateCamera(c, dt, state.now);

  // The alarm: rises while anyone sees the thief, decays while hidden.
  let seenByGuard = false;
  let seenByCamera = false;
  for (const g of state.guards) {
    if (guardSeesThief(g, state.thief, world, state.smokes) && g.alert > 0.6) seenByGuard = true;
  }
  for (const c of state.cameras) {
    if (cameraSeesThief(c, state.thief, world, state.smokes, state.now)) seenByCamera = true;
  }
  if (seenByGuard) state.alarm += ALARM.guardRate * dt;
  if (seenByCamera) state.alarm += ALARM.cameraRate * dt;
  if (!seenByGuard && !seenByCamera) state.alarm -= ALARM.decayRate * dt;
  state.alarm = Math.max(0, Math.min(100, state.alarm));
  state.alarmPeak = Math.max(state.alarmPeak, state.alarm);
  if (state.alarm >= ALARM.warnAt) audio.startSiren();
  else audio.stopSiren();

  // Caught by touch: a chasing guard that reaches the thief ends the run.
  for (const g of state.guards) {
    if (g.chasing && Math.hypot(g.x - state.thief.x, g.y - state.thief.y) < GUARD.catchDistance) {
      endRun('caught');
      return;
    }
  }
  if (state.alarm >= 100) {
    endRun('caught');
    return;
  }

  // The loot, then the door.
  if (!state.lootTaken && Math.hypot(state.thief.x - world.loot.x, state.thief.y - world.loot.y) < 34) {
    state.lootTaken = true;
    if (!quiet) audio.pickup();
  }
  if (state.lootTaken && state.thief.x < 40 && state.thief.y > world.exit.y && state.thief.y < world.exit.y + world.exit.h) {
    endRun('won');
  }
}

function endRun(phase) {
  state.phase = phase;
  audio.stopSiren();
  if (phase === 'caught') audio.caught();
  else audio.win();
  document.getElementById('status').textContent =
    phase === 'caught'
      ? `Caught. Alarm reached ${Math.round(state.alarmPeak)} percent.`
      : 'Clean getaway. The Star of Midnight is yours.';
}

function draw() {
  ctx.clearRect(0, 0, VIEW.w, VIEW.h);
  drawRoom(ctx, world);
  if (state.phase !== 'title') {
    drawCones(ctx, state.guards, state.cameras, state.now);
  }
  drawLoot(ctx, world, state.lootTaken, state.now);
  drawCameras(ctx, state.cameras, state.now);
  drawGuards(ctx, state.guards);
  drawThief(ctx, state.thief, state.now);
  drawTools(ctx, state.smokes, state.coins, state.now);
  drawHud(ctx, state);
  if (state.phase === 'title') drawTitle(ctx);
  else if (state.phase === 'caught') drawCaught(ctx, state);
  else if (state.phase === 'won') drawWin(ctx, state);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (state.phase === 'title') {
    const actions = input.consume();
    if (actions.start) {
      audio.unlock();
      state.phase = 'playing';
    }
    if (actions.mute) audio.toggleMute();
    // The room lives behind the title so the first frame already shows it.
    state.now += dt;
    for (const g of state.guards) updateGuard(g, dt, state.thief, world, state.smokes, state.now);
    for (const c of state.cameras) updateCamera(c, dt, state.now);
  } else if (state.phase === 'caught' || state.phase === 'won') {
    const actions = input.consume();
    if (actions.restart || actions.start) {
      audio.unlock();
      reset();
    }
  } else {
    audio.unlock();
    step(dt);
  }
  draw();
  requestAnimationFrame(frame);
}

// Clicking the canvas on the title screen starts the heist too.
canvas.addEventListener('mousedown', () => {
  if (state.phase === 'title') {
    audio.unlock();
    state.phase = 'playing';
    input.moveTarget = null;
  }
});

applyShotMode();

// A small handle for automated playtests: read-only state plus the phase.
window.HEIST = {
  state: () => ({
    phase: state.phase,
    alarm: state.alarm,
    lootTaken: state.lootTaken,
    thief: { x: state.thief.x, y: state.thief.y },
    guards: state.guards.map((g) => ({ name: g.name, x: g.x, y: g.y, alert: g.alert, chasing: g.chasing })),
    smokeLeft: state.smokeLeft,
    coinsLeft: state.coinsLeft,
    elapsed: state.elapsed,
  }),
  start: () => { state.phase = 'playing'; },
  reset,
};

requestAnimationFrame(frame);
