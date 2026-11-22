// Keyboard and mouse: WASD or arrows to move, Shift to sneak, click to
// walk to a spot, Q for a smoke bomb, F to toss a coin at the cursor,
// Enter to start, R to restart, M to mute. Nothing here knows about the
// game rules — it only reports what the player is doing.
export function makeInput(canvas) {
  const input = {
    keys: new Set(),
    // Mouse position in canvas pixels, and the last click-to-move target.
    mouseX: 0,
    mouseY: 0,
    moveTarget: null,
    // One-shot actions, consumed by the game loop each frame.
    pressed: { smoke: false, coin: false, start: false, restart: false, mute: false },
  };

  const keyMap = {
    KeyQ: 'smoke',
    KeyF: 'coin',
    Enter: 'start',
    KeyR: 'restart',
    KeyM: 'mute',
  };

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    input.keys.add(event.code);
    const action = keyMap[event.code];
    if (action) input.pressed[action] = true;
  });
  window.addEventListener('keyup', (event) => input.keys.delete(event.code));
  window.addEventListener('blur', () => input.keys.clear());

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  canvas.addEventListener('mousemove', (event) => {
    const p = canvasPoint(event);
    input.mouseX = p.x;
    input.mouseY = p.y;
  });
  canvas.addEventListener('mousedown', (event) => {
    const p = canvasPoint(event);
    input.mouseX = p.x;
    input.mouseY = p.y;
    input.moveTarget = { x: p.x, y: p.y };
  });

  // Direction from the held movement keys, normalised.
  input.moveVector = () => {
    let x = 0;
    let y = 0;
    if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) x -= 1;
    if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) x += 1;
    if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) y -= 1;
    if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) y += 1;
    if (x === 0 && y === 0) return null;
    const len = Math.hypot(x, y);
    return { x: x / len, y: y / len };
  };

  input.sneaking = () =>
    input.keys.has('ShiftLeft') || input.keys.has('ShiftRight');

  input.consume = () => {
    const out = { ...input.pressed };
    input.pressed = { smoke: false, coin: false, start: false, restart: false, mute: false };
    return out;
  };

  return input;
}
