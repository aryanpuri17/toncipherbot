// Web Audio — all sounds synthesized, respects global mute via localStorage
let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (localStorage.getItem('tc_sound_muted') === '1') return null;
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

export function playCluck() {
  const ctx = getCtx(); if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator(); const gain = ctx.createGain();
  osc.type = 'sawtooth'; osc.frequency.setValueAtTime(800, t);
  osc.frequency.exponentialRampToValueAtTime(400, t + 0.08);
  osc.frequency.exponentialRampToValueAtTime(650, t + 0.13);
  gain.gain.setValueAtTime(0.18, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  osc.connect(gain); gain.connect(ctx.destination); osc.start(t); osc.stop(t + 0.18);
  // second chirp
  const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
  o2.type = 'square'; o2.frequency.setValueAtTime(1200, t + 0.04);
  o2.frequency.exponentialRampToValueAtTime(500, t + 0.12);
  g2.gain.setValueAtTime(0.09, t + 0.04); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  o2.connect(g2); g2.connect(ctx.destination); o2.start(t + 0.04); o2.stop(t + 0.15);
}

export function playStep() {
  const ctx = getCtx(); if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator(); const gain = ctx.createGain();
  osc.type = 'sine'; osc.frequency.setValueAtTime(1100, t);
  osc.frequency.exponentialRampToValueAtTime(700, t + 0.06);
  gain.gain.setValueAtTime(0.12, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  osc.connect(gain); gain.connect(ctx.destination); osc.start(t); osc.stop(t + 0.08);
}

export function playHonk() {
  const ctx = getCtx(); if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator(); const gain = ctx.createGain();
  osc.type = 'sawtooth'; osc.frequency.setValueAtTime(220, t);
  osc.frequency.setValueAtTime(280, t + 0.15); osc.frequency.setValueAtTime(220, t + 0.3);
  gain.gain.setValueAtTime(0.22, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  osc.connect(gain); gain.connect(ctx.destination); osc.start(t); osc.stop(t + 0.5);
  const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
  o2.type = 'square'; o2.frequency.setValueAtTime(330, t);
  o2.frequency.setValueAtTime(400, t + 0.15);
  g2.gain.setValueAtTime(0.1, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
  o2.connect(g2); g2.connect(ctx.destination); o2.start(t); o2.stop(t + 0.45);
}

export function playCrash() {
  const ctx = getCtx(); if (!ctx) return;
  const t = ctx.currentTime;
  const bufSize = ctx.sampleRate * 0.55;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.1));
  const noise = ctx.createBufferSource(); noise.buffer = buf;
  const ng = ctx.createGain(); ng.gain.setValueAtTime(0.45, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
  noise.connect(ng); ng.connect(ctx.destination); noise.start(t);
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.type = 'sine'; osc.frequency.setValueAtTime(160, t); osc.frequency.exponentialRampToValueAtTime(30, t + 0.4);
  g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  osc.connect(g); g.connect(ctx.destination); osc.start(t); osc.stop(t + 0.4);
}

export function playFanfare() {
  const ctx = getCtx(); if (!ctx) return;
  const t = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = 'square'; osc.frequency.setValueAtTime(freq, t + i * 0.14);
    gain.gain.setValueAtTime(0, t); gain.gain.setValueAtTime(0.15, t + i * 0.14);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.14 + 0.28);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(t + i * 0.14); osc.stop(t + i * 0.14 + 0.3);
    const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
    o2.type = 'triangle'; o2.frequency.setValueAtTime(freq * 0.5, t + i * 0.14);
    g2.gain.setValueAtTime(0, t); g2.gain.setValueAtTime(0.1, t + i * 0.14);
    g2.gain.exponentialRampToValueAtTime(0.001, t + i * 0.14 + 0.32);
    o2.connect(g2); g2.connect(ctx.destination); o2.start(t + i * 0.14); o2.stop(t + i * 0.14 + 0.34);
  });
  const ft = t + 0.6;
  [523.25, 659.25, 783.99, 1046.5].forEach(freq => {
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = 'triangle'; osc.frequency.setValueAtTime(freq, ft);
    gain.gain.setValueAtTime(0.09, ft); gain.gain.exponentialRampToValueAtTime(0.001, ft + 1.1);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(ft); osc.stop(ft + 1.1);
  });
}

export function playCoin() {
  const ctx = getCtx(); if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator(); const gain = ctx.createGain();
  osc.type = 'sine'; osc.frequency.setValueAtTime(988, t); osc.frequency.setValueAtTime(1319, t + 0.08);
  gain.gain.setValueAtTime(0.18, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
  osc.connect(gain); gain.connect(ctx.destination); osc.start(t); osc.stop(t + 0.32);
}

export function playClick() {
  const ctx = getCtx(); if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator(); const gain = ctx.createGain();
  osc.type = 'sine'; osc.frequency.setValueAtTime(1000, t);
  gain.gain.setValueAtTime(0.1, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  osc.connect(gain); gain.connect(ctx.destination); osc.start(t); osc.stop(t + 0.05);
}

export function playDanger() {
  const ctx = getCtx(); if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator(); const gain = ctx.createGain();
  osc.type = 'sawtooth'; osc.frequency.setValueAtTime(180, t); osc.frequency.setValueAtTime(160, t + 0.1);
  gain.gain.setValueAtTime(0.08, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  osc.connect(gain); gain.connect(ctx.destination); osc.start(t); osc.stop(t + 0.18);
}
