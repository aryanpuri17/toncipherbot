import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { ArrowLeft, Minus, Plus, RotateCcw, Trophy, Zap } from 'lucide-react';

// ══════════════════════════════════════════════════════════════════
// SHARED TYPES & STREAK SYSTEM
// ══════════════════════════════════════════════════════════════════

// Each game receives current consecutive win count and reports back.
// After 2+ consecutive wins the house edge increases silently.
type OnResult = (won: boolean) => void;

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
  { label: '×10',   mult: 10,  fill: '#0e001e', stroke: '#5b21b6', text: '#c4b5fd' }, // never won
];

const CX = 150, CY = 150, WRADIUS = 118;
const SEG_COUNT = 10, SEG_DEG = 36;

function pt(deg: number, r = WRADIUS) {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}
function arcPath(i: number): string {
  const s = pt(i * SEG_DEG - SEG_DEG / 2);
  const e = pt(i * SEG_DEG + SEG_DEG / 2);
  return `M${CX} ${CY} L${s.x.toFixed(2)} ${s.y.toFixed(2)} A${WRADIUS} ${WRADIUS} 0 0 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}Z`;
}

// Streak-adaptive weights — after wins, PERDU weight climbs, wins deflate
function rollWheel(streak: number): { mult: number; idx: number[] } {
  const bonus = Math.min(28, streak * 10); // +0, +10, +20, +28 to PERDU
  const loseW = 42 + bonus;
  const f = (100 - loseW) / 58; // scale factor for wins
  const raw = [
    { mult: 0,   weight: loseW,                            idx: [0, 3, 6, 8] },
    { mult: 0.4, weight: Math.max(2, Math.round(22 * f)),  idx: [1] },
    { mult: 1,   weight: Math.max(2, Math.round(18 * f)),  idx: [2] },
    { mult: 2,   weight: Math.max(1, Math.round(12 * f)),  idx: [4] },
    { mult: 3,   weight: Math.max(1, Math.round(5  * f)),  idx: [5] },
    { mult: 5,   weight: streak >= 2 ? 0 : Math.max(0, Math.round(1 * f)), idx: [7] },
  ];
  const total = raw.reduce((s, r) => s + r.weight, 0);
  let r = Math.random() * total;
  for (const rule of raw) { r -= rule.weight; if (r <= 0) return rule; }
  return raw[0];
}

const WheelSVG: React.FC<{ rotation: number }> = ({ rotation }) => {
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
      </defs>
      {/* outer ring */}
      <circle cx={CX} cy={CY} r={WRADIUS + 22} fill="#1a0e00" />
      <circle cx={CX} cy={CY} r={WRADIUS + 22} fill="none" stroke="#fbbf24" strokeWidth="3" />
      <circle cx={CX} cy={CY} r={WRADIUS + 3}  fill="none" stroke="#92400e" strokeWidth="1.5" />
      {/* gold studs */}
      {studs.map((p, i) => (
        <circle key={i} cx={p.x.toFixed(2)} cy={p.y.toFixed(2)} r={5}
          fill="#fbbf24" stroke="#78350f" strokeWidth="1.5" />
      ))}
      {/* segments */}
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
      {/* hub */}
      <circle cx={CX} cy={CY} r={27} fill="url(#wHub)" stroke="#fbbf24" strokeWidth="2.5" />
      <circle cx={CX} cy={CY} r={18} fill="#1a0800" />
      <circle cx={CX} cy={CY} r={9}  fill="#fbbf24" opacity="0.25" />
    </svg>
  );
};

const WHEEL_PRESETS = [0.01, 0.05, 0.1, 0.5, 1, 5];

const WheelGame: React.FC<{ onBack: () => void; streak: number; onResult: OnResult }> = ({ onBack, streak, onResult }) => {
  const { currentUser, placeGameBet } = useAppStore();
  const [bet, setBet]       = useState(0.01);
  const [spinning, setSpin] = useState(false);
  const [rotation, setRot]  = useState(0);
  const rotRef              = useRef(0);
  const [result, setResult] = useState<{ seg: Seg; win: number } | null>(null);
  const [hist, setHist]     = useState<number[]>([]);

  const effBet  = Math.min(bet, currentUser.balanceMain);
  const canSpin = !spinning && effBet >= 0.01 && currentUser.balanceMain >= 0.01;
  const adj = (d: number) => setBet(p => Math.max(0.01, Math.min(50, +(p + d).toFixed(3))));

  const spin = () => {
    if (!canSpin) return;
    const rule = rollWheel(streak);
    const idx = rule.idx[Math.floor(Math.random() * rule.idx.length)];
    const target = (360 - idx * SEG_DEG + 360) % 360;
    const cur = rotRef.current % 360;
    let delta = target - cur;
    if (delta < 0) delta += 360;
    const newRot = rotRef.current + 5 * 360 + delta;
    rotRef.current = newRot;
    setRot(newRot);
    setSpin(true);
    setResult(null);
    const used = Math.min(effBet, currentUser.balanceMain);
    const win = +(used * rule.mult).toFixed(6);
    setTimeout(() => {
      setSpin(false);
      placeGameBet(used, win);
      setResult({ seg: SEGS[idx], win });
      setHist(h => [rule.mult, ...h.slice(0, 7)]);
      onResult(rule.mult > 0);
    }, 4300);
  };

  const pf = (m: number) => (effBet * m).toFixed(m < 1 ? 4 : 3);

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h2 className="text-base font-bold text-white">Roue de la Fortune</h2>
          <p className="text-[11px] text-slate-500">Faites tourner · Gagnez jusqu'à ×5 votre mise</p>
        </div>
        <div className="glass-card px-3 py-1.5 text-right">
          <p className="text-[10px] text-slate-500 uppercase">Solde</p>
          <p className="text-sm font-bold text-white">{currentUser.balanceMain.toFixed(3)} TON</p>
        </div>
      </div>

      {/* History chips */}
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

      {/* Wheel */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="absolute z-10" style={{
            top: '-6px', left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '13px solid transparent', borderRight: '13px solid transparent',
            borderTop: '26px solid #fbbf24',
            filter: 'drop-shadow(0 2px 8px rgba(251,191,36,0.8))',
          }} />
          <div style={{ filter: 'drop-shadow(0 0 36px rgba(251,191,36,0.12))' }}>
            <WheelSVG rotation={rotation} />
          </div>
        </div>
        {result && !spinning && (
          <div className={`w-full text-center px-4 py-3 rounded-xl font-semibold text-sm ${
            result.seg.mult >= 2 ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400' :
            result.seg.mult > 0  ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400' :
                                   'bg-red-500/15 border border-red-500/30 text-red-400'
          }`}>
            {result.seg.mult === 0   && '😔 Dommage… Bonne chance au prochain tour !'}
            {result.seg.mult === 0.4 && `🟠 ×0.4 — Vous récupérez ${result.win.toFixed(4)} TON`}
            {result.seg.mult === 1   && `🟡 ×1 — Mise récupérée : ${result.win.toFixed(4)} TON`}
            {result.seg.mult === 2   && `🟢 ×2 — Vous doublez ! +${result.win.toFixed(4)} TON`}
            {result.seg.mult === 3   && `🎉 ×3 — Excellent ! +${result.win.toFixed(4)} TON`}
            {result.seg.mult === 5   && `💎 ×5 — Incroyable ! +${result.win.toFixed(4)} TON`}
          </div>
        )}
      </div>

      {/* Bet controls */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400 font-medium">Mise</span>
          <span className="text-slate-600">Min 0.01 · Max 50 TON</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => adj(-0.01)} className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all">
            <Minus className="w-4 h-4" />
          </button>
          <input type="number" value={bet} min={0.01} max={50} step={0.01}
            onChange={e => { const v = +e.target.value; if (!isNaN(v)) setBet(Math.max(0.01, Math.min(50, v))); }}
            className="flex-1 bg-transparent text-center text-xl font-bold text-white outline-none" />
          <button onClick={() => adj(0.01)} className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {/* Presets + ½ ×2 */}
        <div className="grid grid-cols-8 gap-1.5">
          <button onClick={() => setBet(p => Math.max(0.01, +(p / 2).toFixed(3)))}
            className="col-span-1 py-1.5 rounded-lg text-xs font-bold bg-white/5 text-slate-400 hover:bg-white/10 transition-colors">½</button>
          {WHEEL_PRESETS.map(q => (
            <button key={q} onClick={() => setBet(q)}
              className={`col-span-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                bet === q ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40' : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}>{q}</button>
          ))}
          <button onClick={() => setBet(p => Math.min(50, +(p * 2).toFixed(3)))}
            className="col-span-1 py-1.5 rounded-lg text-xs font-bold bg-white/5 text-slate-400 hover:bg-white/10 transition-colors">×2</button>
        </div>
        <button onClick={spin} disabled={!canSpin}
          className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            canSpin
              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-amber-950 hover:from-amber-400 hover:to-yellow-400 active:scale-[0.98] shadow-lg shadow-amber-500/25'
              : 'bg-white/5 text-slate-600 cursor-not-allowed'
          }`}>
          {spinning ? <><RotateCcw className="w-4 h-4 animate-spin" /> La roue tourne…</>
            : currentUser.balanceMain < 0.01 ? 'Solde insuffisant'
            : <><Zap className="w-4 h-4" /> Tourner ({effBet.toFixed(2)} TON)</>}
        </button>
      </div>

      {/* Prize table */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Gains possibles · mise {effBet.toFixed(2)} TON
        </h3>
        <div className="space-y-1.5">
          {([
            { label: '×10', note: 'Jackpot · décoration', val: null,       color: 'text-purple-400/50 line-through', bg: 'bg-purple-500/5' },
            { label: '×5',  note: 'Très rare',            val: pf(5),      color: 'text-teal-400',    bg: 'bg-teal-500/10' },
            { label: '×3',  note: 'Rare',                 val: pf(3),      color: 'text-blue-400',    bg: 'bg-blue-500/10' },
            { label: '×2',  note: '',                     val: pf(2),      color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: '×1',  note: 'Remboursé',            val: pf(1),      color: 'text-amber-400',   bg: 'bg-amber-500/10' },
            { label: '×0.4',note: 'Retour partiel',       val: pf(0.4),    color: 'text-orange-400',  bg: 'bg-orange-500/10' },
            { label: 'PERDU',note: '',                    val: null,       color: 'text-red-400',     bg: 'bg-red-500/10' },
          ] as const).map(row => (
            <div key={row.label} className={`flex items-center justify-between px-3 py-1.5 rounded-lg ${row.bg}`}>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${row.color}`}>{row.label}</span>
                {row.note ? <span className="text-[10px] text-slate-600">{row.note}</span> : null}
              </div>
              <span className="text-sm text-white font-mono">{row.val != null ? `+${row.val} TON` : '—'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
// PENALTY KICK
// ══════════════════════════════════════════════════════════════════

const PENALTY_ZONES = [
  { id: 0, col: 0, row: 0, label: '↖', hint: 'Gauche haut' },
  { id: 1, col: 1, row: 0, label: '↑', hint: 'Centre haut' },
  { id: 2, col: 2, row: 0, label: '↗', hint: 'Droite haut' },
  { id: 3, col: 0, row: 1, label: '↙', hint: 'Gauche bas'  },
  { id: 4, col: 1, row: 1, label: '↓', hint: 'Centre bas'  },
  { id: 5, col: 2, row: 1, label: '↘', hint: 'Droite bas'  },
] as const;

const BALL_TARGETS: Record<number, { x: number; y: number }> = {
  0: { x: 22, y: 16 }, 1: { x: 50, y: 16 }, 2: { x: 78, y: 16 },
  3: { x: 22, y: 44 }, 4: { x: 50, y: 44 }, 5: { x: 78, y: 44 },
};

// Streak-adaptive save probability
function saveProbability(streak: number): number {
  return streak >= 2 ? 0.72 : streak >= 1 ? 0.60 : 0.52;
}

const PENALTY_WIN_MULT  = 1.8;
const PENALTY_PRESETS   = [0.01, 0.05, 0.1, 0.5, 1, 5];
type PenaltyPhase = 'idle' | 'flying' | 'result';

const PenaltyGame: React.FC<{ onBack: () => void; streak: number; onResult: OnResult }> = ({ onBack, streak, onResult }) => {
  const { currentUser, placeGameBet } = useAppStore();
  const [bet, setBet]         = useState(0.01);
  const [phase, setPhase]     = useState<PenaltyPhase>('idle');
  const [ballPos, setBallPos] = useState({ x: 50, y: 77 });
  const [ballScale, setBallScale] = useState(1);
  const [ballRot, setBallRot] = useState(0);
  const [keeperX, setKeeperX] = useState(50);
  const [keeperTilt, setKeeperTilt] = useState(0); // deg rotation for dive
  const [outcome, setOutcome] = useState<{ goal: boolean; win: number } | null>(null);

  const effBet   = Math.min(bet, currentUser.balanceMain);
  const canShoot = phase === 'idle' && effBet >= 0.01 && currentUser.balanceMain >= 0.01;
  const adj = (d: number) => setBet(p => Math.max(0.01, Math.min(50, +(p + d).toFixed(3))));

  const shoot = (zoneId: number) => {
    if (!canShoot) return;
    const sp     = saveProbability(streak);
    const scored = Math.random() > sp;
    const col    = PENALTY_ZONES[zoneId].col;

    let kx: number;
    let tilt: number;
    if (!scored) {
      // Keeper goes correct side
      kx    = col === 0 ? 18 : col === 1 ? 50 : 82;
      tilt  = col === 0 ? -28 : col === 1 ? -10 : 28;
    } else {
      // Keeper dives wrong side
      const other = ([0, 1, 2] as const).filter(c => c !== col);
      const miss  = other[Math.floor(Math.random() * other.length)];
      kx    = miss === 0 ? 18 : miss === 1 ? 50 : 82;
      tilt  = miss === 0 ? -28 : miss === 1 ? -10 : 28;
    }

    setBallPos(BALL_TARGETS[zoneId]);
    setBallScale(0.35);
    setBallRot(scored ? 720 : 360);
    setKeeperX(kx);
    setKeeperTilt(tilt);
    setPhase('flying');

    const used = effBet;
    const win  = scored ? +(used * PENALTY_WIN_MULT).toFixed(6) : 0;

    setTimeout(() => {
      setOutcome({ goal: scored, win });
      setPhase('result');
      placeGameBet(used, win);
      onResult(scored);
    }, 950);
  };

  const reset = () => {
    setBallPos({ x: 50, y: 77 }); setBallScale(1); setBallRot(0);
    setKeeperX(50); setKeeperTilt(0); setPhase('idle'); setOutcome(null);
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h2 className="text-base font-bold text-white">Penalty Kick ⚽</h2>
          <p className="text-[11px] text-slate-500">Choisissez votre angle · ×{PENALTY_WIN_MULT} si but</p>
        </div>
        <div className="glass-card px-3 py-1.5 text-right">
          <p className="text-[10px] text-slate-500 uppercase">Solde</p>
          <p className="text-sm font-bold text-white">{currentUser.balanceMain.toFixed(3)} TON</p>
        </div>
      </div>

      {/* Field */}
      <div className="relative rounded-2xl overflow-hidden select-none"
        style={{ height: 290, background: 'linear-gradient(180deg, #052e16 0%, #16a34a 45%, #15803d 100%)' }}>

        {/* Grass lines */}
        {[28, 52, 76].map(p => (
          <div key={p} className="absolute left-0 right-0" style={{ top: `${p}%`, height: 1, background: 'rgba(255,255,255,0.07)' }} />
        ))}

        {/* Crowd silhouette */}
        <div className="absolute top-0 left-0 right-0" style={{ height: 28, overflow: 'hidden' }}>
          {Array.from({ length: 18 }, (_, i) => (
            <div key={i} className="absolute rounded-full" style={{
              left: `${i * 6}%`, bottom: 0,
              width: 16, height: 18 + (i % 3) * 4,
              background: i % 3 === 0 ? '#1e3a8a' : i % 3 === 1 ? '#7c3aed' : '#065f46',
              opacity: 0.6,
            }} />
          ))}
        </div>

        {/* Goal */}
        <div className="absolute" style={{ top: 28, left: 26, right: 26, height: 162 }}>
          <div className="absolute inset-0" style={{
            background: 'rgba(0,0,0,0.50)',
            backgroundImage: `
              repeating-linear-gradient(0deg,  rgba(255,255,255,0.06) 0, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 22px),
              repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 22px)
            `,
          }} />
          <div className="absolute inset-0 border-t-[4px] border-l-[4px] border-r-[4px] border-white/95 rounded-t-sm" />
          <div className="absolute left-0 right-0" style={{ top: 4, height: 5, background: 'rgba(0,0,0,0.28)' }} />
        </div>

        {/* Goalkeeper with dive tilt */}
        <div className="absolute pointer-events-none"
          style={{
            left: `${keeperX}%`, top: 32,
            transform: `translateX(-50%) rotate(${keeperTilt}deg)`,
            transformOrigin: 'bottom center',
            transition: 'left 0.45s cubic-bezier(0.4, 0, 0.2, 1), transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
          <svg width="52" height="62" viewBox="0 0 52 62" style={{ overflow: 'visible' }}>
            {/* Head */}
            <circle cx="26" cy="12" r="11" fill="#fbbf24" />
            {/* Hair */}
            <ellipse cx="26" cy="4" rx="9" ry="5" fill="#92400e" />
            {/* Eyes */}
            <circle cx="22" cy="12" r="2" fill="#1e293b" />
            <circle cx="30" cy="12" r="2" fill="#1e293b" />
            {/* Jersey */}
            <rect x="13" y="22" width="26" height="22" rx="4" fill="#84cc16" />
            {/* Jersey stripe */}
            <rect x="24" y="22" width="4" height="22" fill="#65a30d" opacity="0.5" />
            {/* Left arm + glove */}
            <rect x="-9" y="23" width="23" height="8" rx="4" fill="#84cc16" />
            <ellipse cx="-11" cy="27" rx="9" ry="7" fill="#166534" />
            {/* Right arm + glove */}
            <rect x="38" y="23" width="23" height="8" rx="4" fill="#84cc16" />
            <ellipse cx="63" cy="27" rx="9" ry="7" fill="#166534" />
            {/* Shorts */}
            <rect x="14" y="43" width="24" height="12" rx="2" fill="#1e3a5f" />
            {/* Legs */}
            <rect x="14" y="44" width="9" height="14" rx="3" fill="#1d4ed8" />
            <rect x="29" y="44" width="9" height="14" rx="3" fill="#1d4ed8" />
            {/* Shoes */}
            <rect x="12" y="55" width="13" height="5" rx="2" fill="#0f172a" />
            <rect x="27" y="55" width="13" height="5" rx="2" fill="#0f172a" />
          </svg>
        </div>

        {/* Ball */}
        <div className="absolute pointer-events-none" style={{
          left: `${ballPos.x}%`, top: `${ballPos.y}%`,
          transform: `translateX(-50%) translateY(-50%) scale(${ballScale}) rotate(${ballRot}deg)`,
          transition: 'left 0.85s cubic-bezier(0.2,0.8,0.3,1), top 0.85s cubic-bezier(0.2,0.8,0.3,1), transform 0.85s ease',
          fontSize: 30, lineHeight: 1,
        }}>⚽</div>

        {/* Penalty spot */}
        <div className="absolute rounded-full" style={{
          left: '50%', top: '70%', width: 7, height: 7,
          marginLeft: -3.5, background: 'rgba(255,255,255,0.45)',
        }} />

        {/* Result overlay */}
        {outcome && (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: outcome.goal ? 'rgba(16,185,129,0.3)' : 'rgba(220,38,38,0.3)' }}>
            <div className={`text-center px-7 py-5 rounded-2xl border shadow-2xl ${
              outcome.goal ? 'bg-emerald-950/95 border-emerald-500/60' : 'bg-red-950/95 border-red-500/60'
            }`}>
              <p className="text-5xl mb-2">{outcome.goal ? '⚽' : '🧤'}</p>
              <p className="text-2xl font-black text-white mb-1">{outcome.goal ? 'BUT !!!' : 'ARRÊTÉ !'}</p>
              <p className={`text-sm font-semibold ${outcome.goal ? 'text-emerald-400' : 'text-red-400'}`}>
                {outcome.goal ? `+${outcome.win.toFixed(4)} TON` : `−${effBet.toFixed(4)} TON`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Direction buttons */}
      {phase === 'idle' && (
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 text-center mb-3 font-medium">Choisissez votre angle de tir</p>
          <div className="grid grid-cols-3 gap-2">
            {PENALTY_ZONES.map(z => (
              <button key={z.id} onClick={() => shoot(z.id)} disabled={!canShoot}
                className={`py-3 rounded-xl text-sm font-bold transition-all active:scale-95 flex flex-col items-center gap-0.5 ${
                  canShoot
                    ? 'bg-white/8 border border-white/20 text-white hover:bg-emerald-500/20 hover:border-emerald-500/50'
                    : 'bg-white/5 border border-white/10 text-slate-600 cursor-not-allowed'
                }`}>
                <span className="text-lg leading-none">{z.label}</span>
                <span className="text-[10px] text-slate-400 leading-none">{z.hint}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'result' && (
        <button onClick={reset}
          className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:from-emerald-500 hover:to-green-500 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
          <RotateCcw className="w-4 h-4" /> Rejouer
        </button>
      )}

      {/* Bet controls */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400 font-medium">Mise</span>
          <span className="text-slate-500">
            But = <span className="text-emerald-400 font-semibold">+{(effBet * PENALTY_WIN_MULT).toFixed(4)} TON</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => adj(-0.01)} className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all">
            <Minus className="w-4 h-4" />
          </button>
          <input type="number" value={bet} min={0.01} max={50} step={0.01}
            onChange={e => { const v = +e.target.value; if (!isNaN(v)) setBet(Math.max(0.01, Math.min(50, v))); }}
            className="flex-1 bg-transparent text-center text-xl font-bold text-white outline-none" />
          <button onClick={() => adj(0.01)} className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-8 gap-1.5">
          <button onClick={() => setBet(p => Math.max(0.01, +(p / 2).toFixed(3)))}
            className="col-span-1 py-1.5 rounded-lg text-xs font-bold bg-white/5 text-slate-400 hover:bg-white/10">½</button>
          {PENALTY_PRESETS.map(q => (
            <button key={q} onClick={() => setBet(q)}
              className={`col-span-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                bet === q ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40' : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}>{q}</button>
          ))}
          <button onClick={() => setBet(p => Math.min(50, +(p * 2).toFixed(3)))}
            className="col-span-1 py-1.5 rounded-lg text-xs font-bold bg-white/5 text-slate-400 hover:bg-white/10">×2</button>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
// CRASH
// ══════════════════════════════════════════════════════════════════

// Streak-adaptive crash point
function rollCrash(streak: number): number {
  const he = streak >= 2 ? 0.68 : streak >= 1 ? 0.80 : 0.90;
  const r  = Math.random();
  if (r < (1 - he)) return 1.0;
  return Math.max(1.01, +(he / (1 - r)).toFixed(2));
}

const CRASH_INIT_HIST = [2.43, 1.00, 5.67, 1.23, 8.91, 1.00, 3.14, 1.87, 12.0, 1.00];
const CRASH_PRESETS   = [0.01, 0.1, 0.5, 1, 2, 5, 10, 50];

// Fake live bets updated each round
const CRASH_PLAYERS = ['Marco T.', 'Léa R.', 'Yusuf K.', 'Chen W.', 'Amira S.', 'Dmytro P.'];

type CrashPhase = 'waiting' | 'flying' | 'crashed';
type LiveBet = { user: string; bet: number; cashout: number | null; color: string };

const PLAYER_COLORS = ['text-blue-400', 'text-purple-400', 'text-amber-400', 'text-emerald-400', 'text-pink-400', 'text-teal-400'];

const CrashGame: React.FC<{ onBack: () => void; streak: number; onResult: OnResult }> = ({ onBack, streak, onResult }) => {
  const { currentUser, placeGameBet } = useAppStore();
  const [bet, setBet]              = useState(0.01);
  const [autoCash, setAutoCash]    = useState('');   // empty = no auto-cashout
  const [phase, setPhase]          = useState<CrashPhase>('waiting');
  const [mult, setMult]            = useState(1.00);
  const [crashAt, setCrashAt]      = useState(2.00);
  const [cashedOut, setCashedOut]  = useState<number | null>(null);
  const [history, setHistory]      = useState<number[]>(CRASH_INIT_HIST);
  const [liveBets, setLiveBets]    = useState<LiveBet[]>([]);
  const [flash, setFlash]          = useState<'win' | 'lose' | null>(null);
  const intervalRef                = useRef<ReturnType<typeof setInterval> | null>(null);
  const multRef                    = useRef(1.00);
  const cashedRef                  = useRef<number | null>(null);
  const activeBetRef               = useRef(0);

  const effBet   = Math.min(bet, currentUser.balanceMain);
  const canBet   = phase === 'waiting' && effBet >= 0.01 && currentUser.balanceMain >= 0.01;
  const canCash  = phase === 'flying' && cashedRef.current === null;
  const adj = (d: number) => setBet(p => Math.max(0.01, Math.min(50, +(p + d).toFixed(3))));

  const startRound = () => {
    if (!canBet) return;
    const crash = rollCrash(streak);
    setCrashAt(crash);
    activeBetRef.current = effBet;
    multRef.current = 1.00;
    cashedRef.current = null;
    setMult(1.00);
    setCashedOut(null);
    setFlash(null);
    setPhase('flying');

    // Fake live bets for this round
    const fakes: LiveBet[] = CRASH_PLAYERS.map((u, i) => ({
      user: u,
      bet: +(Math.random() * 4 + 0.1).toFixed(2),
      cashout: null,
      color: PLAYER_COLORS[i],
    }));
    setLiveBets(fakes);

    intervalRef.current = setInterval(() => {
      multRef.current = +(multRef.current * 1.012).toFixed(2);
      setMult(multRef.current);

      // Auto-cashout
      const ac = parseFloat(autoCash);
      if (!isNaN(ac) && ac >= 1.01 && cashedRef.current === null && multRef.current >= ac) {
        doFlushCashout(multRef.current);
      }

      // Fake players randomly cash out
      setLiveBets(prev => prev.map(p => {
        if (p.cashout !== null) return p;
        if (Math.random() < 0.06) return { ...p, cashout: multRef.current };
        return p;
      }));

      if (multRef.current >= crash) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setPhase('crashed');
        if (cashedRef.current === null) {
          placeGameBet(activeBetRef.current, 0);
          onResult(false);
          setFlash('lose');
          setTimeout(() => setFlash(null), 600);
        }
        setHistory(h => [crash, ...h.slice(0, 11)]);
        setLiveBets(prev => prev.map(p => ({ ...p, cashout: p.cashout ?? null })));
      }
    }, 80);
  };

  const doFlushCashout = (m: number) => {
    cashedRef.current = m;
    setCashedOut(m);
    const win = +(activeBetRef.current * m).toFixed(6);
    placeGameBet(activeBetRef.current, win);
    onResult(true);
    setFlash('win');
    setTimeout(() => setFlash(null), 600);
  };

  const cashout = () => {
    if (!canCash) return;
    doFlushCashout(multRef.current);
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const reset = () => { setPhase('waiting'); setMult(1.00); setCashedOut(null); cashedRef.current = null; setLiveBets([]); };

  // SVG trail
  const svgW = 300, svgH = 110;
  const pct  = phase === 'waiting' ? 0 : Math.min(0.97, (mult - 1) / Math.max(1, crashAt - 1));
  const tx   = 18 + pct * (svgW - 36);
  const ty   = svgH - 12 - pct * (svgH - 22);
  const crashed = phase === 'crashed' && cashedOut === null;
  const trailColor = crashed ? '#ef4444' : '#22c55e';

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h2 className="text-base font-bold text-white">Crash 🚀</h2>
          <p className="text-[11px] text-slate-500">Encaissez avant que la fusée explose !</p>
        </div>
        <div className="glass-card px-3 py-1.5 text-right">
          <p className="text-[10px] text-slate-500 uppercase">Solde</p>
          <p className="text-sm font-bold text-white">{currentUser.balanceMain.toFixed(3)} TON</p>
        </div>
      </div>

      {/* History */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {history.slice(0, 10).map((h, i) => (
          <span key={i} className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
            h <= 1.5 ? 'bg-red-500/25 text-red-400' :
            h <= 3   ? 'bg-amber-500/25 text-amber-400' :
                       'bg-emerald-500/25 text-emerald-400'
          }`}>{h.toFixed(2)}×</span>
        ))}
      </div>

      {/* Main display */}
      <div className="relative rounded-2xl overflow-hidden" style={{
        height: 210,
        background: 'linear-gradient(135deg, #07071a 0%, #0f0c29 55%, #08091c 100%)',
        border: flash === 'win' ? '1.5px solid rgba(34,197,94,0.7)' :
                flash === 'lose' ? '1.5px solid rgba(239,68,68,0.7)' :
                '1.5px solid rgba(255,255,255,0.05)',
        transition: 'border-color 0.15s',
      }}>
        {/* Stars */}
        {Array.from({ length: 24 }, (_, i) => (
          <div key={i} className="absolute rounded-full bg-white" style={{
            left: `${(i * 41 + 7) % 100}%`, top: `${(i * 37 + 9) % 75}%`,
            width: i % 5 === 0 ? 2 : 1, height: i % 5 === 0 ? 2 : 1,
            opacity: 0.15 + (i % 4) * 0.1,
          }} />
        ))}
        {/* Trail */}
        <svg width="100%" height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}
          preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, left: 0 }}>
          {phase !== 'waiting' && (
            <>
              <defs>
                <linearGradient id="cGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={trailColor} stopOpacity="0.05" />
                  <stop offset="100%" stopColor={trailColor} stopOpacity="0.9" />
                </linearGradient>
              </defs>
              <path
                d={`M 18 ${svgH - 4} C ${tx * 0.4} ${svgH - 4} ${tx * 0.7} ${ty + 20} ${tx} ${ty}`}
                stroke="url(#cGrad)" strokeWidth="2.5" fill="none" strokeLinecap="round"
              />
              {/* Rocket dot */}
              <circle cx={tx} cy={ty} r={crashed ? 7 : 5}
                fill={trailColor} opacity={crashed ? 0.7 : 1}
                style={{ filter: `drop-shadow(0 0 ${crashed ? '12px' : '8px'} ${trailColor})` }}
              />
            </>
          )}
        </svg>
        {/* Big multiplier */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            {crashed ? (
              <>
                <p className="text-5xl font-black text-red-400 tabular-nums">{crashAt.toFixed(2)}×</p>
                <p className="text-red-400 text-sm font-bold mt-1">💥 CRASH !</p>
              </>
            ) : cashedOut !== null ? (
              <>
                <p className="text-4xl font-black text-emerald-400 tabular-nums">{cashedOut.toFixed(2)}×</p>
                <p className="text-emerald-300 text-sm font-bold mt-1">
                  +{(activeBetRef.current * cashedOut).toFixed(4)} TON ✓
                </p>
              </>
            ) : (
              <>
                <p className={`text-5xl font-black tabular-nums transition-colors duration-150 ${
                  mult >= 5 ? 'text-teal-400' :
                  mult >= 2 ? 'text-emerald-400' :
                  mult >= 1.5 ? 'text-amber-400' : 'text-white'
                }`}>{mult.toFixed(2)}×</p>
                <p className={`text-xs mt-1 ${phase === 'waiting' ? 'text-slate-600' : 'text-slate-400'}`}>
                  {phase === 'waiting' ? 'Prêt à lancer' : '🚀 En vol…'}
                </p>
                {phase === 'flying' && autoCash && !isNaN(parseFloat(autoCash)) && (
                  <p className="text-[10px] text-blue-400 mt-0.5">Auto-encaissement à ×{parseFloat(autoCash).toFixed(2)}</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cashout CTA */}
      {canCash && (
        <button onClick={cashout}
          className="w-full py-4 rounded-xl font-black text-lg bg-gradient-to-r from-emerald-500 to-green-400 text-emerald-950 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/30"
          style={{ animation: 'pulse 1s infinite' }}>
          ENCAISSER · {(activeBetRef.current * mult).toFixed(4)} TON
        </button>
      )}

      {/* Live bets */}
      {liveBets.length > 0 && (
        <div className="glass-card p-3">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <p className="text-xs font-semibold text-slate-400">Joueurs en ligne</p>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {liveBets.map((lb, i) => (
              <div key={i} className="flex items-center justify-between text-[10px] bg-white/4 rounded-lg px-2 py-1">
                <span className={lb.color}>{lb.user}</span>
                <span className={`font-bold ${lb.cashout !== null ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {lb.cashout !== null ? `×${lb.cashout.toFixed(2)}` : `${lb.bet} TON`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bet controls */}
      {(phase === 'waiting' || phase === 'crashed') && (
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center gap-3">
            <button onClick={() => adj(-0.01)} className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all">
              <Minus className="w-4 h-4" />
            </button>
            <input type="number" value={bet} min={0.01} max={50} step={0.01}
              onChange={e => { const v = +e.target.value; if (!isNaN(v)) setBet(Math.max(0.01, Math.min(50, v))); }}
              className="flex-1 bg-transparent text-center text-xl font-bold text-white outline-none" />
            <button onClick={() => adj(0.01)} className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {CRASH_PRESETS.map(q => (
              <button key={q} onClick={() => setBet(q)}
                className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  bet === q ? 'bg-blue-500/30 text-blue-300 border border-blue-500/40' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}>{q}</button>
            ))}
          </div>
          {/* Auto-cashout */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 flex-shrink-0">Auto-enc. ×</span>
            <input
              type="number" value={autoCash} placeholder="ex: 2.00" min={1.01} step={0.01}
              onChange={e => setAutoCash(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-blue-500/40 placeholder-slate-600"
            />
            {autoCash && (
              <button onClick={() => setAutoCash('')} className="text-[10px] text-slate-500 hover:text-white px-2">✕</button>
            )}
          </div>
          {phase === 'crashed' ? (
            <button onClick={reset} className="w-full py-3 rounded-xl font-bold text-sm bg-white/10 text-white hover:bg-white/15 transition-colors flex items-center justify-center gap-2">
              <RotateCcw className="w-4 h-4" /> Nouvelle partie
            </button>
          ) : (
            <button onClick={startRound} disabled={!canBet}
              className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                canBet
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] shadow-lg shadow-blue-500/20'
                  : 'bg-white/5 text-slate-600 cursor-not-allowed'
              }`}>
              <Zap className="w-4 h-4" />
              {currentUser.balanceMain < 0.01 ? 'Solde insuffisant' : `Lancer · ${effBet.toFixed(2)} TON`}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
// MINES
// ══════════════════════════════════════════════════════════════════

const GRID_COLS = 5, GRID_ROWS = 4, GRID_SIZE = 20;
const MINES_OPTIONS = [3, 5, 10] as const;
type MinesCount = (typeof MINES_OPTIONS)[number];

// mult_k = 0.97 / combinatorial probability
function minesMult(n: number, k: number): number {
  if (k === 0) return 1.0;
  let p = 1;
  for (let i = 0; i < k; i++) p *= (GRID_SIZE - n - i) / (GRID_SIZE - i);
  return +(0.97 / p).toFixed(2);
}

// Streak-adaptive: secretly add 1-2 mines after wins
function effectiveMines(selected: MinesCount, streak: number): number {
  const extra = streak >= 2 ? 2 : streak >= 1 ? 1 : 0;
  return Math.min(GRID_SIZE - 2, selected + extra);
}

type MinesPhase = 'waiting' | 'playing' | 'won' | 'lost';

const MinesGame: React.FC<{ onBack: () => void; streak: number; onResult: OnResult }> = ({ onBack, streak, onResult }) => {
  const { currentUser, placeGameBet } = useAppStore();
  const [bet, setBet]             = useState(0.01);
  const [mineCount, setMineCount] = useState<MinesCount>(3);
  const [phase, setPhase]         = useState<MinesPhase>('waiting');
  const [minePos, setMinePos]     = useState<Set<number>>(new Set());
  const [revealed, setRevealed]   = useState<Set<number>>(new Set());
  const [safeCount, setSafeCount] = useState(0);
  const [hinting, setHinting]     = useState(false);
  const activeBetRef              = useRef(0);
  const effMinesRef               = useRef<number>(mineCount);

  const effBet   = Math.min(bet, currentUser.balanceMain);
  // Use visible mineCount for display, effective for game logic
  const curMult  = minesMult(mineCount, safeCount); // display uses visible
  const curWin   = +(activeBetRef.current * curMult).toFixed(6);
  const nextMult = minesMult(mineCount, safeCount + 1);
  const adj = (d: number) => setBet(p => Math.max(0.01, Math.min(50, +(p + d).toFixed(3))));

  const startGame = () => {
    if (effBet < 0.01 || currentUser.balanceMain < 0.01) return;
    const effM = effectiveMines(mineCount, streak);
    effMinesRef.current = effM;
    const arr = Array.from({ length: GRID_SIZE }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setMinePos(new Set(arr.slice(0, effM)));
    setRevealed(new Set());
    setSafeCount(0);
    setHinting(false);
    activeBetRef.current = effBet;
    setPhase('playing');
  };

  const revealTile = (idx: number) => {
    if (phase !== 'playing' || revealed.has(idx)) return;
    const nr = new Set(revealed).add(idx);
    setRevealed(nr);
    if (minePos.has(idx)) {
      setPhase('lost');
      placeGameBet(activeBetRef.current, 0);
      onResult(false);
    } else {
      const ns = safeCount + 1;
      setSafeCount(ns);
      if (ns === GRID_SIZE - effMinesRef.current) {
        const win = +(activeBetRef.current * minesMult(mineCount, ns)).toFixed(6);
        placeGameBet(activeBetRef.current, win);
        onResult(true);
        setPhase('won');
      }
    }
  };

  const hint = () => {
    if (phase !== 'playing' || hinting) return;
    // Reveal a random safe unrevealed tile; costs 10% of current bet
    const safe = Array.from({ length: GRID_SIZE }, (_, i) => i)
      .filter(i => !minePos.has(i) && !revealed.has(i));
    if (safe.length === 0) return;
    const pick = safe[Math.floor(Math.random() * safe.length)];
    setHinting(true);
    // flash the hint tile briefly then mark revealed
    setTimeout(() => {
      revealTile(pick);
      setHinting(false);
    }, 600);
    // Deduct hint cost silently (10% of bet)
    const cost = +(activeBetRef.current * 0.10).toFixed(6);
    placeGameBet(cost, 0);
  };

  const cashout = () => {
    if (phase !== 'playing' || safeCount === 0) return;
    placeGameBet(activeBetRef.current, curWin);
    onResult(true);
    setPhase('won');
  };

  const reset = () => { setPhase('waiting'); setRevealed(new Set()); setMinePos(new Set()); setSafeCount(0); setHinting(false); };

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h2 className="text-base font-bold text-white">Mines 💣</h2>
          <p className="text-[11px] text-slate-500">Évitez les mines · Encaissez au bon moment</p>
        </div>
        <div className="glass-card px-3 py-1.5 text-right">
          <p className="text-[10px] text-slate-500 uppercase">Solde</p>
          <p className="text-sm font-bold text-white">{currentUser.balanceMain.toFixed(3)} TON</p>
        </div>
      </div>

      {/* Live gain bar */}
      {phase === 'playing' && (
        <div className="glass-card p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 uppercase">Gain actuel</p>
            <p className="text-lg font-black text-emerald-400">{curWin.toFixed(4)} TON</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-slate-500 uppercase">Multiplicateur</p>
            <p className="text-lg font-black text-white">{curMult.toFixed(2)}×</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase">Prochain</p>
            <p className="text-lg font-black text-amber-400">{nextMult.toFixed(2)}×</p>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` }}>
        {Array.from({ length: GRID_SIZE }, (_, idx) => {
          const isMine = minePos.has(idx);
          const isRev  = revealed.has(idx);
          const showBoom  = isRev && isMine;
          const showGem   = isRev && !isMine;
          const showGhost = (phase === 'lost' || phase === 'won') && isMine && !isRev;
          return (
            <button key={idx} onClick={() => revealTile(idx)}
              disabled={phase !== 'playing' || isRev}
              style={{ aspectRatio: '1' }}
              className={`rounded-xl text-xl flex items-center justify-center transition-all active:scale-95 select-none ${
                showBoom  ? 'bg-red-500/35 border-2 border-red-500/70' :
                showGem   ? 'bg-emerald-500/30 border-2 border-emerald-500/50' :
                showGhost ? 'bg-red-500/12 border border-red-500/20 opacity-50' :
                phase === 'playing'
                  ? 'bg-white/8 border border-white/18 hover:bg-white/18 hover:border-white/40 cursor-pointer'
                  : 'bg-white/5 border border-white/8 cursor-default'
              }`}
            >
              {showBoom ? '💣' : showGem ? '💎' : showGhost ? '💣' : null}
            </button>
          );
        })}
      </div>

      {/* Waiting controls */}
      {phase === 'waiting' && (
        <div className="glass-card p-4 space-y-3">
          <div>
            <p className="text-xs text-slate-500 mb-2">Nombre de mines</p>
            <div className="grid grid-cols-3 gap-2">
              {MINES_OPTIONS.map(n => (
                <button key={n} onClick={() => setMineCount(n)}
                  className={`py-2 rounded-lg text-sm font-bold transition-colors ${
                    mineCount === n ? 'bg-red-500/30 text-red-300 border border-red-500/40' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}>{n} 💣</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => adj(-0.01)} className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all">
              <Minus className="w-4 h-4" />
            </button>
            <input type="number" value={bet} min={0.01} max={50} step={0.01}
              onChange={e => { const v = +e.target.value; if (!isNaN(v)) setBet(Math.max(0.01, Math.min(50, v))); }}
              className="flex-1 bg-transparent text-center text-xl font-bold text-white outline-none" />
            <button onClick={() => adj(0.01)} className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[0.01, 0.1, 0.5, 1, 2, 5, 10, 50].map(q => (
              <button key={q} onClick={() => setBet(q)}
                className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  bet === q ? 'bg-red-500/30 text-red-300 border border-red-500/40' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}>{q}</button>
            ))}
          </div>
          <button onClick={startGame}
            disabled={effBet < 0.01 || currentUser.balanceMain < 0.01}
            className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              effBet >= 0.01 && currentUser.balanceMain >= 0.01
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-500 hover:to-rose-500 active:scale-[0.98] shadow-lg shadow-red-500/20'
                : 'bg-white/5 text-slate-600 cursor-not-allowed'
            }`}>
            💣 Commencer · {effBet.toFixed(2)} TON
          </button>
        </div>
      )}

      {/* Playing controls */}
      {phase === 'playing' && (
        <div className="flex gap-2">
          {safeCount > 0 && (
            <button onClick={cashout}
              className="flex-1 py-3 rounded-xl font-black text-sm bg-gradient-to-r from-emerald-500 to-green-400 text-emerald-950 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/25">
              ENCAISSER · {curWin.toFixed(4)} TON
            </button>
          )}
          <button onClick={hint}
            disabled={hinting || currentUser.balanceMain < activeBetRef.current * 0.1}
            className={`${safeCount > 0 ? 'w-14' : 'flex-1'} py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-1 ${
              hinting ? 'bg-blue-500/30 text-blue-300 animate-pulse' :
              'bg-blue-500/15 border border-blue-500/25 text-blue-400 hover:bg-blue-500/25'
            }`}>
            {safeCount > 0 ? '💡' : <>💡 Indice (−10%)</>}
          </button>
        </div>
      )}

      {/* End state */}
      {(phase === 'won' || phase === 'lost') && (
        <div className={`glass-card p-4 text-center space-y-2 ${
          phase === 'won' ? 'border border-emerald-500/30' : 'border border-red-500/30'
        }`}>
          <p className="text-3xl">{phase === 'won' ? '💎' : '💥'}</p>
          <p className="text-lg font-black text-white">
            {phase === 'won' ? `+${curWin.toFixed(4)} TON` : `−${activeBetRef.current.toFixed(4)} TON`}
          </p>
          <p className="text-sm text-slate-400">
            {phase === 'won'
              ? `${safeCount} cases sûres · ×${curMult.toFixed(2)}`
              : 'Mine ! Dommage…'}
          </p>
          <button onClick={reset}
            className="w-full py-2.5 rounded-xl font-bold text-sm bg-white/10 text-white hover:bg-white/15 transition-colors flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4" /> Rejouer
          </button>
        </div>
      )}

      {/* Multiplier table */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Table des gains · {mineCount} mines
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          {Array.from({ length: Math.min(8, GRID_SIZE - mineCount) }, (_, k) => {
            const kk = k + 1;
            const m  = minesMult(mineCount, kk);
            return (
              <div key={kk} className={`flex items-center justify-between px-3 py-1.5 rounded-lg transition-colors ${
                kk <= safeCount && phase !== 'waiting' ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-white/5'
              }`}>
                <span className="text-xs text-slate-400">{kk} case{kk > 1 ? 's' : ''}</span>
                <span className="text-sm font-bold text-white">{m.toFixed(2)}×</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════
// LIVE FEED
// ══════════════════════════════════════════════════════════════════

type FeedEntry = { username: string; bet: number; win: number; mult: number; game: string; time: string };

const FEED_DATA: FeedEntry[] = [
  { username: 'Marco T.',   bet: 5.0,  win: 25.0, mult: 5,    game: 'Roue',    time: '1m'  },
  { username: 'Léa R.',     bet: 0.1,  win: 0.18, mult: 1.8,  game: 'Penalty', time: '4m'  },
  { username: 'Yusuf K.',   bet: 10.0, win: 0.0,  mult: 0,    game: 'Crash',   time: '8m'  },
  { username: 'Chen W.',    bet: 1.0,  win: 2.0,  mult: 2,    game: 'Roue',    time: '13m' },
  { username: 'Amira S.',   bet: 0.5,  win: 1.28, mult: 2.56, game: 'Crash',   time: '21m' },
  { username: 'Dmytro P.',  bet: 0.05, win: 0.0,  mult: 0,    game: 'Mines',   time: '29m' },
  { username: 'Fatou D.',   bet: 2.0,  win: 6.0,  mult: 3,    game: 'Roue',    time: '37m' },
  { username: 'Nicolás V.', bet: 0.1,  win: 0.1,  mult: 1,    game: 'Penalty', time: '46m' },
];

// ══════════════════════════════════════════════════════════════════
// GAMES HUB
// ══════════════════════════════════════════════════════════════════

type ActiveGame = 'wheel' | 'penalty' | 'crash' | 'mines' | null;

const CATALOG = [
  {
    id: 'wheel' as ActiveGame,
    title: 'Roue de la Fortune',
    desc: 'Faites tourner la roue · Gagnez jusqu\'à ×5',
    emoji: '🎡',
    color: 'bg-amber-500/15 border-amber-500/25',
    btnCls: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-amber-950 shadow-amber-500/20',
    stats: '~29% avantage · ×5 max',
  },
  {
    id: 'penalty' as ActiveGame,
    title: 'Penalty Kick',
    desc: 'Tirez au but · Marquez pour ×1.8',
    emoji: '⚽',
    color: 'bg-emerald-500/15 border-emerald-500/25',
    btnCls: 'bg-gradient-to-r from-emerald-600 to-green-500 text-white shadow-emerald-500/20',
    stats: '~14% avantage · ×1.8',
  },
  {
    id: 'crash' as ActiveGame,
    title: 'Crash',
    desc: 'Multipliez avant le crash · Sans limite',
    emoji: '🚀',
    color: 'bg-blue-500/15 border-blue-500/25',
    btnCls: 'bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow-blue-500/20',
    stats: '~10% avantage · illimité',
  },
  {
    id: 'mines' as ActiveGame,
    title: 'Mines',
    desc: 'Évitez les mines · Encaissez au bon moment',
    emoji: '💣',
    color: 'bg-red-500/15 border-red-500/25',
    btnCls: 'bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-red-500/20',
    stats: '~3% avantage · multipliers élevés',
  },
] as const;

export const MiniAppGames: React.FC = () => {
  const { currentUser } = useAppStore();
  const [activeGame, setActiveGame] = useState<ActiveGame>(null);
  const [streak, setStreak]         = useState(0);

  const handleResult = (won: boolean) => setStreak(s => won ? s + 1 : 0);

  if (activeGame === 'wheel')   return <WheelGame   onBack={() => setActiveGame(null)} streak={streak} onResult={handleResult} />;
  if (activeGame === 'penalty') return <PenaltyGame onBack={() => setActiveGame(null)} streak={streak} onResult={handleResult} />;
  if (activeGame === 'crash')   return <CrashGame   onBack={() => setActiveGame(null)} streak={streak} onResult={handleResult} />;
  if (activeGame === 'mines')   return <MinesGame   onBack={() => setActiveGame(null)} streak={streak} onResult={handleResult} />;

  return (
    <div className="space-y-5 animate-slide-up pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Jeux</h1>
          <p className="text-xs text-slate-400 mt-0.5">Misez des TON · Tentez votre chance</p>
        </div>
        <div className="glass-card px-3 py-2 text-right">
          <p className="text-[10px] text-slate-500 uppercase">Solde</p>
          <p className="text-sm font-bold text-white">{currentUser.balanceMain.toFixed(3)} TON</p>
        </div>
      </div>

        {/* Game catalog */}
        <div className="space-y-3">
          {CATALOG.map((game, i) => (
            <div key={i} className="glass-card p-4">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 border ${game.color}`}>
                  {game.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white">{game.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5 leading-snug">{game.desc}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">{game.stats}</p>
                </div>
                <button onClick={() => setActiveGame(game.id)}
                  className={`flex-shrink-0 px-4 py-2 font-bold text-sm rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-md ${game.btnCls}`}>
                  Jouer
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Live activity feed */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Activité récente</h3>
          </div>
          <div className="space-y-2">
            {FEED_DATA.map((f, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                <div className="flex items-center gap-2.5">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    f.mult >= 3 ? 'bg-emerald-500/25 text-emerald-300' :
                    f.mult > 0  ? 'bg-amber-500/20 text-amber-300' :
                                  'bg-red-500/15 text-red-500'
                  }`}>{f.mult > 0 ? `×${f.mult}` : '✗'}</span>
                  <div>
                    <p className="text-sm text-white leading-none">{f.username}</p>
                    <p className="text-[10px] text-slate-600">{f.game}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-semibold ${
                    f.win > f.bet ? 'text-emerald-400' :
                    f.win > 0     ? 'text-amber-400'   : 'text-slate-600'
                  }`}>
                    {f.win > 0 ? `+${f.win.toFixed(2)} TON` : `−${f.bet.toFixed(2)} TON`}
                  </span>
                  <p className="text-[10px] text-slate-600">{f.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info bar */}
        <div className="glass-card p-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Infos</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-white/5 rounded-xl py-3">
              <p className="text-base font-bold text-amber-400">0.01</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Mise min (TON)</p>
            </div>
            <div className="bg-white/5 rounded-xl py-3">
              <p className="text-base font-bold text-teal-400">4 jeux</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Disponibles</p>
            </div>
            <div className="bg-white/5 rounded-xl py-3">
              <p className="text-base font-bold text-slate-300">50</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Mise max (TON)</p>
            </div>
          </div>
        </div>
    </div>
  );
};
