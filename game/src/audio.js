// Sound: WebAudio only, no files. Tiny synth blips for engine, siren, shots, pickups.
export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  function ensure() {
    if (ctx) return ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      engineOsc = ctx.createOscillator();
      engineGain = ctx.createGain();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain.gain.value = 0;
      engineOsc.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();
    } catch { ctx = null; }
    return ctx;
  }
  function blip(freq, dur, type, vol) {
    if (!ensure()) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type || 'square';
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.12, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + dur);
    } catch { /* sound is polish, never a crash */ }
  }
  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    engine(on, speed) {
      if (!ensure()) return;
      try {
        engineGain.gain.value = on ? 0.03 + Math.min(0.05, speed * 0.001) : 0;
        engineOsc.frequency.value = 55 + speed * 1.6;
      } catch { /* ignore */ }
    },
    siren(on) { if (on) blip(880, 0.18, 'sine', 0.06); },
    shoot() { blip(220, 0.09, 'square', 0.16); },
    hit() { blip(140, 0.15, 'sawtooth', 0.14); },
    pickup() { blip(660, 0.12, 'sine', 0.14); setTimeout(() => blip(990, 0.14, 'sine', 0.12), 90); },
    mission() { [523, 659, 784].forEach((f, i) => setTimeout(() => blip(f, 0.18, 'sine', 0.13), i * 110)); },
    busted() { [392, 311, 233].forEach((f, i) => setTimeout(() => blip(f, 0.25, 'sawtooth', 0.12), i * 160)); },
  };
}
