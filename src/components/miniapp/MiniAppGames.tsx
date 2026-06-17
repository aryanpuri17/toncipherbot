import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { ArrowLeft, RotateCcw, Trophy, Zap } from 'lucide-react';
import { CountUp } from '../ui/CountUp';
import { ConfettiEffect } from '../ui/ConfettiEffect';
import type { GameState as ChickenGameState } from './chicken/GameEngine';
import { GameEngine, type Difficulty, DIFF_CONFIG, computeMultiplier } from './chicken/GameEngine';

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
    // Arpège montant 6 notes — timing décalé non-uniforme = dopamine build
    const notes  = [523, 659, 784, 988, 1319, 1568] as const;
    const delays = [0, 0.055, 0.105, 0.150, 0.190, 0.225] as const;
    const vols   = [0.18, 0.16, 0.14, 0.12, 0.10, 0.08] as const;
    notes.forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine'; o.frequency.value = f;
      const dl = delays[i];
      g.gain.setValueAtTime(0, t + dl);
      g.gain.linearRampToValueAtTime(vols[i], t + dl + 0.010);
      g.gain.exponentialRampToValueAtTime(0.001, t + dl + 0.38);
      o.start(t + dl); o.stop(t + dl + 0.40);
    });
    // Shimmer triangle en clôture
    const sh = ctx.createOscillator(), sg = ctx.createGain();
    sh.connect(sg); sg.connect(ctx.destination); sh.type = 'triangle';
    sh.frequency.setValueAtTime(3200, t + 0.26); sh.frequency.exponentialRampToValueAtTime(2400, t + 0.40);
    sg.gain.setValueAtTime(0, t + 0.26); sg.gain.linearRampToValueAtTime(0.09, t + 0.272);
    sg.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    sh.start(t + 0.26); sh.stop(t + 0.44);
    // Coin clink
    const ck = ctx.createOscillator(), kg = ctx.createGain();
    ck.connect(kg); kg.connect(ctx.destination); ck.type = 'sine';
    ck.frequency.setValueAtTime(2800, t + 0.30); ck.frequency.exponentialRampToValueAtTime(2200, t + 0.32);
    kg.gain.setValueAtTime(0.06, t + 0.30); kg.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
    ck.start(t + 0.30); ck.stop(t + 0.35);
  },
  crash() {
    const ctx = _ac(); if (!ctx) return;
    const t = ctx.currentTime;
    // Sub-bass punch — chest hit
    const sub = ctx.createOscillator(), sg = ctx.createGain();
    sub.connect(sg); sg.connect(ctx.destination); sub.type = 'sine';
    sub.frequency.setValueAtTime(80, t); sub.frequency.exponentialRampToValueAtTime(18, t + 0.18);
    sg.gain.setValueAtTime(0.90, t); sg.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    sub.start(t); sub.stop(t + 0.25);
    // Metal tear
    const tear = ctx.createOscillator(), tg = ctx.createGain();
    tear.connect(tg); tg.connect(ctx.destination); tear.type = 'sawtooth';
    tear.frequency.setValueAtTime(380, t); tear.frequency.exponentialRampToValueAtTime(28, t + 0.32);
    tg.gain.setValueAtTime(0.55, t); tg.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    tear.start(t); tear.stop(t + 0.38);
    // High crack — impact métallique
    const crk = ctx.createOscillator(), cg = ctx.createGain();
    crk.connect(cg); cg.connect(ctx.destination); crk.type = 'square';
    crk.frequency.setValueAtTime(1400, t); crk.frequency.exponentialRampToValueAtTime(200, t + 0.05);
    cg.gain.setValueAtTime(0.30, t); cg.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    crk.start(t); crk.stop(t + 0.07);
    // Rumble grave filtré
    const sr = ctx.sampleRate, len = Math.floor(sr * 0.8);
    const buf = ctx.createBuffer(1, len, sr), dd = buf.getChannelData(0);
    for (let i = 0; i < len; i++) dd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sr * 0.20));
    const ns = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), ng = ctx.createGain();
    lp.type = 'lowpass'; lp.frequency.value = 600;
    ns.buffer = buf; ns.connect(lp); lp.connect(ng); ng.connect(ctx.destination);
    ng.gain.value = 0.65; ns.start(t); ns.stop(t + 0.82);
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
    // Sub-bass kick — plus long, plus percutant
    const kick = ctx.createOscillator(), kg = ctx.createGain();
    kick.connect(kg); kg.connect(ctx.destination); kick.type = 'sine';
    kick.frequency.setValueAtTime(220, t); kick.frequency.exponentialRampToValueAtTime(22, t + 0.28);
    kg.gain.setValueAtTime(0.85, t); kg.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    kick.start(t); kick.stop(t + 0.38);
    // Mid crack — sawtooth avec pitch sweep plus long
    const crack = ctx.createOscillator(), cg = ctx.createGain();
    crack.connect(cg); cg.connect(ctx.destination); crack.type = 'sawtooth';
    crack.frequency.setValueAtTime(1100, t); crack.frequency.exponentialRampToValueAtTime(80, t + 0.12);
    cg.gain.setValueAtTime(0.40, t); cg.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    crack.start(t); crack.stop(t + 0.14);
    // Noise body — deux couches : lowpass grave + bandpass mid crackling
    const sr  = ctx.sampleRate;
    const len = Math.floor(sr * 0.7);
    const buf = ctx.createBuffer(1, len, sr);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sr * 0.18));
    const ns1 = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), ng1 = ctx.createGain();
    lp.type = 'lowpass'; lp.frequency.value = 700;
    ns1.buffer = buf; ns1.connect(lp); lp.connect(ng1); ng1.connect(ctx.destination);
    ng1.gain.value = 0.55; ns1.start(t); ns1.stop(t + 0.72);
    const ns2 = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), ng2 = ctx.createGain();
    bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = 0.8;
    ns2.buffer = buf; ns2.connect(bp); bp.connect(ng2); ng2.connect(ctx.destination);
    ng2.gain.setValueAtTime(0.28, t); ng2.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    ns2.start(t); ns2.stop(t + 0.20);
  },
  reveal() {
    const ctx = _ac(); if (!ctx) return;
    const t = ctx.currentTime;
    // Accord Mi6/Sol#6/Si6/Mi7 — arpège ascendant gem casino
    ([1319, 1661, 1976, 2637] as const).forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine'; o.frequency.value = f;
      const vol   = [0.14, 0.09, 0.07, 0.04][i];
      const delay = i * 0.028;
      g.gain.setValueAtTime(0, t + delay);
      g.gain.linearRampToValueAtTime(vol, t + delay + 0.012);
      g.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.55);
      o.start(t + delay); o.stop(t + delay + 0.6);
    });
    // Shimmer cristallin plus long et plus audible
    const sh = ctx.createOscillator(), sg = ctx.createGain();
    sh.connect(sg); sg.connect(ctx.destination); sh.type = 'sine';
    sh.frequency.setValueAtTime(5200, t); sh.frequency.exponentialRampToValueAtTime(2600, t + 0.12);
    sg.gain.setValueAtTime(0, t); sg.gain.linearRampToValueAtTime(0.10, t + 0.008);
    sg.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    sh.start(t); sh.stop(t + 0.15);
    // Micro "ping" métallique — transitoire de contact gem
    const ping = ctx.createOscillator(), pg = ctx.createGain();
    ping.connect(pg); pg.connect(ctx.destination); ping.type = 'triangle';
    ping.frequency.setValueAtTime(3400, t); ping.frequency.exponentialRampToValueAtTime(2800, t + 0.04);
    pg.gain.setValueAtTime(0.08, t); pg.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    ping.start(t); ping.stop(t + 0.07);
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

const DemoModeBanner: React.FC = () => (
  <div style={{
    height: 20, flexShrink: 0, pointerEvents: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(245,158,11,0.12)', borderBottom: '1px solid rgba(245,158,11,0.25)',
  }}>
    <p style={{ fontSize: 9, fontWeight: 700, color: '#f59e0b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
      🎮 Mode démo — gains non crédités
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
// SHARED SESSION STATS (total gagné / meilleur gain / misé — remis à
// zéro à chaque ouverture du jeu, puisque chaque composant de jeu est
// démonté quand on retourne au hub). On n'affiche jamais de pertes —
// uniquement les gains positifs.
// ══════════════════════════════════════════════════════════════════

function useSessionStats() {
  const [totalWon, setTotalWon] = useState(0);
  const [best, setBest]         = useState(0);
  const [wagered, setWagered]   = useState(0);
  const record = (betAmt: number, winAmt: number) => {
    const p = +(winAmt - betAmt).toFixed(6);
    setWagered(v => +(v + betAmt).toFixed(6));
    if (p > 0) {
      setTotalWon(v => +(v + p).toFixed(6));
      setBest(v => Math.max(v, p));
    }
  };
  return { totalWon, best, wagered, record };
}

const SessionStatsBar: React.FC<{ totalWon: number; best: number; wagered: number }> = ({ totalWon, best, wagered }) => {
  if (wagered === 0) return null;
  return (
    <div className="grid grid-cols-3 px-1" style={{ gap: 8 }}>
      {[
        { label: 'Total gagné', value: totalWon > 0 ? `+${totalWon.toFixed(4)}` : '—', color: totalWon > 0 ? '#4ade80' : '#475569' },
        { label: 'Meilleur gain', value: best > 0 ? `+${best.toFixed(4)}` : '—', color: best > 0 ? '#fbbf24' : '#475569' },
        { label: 'Misé', value: wagered.toFixed(4), color: '#94a3b8' },
      ].map(s => (
        <div key={s.label} className="text-center">
          <p style={{ fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</p>
          <p style={{ fontSize: 12, fontWeight: 800, color: s.color }}>{s.value}</p>
        </div>
      ))}
    </div>
  );
};

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
        <button key={l} onClick={() => { snd.tick(); handlers[l](); }}
          className="tap-scale py-3 rounded-xl text-sm font-bold bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white transition-all">
          {l}
        </button>
      ))}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
// DICE — prédire si le tirage (0.00–100.00) sera plus haut ou plus bas
// que le seuil choisi. Multiplicateur = 99 / chance de gagner (1% edge
// mathématique fixe, identique pour tous, sans ajustement caché).
// ══════════════════════════════════════════════════════════════════

type DiceDir = 'under' | 'over';

function diceWinChance(target: number, dir: DiceDir): number {
  return dir === 'under' ? target : 100 - target;
}
function diceMultiplier(target: number, dir: DiceDir): number {
  const wc = Math.max(2, Math.min(98, diceWinChance(target, dir)));
  return +(99 / wc).toFixed(4);
}

function rollDice(target: number, dir: DiceDir): { roll: number; win: boolean } {
  const roll = +(Math.random() * 100).toFixed(2);
  const win = dir === 'under' ? roll < target : roll > target;
  return { roll, win };
}

const DiceGame: React.FC<{ onBack: () => void; streak: number; onResult: OnResult }> = ({ onBack, streak, onResult }) => {
  const { currentUser, placeGameBet, recordGameResult, demoMode, demoBalance } = useAppStore();
  const bal = demoMode ? demoBalance : currentUser.balanceMain;
  const [bet, setBet]         = useState(0.01);
  const [target, setTarget]   = useState(50);
  const [dir, setDir]         = useState<DiceDir>('under');
  const [rolling, setRolling] = useState(false);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [lastWin, setLastWin]   = useState<boolean | null>(null);
  const [payout, setPayout]     = useState(0);
  const [hist, setHist]         = useState<{ roll: number; win: boolean }[]>([]);
  const [bigWin, setBigWin]     = useState(false);
  const mountedRef             = useRef(true);
  const rollTimerRef           = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bigWinTimerRef         = useRef<ReturnType<typeof setTimeout> | null>(null);
  const session                = useSessionStats();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (rollTimerRef.current)  clearTimeout(rollTimerRef.current);
      if (bigWinTimerRef.current) clearTimeout(bigWinTimerRef.current);
    };
  }, []);

  const effBet      = Math.min(bet, bal);
  const winChance    = diceWinChance(target, dir);
  const multiplier   = diceMultiplier(target, dir);
  const canRoll      = !rolling && effBet >= 0.01 && bal >= 0.01;
  const potentialWin = +(effBet * multiplier).toFixed(4);

  const roll = () => {
    if (!canRoll) return;
    setRolling(true);
    snd.spin();
    const used = effBet;
    const { roll: r, win } = rollDice(target, dir);
    rollTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setRolling(false);
      const winAmt = win ? +(used * multiplier).toFixed(6) : 0;
      placeGameBet(used, winAmt);
      recordGameResult('Dice', used, winAmt);
      session.record(used, winAmt);
      setLastRoll(r);
      setLastWin(win);
      setPayout(winAmt);
      setHist(h => [{ roll: r, win }, ...h.slice(0, 11)]);
      onResult(win);
      if (win && multiplier >= 5) {
        setBigWin(true);
        bigWinTimerRef.current = setTimeout(() => { if (mountedRef.current) setBigWin(false); }, 2600);
        snd.win();
      } else if (win) { snd.win(); }
      else { snd.lose(); }
    }, 750);
  };

  // Zone basse (under) = de 0 à target ; zone haute (over) = de target à 100
  const zoneLeft  = dir === 'under' ? 0 : target;
  const zoneWidth = dir === 'under' ? target : 100 - target;

  return (
    <div className="space-y-5 pb-4">
      <BigWinEffect show={bigWin} />
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">Dice</h2>
            <StreakChip streak={streak} />
          </div>
          <p className="text-[11px] text-slate-500">Choisissez votre seuil · misez · lancez</p>
        </div>
        <MuteButton />
        <GameBalanceChip bal={bal} demo={demoMode} />
      </div>
      {demoMode && <DemoModeBanner />}

      <SessionStatsBar totalWon={session.totalWon} best={session.best} wagered={session.wagered} />

      {hist.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {hist.map((h, i) => (
            <span key={i} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${h.win ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              {h.roll.toFixed(2)}
            </span>
          ))}
        </div>
      )}

      {/* Result display + track */}
      <div className="glass-card p-4 space-y-4">
        <div className="text-center">
          <p className="text-4xl font-black" style={{
            color: lastRoll == null ? '#f8fafc' : lastWin ? '#4ade80' : '#f87171',
            transition: 'color 0.2s',
          }}>
            {rolling ? '··.··' : lastRoll != null ? lastRoll.toFixed(2) : '0.00'}
          </p>
          {lastRoll != null && !rolling && (
            <p className="text-xs mt-1" style={{ color: lastWin ? '#4ade80' : '#f87171' }}>
              {lastWin ? `🎉 Gagné +${payout.toFixed(4)} TON` : '😔 Perdu — réessayez'}
            </p>
          )}
        </div>

        {/* Track */}
        <div className="relative" style={{ height: 14, borderRadius: 8, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: 0, bottom: 0,
            left: `${zoneLeft}%`, width: `${zoneWidth}%`,
            background: 'linear-gradient(90deg,#22c55e,#4ade80)',
          }} />
          {lastRoll != null && (
            <div style={{
              position: 'absolute', top: -3, left: `${Math.min(99, Math.max(0, lastRoll))}%`,
              width: 3, height: 20, borderRadius: 2, background: '#f8fafc',
              boxShadow: '0 0 8px rgba(255,255,255,0.8)', transition: 'left 0.15s',
            }} />
          )}
        </div>
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
        </div>

        {/* Slider */}
        <input type="range" min={2} max={98} step={1} value={target}
          onChange={e => setTarget(+e.target.value)}
          className="w-full" style={{ accentColor: '#22c55e' }} />

        {/* Direction toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setDir('under')}
            style={{
              padding: '10px 0', borderRadius: 12, fontWeight: 800, fontSize: 13, cursor: 'pointer',
              background: dir === 'under' ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'rgba(255,255,255,0.05)',
              color: dir === 'under' ? '#06210f' : '#94a3b8',
              border: dir === 'under' ? 'none' : '1px solid #1e2847',
            }}>
            Plus bas que {target}
          </button>
          <button onClick={() => setDir('over')}
            style={{
              padding: '10px 0', borderRadius: 12, fontWeight: 800, fontSize: 13, cursor: 'pointer',
              background: dir === 'over' ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'rgba(255,255,255,0.05)',
              color: dir === 'over' ? '#06210f' : '#94a3b8',
              border: dir === 'over' ? 'none' : '1px solid #1e2847',
            }}>
            Plus haut que {target}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #1e2847', borderRadius: 10 }} className="px-2 py-2 text-center">
            <p style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Chance</p>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#f8fafc' }}>{winChance.toFixed(0)}%</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #1e2847', borderRadius: 10 }} className="px-2 py-2 text-center">
            <p style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Multiplicateur</p>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#f8fafc' }}>×{multiplier.toFixed(2)}</p>
          </div>
          <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10 }} className="px-2 py-2 text-center">
            <p style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Gain possible</p>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#4ade80' }}>{potentialWin.toFixed(4)}</p>
          </div>
        </div>
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
        <button onClick={roll} disabled={!canRoll}
          className={`w-full py-4 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 ${
            canRoll
              ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-emerald-950 hover:from-emerald-400 hover:to-green-400 active:scale-[0.98] shadow-lg shadow-emerald-500/25'
              : 'bg-white/5 text-slate-600 cursor-not-allowed'
          }`}>
          {rolling ? <><RotateCcw className="w-4 h-4 animate-spin" /> Lancement…</>
            : bal < 0.01 ? (demoMode ? '🎮 Démo épuisé' : '💸 Solde insuffisant')
            : <><Zap className="w-4 h-4" /> Lancer ({effBet.toFixed(2)} TON)</>}
        </button>
      </div>
    </div>
  );
};

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

// ══════════════════════════════════════════════════════════════════
// CHICKEN ROAD 3D — Three.js voxel game, RTP-based multipliers
// ══════════════════════════════════════════════════════════════════

const DIFF_LABELS: Record<Difficulty, string> = {
  easy: '🟢 Facile', medium: '🟡 Moyen', hard: '🔴 Difficile', hardcore: '💀 Hardcore',
};
const DIFF_COLORS: Record<Difficulty, string> = {
  easy: '#4CAF50', medium: '#FFD600', hard: '#FF3D00', hardcore: '#AA00FF',
};

const ChickenRoadGame: React.FC<{ onBack: () => void; streak: number; onResult: OnResult }> = ({ onBack, streak, onResult }) => {
  const { currentUser, placeGameBet, recordGameResult, demoMode, demoBalance } = useAppStore();
  const bal = demoMode ? demoBalance : currentUser.balanceMain;

  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef    = useRef<GameEngine | null>(null);
  const mountedRef   = useRef(true);
  const bigWinTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeBetRef = useRef(0);
  const multRef      = useRef(1.0);
  const laneRef      = useRef(-1);
  const session      = useSessionStats();

  const [gameState,   setGameState]   = useState<ChickenGameState>('idle');
  const [multiplier,  setMultiplier]  = useState(1.0);
  const [currentLane, setCurrentLane] = useState(-1);
  const [difficulty,  setDifficulty]  = useState<Difficulty>('medium');
  const [bet,         setBet]         = useState(0.10);
  const [autoCash,    setAutoCash]    = useState('');
  const [bigWin,      setBigWin]      = useState(false);
  const [history,     setHistory]     = useState<{ mult: number; won: boolean }[]>([]);
  const [showResult,  setShowResult]  = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (bigWinTimer.current) clearTimeout(bigWinTimer.current);
    };
  }, []);

  useEffect(() => {
    const canvas    = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const engine = new GameEngine(canvas, {
      onStateChange: (s: ChickenGameState) => {
        if (!mountedRef.current) return;
        setGameState(s);
        if (s === 'dead' || s === 'won' || s === 'cashed_out') setShowResult(true);
      },
      onMultiplierChange: (m: number) => {
        if (!mountedRef.current) return;
        multRef.current = m;
        setMultiplier(m);
      },
      onRowChange: (row: number) => {
        if (!mountedRef.current) return;
        laneRef.current = row;
        setCurrentLane(row);
      },
      onAutoCashout: () => { handleCashOut(); },
    });
    engineRef.current = engine;

    const obs = new ResizeObserver(() => {
      if (!container) return;
      engine.resize(container.clientWidth, container.clientHeight);
    });
    obs.observe(container);
    engine.resize(container.clientWidth, container.clientHeight);

    return () => { obs.disconnect(); engine.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { engineRef.current?.setDifficulty(difficulty); }, [difficulty]);
  useEffect(() => {
    const t = parseFloat(autoCash);
    engineRef.current?.setAutoCashoutTarget(isNaN(t) || t < 1.01 ? 0 : t);
  }, [autoCash]);

  const effBet   = Math.min(bet, bal);
  const isPlaying  = gameState === 'playing' || gameState === 'jumping';
  const isFinished = gameState === 'dead' || gameState === 'won' || gameState === 'cashed_out';
  const cfg        = DIFF_CONFIG[difficulty];

  const handleStart = useCallback(() => {
    if (effBet < 0.01 || bal < 0.01) return;
    activeBetRef.current = effBet;
    setShowResult(false);
    setMultiplier(1.0);
    setCurrentLane(-1);
    multRef.current = 1.0;
    laneRef.current = -1;
    snd.bet();
    engineRef.current?.setDifficulty(difficulty);
    engineRef.current?.startGame();
  }, [effBet, bal, difficulty]);

  const handleJump = useCallback(() => {
    if (gameState !== 'playing') return;
    engineRef.current?.jump();
  }, [gameState]);

  const handleCashOut = useCallback(() => {
    if ((gameState !== 'playing' && gameState !== 'jumping') || laneRef.current < 0) return;
    const win = +(activeBetRef.current * multRef.current).toFixed(6);
    placeGameBet(activeBetRef.current, win);
    recordGameResult('Chicken Road', activeBetRef.current, win);
    session.record(activeBetRef.current, win);
    snd.cashout();
    onResult(true);
    if (multRef.current >= 5) {
      setBigWin(true);
      if (bigWinTimer.current) clearTimeout(bigWinTimer.current);
      bigWinTimer.current = setTimeout(() => { if (mountedRef.current) setBigWin(false); }, 2600);
    }
    setHistory(h => [{ mult: multRef.current, won: true }, ...h.slice(0, 19)]);
    engineRef.current?.cashOut();
  }, [gameState, placeGameBet, recordGameResult, session, onResult]);

  useEffect(() => {
    if (gameState === 'dead') {
      placeGameBet(activeBetRef.current, 0);
      recordGameResult('Chicken Road', activeBetRef.current, 0);
      session.record(activeBetRef.current, 0);
      onResult(false);
      setHistory(h => [{ mult: 0, won: false }, ...h.slice(0, 19)]);
    } else if (gameState === 'won') {
      const win = +(activeBetRef.current * multRef.current).toFixed(6);
      placeGameBet(activeBetRef.current, win);
      recordGameResult('Chicken Road', activeBetRef.current, win);
      session.record(activeBetRef.current, win);
      snd.win();
      onResult(true);
      setBigWin(true);
      if (bigWinTimer.current) clearTimeout(bigWinTimer.current);
      bigWinTimer.current = setTimeout(() => { if (mountedRef.current) setBigWin(false); }, 2800);
      setHistory(h => [{ mult: multRef.current, won: true }, ...h.slice(0, 19)]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  useEffect(() => {
    if (!isFinished) return;
    const id = setTimeout(() => { if (mountedRef.current) setGameState('idle'); }, 3000);
    return () => clearTimeout(id);
  }, [isFinished]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (gameState === 'idle') handleStart();
        else if (gameState === 'playing') handleJump();
      }
      if (e.code === 'KeyC') handleCashOut();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gameState, handleStart, handleJump, handleCashOut]);

  const fmtMult = (m: number) =>
    m >= 100 ? `×${m.toFixed(0)}` : m >= 10 ? `×${m.toFixed(1)}` : `×${m.toFixed(2)}`;

  const diffColor = DIFF_COLORS[difficulty];
  const progress  = currentLane >= 0 ? ((currentLane + 1) / cfg.totalLanes) * 100 : 0;
  const nextMult  = computeMultiplier(difficulty, currentLane + 1);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#0a1a2e', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <BigWinEffect show={bigWin} />

      {/* Header */}
      <div style={{ flexShrink: 0, background: 'rgba(0,0,0,0.55)', borderBottom: '1px solid rgba(255,200,0,0.15)', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={onBack} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors" style={{ flexShrink: 0 }}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span style={{ fontSize: 22 }}>🐔</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-2">
            <h2 style={{ fontSize: 15, fontWeight: 900, color: '#FFD600', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Chicken Road</h2>
            <StreakChip streak={streak} />
          </div>
          <p style={{ fontSize: 10, color: '#90A4AE', marginTop: 1 }}>Traversez la route · évitez les voitures</p>
        </div>
        <MuteButton />
        <GameBalanceChip bal={bal} demo={demoMode} />
      </div>

      {demoMode && <DemoModeBanner />}
      <SessionStatsBar totalWon={session.totalWon} best={session.best} wagered={session.wagered} />

      {/* 3D Canvas */}
      <div ref={containerRef} style={{ flex: 1, minHeight: 0, position: 'relative', cursor: isPlaying ? 'pointer' : 'default' }}
        onClick={isPlaying ? handleJump : undefined}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />

        {/* Multiplier HUD overlay */}
        {isPlaying && (
          <div style={{ position: 'absolute', top: 8, left: 8, right: 8, pointerEvents: 'none' }}>
            <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ flex: 1, height: 10, background: 'rgba(255,255,255,0.12)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg,#4CAF50,#FFD600,${diffColor})`, transition: 'width 0.3s', borderRadius: 10 }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', minWidth: 44, textAlign: 'right' }}>
                {currentLane + 1}/{cfg.totalLanes}
              </span>
            </div>
            {currentLane >= 0 && (
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ background: 'linear-gradient(135deg,#FF6D00,#FFD600)', borderRadius: 12, padding: '5px 14px', boxShadow: '0 2px 12px rgba(255,165,0,0.5)' }}>
                  <span style={{ fontSize: 20, fontWeight: 900, color: '#000' }}>{fmtMult(multiplier)}</span>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '5px 12px' }}>
                  <span style={{ fontSize: 11, color: '#90A4AE' }}>Prochain </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#4CAF50' }}>{fmtMult(nextMult)}</span>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '5px 12px' }}>
                  <span style={{ fontSize: 11, color: '#90A4AE' }}>Gain </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#FFD600' }}>
                    {(activeBetRef.current * multiplier).toFixed(3)} TON
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Start hint */}
        {gameState === 'idle' && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none', textAlign: 'center' }}>
            <div style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)', borderRadius: 16, padding: '16px 24px', border: '1px solid rgba(255,200,0,0.25)' }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>🐔 Aide le poulet à traverser !</p>
              <p style={{ fontSize: 12, color: '#FFD600', marginTop: 4 }}>Misez et cliquez pour démarrer</p>
            </div>
          </div>
        )}

        {/* Result overlay */}
        {showResult && isFinished && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.62)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <div style={{
              margin: 16, padding: '24px 20px', borderRadius: 20,
              background: gameState === 'dead' ? 'linear-gradient(160deg,#1a0000,#3d0000)' : 'linear-gradient(160deg,#001a04,#003d0e)',
              border: `1px solid ${gameState === 'dead' ? '#FF1744' : '#00E676'}44`,
              textAlign: 'center', minWidth: 230, maxWidth: 300,
            }}>
              <div style={{ fontSize: 48 }}>
                {gameState === 'dead' ? '💥' : gameState === 'won' ? '🏆' : '💰'}
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 900, color: gameState === 'dead' ? '#FF5252' : '#69F0AE', marginTop: 6 }}>
                {gameState === 'dead' ? 'ÉCRASÉ !' : gameState === 'won' ? 'VICTOIRE !' : 'ENCAISSÉ !'}
              </h3>
              {gameState === 'dead' ? (
                <p style={{ fontSize: 13, color: '#EF9A9A', marginTop: 6 }}>
                  Voiture ! Perdu −{activeBetRef.current.toFixed(2)} TON
                </p>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <p style={{ fontSize: 11, color: '#A5D6A7' }}>
                    {gameState === 'won' ? `Toutes les ${cfg.totalLanes} voies !` : `${currentLane + 1} voie${currentLane > 0 ? 's' : ''} traversée${currentLane > 0 ? 's' : ''}`}
                  </p>
                  <p style={{ fontSize: 13, color: '#80CBC4', marginTop: 2 }}>{fmtMult(multiplier)}</p>
                  <p style={{ fontSize: 26, fontWeight: 900, color: '#69F0AE', marginTop: 4 }}>
                    +{(activeBetRef.current * multiplier - activeBetRef.current).toFixed(4)} TON
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* History strip */}
      {history.length > 0 && (
        <div style={{ flexShrink: 0, background: 'rgba(0,0,0,0.55)', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '5px 12px', display: 'flex', gap: 5, overflowX: 'auto' }} className="no-scrollbar">
          {history.map((h, i) => (
            <span key={i} style={{
              flexShrink: 0, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
              background: !h.won ? 'rgba(239,68,68,0.18)' : h.mult >= 10 ? 'rgba(34,197,94,0.18)' : 'rgba(255,214,0,0.15)',
              color: !h.won ? '#EF5350' : h.mult >= 10 ? '#4CAF50' : '#FFD600',
            }}>
              {h.won ? fmtMult(h.mult) : '💥'}
            </span>
          ))}
        </div>
      )}

      {/* Controls */}
      <div style={{ flexShrink: 0, background: 'rgba(0,0,0,0.82)', borderTop: '1px solid rgba(255,200,0,0.12)', padding: '10px 12px' }}>
        {gameState === 'idle' || isFinished ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Difficulty */}
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
              {(['easy', 'medium', 'hard', 'hardcore'] as Difficulty[]).map(d => {
                const active = difficulty === d;
                const col = DIFF_COLORS[d];
                return (
                  <button key={d} onClick={() => setDifficulty(d)}
                    style={{
                      flex: 1, padding: '5px 0', borderRadius: 8, fontSize: 10, fontWeight: 700,
                      background: active ? col : 'rgba(255,255,255,0.06)',
                      color: active ? (d === 'medium' ? '#000' : '#fff') : '#64748b',
                      border: active ? 'none' : '1px solid #1e2847',
                    }}>
                    {DIFF_LABELS[d]}
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: 10, color: '#546E7A', textAlign: 'center' }}>
              {cfg.totalLanes} voies · ×{computeMultiplier(difficulty, cfg.totalLanes).toFixed(2)} max · survie {Math.round(cfg.survivalProb * 100)}%/voie
            </p>

            {/* Auto-cashout */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid #1e2847', borderRadius: 10, padding: '6px 10px' }}>
              <span style={{ fontSize: 10, color: '#546E7A', fontWeight: 700, flexShrink: 0 }}>AUTO ×</span>
              <input type="number" value={autoCash} placeholder="ex: 2.00" min={1.01} step={0.01}
                onChange={e => setAutoCash(e.target.value)}
                style={{ flex: 1, background: 'transparent', color: '#fff', fontSize: 13, fontWeight: 600, outline: 'none', border: 'none' }} />
              {autoCash && <button onClick={() => setAutoCash('')} style={{ color: '#546E7A', fontSize: 13 }}>✕</button>}
            </div>

            {/* Bet */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid #1e2847', borderRadius: 10, padding: '6px 12px' }}>
              <input type="number" value={bet} min={0.01} max={50} step={0.01}
                onChange={e => { const v = +e.target.value; if (!isNaN(v)) setBet(Math.max(0.01, Math.min(50, v))); }}
                style={{ flex: 1, background: 'transparent', color: '#fff', fontSize: 20, fontWeight: 700, outline: 'none', border: 'none' }} />
              <span style={{ color: '#546E7A', fontWeight: 700 }}>TON</span>
            </div>
            <BetQuickButtons setBet={setBet} maxBal={bal} />

            <button onClick={handleStart} disabled={effBet < 0.01 || bal < 0.01}
              className={`w-full py-3 rounded-xl font-black text-base uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 ${
                effBet >= 0.01 && bal >= 0.01
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black shadow-lg shadow-orange-500/30'
                  : 'bg-white/5 text-slate-600 cursor-not-allowed'
              }`}>
              {bal < 0.01 ? (demoMode ? '🎮 Démo épuisé' : '💸 Solde insuffisant') : <>🐔 JOUER ({effBet.toFixed(2)} TON)</>}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#546E7A' }}>Mise : <span style={{ color: '#fff', fontWeight: 700 }}>{activeBetRef.current.toFixed(2)} TON</span></span>
              <span style={{ fontSize: 11, color: '#546E7A' }}>Potentiel : <span style={{ color: '#FFD600', fontWeight: 700 }}>{(activeBetRef.current * multiplier).toFixed(3)} TON</span></span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleJump} disabled={gameState === 'jumping'}
                className="flex-1 py-3 rounded-xl font-black text-base uppercase transition-all active:scale-95 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#1E88E5,#5E35B1)', color: '#fff', boxShadow: '0 4px 16px rgba(30,136,229,0.35)' }}>
                🐔 GO !
              </button>
              <button onClick={handleCashOut} disabled={currentLane < 0 || gameState === 'jumping'}
                className={`flex-1 py-3 rounded-xl font-black text-base uppercase transition-all active:scale-95 ${
                  currentLane < 0 ? 'bg-white/5 text-slate-600 cursor-not-allowed' : ''
                }`}
                style={currentLane >= 0 ? { background: 'linear-gradient(135deg,#FFD600,#FF8F00)', color: '#000', boxShadow: '0 4px 16px rgba(255,200,0,0.35)' } : {}}>
                💰 {(activeBetRef.current * multiplier).toFixed(3)}
              </button>
            </div>
          </div>
        )}
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
  const session                   = useSessionStats();

  useEffect(() => {
    minesMountedRef.current = true;
    return () => { minesMountedRef.current = false; if (minesBigWinTimer.current) clearTimeout(minesBigWinTimer.current); };
  }, []);

  const effBet   = Math.min(bet, bal);
  const effMinesCalc = phase === 'waiting' ? mineCount : (effMinesRef.current || mineCount);
  const curMult  = minesMult(effMinesCalc, safeCount);
  const curWin   = +(activeBetRef.current * curMult).toFixed(6);
  const nextMult = minesMult(effMinesCalc, safeCount + 1);
  const firstCaseMult = minesMult(effMinesCalc, 1);
  const maxPossibleMult = minesMult(effMinesCalc, GRID_SIZE - effMinesCalc);

  const startGame = () => {
    if (effBet < 0.01 || bal < 0.01) return;
    snd.bet();
    const effM = mineCount;
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

    const isMine = minePos.has(idx);

    if (isMine) {
      setRevealed(new Set([...revealed, idx]));
      setPhase('lost');
      placeGameBet(activeBetRef.current, 0);
      recordGameResult('Mines', activeBetRef.current, 0);
      session.record(activeBetRef.current, 0);
      snd.boom();
      onResult(false);
      const entry: MinesFeedEntry = { username: 'Vous', bet: activeBetRef.current, payout: 0, profit: -activeBetRef.current, mines: mineCount };
      if (!demoMode) setFeed(f => [entry, ...f.slice(0, 9)]);
      setMyFeed(f => [entry, ...f.slice(0, 9)]);
    } else {
      setRevealed(new Set([...revealed, idx]));
      snd.reveal();
      const ns = safeCount + 1;
      setSafeCount(ns);
      if (ns === GRID_SIZE - effMinesRef.current) {
        const win = +(activeBetRef.current * minesMult(effMinesRef.current, ns)).toFixed(6);
        placeGameBet(activeBetRef.current, win);
        recordGameResult('Mines', activeBetRef.current, win);
        session.record(activeBetRef.current, win);
        snd.win();
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

  const cashout = () => {
    if (phase !== 'playing' || safeCount === 0) return;
    placeGameBet(activeBetRef.current, curWin);
    recordGameResult('Mines', activeBetRef.current, curWin);
    session.record(activeBetRef.current, curWin);
    snd.win();
    onResult(true);
    if (curMult >= 5) { setBigWin(true); if (minesBigWinTimer.current) clearTimeout(minesBigWinTimer.current); minesBigWinTimer.current = setTimeout(() => { if (minesMountedRef.current) setBigWin(false); }, 2600); }
    setPhase('won');
    const entry: MinesFeedEntry = { username: 'Vous', bet: activeBetRef.current, payout: curWin, profit: +(curWin - activeBetRef.current).toFixed(4), mines: mineCount };
    if (!demoMode) setFeed(f => [entry, ...f.slice(0, 9)]);
    setMyFeed(f => [entry, ...f.slice(0, 9)]);
  };

  const reset = () => { setPhase('waiting'); setRevealed(new Set()); setMinePos(new Set()); setSafeCount(0); };

  // Round auto-continues — no "replay" prompt blocking the player.
  useEffect(() => {
    if (phase !== 'lost' && phase !== 'won') return;
    const id = setTimeout(() => { if (minesMountedRef.current) reset(); }, 2200);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const displayFeed = feedTab === 'all' ? feed : myFeed;

  return (
    <div className="pb-4" style={{ background: '#060a18', minHeight: '100%' }}>
      <style>{`
        .mine-tile-front:hover { background: #243059 !important; border-color: #3a4f8e !important; }
        @keyframes tileFlipFront { 0%{transform:rotateY(0deg)} 100%{transform:rotateY(90deg)} }
        @keyframes tileFlipBack  { 0%{transform:rotateY(-90deg)} 100%{transform:rotateY(0deg)} }
        @keyframes tileIdle {
          0%,100%{box-shadow:0 0 0px rgba(100,149,255,0); transform:scale(1)}
          45%    {box-shadow:0 0 8px rgba(100,149,255,0.22),0 0 3px rgba(100,149,255,0.10) inset; transform:scale(1.015)}
        }
        @keyframes tileSweep { 0%{background-position:-120% center} 100%{background-position:220% center} }
        @keyframes mineReveal {
          0%  {transform:rotateY(0deg) scale(0.55);opacity:0}
          50% {transform:rotateY(0deg) scale(1.20);opacity:1}
          72% {transform:rotateY(0deg) scale(0.93)}
          88% {transform:rotateY(0deg) scale(1.05)}
          100%{transform:rotateY(0deg) scale(1)}
        }
        @keyframes gemShine {
          0%,100%{filter:brightness(1.1) drop-shadow(0 0 4px rgba(74,222,128,0.45));box-shadow:0 0 14px rgba(74,222,128,0.45),0 0 5px rgba(74,222,128,0.25) inset}
          50%    {filter:brightness(1.85) drop-shadow(0 0 14px rgba(74,222,128,0.90));box-shadow:0 0 28px rgba(74,222,128,0.80),0 0 10px rgba(74,222,128,0.40) inset}
        }
        @keyframes mineGridShake {
          0%,100%{transform:translate(0,0) rotate(0deg)}
          12%    {transform:translate(-7px,5px) rotate(-0.5deg)}
          25%    {transform:translate(7px,-5px) rotate(0.5deg)}
          38%    {transform:translate(-6px,-4px) rotate(-0.3deg)}
          52%    {transform:translate(6px,4px) rotate(0.3deg)}
          68%    {transform:translate(-3px,2px)}
          84%    {transform:translate(2px,-1px)}
        }
        @keyframes boomFlash {
          0%  {box-shadow:0 0 0 rgba(239,68,68,0);transform:scale(1);filter:brightness(1)}
          8%  {box-shadow:0 0 0 4px rgba(255,255,100,0.9),0 0 40px 6px rgba(239,68,68,1),0 0 12px rgba(255,120,0,1) inset;transform:scale(1.18);filter:brightness(2.2)}
          22% {box-shadow:0 0 28px 2px rgba(239,68,68,0.85),0 0 8px rgba(255,80,0,0.5) inset;transform:scale(1.07);filter:brightness(1.4)}
          55% {box-shadow:0 0 18px rgba(239,68,68,0.55);transform:scale(1.02);filter:brightness(1.1)}
          100%{box-shadow:0 0 10px rgba(239,68,68,0.30);transform:scale(1);filter:brightness(1)}
        }
        @keyframes gridFlashRed {
          0%  {outline:0px solid rgba(239,68,68,0)}
          10% {outline:3px solid rgba(239,68,68,0.85);box-shadow:0 0 40px rgba(239,68,68,0.4)}
          100%{outline:0px solid rgba(239,68,68,0);box-shadow:none}
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
      {demoMode && <DemoModeBanner />}

      <div className="px-4 pt-4 space-y-4">
        <SessionStatsBar totalWon={session.totalWon} best={session.best} wagered={session.wagered} />
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
            const isMine    = minePos.has(idx);
            const isRev     = revealed.has(idx);
            const showBoom  = isRev && isMine;
            const showGem   = isRev && !isMine;
            const showGhost = (phase === 'lost' || phase === 'won') && isMine && !isRev;
            const isPlayable = phase === 'playing' && !isRev;
            return (
              <div
                key={idx}
                style={{
                  aspectRatio: '1',
                  position: 'relative',
                  perspective: '500px',
                  cursor: isPlayable ? 'pointer' : 'default',
                }}
                onClick={() => { if (isPlayable) revealTile(idx); }}
              >
                {/* ── Face avant — visible avant révélation ── */}
                <div
                  className={isPlayable ? 'mine-tile-front' : undefined}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transformStyle: 'preserve-3d',
                    transform: isRev ? 'rotateY(90deg)' : 'rotateY(0deg)',
                    transition: isRev ? 'transform 0.18s ease-in' : 'none',
                    background: showGhost
                      ? 'rgba(239,68,68,0.08)'
                      : phase === 'playing'
                        ? 'linear-gradient(160deg,#1e2a52,#161d3a)'
                        : '#111830',
                    border: showGhost
                      ? '1px solid rgba(239,68,68,0.22)'
                      : phase === 'playing'
                        ? '1px solid #2a3a6e'
                        : '1px solid #1e2847',
                    animation: isPlayable ? 'tileIdle 3.2s ease-in-out infinite' : undefined,
                    animationDelay: isPlayable ? `${(idx * 0.13) % 1.6}s` : undefined,
                    opacity: showGhost ? 0.45 : 1,
                    overflow: 'hidden',
                  }}
                >
                  {/* Sweep shimmer diagonal */}
                  {isPlayable && (
                    <div
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 12,
                        background: 'linear-gradient(105deg,transparent 30%,rgba(255,255,255,0.045) 50%,transparent 70%)',
                        backgroundSize: '200% 100%',
                        animation: 'tileSweep 4s ease-in-out infinite',
                        animationDelay: `${(idx * 0.19) % 2}s`,
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                  {showGhost && <span style={{ fontSize: 18, opacity: 0.5 }}>💣</span>}
                </div>

                {/* ── Face arrière — visible après révélation ── */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transformStyle: 'preserve-3d',
                    transform: isRev ? 'rotateY(0deg)' : 'rotateY(-90deg)',
                    transition: isRev ? 'transform 0.18s ease-out 0.18s' : 'none',
                    background: showBoom
                      ? 'radial-gradient(circle at 50% 35%,rgba(239,68,68,0.65),rgba(127,29,29,0.55))'
                      : showGem
                        ? 'radial-gradient(circle at 45% 30%,rgba(74,222,128,0.60),rgba(20,83,45,0.50))'
                        : 'transparent',
                    border: showBoom
                      ? '2px solid rgba(239,68,68,0.90)'
                      : showGem
                        ? '2px solid rgba(74,222,128,0.80)'
                        : 'none',
                    boxShadow: showGem
                      ? '0 0 22px rgba(74,222,128,0.65),0 0 8px rgba(74,222,128,0.35) inset'
                      : showBoom
                        ? '0 0 26px rgba(239,68,68,0.75)'
                        : undefined,
                    animation: showBoom
                      ? 'boomFlash 0.65s ease-out forwards'
                      : showGem
                        ? 'mineReveal 0.32s cubic-bezier(0.34,1.56,0.64,1) forwards, gemShine 2.4s ease-in-out 0.35s infinite'
                        : undefined,
                    filter: showGem ? 'brightness(1.18)' : undefined,
                  }}
                >
                  {showBoom && '💣'}
                  {showGem  && '💎'}
                </div>
              </div>
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
// TOWER — grimpez les étages, évitez le piège, encaissez quand vous voulez
// ══════════════════════════════════════════════════════════════════

type TowerDiff = 'easy' | 'medium' | 'hard';
type TowerPhase = 'waiting' | 'playing' | 'won' | 'lost';

const TOWER_FLOORS = 7;
const TOWER_CELLS: Record<TowerDiff, number> = { easy: 4, medium: 3, hard: 2 };
const TOWER_RTP = 0.95;
const TOWER_LABEL: Record<TowerDiff, string> = { easy: 'Facile', medium: 'Moyen', hard: 'Difficile' };

function towerSafeFrac(diff: TowerDiff): number {
  const cells = TOWER_CELLS[diff];
  return (cells - 1) / cells; // 1 piège par étage
}
function towerMult(diff: TowerDiff, floor: number): number {
  if (floor <= 0) return 1;
  return +(TOWER_RTP / Math.pow(towerSafeFrac(diff), floor)).toFixed(4);
}

function towerStep(diff: TowerDiff): boolean {
  const cells = TOWER_CELLS[diff];
  return Math.random() < (cells - 1) / cells;
}

const TowerGame: React.FC<{ onBack: () => void; streak: number; onResult: OnResult }> = ({ onBack, streak, onResult }) => {
  const { currentUser, placeGameBet, recordGameResult, demoMode, demoBalance } = useAppStore();
  const bal = demoMode ? demoBalance : currentUser.balanceMain;
  const [bet, setBet]           = useState(0.01);
  const [diff, setDiff]         = useState<TowerDiff>('medium');
  const [phase, setPhase]       = useState<TowerPhase>('waiting');
  const [floor, setFloor]       = useState(0);
  const [picks, setPicks]       = useState<number[]>([]);
  const [trapCell, setTrapCell] = useState<number | null>(null);
  const [bigWin, setBigWin]     = useState(false);
  const activeBetRef            = useRef(0);
  const diffRef                 = useRef<TowerDiff>('medium');
  const towerMountedRef         = useRef(true);
  const towerBigWinTimer        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const session                 = useSessionStats();

  useEffect(() => {
    towerMountedRef.current = true;
    return () => { towerMountedRef.current = false; if (towerBigWinTimer.current) clearTimeout(towerBigWinTimer.current); };
  }, []);

  const effBet       = Math.min(bet, bal);
  const activeDiff   = phase === 'waiting' ? diff : diffRef.current;
  const cellsPerFloor = TOWER_CELLS[activeDiff];
  const curMult       = towerMult(activeDiff, floor);
  const curWin         = +(activeBetRef.current * curMult).toFixed(6);
  const nextMult       = towerMult(activeDiff, floor + 1);
  const maxMult         = towerMult(activeDiff, TOWER_FLOORS);

  const start = () => {
    if (effBet < 0.01 || bal < 0.01) return;
    snd.bet();
    diffRef.current = diff;
    activeBetRef.current = effBet;
    setFloor(0);
    setPicks([]);
    setTrapCell(null);
    setPhase('playing');
  };

  const pickCell = (cellIdx: number) => {
    if (phase !== 'playing') return;
    const safe = towerStep(diffRef.current);
    if (safe) {
      snd.reveal();
      const nf = floor + 1;
      setPicks(p => [...p, cellIdx]);
      setFloor(nf);
      if (nf >= TOWER_FLOORS) {
        const win = +(activeBetRef.current * towerMult(diffRef.current, nf)).toFixed(6);
        placeGameBet(activeBetRef.current, win);
        recordGameResult('Tower', activeBetRef.current, win);
        session.record(activeBetRef.current, win);
        snd.win();
        onResult(true);
        setBigWin(true);
        if (towerBigWinTimer.current) clearTimeout(towerBigWinTimer.current);
        towerBigWinTimer.current = setTimeout(() => { if (towerMountedRef.current) setBigWin(false); }, 2600);
        setPhase('won');
      }
    } else {
      setTrapCell(cellIdx);
      setPhase('lost');
      placeGameBet(activeBetRef.current, 0);
      recordGameResult('Tower', activeBetRef.current, 0);
      session.record(activeBetRef.current, 0);
      snd.boom();
      onResult(false);
    }
  };

  const cashout = () => {
    if (phase !== 'playing' || floor === 0) return;
    placeGameBet(activeBetRef.current, curWin);
    recordGameResult('Tower', activeBetRef.current, curWin);
    session.record(activeBetRef.current, curWin);
    snd.win();
    onResult(true);
    if (curMult >= 5) {
      setBigWin(true);
      if (towerBigWinTimer.current) clearTimeout(towerBigWinTimer.current);
      towerBigWinTimer.current = setTimeout(() => { if (towerMountedRef.current) setBigWin(false); }, 2600);
    }
    setPhase('won');
  };

  const reset = () => { setPhase('waiting'); setFloor(0); setPicks([]); setTrapCell(null); };

  // Le tour repart automatiquement — pas de bouton "Rejouer" bloquant.
  useEffect(() => {
    if (phase !== 'lost' && phase !== 'won') return;
    const id = setTimeout(() => { if (towerMountedRef.current) reset(); }, 2200);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <div className="space-y-5 pb-4">
      <BigWinEffect show={bigWin} />
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">Tower</h2>
            <StreakChip streak={streak} />
          </div>
          <p className="text-[11px] text-slate-500">Grimpez les étages · évitez le piège · encaissez</p>
        </div>
        <MuteButton />
        <GameBalanceChip bal={bal} demo={demoMode} />
      </div>
      {demoMode && <DemoModeBanner />}

      <SessionStatsBar totalWon={session.totalWon} best={session.best} wagered={session.wagered} />

      {/* Live gain bar */}
      {phase === 'playing' && (
        <div className="glass-card p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-semibold">Gain actuel</p>
            <p className="text-lg font-black text-emerald-400">{floor > 0 ? `${curWin.toFixed(4)} TON` : '—'}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-slate-500 uppercase font-semibold">Étage</p>
            <p className="text-lg font-black text-white">{floor}/{TOWER_FLOORS}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase font-semibold">Prochain</p>
            <p className="text-lg font-black text-amber-400">{nextMult.toFixed(2)}×</p>
          </div>
        </div>
      )}

      {(phase === 'won' || phase === 'lost') && (
        <div className="glass-card p-4 text-center">
          {phase === 'won' ? (
            <p className="text-emerald-400 font-bold text-sm">
              {floor >= TOWER_FLOORS ? '🏆 Sommet atteint !' : '🎉 Encaissé'} +{curWin.toFixed(4)} TON
            </p>
          ) : (
            <p className="text-red-400 font-bold text-sm">💥 Piège ! Perdu −{activeBetRef.current.toFixed(4)} TON</p>
          )}
        </div>
      )}

      {/* Tour — échelle des étages */}
      <div className="glass-card p-4 space-y-2">
        {Array.from({ length: TOWER_FLOORS }, (_, i) => TOWER_FLOORS - i).map(f => {
          const isCleared = f <= floor;
          const isCurrent = phase === 'playing' && f === floor + 1;
          const isBusted  = phase === 'lost' && f === floor + 1;
          const isLocked  = !isCleared && !isCurrent && !isBusted;
          const pickIdx   = f <= floor ? picks[f - 1] : null;

          return (
            <div key={f} className="flex items-center gap-2">
              <span className="w-9 text-right" style={isCurrent
                ? { background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)', borderRadius: 8, padding: '2px 4px', fontSize: 12, fontWeight: 800, color: '#fbbf24', transition: 'background 0.15s' }
                : { fontSize: 10, fontWeight: 700, color: isCleared ? '#4ade80' : '#475569' }}>
                {towerMult(activeDiff, f).toFixed(2)}×
              </span>
              <div className="flex-1 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cellsPerFloor}, 1fr)` }}>
                {Array.from({ length: cellsPerFloor }, (_, c) => {
                  const cleared = f <= floor && pickIdx === c;
                  const busted  = isBusted && c === trapCell;
                  return (
                    <button
                      key={c}
                      disabled={!isCurrent}
                      onClick={() => pickCell(c)}
                      style={{
                        height: 30, borderRadius: 8,
                        background: cleared ? 'linear-gradient(135deg,#22c55e,#16a34a)'
                          : busted ? 'linear-gradient(135deg,#ef4444,#b91c1c)'
                          : isCurrent ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
                        border: isCurrent ? '1px solid #3a4f8e' : '1px solid #1e2847',
                        opacity: isLocked ? 0.35 : 1,
                        cursor: isCurrent ? 'pointer' : 'default',
                        fontSize: 14,
                        transition: 'background 0.15s',
                      }}
                      className={isCurrent ? 'tap-scale' : undefined}
                    >
                      {cleared ? '💎' : busted ? '💥' : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="glass-card p-4 space-y-3">
        {phase === 'waiting' ? (
          <>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Difficulté</p>
            <div className="grid grid-cols-3 gap-2">
              {(['easy', 'medium', 'hard'] as const).map(d => (
                <button key={d} onClick={() => setDiff(d)}
                  style={{
                    padding: '8px 0', borderRadius: 10, fontWeight: 700, fontSize: 12,
                    background: diff === d ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'rgba(255,255,255,0.05)',
                    color: diff === d ? '#06210f' : '#94a3b8',
                    border: diff === d ? 'none' : '1px solid #1e2847',
                  }}>
                  {TOWER_LABEL[d]}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500">{TOWER_CELLS[diff]} cases/étage · ×{maxMult.toFixed(2)} au sommet</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pt-1">Montant de la mise</p>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <input type="number" value={bet} min={0.01} max={50} step={0.01}
                onChange={e => { const v = +e.target.value; if (!isNaN(v)) setBet(Math.max(0.01, Math.min(50, v))); }}
                className="flex-1 bg-transparent text-2xl font-bold text-white outline-none" />
              <span className="text-base font-bold text-slate-500">TON</span>
            </div>
            <BetQuickButtons setBet={setBet} maxBal={bal} />
            <button onClick={start} disabled={effBet < 0.01 || bal < 0.01}
              className={`w-full py-4 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 ${
                effBet >= 0.01 && bal >= 0.01
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-emerald-950 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] shadow-lg shadow-emerald-500/25'
                  : 'bg-white/5 text-slate-600 cursor-not-allowed'
              }`}>
              {bal < 0.01 ? (demoMode ? '🎮 Démo épuisé' : '💸 Solde insuffisant') : <><Zap className="w-4 h-4" /> Grimper ({effBet.toFixed(2)} TON)</>}
            </button>
          </>
        ) : phase === 'playing' ? (
          <button onClick={cashout} disabled={floor === 0}
            className={`w-full py-4 rounded-xl font-bold text-base transition-all ${
              floor > 0
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-amber-950 active:scale-[0.98] shadow-lg shadow-amber-500/25'
                : 'bg-white/5 text-slate-600 cursor-not-allowed'
            }`}>
            {floor > 0 ? `💰 Encaisser ${curWin.toFixed(4)} TON` : 'Choisissez une case pour grimper'}
          </button>
        ) : (
          <p className="text-center text-[11px] text-slate-500">Nouvelle partie dans un instant…</p>
        )}
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

function rollPlinko(rows: PlinkoRows, risk: PlinkoRisk, demo = false): { slot: number; path: boolean[] } {
  const slots = rows + 1;
  const center = rows / 2;
  const spreadFactor = risk === 'low' ? 0.45 : risk === 'medium' ? 0.70 : 1.0;
  // Positive houseEdge → ball pushed toward edges (lower multipliers in low risk, higher variance)
  // In medium/high risk, edges = high multiplier BUT the probability is already heavily tailed
  // Net effect: lower EV for player
  const houseEdge = demo ? 0.04 : 0.10;
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
  const session           = useSessionStats();
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
    flashes.current.push({ x: pt.x, y: pt.y, t: 0 });
  };

  apiRef.current.finish = (b) => {
    if (!mountedRef.current) return;
    pendingWins.current.delete(b.id);
    placeGameBet(0, b.win);
    recordGameResult('Plinko', b.bet, b.win);
    sessionGainRef.current = +(sessionGainRef.current + b.win - b.bet).toFixed(4);
    setSessionGain(sessionGainRef.current);
    session.record(b.bet, b.win);
    setHist(h => [{ slot: b.slot, mult: b.mult }, ...h.slice(0, 7)]);
    setLastWin({ mult: b.mult, win: b.win });
    setFinalSlot(b.slot);
    if (b.mult >= 10) {
      setBigWin(true);
      if (plinkoBigWinTimer.current) clearTimeout(plinkoBigWinTimer.current);
      plinkoBigWinTimer.current = setTimeout(() => { if (mountedRef.current) setBigWin(false); }, 2600);
      snd.win();
    } else if (b.mult >= 1) { snd.win(); }
    else                    { snd.lose(); }
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
          const { slot: s2, path: p2 } = rollPlinko(rows, risk, demoMode);
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
    snd.bet();
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
        const { slot, path } = rollPlinko(rows, risk, demoMode);
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
      {demoMode && <DemoModeBanner />}

      <div className="px-4 pt-4 space-y-4">
        <SessionStatsBar totalWon={session.totalWon} best={session.best} wagered={session.wagered} />
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
            <p style={{ fontSize: 10, color: '#475569', marginTop: 6 }}>
              Avantage maison : {((demoMode ? 0.04 : 0.10) * 100).toFixed(0)}% (biais de trajectoire par rebond)
            </p>
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
  { username: 'Léa R.',      bet: 0.05, win: 0.00, mult: 0,    game: 'Chicken Road',    createdAt: _NOW -  1 * 60000 },
  { username: 'Yusuf K.',    bet: 0.10, win: 2.80, mult: 2.80, game: 'Plinko',   createdAt: _NOW -  3 * 60000 },
  { username: 'Marco T.',    bet: 1.0,  win: 0.00, mult: 0,    game: 'Tower',    createdAt: _NOW -  6 * 60000 },
  { username: 'Chen W.',     bet: 0.02, win: 0.04, mult: 2,    game: 'Tower',    createdAt: _NOW -  9 * 60000 },
  { username: 'Amira S.',    bet: 0.50, win: 1.28, mult: 2.56, game: 'Chicken Road',    createdAt: _NOW - 14 * 60000 },
  { username: 'Priya S.',    bet: 0.05, win: 0.00, mult: 0,    game: 'Mines',    createdAt: _NOW - 19 * 60000 },
  { username: 'Fatou D.',    bet: 0.10, win: 0.19, mult: 2,    game: 'Tower',    createdAt: _NOW - 25 * 60000 },
  { username: 'Nicolás V.',  bet: 0.03, win: 1.08, mult: 36,   game: 'Tower',    createdAt: _NOW - 33 * 60000 },
  { username: 'Kwame O.',    bet: 0.20, win: 0.00, mult: 0,    game: 'Plinko',   createdAt: _NOW - 41 * 60000 },
  { username: 'Hana P.',     bet: 0.01, win: 0.02, mult: 2,    game: 'Dice',     createdAt: _NOW - 48 * 60000 },
];

// ══════════════════════════════════════════════════════════════════
// GAMES HUB
// ══════════════════════════════════════════════════════════════════

type ActiveGame = 'dice' | 'chicken' | 'mines' | 'tower' | 'plinko' | null;

const CATALOG = [
  {
    id: 'dice' as ActiveGame,
    title: 'Dice',
    desc: 'Choisis ta chance, multiplie ta mise',
    stats: 'jusqu\'à ×49 · équilibré',
    emoji: '🎲',
    badge: 'POPULAIRE',
    accentFrom: '#f59e0b', accentTo: '#fbbf24',
    glow: 'rgba(245,158,11,0.4)',
    badgeColor: '#f59e0b',
    pattern: 'dice',
  },
  {
    id: 'chicken' as ActiveGame,
    title: 'Chicken Road',
    desc: 'Traversez la route, évitez les voitures',
    stats: 'jusqu\'à ×40 · encaissez à tout moment',
    emoji: '🐔',
    badge: 'HOT',
    accentFrom: '#fbbf24', accentTo: '#f59e0b',
    glow: 'rgba(251,191,36,0.4)',
    badgeColor: '#f59e0b',
    pattern: 'chicken',
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
    id: 'tower' as ActiveGame,
    title: 'Tower',
    desc: 'Grimpez les étages, évitez le piège',
    stats: 'jusqu\'à ×40 · encaissez à tout moment',
    emoji: '🗼',
    badge: 'NOUVEAU',
    accentFrom: '#10b981', accentTo: '#34d399',
    glow: 'rgba(16,185,129,0.4)',
    badgeColor: '#10b981',
    pattern: 'tower',
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

  // Le mode démo se réinitialise toujours en quittant l'onglet Jeux —
  // impossible de l'oublier activé par erreur en revenant plus tard.
  useEffect(() => {
    return () => { if (useAppStore.getState().demoMode) toggleDemoMode(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick every 10s to refresh relative timestamps in live feed
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(id);
  }, []);

  // Live feed auto-rotation — new fake entry every 8–18 seconds
  useEffect(() => {
    const GAME_NAMES = ['Chicken Road', 'Plinko', 'Tower', 'Mines', 'Dice'];
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

  if (activeGame === 'dice')     return <DiceGame     onBack={() => setActiveGame(null)} streak={streak} onResult={handleResult} />;
  if (activeGame === 'tower')    return <TowerGame    onBack={() => setActiveGame(null)} streak={streak} onResult={handleResult} />;
  if (activeGame === 'plinko')   return <PlinkoGame   onBack={() => setActiveGame(null)} streak={streak} onResult={handleResult} />;
  if (activeGame === 'chicken') return <ChickenRoadGame onBack={() => setActiveGame(null)} streak={streak} onResult={handleResult} />;
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
        <button onClick={() => { snd.tick(); toggleDemoMode(); }} style={{
          flex: 1, padding: '10px 12px', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer',
          background: demoMode ? 'linear-gradient(135deg,#d97706,#f59e0b)' : 'rgba(255,255,255,0.05)',
          border: demoMode ? '1px solid #f59e0b' : '1px solid #1e2847',
          color: demoMode ? '#1c1400' : '#94a3b8',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <span>🎮</span>
          <span>{demoMode ? `Mode Démo · ${demoBalance.toFixed(2)} TON` : 'Mode Démo'}</span>
        </button>
        <button onClick={toggleMute} style={{
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
            onClick={() => { snd.tick(); setActiveGame(game.id); }}
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
              <p className="text-[10px] mt-0.5 truncate" style={{ color: '#475569' }}>{game.stats}</p>
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
          onClick={() => { snd.tick(); setActiveGame(game.id); }}
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
