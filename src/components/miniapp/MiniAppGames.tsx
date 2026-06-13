import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { ArrowLeft, RotateCcw, Trophy, Zap } from 'lucide-react';
import { haptic } from '../../lib/haptics';
import { CountUp } from '../ui/CountUp';
import { ConfettiEffect } from '../ui/ConfettiEffect';

// ══════════════════════════════════════════════════════════════════
// AUDIO ENGINE (Web Audio API — aucun fichier externe)
// ══════════════════════════════════════════════════════════════════

let _soundMuted = localStorage.getItem('tc_sound_muted') === '1';
const _AC: { ctx: AudioContext | null } = { ctx: null };
function _ac(): AudioContext | null {
  if (_soundMuted) return null;
  if (typeof window === 'undefined') return null;
  const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!_AC.ctx || _AC.ctx.state === 'closed') { try { _AC.ctx = new Ctor(); } catch { return null; } }
  const ctx = _AC.ctx;
  if (!ctx) return null;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

const snd = {
  bet() {
    const ctx = _ac(); if (!ctx) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.setValueAtTime(660, t); o.frequency.exponentialRampToValueAtTime(880, t + 0.06);
    g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    o.start(t); o.stop(t + 0.1);
  },
  cashout() {
    const ctx = _ac(); if (!ctx) return;
    const t = ctx.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine'; o.frequency.value = f;
      const s = t + i * 0.055;
      g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(0.18, s + 0.018); g.gain.exponentialRampToValueAtTime(0.001, s + 0.16);
      o.start(s); o.stop(s + 0.18);
    });
  },
  crash() {
    const ctx = _ac(); if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.type = 'sawtooth';
    o.frequency.setValueAtTime(320, t); o.frequency.exponentialRampToValueAtTime(35, t + 0.55);
    g.gain.setValueAtTime(0.28, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    o.start(t); o.stop(t + 0.6);
    const sr = ctx.sampleRate, len = Math.floor(sr * 0.45);
    const buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const ns = ctx.createBufferSource(), ng = ctx.createGain();
    ns.buffer = buf; ns.connect(ng); ng.connect(ctx.destination);
    ng.gain.setValueAtTime(0.45, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    ns.start(t); ns.stop(t + 0.5);
  },
  win() {
    const ctx = _ac(); if (!ctx) return;
    const t = ctx.currentTime;
    [523, 659, 784, 1047, 1319].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination); o.type = 'triangle'; o.frequency.value = f;
      const s = t + i * 0.065;
      g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(0.2, s + 0.02); g.gain.exponentialRampToValueAtTime(0.001, s + 0.22);
      o.start(s); o.stop(s + 0.25);
    });
  },
  lose() {
    const ctx = _ac(); if (!ctx) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.type = 'sine';
    o.frequency.setValueAtTime(280, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.32);
    g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
    o.start(t); o.stop(t + 0.38);
  },
  tick() {
    const ctx = _ac(); if (!ctx) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 900 + Math.random() * 500;
    g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.032);
    o.start(t); o.stop(t + 0.04);
  },
  boom() {
    const ctx = _ac(); if (!ctx) return;
    const t = ctx.currentTime;
    // Sub-bass thump — the "physical" punch of the explosion
    const kick = ctx.createOscillator(), kg = ctx.createGain();
    kick.connect(kg); kg.connect(ctx.destination); kick.type = 'sine';
    kick.frequency.setValueAtTime(200, t); kick.frequency.exponentialRampToValueAtTime(28, t + 0.2);
    kg.gain.setValueAtTime(0.75, t); kg.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    kick.start(t); kick.stop(t + 0.3);
    // High crack — the sharp initial "snap"
    const crack = ctx.createOscillator(), cg = ctx.createGain();
    crack.connect(cg); cg.connect(ctx.destination); crack.type = 'sawtooth';
    crack.frequency.setValueAtTime(900, t); crack.frequency.exponentialRampToValueAtTime(150, t + 0.06);
    cg.gain.setValueAtTime(0.35, t); cg.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    crack.start(t); crack.stop(t + 0.08);
    // Noise body — long rumble with low-pass filter for realism
    const sr = ctx.sampleRate, len = Math.floor(sr * 0.6);
    const buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sr * 0.14));
    const ns = ctx.createBufferSource(), filt = ctx.createBiquadFilter(), ng = ctx.createGain();
    filt.type = 'lowpass'; filt.frequency.value = 900;
    ns.buffer = buf; ns.connect(filt); filt.connect(ng); ng.connect(ctx.destination);
    ng.gain.value = 0.6; ns.start(t); ns.stop(t + 0.65);
  },
  reveal() {
    const ctx = _ac(); if (!ctx) return;
    const t = ctx.currentTime;
    // Crystal chime — triad C6/G6/C7 for a glassy, satisfying ring
    ([1047, 1568, 2093] as number[]).forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine'; o.frequency.value = f;
      const vol = [0.16, 0.09, 0.05][i];
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
      o.start(t); o.stop(t + 0.45);
    });
    // Glassy attack shimmer — high transient that fades fast
    const sh = ctx.createOscillator(), sg = ctx.createGain();
    sh.connect(sg); sg.connect(ctx.destination); sh.type = 'sine';
    sh.frequency.setValueAtTime(4200, t); sh.frequency.exponentialRampToValueAtTime(2100, t + 0.07);
    sg.gain.setValueAtTime(0.07, t); sg.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    sh.start(t); sh.stop(t + 0.1);
  },
  spin() {
    const ctx = _ac(); if (!ctx) return;
    const t = ctx.currentTime;
    const sr = ctx.sampleRate, len = Math.floor(sr * 0.22);
    const buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const ns = ctx.createBufferSource(), filt = ctx.createBiquadFilter(), ng = ctx.createGain();
    filt.type = 'bandpass'; filt.frequency.value = 600; filt.Q.value = 0.9;
    ns.buffer = buf; ns.connect(filt); filt.connect(ng); ng.connect(ctx.destination);
    ng.gain.value = 0.16; ns.start(t); ns.stop(t + 0.25);
  },
};

// ══════════════════════════════════════════════════════════════════
// SHARED TYPES & STREAK SYSTEM
// ══════════════════════════════════════════════════════════════════

type OnResult = (won: boolean) => void;

// ══════════════════════════════════════════════════════════════════
// SHARED UI COMPONENTS
// ══════════════════════════════════════════════════════════════════

// Stable confetti particle positions (pre-computed, no random on render)
const CONFETTI_SEEDS = Array.from({ length: 32 }, (_, i) => ({
  left:     `${((i * 37 + 11) % 97)}%`,
  color:    ['#fbbf24','#22c55e','#3b82f6','#a855f7','#ef4444','#06b6d4','#f97316','#10b981'][i % 8],
  delay:    `${((i * 0.071) % 0.55).toFixed(2)}s`,
  duration: `${(1.15 + (i * 0.087) % 0.9).toFixed(2)}s`,
  isCircle: i % 3 === 0,
  size:     i % 5 === 0 ? 11 : 7,
  rotate:   `${(i * 47) % 360}deg`,
}));

const BigWinEffect: React.FC<{ show: boolean }> = ({ show }) => (
  <>
    <style>{`@keyframes confettiFall{0%{transform:translateY(0) rotate(0deg) scale(1);opacity:1}100%{transform:translateY(92vh) rotate(600deg) scale(0.6);opacity:0}}`}</style>
    {show && (
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
        {CONFETTI_SEEDS.map((p, i) => (
          <div key={i} style={{
            position: 'absolute', left: p.left, top: '-14px',
            width: p.size, height: p.size, background: p.color,
            borderRadius: p.isCircle ? '50%' : '2px',
            transform: `rotate(${p.rotate})`,
            animationName: 'confettiFall',
            animationDuration: p.duration,
            animationDelay: p.delay,
            animationTimingFunction: 'cubic-bezier(0.25,0.46,0.45,0.94)',
            animationFillMode: 'forwards',
          }} />
        ))}
      </div>
    )}
  </>
);

const MuteButton: React.FC = () => {
  const [m, setM] = React.useState(_soundMuted);
  return (
    <button onClick={() => { _soundMuted = !_soundMuted; localStorage.setItem('tc_sound_muted', _soundMuted ? '1' : '0'); setM(_soundMuted); }}
      title={m ? 'Activer le son' : 'Couper le son'}
      style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0, cursor: 'pointer',
        background: 'rgba(255,255,255,0.04)', border: '1px solid #1e2847',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
      }}>
      {m ? '🔇' : '🔊'}
    </button>
  );
};

const GameBalanceChip: React.FC<{ bal: number; demo: boolean }> = ({ bal, demo }) => (
  <div style={{
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${demo ? 'rgba(245,158,11,0.35)' : '#1e2847'}`,
    borderRadius: 12, padding: '6px 12px', textAlign: 'right', flexShrink: 0,
  }}>
    <p style={{ fontSize: 10, textTransform: 'uppercase', color: demo ? '#f59e0b' : '#64748b', letterSpacing: '0.05em' }}>
      {demo ? '🎮 Démo' : 'Solde'}
    </p>
    <p style={{ fontSize: 14, fontWeight: 700, color: demo ? '#fbbf24' : '#f8fafc', marginTop: 1 }}>
      <CountUp value={bal} decimals={3} suffix=" TON" />
    </p>
  </div>
);

const StreakChip: React.FC<{ streak: number }> = ({ streak }) =>
  streak >= 2 ? (
    <span title={`${streak} victoires consécutives`} style={{
      display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px',
      borderRadius: 99, fontSize: 11, fontWeight: 700, flexShrink: 0,
      background: 'rgba(249,115,22,0.18)', color: '#fb923c',
      border: '1px solid rgba(249,115,22,0.3)',
    }}>
      🔥 {streak}
    </span>
  ) : null;

// ══════════════════════════════════════════════════════════════════
// SHARED BET QUICK BUTTONS (MIN / ½ / 2× / MAX)
// ══════════════════════════════════════════════════════════════════

const BetQuickButtons: React.FC<{ setBet: React.Dispatch<React.SetStateAction<number>>; maxBal: number }> = ({ setBet, maxBal }) => {
  const labels = ['MIN', '½', '2×', 'MAX'] as const;
  const handlers: Record<string, () => void> = {
    MIN: () => setBet(0.01),
    '½':  () => setBet(p => Math.max(0.01, +(p / 2).toFixed(3))),
    '2×': () => setBet(p => Math.min(50, +(p * 2).toFixed(3))),
    MAX:  () => setBet(Math.min(50, maxBal)),
  };
  return (
    <div className="grid grid-cols-4 gap-2">
      {labels.map(l => (
        <button key={l} onClick={() => { haptic.selection(); handlers[l](); }}
          className="tap-scale py-3 rounded-xl text-sm font-bold bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white transition-all">
          {l}
        </button>
      ))}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
// ROUE DE LA FORTUNE
// ══════════════════════════════════════════════════════════════════

type Seg = { label: string; mult: number; fill: string; stroke: string; text: string };

const SEGS: Seg[] = [
  { label: 'PERDU', mult: 0,   fill: '#200808', stroke: '#991b1b', text: '#f87171' },
  { label: '×0.4',  mult: 0.4, fill: '#1e1200', stroke: '#92400e', text: '#fb923c' },
  { label: '×1',    mult: 1,   fill: '#1e1a00', stroke: '#a16207', text: '#fbbf24' },
  { label: 'PERDU', mult: 0,   fill: '#200808', stroke: '#991b1b', text: '#f87171' },
  { label: '×2',    mult: 2,   fill: '#001e08', stroke: '#166534', text: '#4ade80' },
  { label: '×3',    mult: 3,   fill: '#00061e', stroke: '#1e3a8a', text: '#93c5fd' },
  { label: 'PERDU', mult: 0,   fill: '#200808', stroke: '#991b1b', text: '#f87171' },
  { label: '×5',    mult: 5,   fill: '#001818', stroke: '#134e4a', text: '#5eead4' },
  { label: 'PERDU', mult: 0,   fill: '#200808', stroke: '#991b1b', text: '#f87171' },
  { label: '×10',   mult: 10,  fill: '#0e001e', stroke: '#5b21b6', text: '#c4b5fd' },
];

const CX = 150, CY = 150, WRADIUS = 118;
const SEG_DEG = 36;

function pt(deg: number, r = WRADIUS) {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}
function arcPath(i: number): string {
  const s = pt(i * SEG_DEG - SEG_DEG / 2);
  const e = pt(i * SEG_DEG + SEG_DEG / 2);
  return `M${CX} ${CY} L${s.x.toFixed(2)} ${s.y.toFixed(2)} A${WRADIUS} ${WRADIUS} 0 0 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}Z`;
}

function rollWheel(streak: number, demo = false): { mult: number; idx: number[] } {
  if (demo) {
    const r = Math.random();
    if (r < 0.35) return { mult: 0,   idx: [0] };
    if (r < 0.52) return { mult: 0.4, idx: [1] };
    if (r < 0.68) return { mult: 1,   idx: [2] };
    if (r < 0.83) return { mult: 2,   idx: [4] };
    if (r < 0.93) return { mult: 3,   idx: [5] };
    if (r < 0.99) return { mult: 5,   idx: [7] };
    return { mult: 10, idx: [9] };
  }
  const bonus = Math.min(35, streak * 12);
  const loseW = 58 + bonus;
  const f = (100 - loseW) / 42;
  const raw = [
    { mult: 0,   weight: loseW,                                                idx: [0, 3, 6, 8] },
    { mult: 0.4, weight: Math.max(1, Math.round(18 * f)),                      idx: [1] },
    { mult: 1,   weight: Math.max(1, Math.round(13 * f)),                      idx: [2] },
    { mult: 2,   weight: Math.max(1, Math.round(8  * f)),                      idx: [4] },
    { mult: 3,   weight: Math.max(1, Math.round(3  * f)),                      idx: [5] },
    { mult: 5,   weight: streak >= 1 ? 0 : Math.max(0, Math.round(0.6 * f)),  idx: [7] },
    { mult: 10,  weight: streak >= 1 ? 0 : Math.max(0, Math.round(0.15 * f)), idx: [9] },
  ];
  const total = raw.reduce((s, r) => s + r.weight, 0);
  let r = Math.random() * total;
  for (const rule of raw) { r -= rule.weight; if (r <= 0) return rule; }
  return raw[0];
}

const WheelSVG: React.FC<{ rotation: number; winIdx?: number | null }> = ({ rotation, winIdx }) => {
  const studs = Array.from({ length: 20 }, (_, i) => pt(i * 18, WRADIUS + 14));
  return (
    <svg width="280" height="280" viewBox="0 0 300 300" style={{
      transform: `rotate(${rotation}deg)`,
      transition: 'transform 4.2s cubic-bezier(0.17, 0.67, 0.1, 0.99)',
      display: 'block',
    }}>
      <defs>
        <radialGradient id="wjGlow" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#5b21b6" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="wHub" cx="45%" cy="38%" r="55%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#78350f" />
        </radialGradient>
        <filter id="wSegGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <circle cx={CX} cy={CY} r={WRADIUS + 22} fill="#1a0e00" />
      <circle cx={CX} cy={CY} r={WRADIUS + 22} fill="none" stroke="#fbbf24" strokeWidth="3" />
      <circle cx={CX} cy={CY} r={WRADIUS + 3}  fill="none" stroke="#92400e" strokeWidth="1.5" />
      {studs.map((p, i) => (
        <circle key={i} cx={p.x.toFixed(2)} cy={p.y.toFixed(2)} r={5}
          fill="#fbbf24" stroke="#78350f" strokeWidth="1.5" />
      ))}
      {SEGS.map((seg, i) => {
        const midDeg = i * SEG_DEG;
        const tp = pt(midDeg, WRADIUS * 0.63);
        const rot = midDeg - 90;
        return (
          <g key={i}>
            <path d={arcPath(i)} fill={seg.fill} stroke={seg.stroke} strokeWidth="1.5" />
            {seg.mult === 10 && <path d={arcPath(i)} fill="url(#wjGlow)" />}
            <text x={tp.x.toFixed(2)} y={tp.y.toFixed(2)}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={seg.label.length > 3 ? 9 : 11} fontWeight="900" fill={seg.text}
              transform={`rotate(${rot},${tp.x.toFixed(2)},${tp.y.toFixed(2)})`}
              style={{ userSelect: 'none', pointerEvents: 'none' }}>
              {seg.label}
            </text>
          </g>
        );
      })}
      {/* Winning segment glow — appears after spin stops */}
      {winIdx != null && (
        <path
          d={arcPath(winIdx)}
          fill={SEGS[winIdx].text + '30'}
          stroke={SEGS[winIdx].text}
          strokeWidth="2.5"
          filter="url(#wSegGlow)"
          style={{ animation: 'winSegPulse 1.2s ease-in-out infinite alternate' }}
        />
      )}
      <circle cx={CX} cy={CY} r={27} fill="url(#wHub)" stroke="#fbbf24" strokeWidth="2.5" />
      <circle cx={CX} cy={CY} r={18} fill="#1a0800" />
      <circle cx={CX} cy={CY} r={9}  fill="#fbbf24" opacity="0.25" />
    </svg>
  );
};

const WheelGame: React.FC<{ onBack: () => void; streak: number; onResult: OnResult }> = ({ onBack, streak, onResult }) => {
  const { currentUser, placeGameBet, recordGameResult, demoMode, demoBalance } = useAppStore();
  const bal = demoMode ? demoBalance : currentUser.balanceMain;
  const [bet, setBet]         = useState(0.01);
  const [spinning, setSpin]   = useState(false);
  const [rotation, setRot]    = useState(0);
  const rotRef                = useRef(0);
  const [result, setResult]   = useState<{ seg: Seg; win: number } | null>(null);
  const [hist, setHist]       = useState<number[]>([]);
  const [bigWin, setBigWin]   = useState(false);
  const [winIdx, setWinIdx]   = useState<number | null>(null);
  const mountedRef            = useRef(true);
  const spinTimerRef          = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bigWinTimerRef        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimers            = useRef<ReturnType<typeof setTimeout>[]>([]);
  const ptrRef                = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (spinTimerRef.current)  clearTimeout(spinTimerRef.current);
      if (bigWinTimerRef.current) clearTimeout(bigWinTimerRef.current);
      tickTimers.current.forEach(clearTimeout);
    };
  }, []);

  const effBet  = Math.min(bet, bal);
  const canSpin = !spinning && effBet >= 0.01 && bal >= 0.01;

  const spin = () => {
    if (!canSpin) return;
    const rule = rollWheel(streak, demoMode);
    const idx = rule.idx[Math.floor(Math.random() * rule.idx.length)];
    const target = (360 - idx * SEG_DEG + 360) % 360;
    const cur = rotRef.current % 360;
    let delta = target - cur;
    if (delta < 0) delta += 360;
    const newRot = rotRef.current + 5 * 360 + delta;
    rotRef.current = newRot;
    setRot(newRot);
    setSpin(true);
    setWinIdx(null);
    snd.spin();
    haptic.impact('medium');
    setResult(null);

    // Schedule tick sounds — exponentially decelerating like a real wheel
    tickTimers.current.forEach(clearTimeout);
    tickTimers.current = [];
    {
      let elapsed = 0;
      let interval = 55;
      while (elapsed < 4050) {
        elapsed += interval;
        const t = elapsed;
        tickTimers.current.push(setTimeout(() => {
          if (!mountedRef.current) return;
          snd.tick();
          // Flash the pointer via direct DOM manipulation (no re-render)
          const el = ptrRef.current;
          if (el) {
            el.style.animation = 'none';
            void el.offsetHeight; // force reflow to restart animation
            el.style.animation = 'ptrFlash 0.2s ease-out';
          }
        }, t));
        interval = Math.min(370, interval * 1.052);
      }
    }

    const used = Math.min(effBet, bal);
    const win = +(used * rule.mult).toFixed(6);
    spinTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setSpin(false);
      setWinIdx(idx);
      placeGameBet(used, win);
      recordGameResult('Roue', used, win);
      setResult({ seg: SEGS[idx], win });
      setHist(h => [rule.mult, ...h.slice(0, 7)]);
      onResult(rule.mult > 0);
      if (rule.mult >= 5) {
        setBigWin(true);
        bigWinTimerRef.current = setTimeout(() => { if (mountedRef.current) setBigWin(false); }, 2600);
        snd.win();
        haptic.impact('heavy'); haptic.success();
      } else if (rule.mult >= 2) { snd.win(); haptic.success(); }
      else if (rule.mult > 0) { snd.cashout(); haptic.success(); }
      else { snd.lose(); haptic.error(); }
    }, 4300);
  };

  const displayBet = Math.max(0.01, effBet);
  const pf = (m: number) => (displayBet * m).toFixed(m < 1 ? 4 : 3);

  return (
    <div className="space-y-5 pb-4">
      <style>{`
        @keyframes ptrFlash {
          0%   { filter: brightness(3) drop-shadow(0 0 18px #fbbf24); transform: scaleY(1.25); }
          100% { filter: brightness(1) drop-shadow(0 2px 8px rgba(251,191,36,0.8)); transform: scaleY(1); }
        }
        @keyframes winSegPulse {
          0%   { opacity: 0.55; }
          100% { opacity: 1; }
        }
      `}</style>
      <BigWinEffect show={bigWin} />
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">Roue de la Fortune</h2>
            <StreakChip streak={streak} />
          </div>
          <p className="text-[11px] text-slate-500">Faites tourner · Jackpot ×10 — jusqu'à ×10 la mise</p>
        </div>
        <MuteButton />
        <GameBalanceChip bal={bal} demo={demoMode} />
      </div>

      {hist.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {hist.map((m, i) => (
            <span key={i} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              m === 0 ? 'bg-red-500/20 text-red-400' :
              m < 1   ? 'bg-orange-500/20 text-orange-400' :
              m < 2   ? 'bg-amber-500/20 text-amber-400' :
              m < 5   ? 'bg-emerald-500/20 text-emerald-400' :
                        'bg-teal-500/20 text-teal-300'
            }`}>{m === 0 ? 'PERDU' : `×${m}`}</span>
          ))}
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          {/* Pointer — inner div ref'd for direct animation on each tick */}
          <div className="absolute z-10" style={{ top: '-6px', left: '50%', transform: 'translateX(-50%)' }}>
            <div ref={ptrRef} style={{
              width: 0, height: 0,
              borderLeft: '13px solid transparent', borderRight: '13px solid transparent',
              borderTop: '26px solid #fbbf24',
              filter: 'drop-shadow(0 2px 8px rgba(251,191,36,0.8))',
              transformOrigin: 'top center',
            }} />
          </div>
          <div style={{ filter: 'drop-shadow(0 0 36px rgba(251,191,36,0.12))' }}>
            <WheelSVG rotation={rotation} winIdx={winIdx} />
          </div>
        </div>
        {result && !spinning && (
          <div className={`w-full text-center px-4 py-3 rounded-xl font-semibold text-sm ${
            result.seg.mult >= 10 ? 'bg-purple-500/20 border border-purple-400/50 text-purple-300' :
            result.seg.mult >= 2  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400' :
            result.seg.mult > 0   ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400' :
                                    'bg-red-500/15 border border-red-500/30 text-red-400'
          }`}>
            {result.seg.mult === 0   && '😔 Dommage… Bonne chance au prochain tour !'}
            {result.seg.mult === 0.4 && `🟠 ×0.4 — Vous récupérez ${result.win.toFixed(4)} TON`}
            {result.seg.mult === 1   && `🟡 ×1 — Mise récupérée : ${result.win.toFixed(4)} TON`}
            {result.seg.mult === 2   && `🟢 ×2 — Vous doublez ! +${result.win.toFixed(4)} TON`}
            {result.seg.mult === 3   && `🎉 ×3 — Excellent ! +${result.win.toFixed(4)} TON`}
            {result.seg.mult === 5   && `💎 ×5 — Incroyable ! +${result.win.toFixed(4)} TON`}
            {result.seg.mult === 10  && `🏆 JACKPOT ×10 !! +${result.win.toFixed(4)} TON — Félicitations !`}
          </div>
        )}
      </div>

      {/* Bet controls */}
      <div className="glass-card p-4 space-y-3">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Montant de la mise</p>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
          <input type="number" value={bet} min={0.01} max={50} step={0.01}
            onChange={e => { const v = +e.target.value; if (!isNaN(v)) setBet(Math.max(0.01, Math.min(50, v))); }}
            className="flex-1 bg-transparent text-2xl font-bold text-white outline-none" />
          <span className="text-base font-bold text-slate-500">TON</span>
        </div>
        <BetQuickButtons setBet={setBet} maxBal={bal} />
        <button onClick={spin} disabled={!canSpin}
          className={`w-full py-4 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 ${
            canSpin
              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-amber-950 hover:from-amber-400 hover:to-yellow-400 active:scale-[0.98] shadow-lg shadow-amber-500/25'
              : 'bg-white/5 text-slate-600 cursor-not-allowed'
          }`}>
          {spinning ? <><RotateCcw className="w-4 h-4 animate-spin" /> La roue tourne…</>
            : bal < 0.01 ? (demoMode ? '🎮 Démo épuisé' : '💸 Solde insuffisant')
            : <><Zap className="w-4 h-4" /> Tourner ({effBet.toFixed(2)} TON)</>}
        </button>
      </div>

      {/* Prize table */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Gains possibles · mise {displayBet.toFixed(2)} TON
        </h3>
        <div className="space-y-1.5">
          {([
            { label: '×10', val: pf(10),  color: 'text-purple-400', bg: 'bg-purple-500/10' },
            { label: '×5',  val: pf(5),   color: 'text-teal-400',   bg: 'bg-teal-500/10'  },
            { label: '×3',  val: pf(3),   color: 'text-blue-400',   bg: 'bg-blue-500/10'  },
            { label: '×2',  val: pf(2),   color: 'text-emerald-400',bg: 'bg-emerald-500/10'},
            { label: '×1',  val: pf(1),   color: 'text-amber-400',  bg: 'bg-amber-500/10' },
            { label: '×0.4',val: pf(0.4), color: 'text-orange-400', bg: 'bg-orange-500/10'},
            { label: 'PERDU',val: null,   color: 'text-red-400',    bg: 'bg-red-500/10'   },
          ] as const).map(row => (
            <div key={row.label} className={`flex items-center justify-between px-3 py-1.5 rounded-lg ${row.bg}`}>
              <span className={`text-sm font-bold ${row.color}`}>{row.label}</span>
              <span className="text-sm text-white font-mono">
                {row.val != null ? `+${row.val} TON` : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
// CRASH — tours continus multijoueur (style Aviator)
// Le serveur tourne en boucle : MISE (7s) → VOL → CRASH (3s) → MISE…
// ══════════════════════════════════════════════════════════════════

const BET_MS   = 7000;  // fenêtre de mise
const PAUSE_MS = 3200;  // pause après crash
const TICK_MS  = 50;
const GROWTH   = 0.13;  // mult = e^(0.13·t) → ×2 à ~5.3s, ×10 à ~17.7s

// Distribution du point de crash.
// Spectateur (le joueur ne mise pas) : généreuse → l'historique donne envie.
// Joueur misé : resserrée selon la série de victoires.
function rollCrashPoint(playerStreak: number | null, demo = false): number {
  const r = Math.random();
  if (demo) {
    if (r < 0.10) return 1.00;
    if (r < 0.28) return +(1.1 + Math.random() * 0.5).toFixed(2);
    return Math.min(50, Math.max(1.5, +(0.975 / (1 - r)).toFixed(2)));
  }
  if (playerStreak === null) {
    if (r < 0.06) return 1.00;
    return Math.min(80, Math.max(1.01, +(0.962 / (1 - r)).toFixed(2)));
  }
  const he = playerStreak >= 2 ? 0.52 : playerStreak >= 1 ? 0.66 : 0.80;
  if (r < (1 - he)) return 1.00;
  return Math.min(40, Math.max(1.01, +(he / (1 - r)).toFixed(2)));
}

const CRASH_INIT_HIST = [2.43, 1.18, 5.67, 1.00, 12.41, 1.23, 3.14, 1.87, 47.20, 1.55, 2.08, 6.91];

const ALL_FAKE_NAMES = [
  'Marco T.','Léa R.','Yusuf K.','Chen W.','Amira S.','Dmytro P.',
  'Fatou D.','Nicolás V.','Sofia M.','Jamal B.','Elena G.','Pierre L.',
  'Aisha N.','Viktor S.','Mina H.','Diego F.','Anya K.','Tariq M.',
  'Hana P.','Reza A.','Priya S.','Omar F.','Julia B.','Kwame O.',
  'Nadia V.','Ivan C.','Mei L.','Lucas R.','Sara D.','Ali H.',
  'Ekaterina B.','Tomás G.','Layla J.','Patrick N.','Yuna K.','Carlos M.',
  'Nour A.','Sergei P.','Zara T.','Matteo F.','Ingrid L.','Hamid R.',
  'Chiara V.','Tunde A.','Sofía C.','Arjun M.','Lena S.','David K.',
  'Blessing O.','Kenji T.','Irina D.','Rafael S.','Fatima Z.','Max W.',
  'Nathalie B.','Seo-Yeon P.','Ibrahim H.','Valentina R.','Tobias L.','Akira N.',
  'Camille D.','Emeka C.','Anastasia K.','Gabriel M.','Hira S.','Finn O.',
  'Amara D.','Nikolai V.','Jasmine T.','Ricardo B.','Olga M.','Khalid A.',
  'Moana K.','Sven H.','Yasmin F.','Andrei S.','Chloé N.','Bashir O.',
  'Elisa P.','Darius C.','Naomi W.','Lukas J.','Rania H.','Felipe A.',
  'Marta G.','Yousef K.','Petra L.','Emmanuel T.','Adaeze N.','Hugo R.',
  'Oksana B.','Rahim J.','Vivienne C.','Kiran S.','Theo M.','Zainab A.',
  'Bianca F.','Kwabena O.','Miriam L.','Tamar K.','Simone B.','Javier H.',
];

function randomFakeBet(): number {
  const r = Math.random();
  if (r < 0.40) return +(0.01 + Math.random() * 0.04).toFixed(2);   // 40%: 0.01–0.05
  if (r < 0.65) return +(0.05 + Math.random() * 0.15).toFixed(2);   // 25%: 0.05–0.20
  if (r < 0.82) return +(0.20 + Math.random() * 0.80).toFixed(2);   // 17%: 0.20–1.00
  if (r < 0.94) return +(1.00 + Math.random() * 4.00).toFixed(2);   // 12%: 1.00–5.00
  return +(5.00 + Math.random() * 10.00).toFixed(2);                 //  6%: 5.00–15.00
}

type CrashPhase = 'betting' | 'flying' | 'crashed';

type FakePlayer = {
  name: string;
  bet: number;
  joinAt: number;               // seconde d'arrivée pendant la phase de mise
  target: number | null;        // null = ne sort jamais (perd)
  joined: boolean;
  cashedAt: number | null;
  cashPoint: { t: number; m: number } | null;
};

function makeFakeRoster(): FakePlayer[] {
  const pool = [...ALL_FAKE_NAMES].sort(() => Math.random() - 0.5);
  const n = 7 + Math.floor(Math.random() * 5); // 7–11 joueurs par tour
  return pool.slice(0, n).map(name => ({
    name,
    bet: randomFakeBet(),
    joinAt: 0.3 + Math.random() * 5.8,
    target: Math.random() < 0.28
      ? null
      : Math.min(30, +(1.05 - 0.9 * Math.log(1 - Math.random())).toFixed(2)),
    joined: false,
    cashedAt: null,
    cashPoint: null,
  }));
}

// Géométrie du graphique
const VB_W = 320, VB_H = 196;
const PX0 = 34, PY0 = 12, PW = 274, PH = 152;

function niceStep(range: number): number {
  const c = [0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50];
  const raw = range / 4;
  return c.find(v => v >= raw) ?? 100;
}

const CrashGame: React.FC<{ onBack: () => void; streak: number; onResult: OnResult }> = ({ onBack, streak, onResult }) => {
  const { currentUser, placeGameBet, recordGameResult, demoMode, demoBalance } = useAppStore();
  const bal = demoMode ? demoBalance : currentUser.balanceMain;

  // mise
  const [bet, setBet]           = useState(0.05);
  const [autoCash, setAutoCash] = useState(() => localStorage.getItem('tc_crash_auto') ?? '');

  // état du tour (rendu)
  const [phase, setPhase]         = useState<CrashPhase>('betting');
  const [countdown, setCountdown] = useState(BET_MS / 1000);
  const [mult, setMult]           = useState(1.0);
  const [lastCrash, setLastCrash] = useState<number | null>(null);
  const [history, setHistory]     = useState<number[]>(CRASH_INIT_HIST);
  const [fakes, setFakes]         = useState<FakePlayer[]>([]);
  const [roundId, setRoundId]     = useState(() => 18200 + Math.floor(Math.random() * 600));
  const [myBet, setMyBet]         = useState<number | null>(null);
  const [cashedOut, setCashedOut] = useState<number | null>(null);
  const [queuedBet, setQueuedBet] = useState<number | null>(null);
  const [toast, setToast]         = useState<{ id: number; text: string; win: boolean } | null>(null);
  const [bigWin, setBigWin]       = useState(false);
  const [cashFlash, setCashFlash] = useState(false);
  const crashMountedRef           = useRef(true);
  const crashBigWinTimer          = useRef<ReturnType<typeof setTimeout> | null>(null);

  // refs moteur (évitent les fermetures périmées dans l'interval)
  const phaseRef      = useRef<CrashPhase>('betting');
  const cdRef         = useRef(BET_MS);
  const pauseRef      = useRef(PAUSE_MS);
  const tRef          = useRef(0);
  const multRef       = useRef(1.0);
  const crashAtRef    = useRef(2.0);
  const myBetRef      = useRef<number | null>(null);
  const queuedRef     = useRef<number | null>(null);
  const cashedRef     = useRef<number | null>(null);
  const samplesRef    = useRef<Array<[number, number]>>([]);
  const fakesRef      = useRef<FakePlayer[]>([]);
  const streakRef     = useRef(streak);
  const autoRef       = useRef('');
  const myCashRef     = useRef<{ t: number; m: number } | null>(null);
  const onResultRef   = useRef(onResult);

  useEffect(() => { streakRef.current = streak; }, [streak]);
  useEffect(() => { autoRef.current = autoCash; }, [autoCash]);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => {
    crashMountedRef.current = true;
    return () => { crashMountedRef.current = false; if (crashBigWinTimer.current) clearTimeout(crashBigWinTimer.current); };
  }, []);

  const doCashout = (m: number) => {
    if (phaseRef.current !== 'flying') return;
    if (myBetRef.current === null || cashedRef.current !== null) return;
    cashedRef.current = m;
    myCashRef.current = { t: tRef.current, m };
    const win = +(myBetRef.current * m).toFixed(6);
    placeGameBet(0, win);
    recordGameResult('Crash', myBetRef.current, win);
    snd.cashout();
    haptic.success();
    onResultRef.current(true);
    setCashFlash(true);
    setTimeout(() => setCashFlash(false), 450);
    setCashedOut(m);
    setToast({ id: Date.now(), text: `+${win.toFixed(4)} TON`, win: true });
    if (m >= 3) {
      setBigWin(true);
      if (crashBigWinTimer.current) clearTimeout(crashBigWinTimer.current);
      crashBigWinTimer.current = setTimeout(() => { if (crashMountedRef.current) setBigWin(false); }, 2600);
    }
  };

  // ── Moteur de tours continus ──
  useEffect(() => {
    const beginBetting = () => {
      phaseRef.current = 'betting';
      cdRef.current    = BET_MS;
      tRef.current     = 0;
      multRef.current  = 1;
      cashedRef.current = null;
      myCashRef.current = null;
      samplesRef.current = [];
      // mise en file d'attente → devient la mise active du tour
      myBetRef.current = queuedRef.current;
      queuedRef.current = null;
      fakesRef.current = makeFakeRoster();
      setFakes([...fakesRef.current]);
      setPhase('betting');
      setCountdown(BET_MS / 1000);
      setMult(1);
      setMyBet(myBetRef.current);
      setQueuedBet(null);
      setCashedOut(null);
      setRoundId(r => r + 1);
    };

    beginBetting();

    const id = setInterval(() => {
      const ph = phaseRef.current;

      if (ph === 'betting') {
        cdRef.current -= TICK_MS;
        const elapsed = (BET_MS - cdRef.current) / 1000;
        let changed = false;
        fakesRef.current.forEach(f => {
          if (!f.joined && f.joinAt <= elapsed) { f.joined = true; changed = true; }
        });
        if (changed) setFakes([...fakesRef.current]);
        setCountdown(Math.max(0, cdRef.current / 1000));
        if (cdRef.current <= 0) {
          crashAtRef.current = rollCrashPoint(myBetRef.current !== null ? streakRef.current : null, demoMode);
          phaseRef.current = 'flying';
          tRef.current = 0;
          setPhase('flying');
        }
        return;
      }

      if (ph === 'flying') {
        tRef.current += TICK_MS / 1000;
        const m = Math.exp(GROWTH * tRef.current);
        multRef.current = m;
        samplesRef.current.push([tRef.current, Math.min(m, crashAtRef.current)]);

        // encaissements des autres joueurs
        let changed = false;
        fakesRef.current.forEach(f => {
          if (f.joined && f.cashedAt === null && f.target !== null && m >= f.target && f.target < crashAtRef.current) {
            f.cashedAt = f.target;
            f.cashPoint = { t: tRef.current, m: f.target };
            changed = true;
          }
        });
        if (changed) setFakes([...fakesRef.current]);

        // encaissement auto du joueur
        const ac = parseFloat(autoRef.current);
        if (myBetRef.current !== null && cashedRef.current === null &&
            !isNaN(ac) && ac >= 1.01 && m >= ac && ac < crashAtRef.current) {
          doCashout(ac);
        }

        if (m >= crashAtRef.current) {
          const cp = crashAtRef.current;
          phaseRef.current = 'crashed';
          pauseRef.current = PAUSE_MS;
          setLastCrash(cp);
          setHistory(h => [cp, ...h.slice(0, 19)]);
          setMult(cp);
          snd.crash();
          if (myBetRef.current !== null && cashedRef.current === null) {
            recordGameResult('Crash', myBetRef.current, 0);
            onResultRef.current(false);
            setToast({ id: Date.now(), text: `−${myBetRef.current.toFixed(2)} TON`, win: false });
            haptic.impact('heavy'); haptic.error();
          }
          setPhase('crashed');
        } else {
          setMult(m);
        }
        return;
      }

      // crashed → pause puis nouveau tour
      pauseRef.current -= TICK_MS;
      if (pauseRef.current <= 0) beginBetting();
    }, TICK_MS);

    return () => {
      clearInterval(id);
      // Refund any unresolved bets on unmount (including mid-flight)
      if (myBetRef.current !== null && cashedRef.current === null) placeGameBet(0, myBetRef.current);
      if (queuedRef.current !== null) placeGameBet(0, queuedRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Actions du joueur ──
  const effBet = Math.min(bet, bal);

  const placeBet = () => {
    if (phaseRef.current !== 'betting' || myBetRef.current !== null) return;
    if (effBet < 0.01) return;
    placeGameBet(effBet, 0);
    snd.bet();
    haptic.impact('light');
    myBetRef.current = effBet;
    setMyBet(effBet);
  };
  const cancelBet = () => {
    if (phaseRef.current !== 'betting' || myBetRef.current === null) return;
    placeGameBet(0, myBetRef.current);
    myBetRef.current = null;
    setMyBet(null);
  };
  const queueBet = () => {
    if (phaseRef.current === 'betting' || queuedRef.current !== null) return;
    if (effBet < 0.01) return;
    placeGameBet(effBet, 0);
    queuedRef.current = effBet;
    setQueuedBet(effBet);
  };
  const cancelQueued = () => {
    if (queuedRef.current === null) return;
    placeGameBet(0, queuedRef.current);
    queuedRef.current = null;
    setQueuedBet(null);
  };

  // ── Géométrie du graphique (échelle dynamique) ──
  const samples  = samplesRef.current;
  const elapsedS = samples.length ? samples[samples.length - 1][0] : 0;
  const curM     = phase === 'crashed' ? (lastCrash ?? mult) : mult;
  const maxT     = Math.max(8, elapsedS * 1.12);
  const maxM     = Math.max(2.2, curM * 1.3);
  const xOf = (tt: number) => PX0 + (tt / maxT) * PW;
  const yOf = (mm: number) => PY0 + PH - ((Math.min(mm, maxM) - 1) / (maxM - 1)) * PH;

  let curvePath = '';
  if (samples.length > 0) {
    const step = Math.max(1, Math.floor(samples.length / 120));
    curvePath = `M${PX0},${PY0 + PH}`;
    for (let i = 0; i < samples.length; i += step) {
      curvePath += ` L${xOf(samples[i][0]).toFixed(1)},${yOf(samples[i][1]).toFixed(1)}`;
    }
    curvePath += ` L${xOf(elapsedS).toFixed(1)},${yOf(Math.min(curM, crashAtRef.current)).toFixed(1)}`;
  }
  const fillPath = curvePath
    ? `${curvePath} L${xOf(elapsedS).toFixed(1)},${PY0 + PH} L${PX0},${PY0 + PH} Z`
    : '';

  // angle de l'avion (pente du dernier segment à l'écran)
  let planeAngle = -18;
  if (samples.length >= 3) {
    const a = samples[Math.max(0, samples.length - 4)];
    const b = samples[samples.length - 1];
    planeAngle = Math.atan2(yOf(b[1]) - yOf(a[1]), xOf(b[0]) - xOf(a[0])) * 180 / Math.PI;
  }
  const tipX = samples.length ? xOf(elapsedS) : PX0;
  const tipY = samples.length ? yOf(Math.min(curM, crashAtRef.current)) : PY0 + PH;
  const isCrashed = phase === 'crashed';

  // graduations
  const yStep  = niceStep(maxM - 1);
  const yTicks = [1, 2, 3, 4].map(i => 1 + yStep * i).filter(v => v <= maxM * 0.99);
  const xStep  = [2, 4, 5, 10, 15, 30, 60].find(v => v >= maxT / 5) ?? 60;
  const xTicks: number[] = [];
  for (let v = xStep; v <= maxT; v += xStep) xTicks.push(v);

  // pot du tour
  const joinedFakes = fakes.filter(f => f.joined);
  const potTotal = joinedFakes.reduce((s, f) => s + f.bet, 0) + (myBet ?? 0);
  const cashedCount = joinedFakes.filter(f => f.cashedAt !== null).length + (cashedOut !== null ? 1 : 0);

  // bouton principal selon l'état
  const mainBtn = (() => {
    if (phase === 'betting') {
      if (myBet !== null) return { label: `ANNULER LA MISE · ${myBet.toFixed(2)} TON`, onClick: cancelBet, kind: 'cancel' as const, disabled: false };
      return { label: `MISER · ${effBet.toFixed(2)} TON`, onClick: placeBet, kind: 'bet' as const, disabled: effBet < 0.01 };
    }
    if (phase === 'flying' && myBet !== null && cashedOut === null) {
      return { label: `ENCAISSER · ${(myBet * mult).toFixed(4)} TON`, onClick: () => doCashout(multRef.current), kind: 'cash' as const, disabled: false };
    }
    if (queuedBet !== null) {
      return { label: 'MISE PLACÉE POUR LE PROCHAIN TOUR ✓ · toucher pour annuler', onClick: cancelQueued, kind: 'queued' as const, disabled: false };
    }
    return { label: `MISER AU PROCHAIN TOUR · ${effBet.toFixed(2)} TON`, onClick: queueBet, kind: 'bet' as const, disabled: effBet < 0.01 };
  })();

  const btnStyle: React.CSSProperties =
    mainBtn.kind === 'cash'   ? { background: 'linear-gradient(135deg,#22c55e,#16a34a)', animation: 'crashPulse 1.1s ease-in-out infinite', color: '#052e16' } :
    mainBtn.kind === 'cancel' ? { background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.45)', color: '#f87171' } :
    mainBtn.kind === 'queued' ? { background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.4)', color: '#4ade80' } :
    mainBtn.disabled          ? { background: 'rgba(255,255,255,0.05)', color: '#475569', cursor: 'not-allowed' } :
                                { background: 'linear-gradient(135deg,#4f6ff0,#6366f1)', boxShadow: '0 4px 16px rgba(79,111,240,0.35)', color: '#fff' };

  const ac = parseFloat(autoCash) || 2;

  return (
    <div className="pb-4" style={{ background: '#060a18', minHeight: '100%' }}>
      <style>{`
        @keyframes crashShake { 0%,100%{transform:translate(0,0)} 15%{transform:translate(-4px,3px)} 30%{transform:translate(4px,-3px)} 45%{transform:translate(-3px,-2px)} 60%{transform:translate(3px,2px)} 80%{transform:translate(-2px,1px)} }
        @keyframes crashFloatUp { 0%{opacity:0;transform:translate(-50%,10px)} 15%{opacity:1} 75%{opacity:1} 100%{opacity:0;transform:translate(-50%,-34px)} }
        @keyframes crashPulse { 0%,100%{box-shadow:0 4px 18px rgba(34,197,94,0.35)} 50%{box-shadow:0 6px 36px rgba(34,197,94,0.72)} }
        @keyframes crashBlink { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes starDrift { from{transform:translateX(0)} to{transform:translateX(-${VB_W}px)} }
        @keyframes chipIn { from{opacity:0;transform:scale(0.5)} to{opacity:1;transform:scale(1)} }
        @keyframes multGlow { 0%,100%{text-shadow:0 0 20px rgba(34,197,94,0.4)} 50%{text-shadow:0 0 40px rgba(34,197,94,0.9)} }
        @keyframes rocketThrust { 0%,100%{opacity:0.82} 50%{opacity:0.45} }
        @keyframes rocketWobble { 0%{transform:rotate(-3deg) scale(1)} 100%{transform:rotate(3deg) scale(1.04)} }
        @keyframes cashoutFlash { 0%{opacity:1} 100%{opacity:0} }
        @keyframes mineReveal { 0%{transform:scale(0.6);opacity:0} 60%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
        @keyframes gemShine { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.5)} }
      `}</style>

      <BigWinEffect show={bigWin} />
      {/* En-tête */}
      <div style={{ background: '#0d1021', borderBottom: '1px solid #1e2847' }} className="px-4 pt-4 pb-3 space-y-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #1e2847' }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white">Crash ✈️</h2>
              <span className="flex items-center gap-1" style={{ fontSize: 9, fontWeight: 800, color: '#f87171', letterSpacing: '0.08em' }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: '#ef4444', animation: 'crashBlink 1.2s infinite' }} />
                EN DIRECT
              </span>
              <StreakChip streak={streak} />
            </div>
            <p className="text-[11px]" style={{ color: '#64748b' }}>Misez avant le décollage · Encaissez avant le crash</p>
          </div>
          <MuteButton />
          <GameBalanceChip bal={bal} demo={demoMode} />
        </div>

        {/* Historique des tours */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {history.slice(0, 14).map((h, i) => (
            <span key={`${roundId}-${i}`} style={{
              flexShrink: 0, fontSize: 11, fontWeight: 700,
              padding: '2px 8px', borderRadius: 20,
              animation: i === 0 ? 'chipIn 0.3s ease' : undefined,
              background: h < 2 ? 'rgba(239,68,68,0.16)' : h < 10 ? 'rgba(79,111,240,0.16)' : 'rgba(34,197,94,0.16)',
              color: h < 2 ? '#f87171' : h < 10 ? '#818cf8' : '#4ade80',
            }}>
              {h.toFixed(2)}×
            </span>
          ))}
        </div>
      </div>

      {/* Méta du tour */}
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <span style={{ fontSize: 11, color: '#64748b' }}>Tour <span style={{ color: '#94a3b8', fontWeight: 700 }}>#{roundId}</span></span>
        <span style={{ fontSize: 11, color: '#64748b' }}>👥 {joinedFakes.length + (myBet !== null ? 1 : 0)} joueurs · 💰 {potTotal.toFixed(2)} TON</span>
      </div>

      {/* Graphique */}
      <div className="mx-4 mt-1 relative" style={{
        borderRadius: 16,
        border: isCrashed ? '1px solid rgba(239,68,68,0.4)' : cashedOut !== null && phase === 'flying' ? '1px solid rgba(34,197,94,0.4)' : '1px solid #1e2847',
        background: 'radial-gradient(120% 120% at 20% 100%, #0c1230 0%, #060a18 60%)',
        overflow: 'hidden',
        animation: (isCrashed && myBet !== null && cashedOut === null) ? 'crashShake 0.45s ease' : undefined,
        transition: 'border-color 0.2s',
      }}>
        <svg width="100%" viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ display: 'block' }}>
          <defs>
            <linearGradient id="avFillG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="avFillR" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* étoiles en dérive (2 couches) */}
          <g style={{ animation: 'starDrift 70s linear infinite' }}>
            {Array.from({ length: 36 }, (_, i) => (
              <circle key={i}
                cx={(i * 53 + 17) % (VB_W * 2)} cy={(i * 37 + 11) % (PH + 20)}
                r={i % 6 === 0 ? 1.4 : 0.8}
                fill="#fff" opacity={0.10 + (i % 4) * 0.07} />
            ))}
          </g>
          <g style={{ animation: 'starDrift 130s linear infinite' }}>
            {Array.from({ length: 24 }, (_, i) => (
              <circle key={i}
                cx={(i * 79 + 41) % (VB_W * 2)} cy={(i * 53 + 29) % (PH + 20)}
                r={0.6} fill="#93c5fd" opacity={0.12} />
            ))}
          </g>

          {/* graduations Y */}
          {yTicks.map(v => (
            <g key={v}>
              <line x1={PX0} y1={yOf(v)} x2={PX0 + PW} y2={yOf(v)}
                stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4,4" />
              <text x={PX0 - 5} y={yOf(v) + 3.5} textAnchor="end" fontSize="9" fill="#64748b">
                {v < 10 ? v.toFixed(1) : Math.round(v)}×
              </text>
            </g>
          ))}

          {/* graduations X */}
          {xTicks.map(v => (
            <g key={v}>
              <line x1={xOf(v)} y1={PY0 + PH} x2={xOf(v)} y2={PY0 + PH + 4} stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
              <text x={xOf(v)} y={VB_H - 6} textAnchor="middle" fontSize="8" fill="#64748b">{v}s</text>
            </g>
          ))}
          <line x1={PX0} y1={PY0 + PH} x2={PX0 + PW} y2={PY0 + PH} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

          {/* courbe */}
          {fillPath && phase !== 'betting' && (
            <path d={fillPath} fill={isCrashed ? 'url(#avFillR)' : 'url(#avFillG)'} />
          )}
          {curvePath && phase !== 'betting' && (
            <path d={curvePath} fill="none"
              stroke={isCrashed ? '#ef4444' : '#22c55e'}
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* ligne cible d'encaissement auto */}
          {(() => {
            const acv = parseFloat(autoCash);
            if (!isNaN(acv) && acv >= 1.01 && acv <= maxM && phase !== 'betting') {
              const y = yOf(acv);
              return (
                <g>
                  <line x1={PX0} y1={y} x2={PX0 + PW} y2={y}
                    stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="5,4" opacity="0.6" />
                  <text x={PX0 + PW - 2} y={y - 4} textAnchor="end" fontSize="9" fontWeight="700" fill="#f59e0b" opacity="0.9">
                    AUTO ×{acv.toFixed(2)}
                  </text>
                </g>
              );
            }
            return null;
          })()}

          {/* marqueurs d'encaissement des autres joueurs */}
          {phase !== 'betting' && fakes.filter(f => f.cashPoint).map((f, i) => (
            <circle key={i} cx={xOf(f.cashPoint!.t)} cy={yOf(f.cashPoint!.m)} r="2.2"
              fill="#4ade80" opacity="0.55" />
          ))}

          {/* marqueur d'encaissement du joueur */}
          {myCashRef.current && phase !== 'betting' && (
            <g>
              <circle cx={xOf(myCashRef.current.t)} cy={yOf(myCashRef.current.m)} r="3.5"
                fill="#22c55e" stroke="#dcfce7" strokeWidth="1" />
              <text x={xOf(myCashRef.current.t)} y={yOf(myCashRef.current.m) - 7}
                textAnchor="middle" fontSize="9" fontWeight="800" fill="#4ade80">
                Vous ×{myCashRef.current.m.toFixed(2)}
              </text>
            </g>
          )}

          {/* fusée / explosion */}
          {phase === 'flying' && (
            <g transform={`translate(${tipX},${tipY}) rotate(${planeAngle})`}>
              {/* Inner g avec wobble — amplitude augmente avec le multiplicateur */}
              <g style={{ animation: mult > 10 ? 'rocketWobble 0.18s ease-in-out infinite alternate' : mult > 3 ? 'rocketWobble 0.3s ease-in-out infinite alternate' : mult > 1.5 ? 'rocketWobble 0.5s ease-in-out infinite alternate' : undefined, transformOrigin: 'center' }}>
                {/* Flammes du réacteur */}
                <ellipse cx="-16" cy="0" rx="11" ry="5.5" fill="#f97316" opacity="0.22" />
                <ellipse cx="-13" cy="0" rx="8"  ry="3.8" fill="#fb923c" opacity="0.50" />
                <ellipse cx="-11" cy="0" rx="5"  ry="2.2" fill="#fde68a" opacity="0.82" />
                {/* Corps principal */}
                <path d="M18,0 L12,-2 L-9,-4 L-14,-2 L-14,2 L-9,4 L12,2 Z" fill="#f43f5e" />
                {/* Nez */}
                <path d="M12,-2 L18,0 L12,2 Z" fill="#fda4af" />
                {/* Aile haute */}
                <path d="M-1,-4 L-8,-13 L-12,-4 Z" fill="#fb7185" opacity="0.9" />
                {/* Aile basse */}
                <path d="M-1,4 L-8,13 L-12,4 Z" fill="#fb7185" opacity="0.9" />
                {/* Aileron haut */}
                <path d="M-10,-4 L-14,-9 L-14,-4 Z" fill="#be123c" />
                {/* Aileron bas */}
                <path d="M-10,4 L-14,9 L-14,4 Z" fill="#be123c" />
                {/* Hublot */}
                <circle cx="5" cy="0" r="3.2" fill="#bfdbfe" opacity="0.95" />
                <circle cx="5" cy="0" r="1.9" fill="#60a5fa" />
                <circle cx="4.2" cy="-0.8" r="0.7" fill="#fff" opacity="0.6" />
                {/* Halo de vitesse */}
                <circle r="10" fill="#f43f5e" opacity="0.06" />
              </g>
            </g>
          )}
          {isCrashed && (
            <g>
              {Array.from({length: 10}, (_, i) => {
                const a = (i * 36) * Math.PI / 180;
                const r = 10 + (i % 3) * 5;
                return <circle key={i} cx={+(tipX + Math.cos(a) * r).toFixed(1)} cy={+(tipY + Math.sin(a) * r).toFixed(1)}
                  r={2 + (i % 3)} fill={['#ef4444','#f97316','#fbbf24'][i % 3]} opacity="0.75" />;
              })}
              <circle cx={tipX} cy={tipY} r="14" fill="#f97316" opacity="0.15" />
              <text x={tipX} y={tipY + 7} textAnchor="middle" fontSize="22">💥</text>
            </g>
          )}
        </svg>

        {/* Flash vert au cashout */}
        {cashFlash && (
          <div className="absolute inset-0 pointer-events-none rounded-2xl"
            style={{ background: 'rgba(34,197,94,0.18)', animation: 'cashoutFlash 0.45s ease-out forwards' }} />
        )}

        {/* superposition centrale */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {phase === 'betting' ? (
            <div className="text-center">
              <p style={{ fontSize: 10, fontWeight: 800, color: '#64748b', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Prochain décollage</p>
              <p style={{
                fontSize: 44, fontWeight: 900, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1,
                color: countdown < 3 ? '#ef4444' : countdown < 5 ? '#f97316' : '#f8fafc',
                animation: countdown < 3 ? 'crashBlink 0.7s ease-in-out infinite' : undefined,
              }}>
                {countdown.toFixed(1)}s
              </p>
              <div style={{ width: 130, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, margin: '8px auto 0', overflow: 'hidden' }}>
                <div style={{
                  width: `${(countdown / (BET_MS / 1000)) * 100}%`, height: '100%',
                  background: countdown < 3 ? 'linear-gradient(90deg,#ef4444,#f97316)' : 'linear-gradient(90deg,#4f6ff0,#818cf8)',
                  borderRadius: 99, transition: 'width 0.05s linear',
                }} />
              </div>
              {myBet !== null && (
                <p style={{ fontSize: 11, fontWeight: 700, color: '#4ade80', marginTop: 8 }}>✓ Mise placée · {myBet.toFixed(2)} TON</p>
              )}
            </div>
          ) : (
            <div className="text-center">
              <p style={{
                fontSize: 46, fontWeight: 900, lineHeight: 1.05, fontVariantNumeric: 'tabular-nums',
                color: isCrashed ? '#ef4444' : cashedOut !== null ? '#4ade80' : '#f8fafc',
                textShadow: isCrashed ? '0 0 24px rgba(239,68,68,0.5)' : '0 0 24px rgba(34,197,94,0.25)',
              }}>
                {curM.toFixed(2)}×
              </p>
              <p style={{
                fontSize: 12, fontWeight: 700, marginTop: 2,
                color: isCrashed ? '#f87171' : cashedOut !== null ? '#4ade80' : '#94a3b8',
              }}>
                {isCrashed
                  ? '💥 CRASHÉ'
                  : cashedOut !== null
                    ? `✓ Encaissé à ×${cashedOut.toFixed(2)}`
                    : myBet !== null ? 'En vol · encaissez !' : 'En vol (spectateur)'}
              </p>
            </div>
          )}
        </div>

        {/* toast résultat */}
        {toast && (
          <div key={toast.id} style={{
            position: 'absolute', left: '50%', bottom: 26,
            animation: 'crashFloatUp 1.8s ease forwards',
            fontSize: 17, fontWeight: 900,
            color: toast.win ? '#4ade80' : '#f87171',
            textShadow: '0 2px 8px rgba(0,0,0,0.6)',
            pointerEvents: 'none',
          }}>
            {toast.text}
          </div>
        )}
      </div>

      {/* Bouton principal */}
      <div className="px-4 pt-3">
        <button onClick={mainBtn.onClick} disabled={mainBtn.disabled}
          className="w-full py-4 rounded-xl font-black text-sm active:scale-[0.98] transition-all tracking-wide uppercase"
          style={btnStyle}>
          {bal < 0.01 && mainBtn.kind === 'bet' ? (demoMode ? '🎮 Démo épuisé' : '💸 Solde insuffisant') : mainBtn.label}
        </button>
      </div>

      {/* Tableau des joueurs en direct */}
      <div style={{ background: '#0d1021', border: '1px solid #1e2847' }} className="mx-4 mt-3 rounded-xl overflow-hidden">
        <div style={{ borderBottom: '1px solid #1e2847' }} className="flex items-center justify-between px-3 py-2">
          <div className="grid grid-cols-4 flex-1">
            {['JOUEUR', 'ENC.', 'MISE', 'PROFIT'].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.06em' }}>{h}</span>
            ))}
          </div>
          <span style={{ fontSize: 10, color: '#64748b' }}>{cashedCount} sortis</span>
        </div>

        {/* ligne du joueur */}
        {(myBet !== null || queuedBet !== null) && (
          <div style={{ background: 'rgba(79,111,240,0.10)', borderBottom: '1px solid #1e2847' }} className="grid grid-cols-4 px-3 py-2 items-center">
            <span style={{ fontSize: 12, fontWeight: 800, color: '#818cf8' }}>Vous</span>
            <span style={{ fontSize: 12, color: cashedOut !== null ? '#4ade80' : '#64748b', fontWeight: 700 }}>
              {cashedOut !== null ? `×${cashedOut.toFixed(2)}` : queuedBet !== null ? 'File' : '—'}
            </span>
            <span style={{ fontSize: 12, color: '#f8fafc' }}>{(myBet ?? queuedBet ?? 0).toFixed(2)}</span>
            <span style={{ fontSize: 12, fontWeight: 800 }}>
              {cashedOut !== null
                ? <span style={{ color: '#4ade80' }}>+{((myBet ?? 0) * cashedOut - (myBet ?? 0)).toFixed(2)}</span>
                : myBet !== null && isCrashed
                  ? <span style={{ color: '#f87171' }}>−{myBet.toFixed(2)}</span>
                  : myBet !== null && phase === 'flying'
                    ? <span style={{ color: '#818cf8' }}>En vol…</span>
                    : <span style={{ color: '#64748b' }}>—</span>}
            </span>
          </div>
        )}

        {joinedFakes.length === 0 && (
          <p className="px-3 py-3 text-center" style={{ fontSize: 11, color: '#475569' }}>Les joueurs rejoignent le tour…</p>
        )}
        {joinedFakes.map((f, i) => (
          <div key={f.name} style={{ borderBottom: i < joinedFakes.length - 1 ? '1px solid rgba(30,40,71,0.45)' : 'none' }}
            className="grid grid-cols-4 px-3 py-2 items-center">
            <span style={{ fontSize: 12, color: '#94a3b8' }}>{f.name}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: f.cashedAt !== null ? '#4ade80' : isCrashed ? '#f87171' : '#64748b' }}>
              {f.cashedAt !== null ? `×${f.cashedAt.toFixed(2)}` : isCrashed ? 'CRASH' : phase === 'flying' ? '…' : '—'}
            </span>
            <span style={{ fontSize: 12, color: '#cbd5e1' }}>{f.bet.toFixed(2)}</span>
            <span style={{ fontSize: 12, fontWeight: 700 }}>
              {f.cashedAt !== null
                ? <span style={{ color: '#4ade80' }}>+{(f.bet * f.cashedAt - f.bet).toFixed(2)}</span>
                : isCrashed
                  ? <span style={{ color: '#f87171' }}>−{f.bet.toFixed(2)}</span>
                  : <span style={{ color: '#64748b' }}>—</span>}
            </span>
          </div>
        ))}
      </div>

      {/* Panneau de mise */}
      <div style={{ background: '#0d1021', border: '1px solid #1e2847' }} className="mx-4 mt-3 rounded-xl p-4 space-y-3">
        <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Montant de la mise</p>
        <div style={{ background: '#080c1e', border: '1px solid #1e2847', borderRadius: 12, opacity: myBet !== null ? 0.5 : 1 }}
          className="flex items-center px-3 py-2.5">
          <input type="number" value={bet} min={0.01} max={50} step={0.01}
            disabled={myBet !== null}
            onChange={e => { const v = +e.target.value; if (!isNaN(v)) setBet(Math.max(0.01, Math.min(50, v))); }}
            style={{ flex: 1, background: 'transparent', color: '#f8fafc', fontSize: 20, fontWeight: 700, outline: 'none', border: 'none' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>TON</span>
        </div>
        <BetQuickButtons setBet={setBet} maxBal={bal} />

        <div className="grid grid-cols-2 gap-2">
          <div style={{ background: '#080c1e', border: '1px solid #1e2847', borderRadius: 10 }} className="px-3 py-2">
            <p style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Profit à ×{ac.toFixed(2)}</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#22c55e' }}>+{(effBet * ac - effBet).toFixed(4)} TON</p>
          </div>
          <div style={{ background: '#080c1e', border: '1px solid #1e2847', borderRadius: 10 }} className="px-3 py-2">
            <p style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Chance de gagner</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>{Math.min(97, 97 / ac).toFixed(1)}%</p>
          </div>
        </div>

        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Encaissement auto (×)</p>
          <div style={{ background: '#080c1e', border: '1px solid #1e2847', borderRadius: 12 }} className="flex items-center px-3 py-2.5 gap-2">
            <input type="number" value={autoCash} placeholder="2.00" min={1.01} step={0.01}
              onChange={e => { setAutoCash(e.target.value); localStorage.setItem('tc_crash_auto', e.target.value); }}
              style={{ flex: 1, background: 'transparent', color: '#f8fafc', fontSize: 16, fontWeight: 600, outline: 'none', border: 'none' }} />
            {autoCash && (
              <button onClick={() => { setAutoCash(''); localStorage.removeItem('tc_crash_auto'); }} style={{ color: '#64748b', fontSize: 13 }}>✕</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
// MINES
// ══════════════════════════════════════════════════════════════════

const GRID_COLS = 5, GRID_SIZE = 20;

function minesMult(n: number, k: number): number {
  if (k === 0) return 1.0;
  let p = 1;
  for (let i = 0; i < k; i++) p *= (GRID_SIZE - n - i) / (GRID_SIZE - i);
  return +(0.93 / p).toFixed(2); // 93% RTP
}

// Real mode: always +1 hidden mine minimum; more with win streak.
// Demo: no hidden mines — displayed odds are accurate.
function effectiveMines(selected: number, streak: number, demo = false): number {
  if (demo) return selected;
  const extra = streak >= 2 ? 3 : streak >= 1 ? 2 : 1;
  return Math.min(GRID_SIZE - 2, selected + extra);
}

type MinesPhase = 'waiting' | 'playing' | 'won' | 'lost';

type MinesFeedEntry = { username: string; bet: number; payout: number; profit: number; mines: number };

const MINES_FEED_INIT: MinesFeedEntry[] = [
  { username: 'Marco T.',  bet: 1.0,  payout: 2.43,  profit: 1.43,  mines: 3 },
  { username: 'Léa R.',    bet: 0.5,  payout: 0,     profit: -0.5,  mines: 5 },
  { username: 'Yusuf K.',  bet: 2.0,  payout: 5.12,  profit: 3.12,  mines: 3 },
  { username: 'Chen W.',   bet: 0.1,  payout: 0,     profit: -0.1,  mines: 10 },
  { username: 'Amira S.',  bet: 5.0,  payout: 9.85,  profit: 4.85,  mines: 5 },
  { username: 'Dmytro P.', bet: 0.05, payout: 0,     profit: -0.05, mines: 3 },
  { username: 'Fatou D.',  bet: 0.2,  payout: 0.44,  profit: 0.24,  mines: 3 },
];

const MinesGame: React.FC<{ onBack: () => void; streak: number; onResult: OnResult }> = ({ onBack, streak, onResult }) => {
  const { currentUser, placeGameBet, recordGameResult, demoMode, demoBalance } = useAppStore();
  const bal = demoMode ? demoBalance : currentUser.balanceMain;
  const [bet, setBet]             = useState(0.01);
  const [mineCount, setMineCount] = useState<number>(3);
  const [phase, setPhase]         = useState<MinesPhase>('waiting');
  const [minePos, setMinePos]     = useState<Set<number>>(new Set());
  const [revealed, setRevealed]   = useState<Set<number>>(new Set());
  const [safeCount, setSafeCount] = useState(0);
  const [feedTab, setFeedTab]     = useState<'all' | 'mine'>('all');
  const [feed, setFeed]           = useState<MinesFeedEntry[]>(MINES_FEED_INIT);
  const [myFeed, setMyFeed]       = useState<MinesFeedEntry[]>([]);
  const activeBetRef              = useRef(0);
  const effMinesRef               = useRef<number>(mineCount);
  const [bigWin, setBigWin]       = useState(false);
  const minesMountedRef           = useRef(true);
  const minesBigWinTimer          = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    minesMountedRef.current = true;
    return () => { minesMountedRef.current = false; if (minesBigWinTimer.current) clearTimeout(minesBigWinTimer.current); };
  }, []);

  const effBet   = Math.min(bet, bal);
  // Use effective mines for honest multiplier display — matches actual placement
  const effMinesCalc = phase === 'waiting'
    ? (demoMode ? mineCount : effectiveMines(mineCount, streak))
    : (effMinesRef.current || mineCount);
  const curMult  = minesMult(effMinesCalc, safeCount);
  const curWin   = +(activeBetRef.current * curMult).toFixed(6);
  const nextMult = minesMult(effMinesCalc, safeCount + 1);
  const firstCaseMult = minesMult(effMinesCalc, 1);
  const maxPossibleMult = minesMult(effMinesCalc, GRID_SIZE - effMinesCalc);

  const startGame = () => {
    if (effBet < 0.01 || bal < 0.01) return;
    haptic.impact('medium');
    const effM = effectiveMines(mineCount, streak, demoMode);
    effMinesRef.current = effM;
    const arr = Array.from({ length: GRID_SIZE }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setMinePos(new Set(arr.slice(0, effM)));
    setRevealed(new Set());
    setSafeCount(0);
    activeBetRef.current = effBet;
    setPhase('playing');
  };

  const revealTile = (idx: number) => {
    if (phase !== 'playing' || revealed.has(idx)) return;

    // Greed trap (real mode only): after 4+ safe reveals the house boosts mine probability
    let isMine = minePos.has(idx);
    if (!isMine && !demoMode && safeCount >= 4) {
      const greedP = Math.min(0.45, 0.10 + (safeCount - 4) * 0.07);
      if (Math.random() < greedP) isMine = true;
    }

    if (isMine) {
      // Build display mine set: the hit tile + up to mineCount-1 others from minePos
      const others = [...minePos].filter(m => m !== idx && !revealed.has(m));
      others.sort(() => Math.random() - 0.5);
      const displayMines = new Set([idx, ...others.slice(0, mineCount - 1)]);
      setMinePos(displayMines);
      setRevealed(new Set([...revealed, idx]));
      setPhase('lost');
      placeGameBet(activeBetRef.current, 0);
      recordGameResult('Mines', activeBetRef.current, 0);
      snd.boom();
      haptic.impact('heavy'); haptic.error();
      onResult(false);
      const entry: MinesFeedEntry = { username: 'Vous', bet: activeBetRef.current, payout: 0, profit: -activeBetRef.current, mines: mineCount };
      if (!demoMode) setFeed(f => [entry, ...f.slice(0, 9)]);
      setMyFeed(f => [entry, ...f.slice(0, 9)]);
    } else {
      setRevealed(new Set([...revealed, idx]));
      snd.reveal();
      haptic.impact('light');
      const ns = safeCount + 1;
      setSafeCount(ns);
      if (ns === GRID_SIZE - effMinesRef.current) {
        const win = +(activeBetRef.current * minesMult(effMinesRef.current, ns)).toFixed(6);
        trimMinesForDisplay();
        placeGameBet(activeBetRef.current, win);
        recordGameResult('Mines', activeBetRef.current, win);
        snd.win();
        haptic.success();
        onResult(true);
        const finalMult = minesMult(effMinesRef.current, ns);
        if (finalMult >= 5) { setBigWin(true); if (minesBigWinTimer.current) clearTimeout(minesBigWinTimer.current); minesBigWinTimer.current = setTimeout(() => { if (minesMountedRef.current) setBigWin(false); }, 2600); }
        setPhase('won');
        const entry: MinesFeedEntry = { username: 'Vous', bet: activeBetRef.current, payout: win, profit: +(win - activeBetRef.current).toFixed(4), mines: mineCount };
        if (!demoMode) setFeed(f => [entry, ...f.slice(0, 9)]);
        setMyFeed(f => [entry, ...f.slice(0, 9)]);
      }
    }
  };

  // On win, only ever display the number of mines the player selected —
  // extra hidden mines must never appear on the final board.
  const trimMinesForDisplay = () => {
    const arr = [...minePos];
    arr.sort(() => Math.random() - 0.5);
    setMinePos(new Set(arr.slice(0, mineCount)));
  };

  const cashout = () => {
    if (phase !== 'playing' || safeCount === 0) return;
    trimMinesForDisplay();
    placeGameBet(activeBetRef.current, curWin);
    recordGameResult('Mines', activeBetRef.current, curWin);
    snd.win();
    haptic.success();
    onResult(true);
    if (curMult >= 5) { setBigWin(true); if (minesBigWinTimer.current) clearTimeout(minesBigWinTimer.current); minesBigWinTimer.current = setTimeout(() => { if (minesMountedRef.current) setBigWin(false); }, 2600); }
    setPhase('won');
    const entry: MinesFeedEntry = { username: 'Vous', bet: activeBetRef.current, payout: curWin, profit: +(curWin - activeBetRef.current).toFixed(4), mines: mineCount };
    if (!demoMode) setFeed(f => [entry, ...f.slice(0, 9)]);
    setMyFeed(f => [entry, ...f.slice(0, 9)]);
  };

  const reset = () => { setPhase('waiting'); setRevealed(new Set()); setMinePos(new Set()); setSafeCount(0); };

  const displayFeed = feedTab === 'all' ? feed : myFeed;

  return (
    <div className="pb-4" style={{ background: '#060a18', minHeight: '100%' }}>
      <style>{`
        @keyframes mineReveal { 0%{transform:scale(0.5) rotate(-8deg);opacity:0} 55%{transform:scale(1.18) rotate(3deg)} 80%{transform:scale(0.95)} 100%{transform:scale(1) rotate(0deg);opacity:1} }
        @keyframes gemShine { 0%,100%{filter:brightness(1.1) drop-shadow(0 0 4px rgba(74,222,128,0.4))} 50%{filter:brightness(1.7) drop-shadow(0 0 10px rgba(74,222,128,0.85))} }
        @keyframes mineGridShake { 0%,100%{transform:translate(0,0)} 15%{transform:translate(-6px,4px)} 30%{transform:translate(6px,-4px)} 45%{transform:translate(-5px,-3px)} 60%{transform:translate(5px,3px)} 80%{transform:translate(-2px,1px)} }
        @keyframes boomFlash {
          0%  {box-shadow:0 0 0 rgba(239,68,68,0); transform:scale(1)}
          15% {box-shadow:0 0 32px 4px rgba(239,68,68,1), 0 0 8px rgba(255,100,0,0.9) inset; transform:scale(1.12)}
          40% {box-shadow:0 0 24px rgba(239,68,68,0.8); transform:scale(1.04)}
          100%{box-shadow:0 0 12px rgba(239,68,68,0.35); transform:scale(1)}
        }
      `}</style>
      <BigWinEffect show={bigWin} />
      {/* Header */}
      <div style={{ background: '#0d1021', borderBottom: '1px solid #1e2847' }} className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #1e2847' }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold" style={{ color: '#f8fafc' }}>Mines 💣</h2>
              <StreakChip streak={streak} />
            </div>
            <p className="text-[11px]" style={{ color: '#64748b' }}>Évitez les mines · Encaissez au bon moment</p>
          </div>
          <MuteButton />
          <GameBalanceChip bal={bal} demo={demoMode} />
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Live gain bar */}
        {phase === 'playing' && (
          <div style={{ background: '#0d1021', border: '1px solid #1e2847', borderRadius: 14 }} className="p-3 flex items-center justify-between">
            <div>
              <p style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Gain actuel</p>
              <p style={{ fontSize: 18, fontWeight: 900, color: '#22c55e' }}>{curWin.toFixed(4)} TON</p>
            </div>
            <div className="text-center">
              <p style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Multiplicateur</p>
              <p style={{ fontSize: 18, fontWeight: 900, color: '#f8fafc' }}>{curMult.toFixed(2)}×</p>
            </div>
            <div className="text-right">
              <p style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Prochain</p>
              <p style={{ fontSize: 18, fontWeight: 900, color: '#fbbf24' }}>{nextMult.toFixed(2)}×</p>
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
            animation: phase === 'lost' ? 'mineGridShake 0.45s ease' : undefined,
          }}>
          {Array.from({ length: GRID_SIZE }, (_, idx) => {
            const isMine = minePos.has(idx);
            const isRev  = revealed.has(idx);
            const showBoom  = isRev && isMine;
            const showGem   = isRev && !isMine;
            const showGhost = (phase === 'lost' || phase === 'won') && isMine && !isRev;
            return (
              <button key={idx} onClick={() => revealTile(idx)}
                disabled={phase !== 'playing' || isRev}
                style={{
                  aspectRatio: '1',
                  background: showBoom ? 'radial-gradient(circle at 50% 35%, rgba(239,68,68,0.6), rgba(127,29,29,0.5))' :
                               showGem  ? 'radial-gradient(circle at 45% 35%, rgba(74,222,128,0.55), rgba(20,83,45,0.45))' :
                               showGhost ? 'rgba(239,68,68,0.08)' :
                               phase === 'playing' ? 'linear-gradient(160deg,#1e2a52,#161d3a)' : '#111830',
                  border: showBoom ? '2px solid rgba(239,68,68,0.85)' :
                          showGem  ? '2px solid rgba(74,222,128,0.75)' :
                          showGhost ? '1px solid rgba(239,68,68,0.2)' :
                          phase === 'playing' ? '1px solid #2a3a6e' : '1px solid #1e2847',
                  borderRadius: 12,
                  fontSize: 20,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.18s, border-color 0.18s, transform 0.12s',
                  animation: showBoom ? 'mineReveal 0.25s ease-out, boomFlash 0.6s ease-out forwards' :
                             showGem  ? 'mineReveal 0.25s ease-out, gemShine 2.2s ease-in-out 0.3s infinite' : undefined,
                  boxShadow: showGem  ? '0 0 18px rgba(74,222,128,0.55), 0 0 6px rgba(74,222,128,0.3) inset' :
                             showBoom ? '0 0 22px rgba(239,68,68,0.7)' : undefined,
                  filter: showGem ? 'brightness(1.15)' : undefined,
                  cursor: phase === 'playing' && !isRev ? 'pointer' : 'default',
                  opacity: showGhost ? 0.5 : 1,
                }}
                onMouseEnter={e => { if (phase === 'playing' && !isRev) (e.currentTarget as HTMLButtonElement).style.background = '#243059'; }}
                onMouseLeave={e => { if (phase === 'playing' && !isRev) (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(160deg,#1e2a52,#161d3a)'; }}
              >
                {showBoom ? '💣' : showGem ? '💎' : showGhost ? '💣' : null}
              </button>
            );
          })}
        </div>

        {/* Waiting controls */}
        {phase === 'waiting' && (
          <div style={{ background: '#0d1021', border: '1px solid #1e2847', borderRadius: 16 }} className="p-4 space-y-4">
            {/* Bet amount */}
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Montant de la mise</p>
              <div style={{ background: '#080c1e', border: '1px solid #1e2847', borderRadius: 12 }} className="flex items-center px-3 py-2.5">
                <input type="number" value={bet} min={0.01} max={50} step={0.01}
                  onChange={e => { const v = +e.target.value; if (!isNaN(v)) setBet(Math.max(0.01, Math.min(50, v))); }}
                  style={{ flex: 1, background: 'transparent', color: '#f8fafc', fontSize: 20, fontWeight: 700, outline: 'none', border: 'none' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>TON</span>
              </div>
            </div>
            <BetQuickButtons setBet={setBet} maxBal={bal} />

            {/* Mines selector */}
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Mines</p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={() => setMineCount(m => Math.max(1, m - 1))}
                  style={{ width: 42, height: 42, background: '#080c1e', border: '1px solid #1e2847', borderRadius: 10, color: '#f8fafc', fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  ‹
                </button>
                <div style={{ flex: 1, height: 42, background: '#080c1e', border: '1px solid #1e2847', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 22, fontWeight: 900, color: '#f8fafc' }}>{mineCount}</span>
                </div>
                <button onClick={() => setMineCount(m => Math.min(15, m + 1))}
                  style={{ width: 42, height: 42, background: '#080c1e', border: '1px solid #1e2847', borderRadius: 10, color: '#f8fafc', fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  ›
                </button>
              </div>
            </div>

            {/* Payout info */}
            <div className="grid grid-cols-2 gap-2">
              <div style={{ background: '#080c1e', border: '1px solid #1e2847', borderRadius: 10 }} className="px-3 py-2.5">
                <p style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>1ʳᵉ case (×)</p>
                <p style={{ fontSize: 16, fontWeight: 900, color: '#f8fafc' }}>{firstCaseMult.toFixed(2)}×</p>
              </div>
              <div style={{ background: '#080c1e', border: '1px solid #1e2847', borderRadius: 10 }} className="px-3 py-2.5">
                <p style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>Profit max</p>
                <p style={{ fontSize: 16, fontWeight: 900, color: '#22c55e' }}>+{(effBet * maxPossibleMult - effBet).toFixed(3)} TON</p>
              </div>
            </div>

            <button onClick={startGame}
              disabled={effBet < 0.01 || bal < 0.01}
              style={effBet >= 0.01 && bal >= 0.01 ? {
                background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                boxShadow: '0 4px 16px rgba(239,68,68,0.3)',
              } : { background: 'rgba(255,255,255,0.05)', cursor: 'not-allowed' }}
              className="w-full py-3.5 rounded-xl font-black text-sm text-white active:scale-[0.98] transition-all tracking-widest uppercase">
              {bal < 0.01 ? (demoMode ? '🎮 Démo épuisé' : '💸 Solde insuffisant') : `💣 Commencer · ${effBet.toFixed(2)} TON`}
            </button>
          </div>
        )}

        {/* Playing controls */}
        {phase === 'playing' && safeCount > 0 && (
          <button onClick={cashout}
            style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: '0 4px 16px rgba(34,197,94,0.3)' }}
            className="w-full py-3 rounded-xl font-black text-sm text-emerald-950 active:scale-[0.98] transition-all">
            ENCAISSER · {curWin.toFixed(4)} TON
          </button>
        )}

        {/* End state */}
        {(phase === 'won' || phase === 'lost') && (
          <div style={{
            background: phase === 'won' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${phase === 'won' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            borderRadius: 14,
          }} className="p-4 text-center space-y-2">
            <p className="text-3xl">{phase === 'won' ? '💎' : '💥'}</p>
            <p className="text-lg font-black" style={{ color: '#f8fafc' }}>
              {phase === 'won' ? `+${curWin.toFixed(4)} TON` : `−${activeBetRef.current.toFixed(4)} TON`}
            </p>
            <p className="text-sm" style={{ color: '#64748b' }}>
              {phase === 'won' ? `${safeCount} cases sûres · ×${curMult.toFixed(2)}` : 'Mine ! Dommage…'}
            </p>
            <button onClick={reset}
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid #1e2847' }}
              className="w-full py-2.5 rounded-xl font-bold text-sm text-white hover:opacity-90 transition-all flex items-center justify-center gap-2">
              <RotateCcw className="w-4 h-4" /> Rejouer
            </button>
          </div>
        )}

        {/* Live bets feed */}
        <div style={{ background: '#0d1021', border: '1px solid #1e2847', borderRadius: 16 }} className="overflow-hidden">
          {/* Tabs */}
          <div style={{ borderBottom: '1px solid #1e2847', display: 'flex' }}>
            {(['all', 'mine'] as const).map(tab => (
              <button key={tab} onClick={() => setFeedTab(tab)}
                style={{
                  flex: 1, padding: '10px 8px',
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                  color: feedTab === tab ? '#f8fafc' : '#64748b',
                  borderBottom: feedTab === tab ? '2px solid #4f6ff0' : '2px solid transparent',
                  background: 'transparent', cursor: 'pointer',
                }}>
                {tab === 'all' ? 'Toutes les mises' : 'Vos mises'}
              </button>
            ))}
          </div>

          {/* Table header */}
          <div style={{ borderBottom: '1px solid #1e2847', padding: '8px 12px', display: 'grid', gridTemplateColumns: '1fr 60px 52px 64px' }}>
            {['JOUEUR', 'PAYOUT', 'MISE', 'PROFIT'].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
            ))}
          </div>

          {/* Table rows */}
          {displayFeed.length === 0 ? (
            <div style={{ padding: '20px 12px', textAlign: 'center', color: '#64748b', fontSize: 12 }}>Aucune mise pour l'instant</div>
          ) : displayFeed.map((entry, i) => (
            <div key={i} style={{
              padding: '8px 12px', display: 'grid', gridTemplateColumns: '1fr 60px 52px 64px',
              borderBottom: i < displayFeed.length - 1 ? '1px solid rgba(30,40,71,0.5)' : 'none',
              alignItems: 'center',
              background: entry.username === 'Vous' ? 'rgba(79,111,240,0.08)' : 'transparent',
            }}>
              <span style={{ fontSize: 12, color: entry.username === 'Vous' ? '#4f6ff0' : '#94a3b8', fontWeight: entry.username === 'Vous' ? 700 : 400 }}>{entry.username}</span>
              <span style={{ fontSize: 12, color: entry.payout > 0 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                {entry.payout > 0 ? `×${(entry.payout / entry.bet).toFixed(2)}` : '—'}
              </span>
              <span style={{ fontSize: 12, color: '#f8fafc' }}>{entry.bet.toFixed(2)}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: entry.profit > 0 ? '#22c55e' : '#ef4444' }}>
                {entry.profit > 0 ? `+${entry.profit.toFixed(2)}` : entry.profit.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
// ROULETTE EUROPÉENNE
// ══════════════════════════════════════════════════════════════════

const R_RED = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const R_WHEEL_SEQ = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];

function rollRoulette(streak: number, demo = false): number {
  const zeroP = demo
    ? 0.04
    : streak >= 2 ? 0.22 : streak >= 1 ? 0.13 : 0.06;
  if (Math.random() < zeroP) return 0;
  return 1 + Math.floor(Math.random() * 36);
}

type RoulettePhase = 'idle' | 'spinning' | 'result';
type RouletteBetType = 'red' | 'black' | 'even' | 'odd' | 'low' | 'high' | 'dozen1' | 'dozen2' | 'dozen3' | `n${number}`;

function roulettePayout(bet: RouletteBetType, result: number): number {
  if (result === 0) return 0;
  if (bet === 'red')   return R_RED.has(result) ? 1.9 : 0;
  if (bet === 'black') return !R_RED.has(result) ? 1.9 : 0;
  if (bet === 'even')  return result % 2 === 0 ? 1.9 : 0;
  if (bet === 'odd')   return result % 2 !== 0 ? 1.9 : 0;
  if (bet === 'low')   return result <= 18 ? 1.9 : 0;
  if (bet === 'high')  return result >= 19 ? 1.9 : 0;
  if (bet === 'dozen1') return result >= 1  && result <= 12 ? 2.8 : 0;
  if (bet === 'dozen2') return result >= 13 && result <= 24 ? 2.8 : 0;
  if (bet === 'dozen3') return result >= 25 && result <= 36 ? 2.8 : 0;
  if (bet.startsWith('n')) return +bet.slice(1) === result ? 36 : 0;
  return 0;
}

const RouletteGame: React.FC<{ onBack: () => void; streak: number; onResult: OnResult }> = ({ onBack, streak, onResult }) => {
  const { currentUser, placeGameBet, recordGameResult, demoMode, demoBalance } = useAppStore();
  const bal = demoMode ? demoBalance : currentUser.balanceMain;
  const [bet, setBet]             = useState(0.01);
  const [selectedBet, setSelected]= useState<RouletteBetType>('red');
  const [phase, setPhase]         = useState<RoulettePhase>('idle');
  const [rotation, setRotation]   = useState(0);
  const rotRef                    = useRef(0);
  const [result, setResult]       = useState<number | null>(null);
  const [payout, setPayout]       = useState(0);
  const [hist, setHist]           = useState<number[]>([]);
  const [ballAngle, setBallAngle] = useState(110);
  const ballRef                   = useRef(110);
  const [bigWin, setBigWin]       = useState(false);
  const mountedRef                = useRef(true);
  const spinTimerRef              = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bigWinTimerRef            = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rTickTimers               = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (spinTimerRef.current)  clearTimeout(spinTimerRef.current);
      if (bigWinTimerRef.current) clearTimeout(bigWinTimerRef.current);
      rTickTimers.current.forEach(clearTimeout);
    };
  }, []);

  const effBet  = Math.min(bet, bal);
  const canSpin = phase === 'idle' && effBet >= 0.01 && bal >= 0.01;

  const NUM_SLOTS = 37;
  const DEG_PER_SLOT = 360 / NUM_SLOTS;

  const spin = () => {
    if (!canSpin) return;
    const n = rollRoulette(streak, demoMode);
    const slotIndex = R_WHEEL_SEQ.indexOf(n);
    const slotCenter = slotIndex * DEG_PER_SLOT + DEG_PER_SLOT / 2;
    const cur = rotRef.current % 360;
    let delta = (360 - slotCenter) - cur;
    if (delta < 0) delta += 360;
    const newRot = rotRef.current + 8 * 360 + delta + (Math.random() * DEG_PER_SLOT * 0.4 - DEG_PER_SLOT * 0.2);
    rotRef.current = newRot;
    setRotation(newRot);
    // Ball counter-clockwise, settles near pointer (top)
    const curBall = ballRef.current % 360;
    const finalBall = ballRef.current - 14 * 360 - curBall + (Math.random() * DEG_PER_SLOT * 0.5 - DEG_PER_SLOT * 0.25);
    ballRef.current = finalBall;
    setBallAngle(finalBall);
    setPhase('spinning');
    snd.spin();
    haptic.impact('medium');
    setResult(null);
    const used = effBet;

    // Cliquetis bille — commence rapide (~30ms) ralentit jusqu'à ~360ms
    rTickTimers.current.forEach(clearTimeout);
    rTickTimers.current = [];
    {
      let elapsed = 0;
      let interval = 28;
      while (elapsed < 4600) {
        elapsed += interval;
        const t = elapsed;
        rTickTimers.current.push(setTimeout(() => {
          if (!mountedRef.current) return;
          snd.tick();
        }, t));
        interval = Math.min(380, interval * 1.038);
      }
    }

    // Rebonds finaux — la bille "hésite" entre 2 cases avant de se stabiliser
    rTickTimers.current.push(setTimeout(() => {
      if (!mountedRef.current) return;
      ballRef.current = finalBall + DEG_PER_SLOT * 0.85;
      setBallAngle(finalBall + DEG_PER_SLOT * 0.85);
      snd.tick();
    }, 4750));
    rTickTimers.current.push(setTimeout(() => {
      if (!mountedRef.current) return;
      ballRef.current = finalBall - DEG_PER_SLOT * 0.35;
      setBallAngle(finalBall - DEG_PER_SLOT * 0.35);
      snd.tick();
    }, 4950));
    rTickTimers.current.push(setTimeout(() => {
      if (!mountedRef.current) return;
      ballRef.current = finalBall;
      setBallAngle(finalBall);
      haptic.impact('light');
    }, 5080));

    spinTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      const mult = roulettePayout(selectedBet, n);
      const win  = +(used * mult).toFixed(6);
      placeGameBet(used, win);
      recordGameResult('Roulette', used, win);
      setResult(n);
      setPayout(mult);
      setHist(h => [n, ...h.slice(0, 11)]);
      setPhase('result');
      onResult(mult > 0);
      if (mult >= 28) {
        setBigWin(true);
        bigWinTimerRef.current = setTimeout(() => { if (mountedRef.current) setBigWin(false); }, 2600);
        snd.win();
        haptic.impact('heavy'); haptic.success();
      } else if (mult > 0) { snd.win(); haptic.success(); }
      else { snd.lose(); haptic.error(); }
    }, 5200);
  };

  const reset = () => { setPhase('idle'); setResult(null); };

  const rColor = (n: number) => n === 0 ? '#10b981' : R_RED.has(n) ? '#ef4444' : '#1e293b';

  const SVG_R = 120, CX2 = 130, CY2 = 130;
  const segAngle = 360 / NUM_SLOTS;

  function segPath2(i: number): string {
    const a0 = (i * segAngle - segAngle / 2 - 90) * Math.PI / 180;
    const a1 = (i * segAngle + segAngle / 2 - 90) * Math.PI / 180;
    const x0 = CX2 + SVG_R * Math.cos(a0), y0 = CY2 + SVG_R * Math.sin(a0);
    const x1 = CX2 + SVG_R * Math.cos(a1), y1 = CY2 + SVG_R * Math.sin(a1);
    return `M${CX2} ${CY2} L${x0.toFixed(2)} ${y0.toFixed(2)} A${SVG_R} ${SVG_R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}Z`;
  }
  function textPos(i: number) {
    const a = (i * segAngle - 90) * Math.PI / 180;
    return { x: CX2 + (SVG_R * 0.72) * Math.cos(a), y: CY2 + (SVG_R * 0.72) * Math.sin(a) };
  }

  const BET_OPTS: { id: RouletteBetType; label: string; mult: string; color: string }[] = [
    { id: 'red',    label: 'Rouge',    mult: '×1.9', color: '#ef4444' },
    { id: 'black',  label: 'Noir',     mult: '×1.9', color: '#475569' },
    { id: 'even',   label: 'Pair',     mult: '×1.9', color: '#6366f1' },
    { id: 'odd',    label: 'Impair',   mult: '×1.9', color: '#8b5cf6' },
    { id: 'low',    label: '1–18',     mult: '×1.9', color: '#0284c7' },
    { id: 'high',   label: '19–36',    mult: '×1.9', color: '#0891b2' },
    { id: 'dozen1', label: 'Douzaine 1', mult: '×2.8', color: '#d97706' },
    { id: 'dozen2', label: 'Douzaine 2', mult: '×2.8', color: '#ca8a04' },
    { id: 'dozen3', label: 'Douzaine 3', mult: '×2.8', color: '#b45309' },
  ];

  const payoutPreview = roulettePayout(selectedBet, result ?? 7);

  return (
    <div className="pb-4" style={{ background: '#060a18', minHeight: '100%' }}>
      <BigWinEffect show={bigWin} />
      <div style={{ background: '#0d1021', borderBottom: '1px solid #1e2847' }} className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #1e2847' }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold" style={{ color: '#f8fafc' }}>Roulette 🎰</h2>
              <StreakChip streak={streak} />
            </div>
            <p className="text-[11px]" style={{ color: '#64748b' }}>Roulette européenne · 37 cases · Numéro ×36</p>
          </div>
          <MuteButton />
          <GameBalanceChip bal={bal} demo={demoMode} />
        </div>

        {/* History chips */}
        {hist.length > 0 && (
          <div className="flex gap-1.5 mt-3 overflow-x-auto no-scrollbar pb-0.5">
            {hist.map((n, i) => (
              <span key={i} style={{
                flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: rColor(n), color: '#fff', fontSize: 10, fontWeight: 800,
                border: '1px solid rgba(255,255,255,0.15)',
              }}>{n}</span>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Wheel */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative" style={{ maxWidth: 270, margin: '0 auto' }}>
            {/* Pointer */}
            <div style={{
              position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
              width: 0, height: 0, zIndex: 20,
              borderLeft: '10px solid transparent', borderRight: '10px solid transparent',
              borderTop: '22px solid #fbbf24',
              filter: 'drop-shadow(0 2px 6px rgba(251,191,36,0.7))',
            }} />
            {/* Rotating wheel */}
            <svg width="100%" viewBox="-15 -15 290 290" style={{
              display: 'block',
              transform: `rotate(${rotation}deg)`,
              transition: phase === 'spinning' ? 'transform 5.0s cubic-bezier(0.25,0.00,0.00,1.00)' : 'none',
            }}>
              <circle cx={CX2} cy={CY2} r={SVG_R + 20} fill="#1a0e00" stroke="#fbbf24" strokeWidth="2.5" />
              {R_WHEEL_SEQ.map((n, i) => {
                const tp = textPos(i);
                const a = i * segAngle - 90;
                const fill = n === 0 ? '#064e3b' : R_RED.has(n) ? '#7f1d1d' : '#0f172a';
                const stroke = n === 0 ? '#10b981' : R_RED.has(n) ? '#ef4444' : '#334155';
                return (
                  <g key={i}>
                    <path d={segPath2(i)} fill={fill} stroke={stroke} strokeWidth="1" />
                    <text x={tp.x.toFixed(2)} y={tp.y.toFixed(2)} textAnchor="middle" dominantBaseline="middle"
                      fontSize={8} fontWeight="700" fill="#e2e8f0"
                      transform={`rotate(${a},${tp.x.toFixed(2)},${tp.y.toFixed(2)})`}
                      style={{ userSelect: 'none', pointerEvents: 'none' }}>
                      {n}
                    </text>
                  </g>
                );
              })}
              <circle cx={CX2} cy={CY2} r={24} fill="#1a0800" stroke="#fbbf24" strokeWidth="2" />
              <circle cx={CX2} cy={CY2} r={10} fill="#fbbf24" opacity="0.3" />
            </svg>
            {/* Ball overlay — not rotating with wheel */}
            <svg width="100%" viewBox="-15 -15 290 290" style={{
              position: 'absolute', top: 0, left: 0, pointerEvents: 'none',
            }}>
              <g style={{
                transform: `rotate(${ballAngle}deg)`,
                transformOrigin: `${CX2}px ${CY2}px`,
                transition: phase === 'spinning' ? 'transform 5.0s cubic-bezier(0.28,0.02,0.0,0.98)' : 'none',
              }}>
                {/* Ball sits in the track between outer rim and segment starts */}
                <circle cx={CX2} cy={CY2 - SVG_R - 9} r={6}
                  fill="white" stroke="#94a3b8" strokeWidth="1.5"
                  style={{ filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.9))' }} />
                {/* Shine */}
                <circle cx={CX2 - 1} cy={CY2 - SVG_R - 12} r={2}
                  fill="white" opacity="0.6" />
              </g>
            </svg>
          </div>

          {/* Result */}
          {phase === 'result' && result !== null && (
            <div style={{
              background: payout > 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${payout > 0 ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}`,
              borderRadius: 14,
            }} className="w-full p-3 text-center flex items-center justify-center gap-4">
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: rColor(result), display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 900, color: '#fff',
                border: '3px solid rgba(255,255,255,0.3)',
              }}>{result}</div>
              <div>
                <p style={{ fontSize: 20, fontWeight: 900, color: payout > 0 ? '#4ade80' : '#f87171' }}>
                  {payout > 0 ? `+${(effBet * payout - effBet).toFixed(4)} TON` : `−${effBet.toFixed(4)} TON`}
                </p>
                <p style={{ fontSize: 12, color: '#94a3b8' }}>
                  {result === 0 ? '🟢 Zéro' : R_RED.has(result) ? '🔴 Rouge' : '⚫ Noir'} · {result % 2 === 0 && result !== 0 ? 'Pair' : 'Impair'} · {result >= 1 && result <= 18 ? '1–18' : result >= 19 ? '19–36' : '—'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bet selection */}
        <div style={{ background: '#0d1021', border: '1px solid #1e2847', borderRadius: 16 }} className="p-4 space-y-3">
          <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Choisir votre pari</p>
          <div className="grid grid-cols-3 gap-2">
            {BET_OPTS.map(opt => (
              <button key={opt.id} onClick={() => setSelected(opt.id)}
                style={{
                  padding: '10px 4px', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  background: selectedBet === opt.id ? opt.color : 'rgba(255,255,255,0.04)',
                  border: selectedBet === opt.id ? `2px solid ${opt.color}` : '1px solid #1e2847',
                  color: selectedBet === opt.id ? '#fff' : '#94a3b8',
                  transition: 'all 0.15s',
                }}>
                <div>{opt.label}</div>
                <div style={{ fontSize: 10, opacity: 0.75, marginTop: 2 }}>{opt.mult}</div>
              </button>
            ))}
          </div>

          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Montant</p>
            <div style={{ background: '#080c1e', border: '1px solid #1e2847', borderRadius: 12 }} className="flex items-center px-3 py-2.5">
              <input type="number" value={bet} min={0.01} max={50} step={0.01}
                onChange={e => { const v = +e.target.value; if (!isNaN(v)) setBet(Math.max(0.01, Math.min(50, v))); }}
                style={{ flex: 1, background: 'transparent', color: '#f8fafc', fontSize: 20, fontWeight: 700, outline: 'none', border: 'none' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>TON</span>
            </div>
          </div>
          <BetQuickButtons setBet={setBet} maxBal={bal} />

          <div className="grid grid-cols-2 gap-2">
            <div style={{ background: '#080c1e', border: '1px solid #1e2847', borderRadius: 10 }} className="px-3 py-2">
              <p style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Gain si gagné</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#22c55e' }}>+{(effBet * payoutPreview - effBet).toFixed(4)} TON</p>
            </div>
            <div style={{ background: '#080c1e', border: '1px solid #1e2847', borderRadius: 10 }} className="px-3 py-2">
              <p style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Multiplicateur</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>×{payoutPreview.toFixed(1)}</p>
            </div>
          </div>

          {phase === 'result' ? (
            <button onClick={reset}
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid #1e2847', width: '100%', padding: '12px', borderRadius: 12, color: '#f8fafc', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <RotateCcw className="w-4 h-4" /> Rejouer
            </button>
          ) : (
            <button onClick={spin} disabled={!canSpin}
              style={canSpin ? { background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: '0 4px 16px rgba(124,58,237,0.35)', width: '100%', padding: '14px', borderRadius: 12, color: '#fff', fontWeight: 900, fontSize: 14, cursor: 'pointer', letterSpacing: '0.05em' } : { background: 'rgba(255,255,255,0.05)', width: '100%', padding: '14px', borderRadius: 12, color: '#475569', fontWeight: 700, fontSize: 14, cursor: 'not-allowed' }}>
              {phase === 'spinning' ? '🎰 La roue tourne…' : bal < 0.01 ? (demoMode ? '🎮 Démo épuisé' : '💸 Solde insuffisant') : `🎰 LANCER · ${effBet.toFixed(2)} TON`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
// PLINKO
// ══════════════════════════════════════════════════════════════════

const PLINKO_ROWS_OPTIONS = [8, 12, 16] as const;
type PlinkoRows = typeof PLINKO_ROWS_OPTIONS[number];
type PlinkoRisk = 'low' | 'medium' | 'high';

const PLINKO_MULTS: Record<PlinkoRisk, Record<PlinkoRows, number[]>> = {
  low: {
    8:  [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
    12: [10, 3, 1.6, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 1.6, 3, 10],
    16: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
  },
  medium: {
    8:  [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
    12: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
    16: [110, 41, 10, 5, 3, 1.5, 1.0, 0.5, 0.3, 0.5, 1.0, 1.5, 3, 5, 10, 41, 110],
  },
  high: {
    8:  [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
    12: [141, 26, 5.5, 2, 0.6, 0.3, 0.1, 0.3, 0.6, 2, 5.5, 26, 141],
    16: [999, 130, 26, 9, 4, 2, 0.7, 0.2, 0.1, 0.2, 0.7, 2, 4, 9, 26, 130, 999],
  },
};

// ── ActiveBall type for multi-ball animation system ─────────────────
type ActiveBall = {
  id:    number;
  path:  boolean[];
  row:   number;
  col:   number;
  bet:   number;
  win:   number;
  mult:  number;
  slot:  number;
  trail: { x: number; y: number }[];
};

function rollPlinko(rows: PlinkoRows, risk: PlinkoRisk, streak: number, demo = false): { slot: number; path: boolean[] } {
  const slots = rows + 1;
  const center = rows / 2;
  const spreadFactor = risk === 'low' ? 0.45 : risk === 'medium' ? 0.70 : 1.0;
  // Positive houseEdge → ball pushed toward edges (lower multipliers in low risk, higher variance)
  // In medium/high risk, edges = high multiplier BUT the probability is already heavily tailed
  // Net effect: lower EV for player
  const houseEdge = demo ? 0.04 : streak >= 2 ? 0.24 : streak >= 1 ? 0.16 : 0.10;
  const path: boolean[] = [];
  let pos = 0;
  for (let r = 0; r < rows; r++) {
    const pull = (pos - center) / center;
    const pRight = 0.5 + pull * spreadFactor * 0.38 + houseEdge * 0.5;
    const goRight = Math.random() > Math.max(0.15, Math.min(0.85, pRight));
    path.push(goRight);
    if (goRight) pos++;
  }
  return { slot: Math.min(slots - 1, pos), path };
}

// ── Plinko physics engine ────────────────────────────────────────────
// The ball falls under real gravity and hops in parabolic arcs from peg
// to peg. The landing slot is still decided by rollPlinko() (so payouts
// are untouched) — physics only drives the *visual* path between the
// pre-computed contact points.
type PhysBall = {
  id:   number;
  pts:  { x: number; y: number }[];
  seg:  number;
  segT: number;
  T:    number;
  sx:   number; sy:  number;
  vx:   number; vy0: number;
  x:    number; y:   number;
  bet:  number; win: number; mult: number; slot: number;
  trail: { x: number; y: number }[];
  squishX: number;
  squishY: number;
  squishT: number;
  angle:   number;
};
type Flash = { x: number; y: number; t: number };

const PLINKO_GRAV        = 5200;  // px/s²
const PLINKO_SEG_T_FIRST = 0.22;  // durée premier arc (bille lente)
const PLINKO_SEG_T_LAST  = 0.065; // durée dernier arc  (bille rapide)
const PLINKO_SEG_T_SLOT  = 0.18;  // durée arc final → slot
const PLINKO_BALL_R      = 3 * 1.55;
const PLINKO_DPR         = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);

function segDuration(segIndex: number, totalSegs: number): number {
  const t     = segIndex / Math.max(totalSegs - 1, 1);
  const eased = t * t; // courbe exponentielle — gravité réaliste
  return PLINKO_SEG_T_FIRST + (PLINKO_SEG_T_LAST - PLINKO_SEG_T_FIRST) * eased;
}

function plinkoInitSeg(b: PhysBall) {
  const a      = b.pts[b.seg];
  const c      = b.pts[b.seg + 1];
  const isLast = b.seg === b.pts.length - 2;
  const T      = isLast ? PLINKO_SEG_T_SLOT : segDuration(b.seg, b.pts.length - 2);
  const jitter = 0.85 + Math.random() * 0.30; // ±15% sur la hauteur de l'arc
  b.T    = T;
  b.segT = 0;
  b.sx   = a.x;
  b.sy   = a.y;
  b.vx   = (c.x - a.x) / T;
  b.vy0  = ((c.y - a.y - 0.5 * PLINKO_GRAV * T * T) / T) * jitter;
}

const PlinkoGame: React.FC<{ onBack: () => void; streak: number; onResult: OnResult }> = ({ onBack, streak, onResult }) => {
  const { currentUser, placeGameBet, recordGameResult, demoMode, demoBalance } = useAppStore();
  const bal = demoMode ? demoBalance : currentUser.balanceMain;

  const [bet, setBet]                   = useState(0.01);
  const [rows, setRows]                 = useState<PlinkoRows>(12);
  const [risk, setRisk]                 = useState<PlinkoRisk>('medium');
  const [ballCount, setBallCount]       = useState<1 | 3 | 5 | 10>(1);
  const [autoPlay, setAutoPlay]         = useState(false);
  const [activeBalls, setActiveBalls]   = useState<ActiveBall[]>([]);
  const [sessionGain, setSessionGain]   = useState(0);
  const [finalSlot, setFinalSlot]       = useState<number | null>(null);
  const [lastWin, setLastWin]           = useState<{ mult: number; win: number } | null>(null);
  const [hist, setHist]                 = useState<Array<{ slot: number; mult: number }>>([]);
  const [bigWin, setBigWin]             = useState(false);

  const autoPlayRef       = useRef(false);
  const sessionGainRef    = useRef(0);
  const nextBallId        = useRef(0);
  const ballTimers        = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const pendingWins       = useRef(new Map<number, number>());
  const autoPlayTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef        = useRef(true);
  const plinkoBigWinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Physics engine refs (positions live outside React state for 60fps draws)
  const canvasRef   = useRef<HTMLCanvasElement | null>(null);
  const physBalls   = useRef<PhysBall[]>([]);
  const flashes     = useRef<Flash[]>([]);
  const rafRef      = useRef<number | null>(null);
  const lastTsRef   = useRef(0);
  const loopRef     = useRef<((ts: number) => void) | null>(null);
  const apiRef      = useRef<{ contact: (pt: { x: number; y: number }) => void; finish: (b: PhysBall) => void }>({ contact: () => {}, finish: () => {} });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      autoPlayRef.current = false;
      if (plinkoBigWinTimer.current) clearTimeout(plinkoBigWinTimer.current);
      if (autoPlayTimerRef.current)  clearTimeout(autoPlayTimerRef.current);
      for (const t of ballTimers.current.values()) clearTimeout(t);
      ballTimers.current.clear();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      physBalls.current = [];
      flashes.current = [];
      // Credit all in-flight wins so no bet is lost on unmount
      const st = useAppStore.getState();
      for (const w of pendingWins.current.values()) st.placeGameBet(0, w);
      pendingWins.current.clear();
    };
  }, []);

  const effBet   = Math.min(bet, bal);
  const mults    = PLINKO_MULTS[risk][rows];
  const slots    = rows + 1;
  const dropping = activeBalls.length > 0;

  // Board geometry
  const BOARD_W     = 300;
  const PEG_SPACING = Math.min(22, BOARD_W / (rows + 2));
  const PEG_R       = 3;
  const ROW_H       = PEG_SPACING * 0.95;
  const BOARD_H     = rows * ROW_H + 60;
  const pegX        = (r: number, c: number) => BOARD_W / 2 - (r * PEG_SPACING) / 2 + c * PEG_SPACING;
  const pegY        = (r: number) => 24 + r * ROW_H;

  const slotColor = (mult: number) => {
    if (mult >= 10)  return '#f59e0b';
    if (mult >= 3)   return '#22c55e';
    if (mult >= 1.5) return '#0ea5e9';
    if (mult >= 1.0) return '#6366f1';
    if (mult >= 0.5) return '#8b5cf6';
    return '#ef4444';
  };

  // Build the sequence of contact points the ball arcs through:
  // top → top of each peg on its predetermined path → the target slot.
  const buildPts = (path: boolean[], slot: number) => {
    const pts: { x: number; y: number }[] = [{ x: BOARD_W / 2, y: 8 }];
    let c = 0;
    for (let r = 0; r < rows; r++) {
      pts.push({ x: pegX(r, c), y: pegY(r) - (PEG_R + PLINKO_BALL_R) });
      if (path[r]) c++;
    }
    pts.push({ x: pegX(rows, slot), y: BOARD_H + 6 });
    return pts;
  };

  const startLoop = () => {
    if (rafRef.current != null || !loopRef.current) return;
    lastTsRef.current = 0;
    rafRef.current = requestAnimationFrame(loopRef.current);
  };

  const launchBall = (id: number, path: boolean[], betAmt: number, win: number, mult: number, slot: number) => {
    const pts = buildPts(path, slot);
    const b: PhysBall = {
      id, pts, seg: 0, segT: 0, T: PLINKO_SEG_T_FIRST,
      sx: pts[0].x, sy: pts[0].y, vx: 0, vy0: 0, x: pts[0].x, y: pts[0].y,
      bet: betAmt, win, mult, slot, trail: [],
      squishX: 1, squishY: 1, squishT: 999, angle: 0,
    };
    plinkoInitSeg(b);
    physBalls.current.push(b);
    startLoop();
  };

  // Side-effect handlers — reassigned every render so the long-lived rAF
  // loop always calls into fresh closures (current rows/risk/balance/etc.).
  apiRef.current.contact = (pt) => {
    snd.tick();
    if (physBalls.current.length <= 3) haptic.tick();
    flashes.current.push({ x: pt.x, y: pt.y, t: 0 });
  };

  apiRef.current.finish = (b) => {
    if (!mountedRef.current) return;
    pendingWins.current.delete(b.id);
    placeGameBet(0, b.win);
    recordGameResult('Plinko', b.bet, b.win);
    sessionGainRef.current = +(sessionGainRef.current + b.win - b.bet).toFixed(4);
    setSessionGain(sessionGainRef.current);
    setHist(h => [{ slot: b.slot, mult: b.mult }, ...h.slice(0, 7)]);
    setLastWin({ mult: b.mult, win: b.win });
    setFinalSlot(b.slot);
    if (b.mult >= 10) {
      setBigWin(true);
      if (plinkoBigWinTimer.current) clearTimeout(plinkoBigWinTimer.current);
      plinkoBigWinTimer.current = setTimeout(() => { if (mountedRef.current) setBigWin(false); }, 2600);
      snd.win(); haptic.success();
    } else if (b.mult >= 1) { snd.win(); haptic.success(); }
    else                    { snd.lose(); haptic.error(); }
    onResult(b.mult >= 1);
    setActiveBalls(prev => prev.filter(x => x.id !== b.id));

    // Auto-play: launch the next single ball after a brief pause
    if (autoPlayRef.current) {
      const st = useAppStore.getState();
      const nextBal = st.demoMode ? st.demoBalance : st.currentUser.balanceMain;
      if (nextBal >= b.bet) {
        autoPlayTimerRef.current = setTimeout(() => {
          if (!mountedRef.current || !autoPlayRef.current) return;
          const st2 = useAppStore.getState();
          const bal2 = st2.demoMode ? st2.demoBalance : st2.currentUser.balanceMain;
          if (bal2 < b.bet) { setAutoPlay(false); autoPlayRef.current = false; return; }
          const { slot: s2, path: p2 } = rollPlinko(rows, risk, streak, demoMode);
          const m2  = PLINKO_MULTS[risk][rows][s2];
          const w2  = +(b.bet * m2).toFixed(6);
          st2.placeGameBet(b.bet, 0);
          const id2 = nextBallId.current++;
          pendingWins.current.set(id2, w2);
          setActiveBalls(prev => [...prev, { id: id2, path: p2, row: 0, col: 0, bet: b.bet, win: w2, mult: m2, slot: s2, trail: [] }]);
          launchBall(id2, p2, b.bet, w2, m2, s2);
        }, 180);
      } else {
        setAutoPlay(false);
        autoPlayRef.current = false;
      }
    }
  };

  // The physics + render loop — created once, driven by requestAnimationFrame.
  if (!loopRef.current) {
    loopRef.current = (ts: number) => {
      const last = lastTsRef.current || ts;
      let dt = (ts - last) / 1000;
      lastTsRef.current = ts;
      if (dt > 0.05) dt = 0.05; // clamp big jumps (tab switch)

      const balls = physBalls.current;
      const finished: PhysBall[] = [];
      for (const b of balls) {
        b.trail.unshift({ x: b.x, y: b.y });
        if (b.trail.length > 7) b.trail.pop();

        // Squish animation — phase 1 : écrasement (0→60ms), phase 2 : overshoot élastique (60→120ms)
        if (b.squishT < 0.06) {
          const p = b.squishT / 0.06;
          b.squishX = 1.0 + 0.30 * (1 - p);
          b.squishY = 1.0 - 0.30 * (1 - p);
        } else if (b.squishT < 0.12) {
          const p = (b.squishT - 0.06) / 0.06;
          b.squishX = 1.0 - 0.08 * Math.sin(p * Math.PI);
          b.squishY = 1.0 + 0.08 * Math.sin(p * Math.PI);
        } else {
          b.squishX = 1.0;
          b.squishY = 1.0;
        }
        b.squishT += dt;

        b.segT += dt;
        if (b.segT >= b.T) {
          const arrived = b.seg + 1;
          b.x = b.pts[arrived].x;
          b.y = b.pts[arrived].y;
          if (arrived >= b.pts.length - 1) {
            finished.push(b);
          } else {
            b.squishT = 0; b.squishX = 1.30; b.squishY = 0.70;
            apiRef.current.contact(b.pts[arrived]);
            b.seg = arrived;
            plinkoInitSeg(b);
          }
        } else {
          const t = b.segT;
          b.angle += b.vx * dt * 0.012;
          b.x = b.sx + b.vx * t;
          b.y = b.sy + b.vy0 * t + 0.5 * PLINKO_GRAV * t * t;
        }
      }
      if (finished.length) physBalls.current = balls.filter(b => !finished.includes(b));

      for (const f of flashes.current) f.t += dt;
      if (flashes.current.length) flashes.current = flashes.current.filter(f => f.t < 0.4);

      // ── draw ──
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.save();
          ctx.scale(PLINKO_DPR, PLINKO_DPR);
          // peg-impact rings
          for (const f of flashes.current) {
            const p = f.t / 0.4;
            ctx.beginPath();
            ctx.arc(f.x, f.y, PLINKO_BALL_R + p * 8, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(251,191,36,${0.5 * (1 - p)})`;
            ctx.lineWidth = 1.6 * (1 - p);
            ctx.stroke();
          }
          // balls
          for (const b of physBalls.current) {
            // traînée
            for (let i = b.trail.length - 1; i >= 0; i--) {
              const tp = b.trail[i];
              const f  = 1 - i / b.trail.length;
              ctx.beginPath();
              ctx.arc(tp.x, tp.y, PLINKO_BALL_R * (0.35 + f * 0.4), 0, Math.PI * 2);
              ctx.fillStyle = `rgba(251,191,36,${f * 0.22})`;
              ctx.fill();
            }
            // corps bille avec squish + rotation
            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.rotate(b.angle);
            ctx.scale(b.squishX, b.squishY);
            const g = ctx.createRadialGradient(
              -PLINKO_BALL_R * 0.3, -PLINKO_BALL_R * 0.3, PLINKO_BALL_R * 0.2,
              0, 0, PLINKO_BALL_R,
            );
            g.addColorStop(0,   '#fef9c3');
            g.addColorStop(0.5, '#fbbf24');
            g.addColorStop(1,   '#d97706');
            ctx.shadowColor = 'rgba(251,191,36,0.85)';
            ctx.shadowBlur  = 10;
            ctx.beginPath();
            ctx.arc(0, 0, PLINKO_BALL_R, 0, Math.PI * 2);
            ctx.fillStyle = g;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(-PLINKO_BALL_R * 0.35, -PLINKO_BALL_R * 0.35, PLINKO_BALL_R * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.60)';
            ctx.fill();
            ctx.restore();
          }
          ctx.restore();
        }
      }

      for (const b of finished) apiRef.current.finish(b);

      if (physBalls.current.length > 0 || flashes.current.length > 0) {
        rafRef.current = requestAnimationFrame(loopRef.current!);
      } else {
        rafRef.current = null;
        lastTsRef.current = 0;
      }
    };
  }

  const dropMulti = (count: number) => {
    const snapBet = Math.min(bet, bal);
    if (snapBet < 0.01 || bal < snapBet) return;
    haptic.impact('light');
    sessionGainRef.current = 0;
    setSessionGain(0);
    setLastWin(null);
    setFinalSlot(null);
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        if (!mountedRef.current) return;
        const st = useAppStore.getState();
        const curBal = st.demoMode ? st.demoBalance : st.currentUser.balanceMain;
        if (curBal < snapBet) return;
        const { slot, path } = rollPlinko(rows, risk, streak, demoMode);
        const m   = mults[slot];
        const win = +(snapBet * m).toFixed(6);
        placeGameBet(snapBet, 0);
        const id = nextBallId.current++;
        pendingWins.current.set(id, win);
        setActiveBalls(prev => [...prev, { id, path, row: 0, col: 0, bet: snapBet, win, mult: m, slot, trail: [] }]);
        launchBall(id, path, snapBet, win, m, slot);
      }, i * 300);
    }
  };

  return (
    <div className="pb-4" style={{ background: '#060a18', minHeight: '100%' }}>
      <BigWinEffect show={bigWin} />

      {/* Header */}
      <div style={{ background: '#0d1021', borderBottom: '1px solid #1e2847' }} className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #1e2847' }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold" style={{ color: '#f8fafc' }}>Plinko 🎯</h2>
              <StreakChip streak={streak} />
            </div>
            <p className="text-[11px]" style={{ color: '#64748b' }}>Lâchez la balle · Visez les multiplicateurs élevés</p>
          </div>
          <MuteButton />
          <GameBalanceChip bal={bal} demo={demoMode} />
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Board */}
        <div style={{ background: '#080c1e', border: '1px solid #1e2847', borderRadius: 16, overflow: 'visible', position: 'relative', padding: '12px 0' }} className="flex justify-center">
          <div style={{ position: 'relative', width: BOARD_W, height: BOARD_H + 44 }}>
          <svg width={BOARD_W} height={BOARD_H + 44} style={{ display: 'block' }}>
            <defs>
              <radialGradient id="plinkoBallGrad" cx="35%" cy="30%">
                <stop offset="0%"   stopColor="#fef08a" />
                <stop offset="100%" stopColor="#d97706" />
              </radialGradient>
              <filter id="plinkoBallGlow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Pegs */}
            {Array.from({ length: rows }, (_, r) =>
              Array.from({ length: r + 1 }, (_, c) => (
                <g key={`${r}-${c}`}>
                  <circle cx={pegX(r, c)} cy={pegY(r)} r={PEG_R + 1} fill="#1e2847" opacity="0.5" />
                  <circle cx={pegX(r, c)} cy={pegY(r)} r={PEG_R} fill="#475569" stroke="#64748b" strokeWidth="0.8" />
                  <circle cx={pegX(r, c) - 1} cy={pegY(r) - 1} r={PEG_R * 0.35} fill="#94a3b8" opacity="0.5" />
                </g>
              ))
            )}

            {/* Slots */}
            {mults.map((m, i) => {
              const sx    = pegX(rows, i) - PEG_SPACING / 2;
              const slotW = PEG_SPACING - 2;
              const isActive = finalSlot === i;
              const col   = slotColor(m);
              return (
                <g key={i}>
                  <rect x={sx} y={BOARD_H - 10} width={slotW} height={30} rx={4}
                    fill={isActive ? col : `${col}33`} stroke={col} strokeWidth={isActive ? 2 : 0.5}
                    style={{ transition: 'fill 0.2s' }} />
                  <text x={sx + slotW / 2} y={BOARD_H + 9} textAnchor="middle" fontSize={Math.min(9, 70 / slots)}
                    fontWeight="800" fill={isActive ? '#fff' : col}
                    style={{ userSelect: 'none', pointerEvents: 'none' }}>
                    {m}×
                  </text>
                </g>
              );
            })}
          </svg>
          <canvas
            ref={canvasRef}
            width={Math.round(BOARD_W * PLINKO_DPR)}
            height={Math.round((BOARD_H + 44) * PLINKO_DPR)}
            style={{ position: 'absolute', top: 0, left: 0, width: BOARD_W, height: BOARD_H + 44, pointerEvents: 'none' }}
          />
          </div>

          {/* Result overlay */}
          {lastWin && !dropping && (
            <div style={{
              position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
              background: lastWin.mult >= 1 ? 'rgba(34,197,94,0.9)' : 'rgba(239,68,68,0.9)',
              padding: '4px 16px', borderRadius: 20, pointerEvents: 'none', whiteSpace: 'nowrap',
            }}>
              <p style={{ fontSize: 14, fontWeight: 900, color: '#fff' }}>
                ×{lastWin.mult} — {lastWin.win > effBet ? `+${(lastWin.win - effBet).toFixed(4)} TON` : `−${(effBet - lastWin.win).toFixed(4)} TON`}
              </p>
            </div>
          )}
        </div>

        {/* In-flight counter + session gain */}
        {activeBalls.length > 0 && (
          <div className="flex items-center justify-between text-xs px-1">
            <span style={{ color: '#64748b' }}>
              <span style={{ fontWeight: 700, color: '#fbbf24' }}>{activeBalls.length}</span>
              {' '}boule{activeBalls.length > 1 ? 's' : ''} en vol
            </span>
            {sessionGain !== 0 && (
              <span style={{ fontWeight: 700, color: sessionGain > 0 ? '#22c55e' : '#f87171' }}>
                {sessionGain > 0 ? '+' : ''}{sessionGain.toFixed(4)} TON
              </span>
            )}
          </div>
        )}

        {/* History */}
        {hist.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {hist.map((h, i) => (
              <span key={i} style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                background: `${slotColor(h.mult)}22`, color: slotColor(h.mult),
                border: `1px solid ${slotColor(h.mult)}44`,
              }}>×{h.mult}</span>
            ))}
          </div>
        )}

        {/* Controls */}
        <div style={{ background: '#0d1021', border: '1px solid #1e2847', borderRadius: 16 }} className="p-4 space-y-3">
          {/* Rows */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Lignes</p>
            <div className="flex gap-2">
              {PLINKO_ROWS_OPTIONS.map(r => (
                <button key={r} onClick={() => { if (!dropping && !autoPlay) setRows(r); }}
                  style={{
                    flex: 1, padding: '8px 4px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                    cursor: (dropping || autoPlay) ? 'not-allowed' : 'pointer',
                    background: rows === r ? '#1e3a5f' : '#080c1e',
                    border: rows === r ? '1px solid #3b82f6' : '1px solid #1e2847',
                    color: rows === r ? '#93c5fd' : '#64748b',
                  }}>{r}</button>
              ))}
            </div>
          </div>

          {/* Risk */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Risque</p>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as const).map(r => {
                const col = r === 'low' ? '#22c55e' : r === 'medium' ? '#f59e0b' : '#ef4444';
                return (
                  <button key={r} onClick={() => { if (!dropping && !autoPlay) setRisk(r); }}
                    style={{
                      flex: 1, padding: '8px 4px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                      cursor: (dropping || autoPlay) ? 'not-allowed' : 'pointer',
                      background: risk === r ? `${col}18` : '#080c1e',
                      border: risk === r ? `1px solid ${col}60` : '1px solid #1e2847',
                      color: risk === r ? col : '#64748b',
                    }}>{r === 'low' ? 'Bas' : r === 'medium' ? 'Moyen' : 'Élevé'}</button>
                );
              })}
            </div>
          </div>

          {/* Ball count */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Boules par lancer</p>
            <div className="flex gap-1.5">
              {([1, 3, 5, 10] as const).map(n => (
                <button key={n} onClick={() => { if (!dropping && !autoPlay) setBallCount(n); }}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all border"
                  style={ballCount === n
                    ? { background: 'rgba(0,152,234,0.15)', borderColor: 'rgba(0,152,234,0.4)', color: '#0098EA', cursor: (dropping || autoPlay) ? 'not-allowed' : 'pointer' }
                    : { background: 'rgba(255,255,255,0.04)', borderColor: '#1e2847', color: '#64748b', cursor: (dropping || autoPlay) ? 'not-allowed' : 'pointer' }
                  }>×{n}</button>
              ))}
            </div>
          </div>

          {/* Bet */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Montant de la mise</p>
            <div style={{ background: '#080c1e', border: '1px solid #1e2847', borderRadius: 12 }} className="flex items-center px-3 py-2.5">
              <input type="number" value={bet} min={0.01} max={50} step={0.01} disabled={dropping || autoPlay}
                onChange={e => { const v = +e.target.value; if (!isNaN(v)) setBet(Math.max(0.01, Math.min(50, v))); }}
                style={{ flex: 1, background: 'transparent', color: '#f8fafc', fontSize: 20, fontWeight: 700, outline: 'none', border: 'none' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>TON</span>
            </div>
          </div>
          <BetQuickButtons setBet={setBet} maxBal={bal} />

          {/* Drop + Auto-play */}
          <div className="flex gap-2">
            <button
              onClick={() => dropMulti(ballCount)}
              disabled={autoPlay || dropping || effBet < 0.01 || bal < 0.01}
              style={(!autoPlay && !dropping && effBet >= 0.01 && bal >= 0.01) ? {
                flex: 1, background: 'linear-gradient(135deg,#f59e0b,#d97706)',
                boxShadow: '0 4px 16px rgba(245,158,11,0.35)',
                padding: '14px 8px', borderRadius: 12,
                color: '#451a03', fontWeight: 900, fontSize: 14, cursor: 'pointer', letterSpacing: '0.05em',
              } : {
                flex: 1, background: 'rgba(255,255,255,0.05)',
                padding: '14px 8px', borderRadius: 12, color: '#475569', fontWeight: 700, fontSize: 14, cursor: 'not-allowed',
              }}>
              {dropping ? '🎯 En chute…'
                : bal < 0.01 ? (demoMode ? 'Démo épuisé' : 'Solde insuffisant')
                : ballCount > 1 ? `🎯 ×${ballCount} — ${(effBet * ballCount).toFixed(2)} TON`
                : `🎯 LÂCHER · ${effBet.toFixed(2)} TON`}
            </button>

            <button
              onClick={() => {
                const next = !autoPlay;
                setAutoPlay(next);
                autoPlayRef.current = next;
                if (next) {
                  setBallCount(1);
                  dropMulti(1);
                }
              }}
              disabled={!autoPlay && (effBet < 0.01 || bal < 0.01)}
              className="py-3 px-3 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 flex-shrink-0"
              style={autoPlay
                ? { background: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.3)', color: '#f87171' }
                : { background: 'rgba(255,255,255,0.04)', borderColor: '#1e2847', color: '#94a3b8' }
              }>
              {autoPlay && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
              {autoPlay ? 'Stop' : 'Auto'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
// LIVE FEED
// ══════════════════════════════════════════════════════════════════

type FeedEntry = { username: string; bet: number; win: number; mult: number; game: string; createdAt: number };

function formatFeedTime(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5)    return 'maintenant';
  if (s < 60)   return `il y a ${s}s`;
  if (s < 3600) return `il y a ${Math.floor(s / 60)}m`;
  return `il y a ${Math.floor(s / 3600)}h`;
}

const _NOW = Date.now();
const FEED_DATA: FeedEntry[] = [
  { username: 'Léa R.',      bet: 0.05, win: 0.00, mult: 0,    game: 'Crash',    createdAt: _NOW -  1 * 60000 },
  { username: 'Yusuf K.',    bet: 0.10, win: 2.80, mult: 2.80, game: 'Plinko',   createdAt: _NOW -  3 * 60000 },
  { username: 'Marco T.',    bet: 1.0,  win: 0.00, mult: 0,    game: 'Roulette', createdAt: _NOW -  6 * 60000 },
  { username: 'Chen W.',     bet: 0.02, win: 0.04, mult: 2,    game: 'Roulette', createdAt: _NOW -  9 * 60000 },
  { username: 'Amira S.',    bet: 0.50, win: 1.28, mult: 2.56, game: 'Crash',    createdAt: _NOW - 14 * 60000 },
  { username: 'Priya S.',    bet: 0.05, win: 0.00, mult: 0,    game: 'Mines',    createdAt: _NOW - 19 * 60000 },
  { username: 'Fatou D.',    bet: 0.10, win: 0.19, mult: 2,    game: 'Roulette', createdAt: _NOW - 25 * 60000 },
  { username: 'Nicolás V.',  bet: 0.03, win: 1.08, mult: 36,   game: 'Roulette', createdAt: _NOW - 33 * 60000 },
  { username: 'Kwame O.',    bet: 0.20, win: 0.00, mult: 0,    game: 'Plinko',   createdAt: _NOW - 41 * 60000 },
  { username: 'Hana P.',     bet: 0.01, win: 0.02, mult: 2,    game: 'Roue',     createdAt: _NOW - 48 * 60000 },
];

// ══════════════════════════════════════════════════════════════════
// GAMES HUB
// ══════════════════════════════════════════════════════════════════

type ActiveGame = 'wheel' | 'crash' | 'mines' | 'roulette' | 'plinko' | null;

const CATALOG = [
  {
    id: 'wheel' as ActiveGame,
    title: 'Roue de la Fortune',
    desc: 'Tourne et gagne jusqu\'à ×10',
    stats: '×10 max · classique',
    emoji: '🎡',
    badge: 'POPULAIRE',
    accentFrom: '#f59e0b', accentTo: '#fbbf24',
    glow: 'rgba(245,158,11,0.4)',
    badgeColor: '#f59e0b',
    pattern: 'wheel',
  },
  {
    id: 'crash' as ActiveGame,
    title: 'Crash',
    desc: 'Encaisse avant le crash — ou tout perdre',
    stats: 'jusqu\'à ×100 · multijoueur',
    emoji: '🚀',
    badge: 'HOT',
    accentFrom: '#ef4444', accentTo: '#f97316',
    glow: 'rgba(239,68,68,0.4)',
    badgeColor: '#ef4444',
    pattern: 'crash',
  },
  {
    id: 'mines' as ActiveGame,
    title: 'Mines',
    desc: 'Évite les mines, multiplie tes gains',
    stats: 'multipliers élevés · stratégie',
    emoji: '💎',
    badge: 'STRATÉGIE',
    accentFrom: '#8b5cf6', accentTo: '#a78bfa',
    glow: 'rgba(139,92,246,0.4)',
    badgeColor: '#8b5cf6',
    pattern: 'mines',
  },
  {
    id: 'roulette' as ActiveGame,
    title: 'Jackpot',
    desc: '3 symboles alignés = jackpot TON',
    stats: '×36 numéro plein · ×2.8 douzaine',
    emoji: '🎰',
    badge: 'JACKPOT',
    accentFrom: '#10b981', accentTo: '#34d399',
    glow: 'rgba(16,185,129,0.4)',
    badgeColor: '#10b981',
    pattern: 'roulette',
  },
  {
    id: 'plinko' as ActiveGame,
    title: 'Plinko',
    desc: 'Lâchez la balle · Visez les gros multiplicateurs',
    stats: '3 niveaux de risque · ×999 max',
    emoji: '🎯',
    badge: 'NOUVEAU',
    accentFrom: '#fbbf24', accentTo: '#fde68a',
    glow: 'rgba(251,191,36,0.4)',
    badgeColor: '#fbbf24',
    pattern: 'plinko',
  },
] as const;

export const MiniAppGames: React.FC = () => {
  const { currentUser, demoMode, demoBalance, toggleDemoMode, gameHistory } = useAppStore();
  const [activeGame, setActiveGame] = useState<ActiveGame>(null);
  const [streak, setStreak]         = useState(() => {
    // Streak expires after 30 minutes of inactivity
    try {
      const saved = localStorage.getItem('tc_game_streak');
      if (saved) { const { count, ts } = JSON.parse(saved) as { count: number; ts: number }; if (Date.now() - ts < 30 * 60_000) return count; }
    } catch {}
    return 0;
  });
  const [muted, setMuted]           = useState(_soundMuted);
  const [showConfetti, setShowConfetti] = useState(false);
  const [liveFeed, setLiveFeed]     = useState<FeedEntry[]>(FEED_DATA);
  const [, setTick]                 = useState(0);
  const feedIdxRef                  = useRef(0);

  const handleResult = (won: boolean) => {
    if (won) setShowConfetti(true);
    setStreak(s => {
      const next = won ? s + 1 : 0;
      try { localStorage.setItem('tc_game_streak', JSON.stringify({ count: next, ts: Date.now() })); } catch {}
      return next;
    });
  };
  const toggleMute   = () => { _soundMuted = !_soundMuted; localStorage.setItem('tc_sound_muted', _soundMuted ? '1' : '0'); setMuted(_soundMuted); };

  const bal = demoMode ? demoBalance : currentUser.balanceMain;

  // Tick every 10s to refresh relative timestamps in live feed
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(id);
  }, []);

  // Live feed auto-rotation — new fake entry every 8–18 seconds
  useEffect(() => {
    const GAME_NAMES = ['Crash', 'Plinko', 'Roulette', 'Mines', 'Roue'];
    const scheduleNext = () => {
      const ms = 8000 + Math.floor(Math.random() * 10000);
      return setTimeout(() => {
        const name = ALL_FAKE_NAMES[feedIdxRef.current % ALL_FAKE_NAMES.length];
        feedIdxRef.current++;
        const game = GAME_NAMES[Math.floor(Math.random() * GAME_NAMES.length)];
        const bet  = randomFakeBet();
        const r    = Math.random();
        const mult = r < 0.42 ? 0 : r < 0.65 ? 1.5 : r < 0.78 ? 2 : r < 0.89 ? 3 : r < 0.96 ? 5 : 10;
        const win  = +(bet * mult).toFixed(4);
        setLiveFeed(prev => [
          { username: name, bet, win, mult, game, createdAt: Date.now() },
          ...prev.slice(0, 9),
        ]);
        timerRef.current = scheduleNext();
      }, ms);
    };
    const timerRef = { current: scheduleNext() };
    return () => clearTimeout(timerRef.current);
  }, []);

  if (activeGame === 'wheel')    return <WheelGame    onBack={() => setActiveGame(null)} streak={streak} onResult={handleResult} />;
  if (activeGame === 'roulette') return <RouletteGame onBack={() => setActiveGame(null)} streak={streak} onResult={handleResult} />;
  if (activeGame === 'plinko')   return <PlinkoGame   onBack={() => setActiveGame(null)} streak={streak} onResult={handleResult} />;
  if (activeGame === 'crash')   return <CrashGame   onBack={() => setActiveGame(null)} streak={streak} onResult={handleResult} />;
  if (activeGame === 'mines')   return <MinesGame   onBack={() => setActiveGame(null)} streak={streak} onResult={handleResult} />;

  return (
    <div className="space-y-5 animate-slide-up pb-4">
      {showConfetti && <ConfettiEffect onComplete={() => setShowConfetti(false)} />}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-white">Jeux</h1>
            {streak >= 2 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px',
                borderRadius: 99, fontSize: 12, fontWeight: 700,
                background: 'rgba(249,115,22,0.18)', color: '#fb923c',
                border: '1px solid rgba(249,115,22,0.3)',
              }}>
                🔥 {streak} en série
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Misez des TON · Tentez votre chance</p>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #1e2847' }} className="px-3 py-2 rounded-xl text-right">
          <p className="text-[10px] uppercase" style={{ color: '#64748b' }}>
            {demoMode ? '🎮 Démo' : 'Solde'}
          </p>
          <p className="text-sm font-bold" style={{ color: demoMode ? '#f59e0b' : '#f8fafc' }}>
            <CountUp value={bal} decimals={3} suffix=" TON" />
          </p>
        </div>
      </div>

      {/* Demo + Sound controls */}
      <div className="flex gap-2">
        <button onClick={() => { haptic.selection(); toggleDemoMode(); }} style={{
          flex: 1, padding: '10px 12px', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer',
          background: demoMode ? 'linear-gradient(135deg,#d97706,#f59e0b)' : 'rgba(255,255,255,0.05)',
          border: demoMode ? '1px solid #f59e0b' : '1px solid #1e2847',
          color: demoMode ? '#1c1400' : '#94a3b8',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <span>🎮</span>
          <span>{demoMode ? `Mode Démo · ${demoBalance.toFixed(2)} TON` : 'Mode Démo'}</span>
        </button>
        <button onClick={() => { haptic.selection(); toggleMute(); }} style={{
          width: 46, borderRadius: 12, fontWeight: 700, fontSize: 18, cursor: 'pointer',
          background: 'rgba(255,255,255,0.05)', border: '1px solid #1e2847',
          color: muted ? '#475569' : '#94a3b8',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {muted ? '🔇' : '🔊'}
        </button>
      </div>

      {/* Game catalog — 2×2 grid for first 4, full-width for 5th */}
      <div className="grid grid-cols-2 gap-3">
        {CATALOG.slice(0, 4).map((game) => (
          <button
            key={game.id}
            data-game={game.id}
            onClick={() => { haptic.impact('light'); setActiveGame(game.id); }}
            className="game-card-hub relative overflow-hidden rounded-2xl text-left"
            style={{
              background: `linear-gradient(135deg,${game.accentFrom}22,${game.accentTo}11)`,
              border: `1px solid ${game.accentFrom}44`,
            }}
          >
            {/* Badge */}
            <span className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: `${game.badgeColor}33`, color: game.badgeColor, border: `1px solid ${game.badgeColor}55` }}>
              {game.badge}
            </span>
            {/* BG pattern */}
            <div className={`game-bg-${game.pattern} absolute inset-0 opacity-10 pointer-events-none`} aria-hidden="true" />
            {/* Content */}
            <div className="relative z-10 p-3.5">
              <div
                className="game-icon-wrap w-11 h-11 rounded-xl flex items-center justify-center mb-2.5"
                style={{ background: `linear-gradient(135deg,${game.accentFrom}33,${game.accentTo}22)`, boxShadow: `0 4px 12px ${game.glow}` }}
              >
                <span className="text-2xl">{game.emoji}</span>
              </div>
              <p className="text-white font-bold text-sm leading-tight">{game.title}</p>
              <p className="text-slate-400 text-[11px] mt-0.5 leading-tight">{game.desc}</p>
              <div className="mt-2.5 h-0.5 rounded-full w-2/3" style={{ background: `linear-gradient(90deg,${game.accentFrom},transparent)` }} />
            </div>
          </button>
        ))}
      </div>
      {/* Plinko — full width */}
      {CATALOG.slice(4).map((game) => (
        <button
          key={game.id}
          data-game={game.id}
          onClick={() => { haptic.impact('light'); setActiveGame(game.id); }}
          className="game-card-hub relative overflow-hidden rounded-2xl text-left w-full"
          style={{
            background: `linear-gradient(135deg,${game.accentFrom}22,${game.accentTo}11)`,
            border: `1px solid ${game.accentFrom}44`,
          }}
        >
          <span className="absolute top-3 right-3 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: `${game.badgeColor}33`, color: game.badgeColor, border: `1px solid ${game.badgeColor}55` }}>
            {game.badge}
          </span>
          <div className={`game-bg-${game.pattern} absolute inset-0 opacity-10 pointer-events-none`} aria-hidden="true" />
          <div className="relative z-10 p-4 flex items-center gap-4">
            <div
              className="game-icon-wrap w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `linear-gradient(135deg,${game.accentFrom}33,${game.accentTo}22)`, boxShadow: `0 4px 12px ${game.glow}` }}
            >
              <span className="text-2xl">{game.emoji}</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm">{game.title}</p>
              <p className="text-slate-400 text-xs mt-0.5">{game.desc}</p>
              <p className="text-slate-600 text-[10px] mt-0.5">{game.stats}</p>
            </div>
          </div>
        </button>
      ))}

      {/* Mes gains */}
      {gameHistory.length > 0 && (() => {
        const total     = gameHistory.length;
        const wonSess   = gameHistory.filter(r => r.win > r.bet);
        const totalWon  = +wonSess.reduce((s, r) => s + r.win - r.bet, 0).toFixed(4);
        const bestWin   = wonSess.length > 0 ? Math.max(...wonSess.map(r => r.win - r.bet)) : 0;
        const recentWins = wonSess.slice(0, 8);
        return (
          <div style={{ background: '#0d1021', border: '1px solid #1e2847', borderRadius: 16 }} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold" style={{ color: '#f8fafc' }}>Mes gains</h3>
              <span style={{ fontSize: 11, color: '#64748b' }}>{total} partie{total !== 1 ? 's' : ''}</span>
            </div>
            {/* Stats row — only positive metrics */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 10 }} className="py-2.5">
                <p style={{ fontSize: 15, fontWeight: 700, color: '#22c55e' }}>+{totalWon.toFixed(2)}</p>
                <p style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>TON gagnés</p>
              </div>
              <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 10 }} className="py-2.5">
                <p style={{ fontSize: 15, fontWeight: 700, color: '#fbbf24' }}>+{bestWin.toFixed(2)}</p>
                <p style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>Meilleur gain</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10 }} className="py-2.5">
                <p style={{ fontSize: 15, fontWeight: 700, color: '#94a3b8' }}>{wonSess.length}</p>
                <p style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>Victoires</p>
              </div>
            </div>
            {/* Wins only */}
            {recentWins.length > 0 ? (
              <div className="space-y-1.5">
                {recentWins.map((r, i) => {
                  const net = +(r.win - r.bet).toFixed(4);
                  return (
                    <div key={i} className="flex items-center justify-between py-1" style={{ borderBottom: i < recentWins.length - 1 ? '1px solid rgba(30,40,71,0.5)' : 'none' }}>
                      <div className="flex items-center gap-2">
                        <span style={{
                          width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10,
                          background: 'rgba(34,197,94,0.18)', color: '#22c55e',
                        }}>↑</span>
                        <div>
                          <p style={{ fontSize: 12, color: '#f8fafc', lineHeight: 1 }}>{r.game}</p>
                          <p style={{ fontSize: 10, color: '#64748b' }}>Mise {r.bet.toFixed(2)} TON</p>
                        </div>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#22c55e' }}>
                        +{net.toFixed(4)} TON
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-3">
                <p style={{ fontSize: 12, color: '#64748b' }}>🎯 Jouez pour décrocher votre première victoire !</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* Live activity feed */}
      <style>{`@keyframes feedIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}} @keyframes liveDot{0%,100%{opacity:1}50%{opacity:0.2}}`}</style>
      <div style={{ background: '#0d1021', border: '1px solid #1e2847', borderRadius: 16 }} className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4" style={{ color: '#f59e0b' }} />
          <h3 className="text-sm font-semibold" style={{ color: '#f8fafc' }}>Activité récente</h3>
          <span style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: '#22c55e', animation: 'liveDot 2s ease-in-out infinite' }} title="En direct" />
        </div>
        <div className="space-y-2">
          {liveFeed.map((f, i) => (
            <div key={f.createdAt} className="flex items-center justify-between py-1.5" style={{
              borderBottom: i < liveFeed.length - 1 ? '1px solid rgba(30,40,71,0.6)' : 'none',
              animation: 'feedIn 0.35s ease',
            }}>
              <div className="flex items-center gap-2.5">
                <span style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                  background: f.mult >= 3 ? 'rgba(34,197,94,0.2)' : f.mult > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.15)',
                  color: f.mult >= 3 ? '#22c55e' : f.mult > 0 ? '#f59e0b' : '#ef4444',
                }}>
                  {f.mult > 0 ? `×${f.mult}` : '✗'}
                </span>
                <div>
                  <p style={{ fontSize: 13, color: '#f8fafc', lineHeight: 1 }}>{f.username}</p>
                  <p style={{ fontSize: 10, color: '#64748b' }}>{f.game}</p>
                </div>
              </div>
              <div className="text-right">
                <span style={{
                  fontSize: 13, fontWeight: 600,
                  color: f.win > f.bet ? '#22c55e' : f.win > 0 ? '#f59e0b' : '#64748b',
                }}>
                  {f.win > 0 ? `+${f.win.toFixed(2)} TON` : `−${f.bet.toFixed(2)} TON`}
                </span>
                <p style={{ fontSize: 10, color: '#64748b' }}>{formatFeedTime(f.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info bar */}
      <div style={{ background: '#0d1021', border: '1px solid #1e2847', borderRadius: 16 }} className="p-4">
        <h3 style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Infos</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12 }} className="py-3">
            <p style={{ fontSize: 15, fontWeight: 700, color: '#f59e0b' }}>0.01</p>
            <p style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>Mise min (TON)</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12 }} className="py-3">
            <p style={{ fontSize: 15, fontWeight: 700, color: '#5eead4' }}>5 jeux</p>
            <p style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>Disponibles</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12 }} className="py-3">
            <p style={{ fontSize: 15, fontWeight: 700, color: '#cbd5e1' }}>50</p>
            <p style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>Mise max (TON)</p>
          </div>
        </div>
      </div>
    </div>
  );
};
