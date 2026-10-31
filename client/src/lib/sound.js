// Click and hover sound effects, synthesised with Web Audio (no audio files). Off until the browser has seen a user gesture.
let ctx = null;
let enabled = true;
const last = {};
const VOL = 0.3;

export const setSoundEnabled = v => { enabled = !!v; };

export function prepareAudio() {
  if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return false; ctx = new C(); }
  if (ctx.state === 'suspended') ctx.resume();
  return true;
}

function tone(f, at, d, { type = 'sine', g = 0.4, to = null } = {}) {
  const t = ctx.currentTime + at, osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = type; osc.frequency.setValueAtTime(f, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + d);
  gain.gain.setValueAtTime(0.0001, t); gain.gain.exponentialRampToValueAtTime(g * VOL, t + 0.01); gain.gain.exponentialRampToValueAtTime(0.0001, t + d);
  osc.connect(gain).connect(ctx.destination); osc.start(t); osc.stop(t + d + 0.05);
}

function noise(at, d, f0, f1, gainV = 0.5) {
  const len = Math.floor(ctx.sampleRate * d), buf = ctx.createBuffer(1, len, ctx.sampleRate), data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const flt = ctx.createBiquadFilter(); flt.type = 'bandpass'; flt.Q.value = 1.2;
  const t = ctx.currentTime + at; flt.frequency.setValueAtTime(f0, t); flt.frequency.exponentialRampToValueAtTime(f1, t + d);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gainV * VOL, t + d * 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  src.connect(flt).connect(g).connect(ctx.destination); src.start(t);
}

const jitter = f => f * (0.97 + Math.random() * 0.06);
const cues = {
  hover: () => tone(jitter(1800), 0, 0.05, { g: 0.08 }),
  click: () => tone(jitter(420), 0, 0.12, { to: 220, g: 0.5 }),
  focus: () => tone(1400, 0, 0.04, { g: 0.1 }),
  chipOn: () => tone(620, 0, 0.14, { to: 900, g: 0.4 }),
  valid: () => { tone(1320, 0, 0.14, { g: 0.3 }); tone(1760, 0.05, 0.2, { g: 0.22 }); },
  invalid: () => tone(150, 0, 0.22, { to: 90, g: 0.55 }),
  step: () => noise(0, 0.32, 500, 3200, 0.5),
  card: () => noise(0, 0.22, 900, 2600, 0.3),
  section: () => noise(0, 0.45, 1200, 4200, 0.22),
  node: i => tone([392, 440, 494, 523, 587, 659, 698, 784, 880][(i || 0) % 9], 0, 0.28, { type: 'triangle', g: 0.45 }),
  toggle: () => { tone(700, 0, 0.08, { g: 0.35 }); tone(1050, 0.07, 0.12, { g: 0.3 }); },
  success: () => { [523, 659, 784].forEach((f, i) => tone(f, i * 0.13, 0.5, { g: 0.4 })); tone(1568, 0.42, 0.8, { g: 0.18 }); tone(2093, 0.52, 0.8, { g: 0.12 }); },
  error: () => { tone(392, 0, 0.22, { g: 0.4 }); tone(262, 0.16, 0.35, { g: 0.4 }); }
};

export function sfx(name, arg, gap = 120) {
  if (!enabled || !cues[name] || document.hidden || !ctx || ctx.state !== 'running') return;
  const now = performance.now();
  if (now - (last[name] || 0) < gap) return;
  last[name] = now;
  try { cues[name](arg); } catch { /* audio is decorative */ }
}
