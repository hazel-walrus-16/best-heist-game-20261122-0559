// Every pixel of the game: the vault hall, the vision cones, the thief, the
// guards and cameras, the loot, the smoke and coins, the HUD with its alarm
// meter, and the title, caught and getaway screens.
import { COLORS, VIEW, WALL, GUARD, CAMERA, LOOT_VALUE } from './config.js';

function conePath(ctx, x, y, angle, range, halfAngle) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawRoom(ctx, world) {
  // Floor: dark tiles with a deep-red carpet runner down the middle.
  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  ctx.fillStyle = COLORS.floorTile;
  for (let x = WALL; x < VIEW.w - WALL; x += 64) {
    for (let y = WALL; y < VIEW.h - WALL; y += 64) {
      if (((x + y) / 64) % 2 === 0) ctx.fillRect(x, y, 62, 62);
    }
  }
  ctx.fillStyle = COLORS.carpet;
  ctx.fillRect(560, WALL, 160, VIEW.h - WALL * 2);

  // Velvet rope across the middle of the hall.
  ctx.strokeStyle = '#8a2f3d';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(300, world.ropeY);
  ctx.lineTo(980, world.ropeY);
  ctx.stroke();
  ctx.fillStyle = '#c9a227';
  for (let x = 320; x <= 960; x += 80) {
    ctx.beginPath();
    ctx.arc(x, world.ropeY, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Solids: walls, vault, pillars, cases.
  for (const s of world.solids) {
    if (s.kind === 'wall' || s.kind === 'vault') {
      ctx.fillStyle = COLORS.wall;
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = COLORS.wallTop;
      ctx.fillRect(s.x, s.y, s.w, 4);
    } else if (s.kind === 'pillar') {
      ctx.fillStyle = COLORS.pillar;
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = COLORS.pillarTop;
      ctx.fillRect(s.x + 5, s.y + 5, s.w - 10, s.h - 10);
      ctx.strokeStyle = '#2c2840';
      ctx.lineWidth = 2;
      ctx.strokeRect(s.x, s.y, s.w, s.h);
    } else if (s.kind === 'case') {
      ctx.fillStyle = COLORS.caseGlass;
      roundRect(ctx, s.x, s.y, s.w, s.h, 8);
      ctx.fill();
      ctx.strokeStyle = COLORS.caseEdge;
      ctx.lineWidth = 3;
      ctx.stroke();
      // A glint of something small and precious inside each case.
      ctx.fillStyle = COLORS.gold;
      ctx.beginPath();
      ctx.arc(s.x + s.w / 2, s.y + s.h / 2, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // The vault alcove glows gold; the diamond sits on its pedestal.
  const glow = ctx.createRadialGradient(1110, 145, 10, 1110, 145, 150);
  glow.addColorStop(0, 'rgba(245, 197, 66, 0.28)');
  glow.addColorStop(1, 'rgba(245, 197, 66, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(960, 40, 300, 210);

  // Exit door in the left wall, green and obvious.
  ctx.fillStyle = COLORS.exit;
  ctx.fillRect(0, world.exit.y, 10, world.exit.h);
  ctx.fillStyle = 'rgba(57, 217, 138, 0.25)';
  ctx.fillRect(10, world.exit.y, 46, world.exit.h);
  ctx.fillStyle = COLORS.exit;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('EXIT', 14, world.exit.y + world.exit.h / 2 + 5);
}

export function drawLoot(ctx, world, taken, time) {
  if (taken) return;
  const pulse = 1 + Math.sin(time * 4) * 0.12;
  const { x, y } = world.loot;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = COLORS.goldGlow;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(14, -4);
  ctx.lineTo(0, 18);
  ctx.lineTo(-14, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#fff6cf';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 246, 207, 0.8)';
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(0, 18);
  ctx.moveTo(-14, -4);
  ctx.lineTo(14, -4);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('STAR OF MIDNIGHT', x, y + 38);
}

export function drawCones(ctx, guards, cameras, now) {
  for (const cam of cameras) {
    if (now < cam.disabledUntil) continue;
    conePath(ctx, cam.x, cam.y, cam.angle, CAMERA.viewRange, CAMERA.halfAngle);
    ctx.fillStyle = COLORS.camCone;
    ctx.fill();
    ctx.strokeStyle = COLORS.camConeEdge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  for (const g of guards) {
    const range = g.chasing ? GUARD.viewRange * 1.15 : GUARD.viewRange;
    conePath(ctx, g.x, g.y, g.angle, range, GUARD.halfAngle);
    ctx.fillStyle = g.alert > 0.25 ? 'rgba(255, 64, 64, 0.34)' : COLORS.cone;
    ctx.fill();
    ctx.strokeStyle = COLORS.coneEdge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

export function drawGuards(ctx, guards) {
  for (const g of guards) {
    // Shadow.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(g.x, g.y + 12, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body: a guard in a dark uniform with a red cap.
    ctx.fillStyle = '#2e3448';
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLORS.guard;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = COLORS.guard;
    ctx.beginPath();
    ctx.arc(g.x, g.y - 4, 6, 0, Math.PI * 2);
    ctx.fill();
    // Facing tick.
    ctx.strokeStyle = '#f2ead8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + Math.cos(g.angle) * (g.radius + 6), g.y + Math.sin(g.angle) * (g.radius + 6));
    ctx.stroke();
    // Name tag.
    ctx.fillStyle = COLORS.dim;
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(g.name, g.x, g.y - g.radius - 8);
    // The fair warning: "!" grows as the guard gets sure, before the
    // alarm spikes.
    if (g.alert > 0.2) {
      const size = 20 + g.alert * 14;
      ctx.fillStyle = g.alert >= 1 ? '#ff2e2e' : '#ffd23e';
      ctx.font = `bold ${Math.round(size)}px system-ui, sans-serif`;
      ctx.fillText('!', g.x, g.y - g.radius - 24);
    }
    if (g.investigating) {
      ctx.fillStyle = '#ffd23e';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText('?', g.x, g.y - g.radius - 24);
    }
  }
}

export function drawCameras(ctx, cameras, now) {
  for (const cam of cameras) {
    const off = now < cam.disabledUntil;
    ctx.fillStyle = '#20242e';
    ctx.fillRect(cam.x - 12, cam.y - 8, 24, 16);
    ctx.strokeStyle = off ? '#666' : '#ffb450';
    ctx.lineWidth = 2;
    ctx.strokeRect(cam.x - 12, cam.y - 8, 24, 16);
    ctx.fillStyle = off ? '#555' : '#ff3b30';
    ctx.beginPath();
    ctx.arc(cam.x + 8, cam.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    if (off) {
      ctx.fillStyle = '#9a94b0';
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('OFF', cam.x, cam.y + 24);
    }
  }
}

export function drawThief(ctx, thief, time) {
  const bob = Math.sin(time * 10) * 1.5;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(thief.x, thief.y + 12, 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Hooded figure in dark blue, cyan scarf — the thief.
  ctx.fillStyle = '#1f2a44';
  ctx.beginPath();
  ctx.arc(thief.x, thief.y + bob * 0.3, thief.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.thief;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = COLORS.thief;
  ctx.beginPath();
  ctx.arc(thief.x, thief.y - 3 + bob * 0.3, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0a0a12';
  ctx.beginPath();
  ctx.arc(thief.x - 2, thief.y - 3 + bob * 0.3, 1.6, 0, Math.PI * 2);
  ctx.arc(thief.x + 2, thief.y - 3 + bob * 0.3, 1.6, 0, Math.PI * 2);
  ctx.fill();
  if (thief.sneaking) {
    ctx.fillStyle = COLORS.thief;
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('sneaking', thief.x, thief.y - thief.radius - 8);
  }
}

export function drawTools(ctx, smokes, coins, now) {
  for (const s of smokes) {
    const fade = Math.max(0, Math.min(1, (s.until - now) / 1.2));
    ctx.fillStyle = `rgba(190, 190, 205, ${0.55 * fade})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(230, 230, 240, ${0.7 * fade})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = `rgba(40, 40, 55, ${0.8 * fade})`;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SMOKE', s.x, s.y + 4);
  }
  for (const c of coins) {
    if (c.landed) {
      ctx.fillStyle = COLORS.gold;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff6cf';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 11, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = COLORS.gold;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawHud(ctx, state) {
  const { alarm, lootTaken, smokeLeft, coinsLeft, elapsed, phase } = state;
  // Top bar.
  ctx.fillStyle = 'rgba(8, 8, 16, 0.82)';
  ctx.fillRect(0, 0, VIEW.w, 52);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('THE GILDED VAULT', 18, 33);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = COLORS.dim;
  ctx.fillText(lootTaken ? 'Loot secured — reach the EXIT!' : 'Steal the Star of Midnight, then escape.', 240, 33);

  // Alarm meter.
  const barX = 640;
  const barW = 300;
  ctx.fillStyle = '#2a1218';
  roundRect(ctx, barX, 16, barW, 20, 10);
  ctx.fill();
  const alarmFrac = Math.max(0, Math.min(1, alarm / 100));
  const alarmColor = alarm >= 55 ? '#ff2e2e' : alarm >= 25 ? '#ff9f1c' : '#ffd23e';
  if (alarmFrac > 0) {
    ctx.fillStyle = alarmColor;
    roundRect(ctx, barX, 16, barW * alarmFrac, 20, 10);
    ctx.fill();
  }
  ctx.strokeStyle = alarm >= 55 ? '#ff2e2e' : '#6b5a6b';
  ctx.lineWidth = 2;
  roundRect(ctx, barX, 16, barW, 20, 10);
  ctx.stroke();
  ctx.fillStyle = alarm >= 55 && Math.floor(performance.now() / 300) % 2 === 0 ? '#ff6b6b' : COLORS.text;
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(`ALARM ${Math.round(alarm)}%`, barX + barW + 12, 32);

  // Tools and timer, right side.
  ctx.fillStyle = COLORS.text;
  ctx.font = '14px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`Smoke Q ×${smokeLeft}    Coin F ×${coinsLeft}`, VIEW.w - 18, 22);
  const mins = Math.floor(elapsed / 60);
  const secs = Math.floor(elapsed % 60).toString().padStart(2, '0');
  ctx.fillStyle = COLORS.dim;
  ctx.fillText(`${mins}:${secs}`, VIEW.w - 18, 42);

  // Objective chip at the bottom.
  if (phase === 'playing') {
    ctx.fillStyle = 'rgba(8, 8, 16, 0.7)';
    roundRect(ctx, VIEW.w / 2 - 260, VIEW.h - 38, 520, 26, 13);
    ctx.fill();
    ctx.fillStyle = COLORS.dim;
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WASD / arrows move · click to walk · Shift sneak · Q smoke · F toss coin · M mute', VIEW.w / 2, VIEW.h - 20);
  }
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(6, 6, 12, 0.72)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  ctx.fillStyle = accent;
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, VIEW.w / 2, 300);
  ctx.fillStyle = COLORS.text;
  ctx.font = '18px system-ui, sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, VIEW.w / 2, 350 + i * 30));
}

export function drawTitle(ctx) {
  overlay(ctx, 'THE GILDED VAULT', [
    'Midnight. One diamond. Three guards, two cameras, one way out.',
    'Sneak past the cones, grab the Star of Midnight, and vanish.',
    '',
    'Click or press Enter to begin the heist',
  ], COLORS.gold);
}

export function drawCaught(ctx, state) {
  overlay(ctx, 'CAUGHT!', [
    `The alarm hit 100% — the guards closed in after ${Math.round(state.elapsed)} seconds.`,
    state.lootTaken ? 'You had the diamond in hand. So close.' : 'The Star of Midnight is still in its case.',
    '',
    'Press R to try again — watch the cones, use the smoke.',
  ], '#ff2e2e');
}

export function drawWin(ctx, state) {
  const mins = Math.floor(state.elapsed / 60);
  const secs = Math.floor(state.elapsed % 60).toString().padStart(2, '0');
  const rating =
    state.alarmPeak < 30 ? 'GHOST — never even noticed' :
    state.alarmPeak < 70 ? 'CLEAN — a whisper of an alarm' :
    'LOUD — but the diamond is yours';
  overlay(ctx, 'CLEAN GETAWAY!', [
    `The Star of Midnight is yours — $${LOOT_VALUE.toLocaleString('en-US')} in one night's work.`,
    `Time ${mins}:${secs} · highest alarm ${Math.round(state.alarmPeak)}% · ${rating}.`,
    '',
    'Press R to run it again, quieter this time.',
  ], COLORS.exit);
}
