// ─── SOUND ───
// Everything is synthesized: no audio files. Placing a digit is mostly touch (a short filtered
// click, like a key or a wooden tile) with a quiet pitched body underneath. Pitches come from one
// warm chord in a low register, so a run of moves never turns into a jingle. Completions ring a
// little longer through a soft room reverb.

// D major 9 voiced low to high, index = digit.
const CHORD = [0, 146.83, 185.0, 220.0, 277.18, 329.63, 369.99, 440.0, 554.37, 659.25];
const ROOT = 73.42; // D2

let ctx = null, out = null, dry = null, wet = null, volume = 0.5, enabled = true, haptics = true, voice = "wood";

// Three instruments. `partials` are [ratio, gain, decay multiplier]; `body` is the noise transient.
export const VOICES = {
  wood: {
    label: "Crisp", partials: [[1, 1, 1], [3.93, 0.28, 0.25], [9.2, 0.06, 0.1]], decay: 0.38, attack: 0.002,
    body: { freq: 1400, q: 1.4, gain: 0.5, len: 0.018 }, lowpass: 3800, wet: 0.14,
  },
  felt: {
    label: "Soft", partials: [[1, 1, 1], [2, 0.32, 0.6], [3, 0.12, 0.4]], decay: 0.55, attack: 0.008,
    body: { freq: 700, q: 0.8, gain: 0.35, len: 0.03 }, lowpass: 1900, wet: 0.2,
  },
  glass: {
    label: "Bright", partials: [[1, 0.8, 1], [2.76, 0.35, 0.6], [5.4, 0.16, 0.35], [8.93, 0.06, 0.2]], decay: 1.1, attack: 0.002,
    body: { freq: 5200, q: 2.2, gain: 0.18, len: 0.008 }, lowpass: 7000, wet: 0.3,
  },
};

// A short, dark room: decaying stereo noise as the impulse response.
function impulse(a, seconds = 1.8) {
  const len = Math.floor(a.sampleRate * seconds);
  const buf = a.createBuffer(2, len, a.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let k = 0; k < len; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / len, 3.2);
  }
  return buf;
}

function audio() {
  if (!enabled) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { enabled = false; return null; }
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3; comp.attack.value = 0.003; comp.release.value = 0.2;
    out = ctx.createGain();
    out.connect(comp).connect(ctx.destination);
    dry = ctx.createGain(); dry.connect(out);
    const verb = ctx.createConvolver(); verb.buffer = impulse(ctx);
    const tone = ctx.createBiquadFilter(); tone.type = "lowpass"; tone.frequency.value = 2400;
    wet = ctx.createGain();
    wet.connect(tone).connect(verb).connect(out);
  }
  if (ctx.state === "suspended") ctx.resume();
  out.gain.value = volume * 0.9;
  return ctx;
}

const V = () => VOICES[voice] || VOICES.wood;

// Routes a node into the dry bus and, a little, the reverb.
function send(node, wetAmount) {
  node.connect(dry);
  const g = ctx.createGain(); g.gain.value = wetAmount;
  node.connect(g).connect(wet);
}

// The tactile part: a burst of noise through a band-pass, a few milliseconds long.
function click({ at = 0, freq = 1400, q = 1.4, gain = 0.4, len = 0.018, sweep = 0 } = {}) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + at, n = Math.max(1, Math.floor(a.sampleRate * len));
  const buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for (let k = 0; k < n; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / n, 4);
  const src = a.createBufferSource(), bp = a.createBiquadFilter(), g = a.createGain();
  src.buffer = buf; bp.type = "bandpass"; bp.Q.value = q; g.gain.value = gain;
  bp.frequency.setValueAtTime(freq, t);
  if (sweep) bp.frequency.exponentialRampToValueAtTime(freq * sweep, t + len);
  src.connect(bp).connect(g);
  send(g, 0.05);
  src.start(t);
}

// The pitched part, built from the voice's partials.
function note(f, { at = 0, gain = 0.3, decay = 1, wetMul = 1 } = {}) {
  const a = audio();
  if (!a) return;
  const v = V(), t = a.currentTime + at;
  const lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = v.lowpass;
  send(lp, v.wet * wetMul);
  for (const [ratio, pg, dm] of v.partials) {
    const len = v.decay * decay * dm;
    const env = a.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(gain * pg, t + v.attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t + v.attack + len);
    const o = a.createOscillator();
    o.frequency.value = f * ratio * (1 + (Math.random() - 0.5) * 0.004);
    o.connect(env).connect(lp);
    o.start(t); o.stop(t + v.attack + len + 0.05);
  }
}

// A low sine that drops in pitch: a soft thud for mistakes and endings.
function thud(f, { at = 0, gain = 0.4, len = 0.22 } = {}) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + at, o = a.createOscillator(), env = a.createGain();
  o.frequency.setValueAtTime(f * 1.6, t);
  o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
  env.gain.setValueAtTime(gain, t);
  env.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(env); send(env, 0.08);
  o.start(t); o.stop(t + len + 0.05);
}

const strum = (freqs, { gap = 0.035, gain = 0.2, decay = 2, wetMul = 1.6 } = {}) =>
  freqs.forEach((f, k) => note(f, { at: k * gap, gain, decay, wetMul }));

export const sound = {
  configure({ sound: on, volume: v, haptics: h, voice: vc }) { enabled = on; volume = v; haptics = h; if (vc) voice = vc; },
  // Placing a digit: a tile set down.
  place: (d) => { const b = V().body; click(b); note(CHORD[d], { gain: 0.22 }); },
  // Pencil marks: a light tick.
  note: () => click({ freq: 4200, q: 3, gain: 0.16, len: 0.006 }),
  erase: () => click({ freq: 2600, q: 0.7, gain: 0.14, len: 0.09, sweep: 0.35 }),
  undo: () => { click({ freq: 900, q: 1.2, gain: 0.22, len: 0.014 }); click({ at: 0.05, freq: 1300, q: 1.2, gain: 0.14, len: 0.01 }); },
  error: () => { thud(98, { gain: 0.38 }); thud(92, { at: 0.09, gain: 0.26 }); },
  // A row, column or box done: the digit's note with a fifth, held a little longer.
  unit: (d, n = 1) => { click(V().body); strum([CHORD[d], CHORD[d] * 1.5, ...(n > 1 ? [CHORD[d] * 2] : [])], { gain: 0.2, decay: 1.6 }); },
  // Every copy of a digit placed.
  digit: (d) => { click(V().body); strum([CHORD[d] / 2, CHORD[d], CHORD[d] * 1.5, CHORD[d] * 2], { gain: 0.17, decay: 2 }); },
  hint: () => strum([CHORD[7], CHORD[9]], { gap: 0.07, gain: 0.12, decay: 1.4 }),
  tick: () => click({ freq: 3200, q: 4, gain: 0.12, len: 0.005 }),
  // The full chord, rolled slowly, over a low root.
  win: () => { note(ROOT, { gain: 0.3, decay: 4, wetMul: 1.4 }); strum([CHORD[1], CHORD[3], CHORD[5], CHORD[6], CHORD[8], CHORD[9]], { gap: 0.09, gain: 0.16, decay: 3.2, wetMul: 2 }); },
  lost: () => { thud(82, { gain: 0.35, len: 0.4 }); strum([CHORD[1] / 2, 174.61], { gap: 0.12, gain: 0.14, decay: 2 }); },
  preview: () => { click(V().body); note(CHORD[3], { gain: 0.24 }); note(CHORD[5], { at: 0.12, gain: 0.2 }); },
};

export function haptic(pattern) {
  if (haptics) try { navigator.vibrate?.(pattern); } catch {}
}
