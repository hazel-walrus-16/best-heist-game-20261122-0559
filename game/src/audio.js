// All sound is synthesised with the Web Audio API — no audio files, no
// network. Short blips for pickups and tools, a two-tone siren while the
// alarm is high, and a little fanfare for the getaway.
export function makeAudio() {
  const audio = {
    ctx: null,
    muted: false,
    sirenNodes: null,
  };

  audio.unlock = () => {
    if (audio.ctx) {
      if (audio.ctx.state === 'suspended') audio.ctx.resume();
      return;
    }
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      audio.ctx = new Ctor();
    } catch {
      audio.ctx = null;
    }
  };

  audio.toggleMute = () => {
    audio.muted = !audio.muted;
    if (audio.muted) audio.stopSiren();
    return audio.muted;
  };

  audio.blip = (freq, seconds = 0.09, type = 'sine', gain = 0.12) => {
    if (!audio.ctx || audio.muted) return;
    try {
      const t = audio.ctx.currentTime;
      const osc = audio.ctx.createOscillator();
      const g = audio.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + seconds);
      osc.connect(g).connect(audio.ctx.destination);
      osc.start(t);
      osc.stop(t + seconds);
    } catch {
      // Sound is garnish; a failed blip never breaks the game.
    }
  };

  audio.coin = () => {
    audio.blip(1320, 0.07, 'triangle', 0.1);
    setTimeout(() => audio.blip(1760, 0.1, 'triangle', 0.1), 70);
  };

  audio.pickup = () => {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => audio.blip(f, 0.12, 'triangle', 0.12), i * 80),
    );
  };

  audio.caught = () => {
    [392, 311, 233].forEach((f, i) =>
      setTimeout(() => audio.blip(f, 0.22, 'sawtooth', 0.08), i * 160),
    );
  };

  audio.win = () => {
    [523, 659, 784, 1047, 1319].forEach((f, i) =>
      setTimeout(() => audio.blip(f, 0.18, 'triangle', 0.12), i * 110),
    );
  };

  audio.startSiren = () => {
    if (!audio.ctx || audio.muted || audio.sirenNodes) return;
    try {
      const osc = audio.ctx.createOscillator();
      const g = audio.ctx.createGain();
      const lfo = audio.ctx.createOscillator();
      const lfoGain = audio.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 660;
      lfo.type = 'sine';
      lfo.frequency.value = 2.2;
      lfoGain.gain.value = 220;
      g.gain.value = 0.035;
      lfo.connect(lfoGain).connect(osc.frequency);
      osc.connect(g).connect(audio.ctx.destination);
      osc.start();
      lfo.start();
      audio.sirenNodes = { osc, lfo, g };
    } catch {
      audio.sirenNodes = null;
    }
  };

  audio.stopSiren = () => {
    if (!audio.sirenNodes) return;
    try {
      audio.sirenNodes.osc.stop();
      audio.sirenNodes.lfo.stop();
    } catch {
      // Already stopped.
    }
    audio.sirenNodes = null;
  };

  return audio;
}
