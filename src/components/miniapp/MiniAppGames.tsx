import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { ArrowLeft, RotateCcw, Trophy, Zap } from 'lucide-react';

// ══════════════════════════════════════════════════════════════════
// SHARED TYPES & STREAK SYSTEM
// ══════════════════════════════════════════════════════════════════

type OnResult = (won: boolean) => void;

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
        <button key={l} onClick={handlers[l]}
          className="py-2.5 rounded-xl text-sm font-bold bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white transition-all">
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

function rollWheel(streak: number): { mult: number; idx: number[] } {
  const bonus = Math.min(28, streak * 10);
  const loseW = 42 + bonus;
  const f = (100 - loseW) / 58;
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
      <circle cx={CX} cy={CY} r={27} fill="url(#wHub)" stroke="#fbbf24" strokeWidth="2.5" />
      <circle cx={CX} cy={CY} r={18} fill="#1a0800" />
      <circle cx={CX} cy={CY} r={9}  fill="#fbbf24" opacity="0.25" />
    </svg>
  );
};

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
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Montant de la mise</p>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
          <input type="number" value={bet} min={0.01} max={50} step={0.01}
            onChange={e => { const v = +e.target.value; if (!isNaN(v)) setBet(Math.max(0.01, Math.min(50, v))); }}
            className="flex-1 bg-transparent text-xl font-bold text-white outline-none" />
          <span className="text-sm font-bold text-slate-500">TON</span>
        </div>
        <BetQuickButtons setBet={setBet} maxBal={currentUser.balanceMain} />
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
            { label: '×10', note: 'Jackpot · décoration', val: null,    color: 'text-purple-400/50 line-through', bg: 'bg-purple-500/5' },
            { label: '×5',  note: 'Très rare',            val: pf(5),   color: 'text-teal-400',    bg: 'bg-teal-500/10' },
            { label: '×3',  note: 'Rare',                 val: pf(3),   color: 'text-blue-400',    bg: 'bg-blue-500/10' },
            { label: '×2',  note: '',                     val: pf(2),   color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: '×1',  note: 'Remboursé',            val: pf(1),   color: 'text-amber-400',   bg: 'bg-amber-500/10' },
            { label: '×0.4',note: 'Retour partiel',       val: pf(0.4), color: 'text-orange-400',  bg: 'bg-orange-500/10' },
            { label: 'PERDU',note: '',                    val: null,    color: 'text-red-400',     bg: 'bg-red-500/10' },
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

function saveProbability(streak: number): number {
  return streak >= 2 ? 0.72 : streak >= 1 ? 0.60 : 0.52;
}

const PENALTY_WIN_MULT  = 1.8;
type PenaltyPhase = 'idle' | 'flying' | 'result';

const PenaltyGame: React.FC<{ onBack: () => void; streak: number; onResult: OnResult }> = ({ onBack, streak, onResult }) => {
  const { currentUser, placeGameBet } = useAppStore();
  const [bet, setBet]         = useState(0.01);
  const [phase, setPhase]     = useState<PenaltyPhase>('idle');
  const [ballPos, setBallPos] = useState({ x: 50, y: 77 });
  const [ballScale, setBallScale] = useState(1);
  const [ballRot, setBallRot] = useState(0);
  const [keeperX, setKeeperX] = useState(50);
  const [keeperTilt, setKeeperTilt] = useState(0);
  const [outcome, setOutcome] = useState<{ goal: boolean; win: number } | null>(null);

  const effBet   = Math.min(bet, currentUser.balanceMain);
  const canShoot = phase === 'idle' && effBet >= 0.01 && currentUser.balanceMain >= 0.01;

  const shoot = (zoneId: number) => {
    if (!canShoot) return;
    const sp     = saveProbability(streak);
    const scored = Math.random() > sp;
    const col    = PENALTY_ZONES[zoneId].col;

    let kx: number;
    let tilt: number;
    if (!scored) {
      kx    = col === 0 ? 18 : col === 1 ? 50 : 82;
      tilt  = col === 0 ? -28 : col === 1 ? -10 : 28;
    } else {
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

        {[28, 52, 76].map(p => (
          <div key={p} className="absolute left-0 right-0" style={{ top: `${p}%`, height: 1, background: 'rgba(255,255,255,0.07)' }} />
        ))}

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

        <div className="absolute pointer-events-none"
          style={{
            left: `${keeperX}%`, top: 32,
            transform: `translateX(-50%) rotate(${keeperTilt}deg)`,
            transformOrigin: 'bottom center',
            transition: 'left 0.45s cubic-bezier(0.4, 0, 0.2, 1), transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
          <svg width="52" height="62" viewBox="0 0 52 62" style={{ overflow: 'visible' }}>
            <circle cx="26" cy="12" r="11" fill="#fbbf24" />
            <ellipse cx="26" cy="4" rx="9" ry="5" fill="#92400e" />
            <circle cx="22" cy="12" r="2" fill="#1e293b" />
            <circle cx="30" cy="12" r="2" fill="#1e293b" />
            <rect x="13" y="22" width="26" height="22" rx="4" fill="#84cc16" />
            <rect x="24" y="22" width="4" height="22" fill="#65a30d" opacity="0.5" />
            <rect x="-9" y="23" width="23" height="8" rx="4" fill="#84cc16" />
            <ellipse cx="-11" cy="27" rx="9" ry="7" fill="#166534" />
            <rect x="38" y="23" width="23" height="8" rx="4" fill="#84cc16" />
            <ellipse cx="63" cy="27" rx="9" ry="7" fill="#166534" />
            <rect x="14" y="43" width="24" height="12" rx="2" fill="#1e3a5f" />
            <rect x="14" y="44" width="9" height="14" rx="3" fill="#1d4ed8" />
            <rect x="29" y="44" width="9" height="14" rx="3" fill="#1d4ed8" />
            <rect x="12" y="55" width="13" height="5" rx="2" fill="#0f172a" />
            <rect x="27" y="55" width="13" height="5" rx="2" fill="#0f172a" />
          </svg>
        </div>

        <div className="absolute pointer-events-none" style={{
          left: `${ballPos.x}%`, top: `${ballPos.y}%`,
          transform: `translateX(-50%) translateY(-50%) scale(${ballScale}) rotate(${ballRot}deg)`,
          transition: 'left 0.85s cubic-bezier(0.2,0.8,0.3,1), top 0.85s cubic-bezier(0.2,0.8,0.3,1), transform 0.85s ease',
          fontSize: 30, lineHeight: 1,
        }}>⚽</div>

        <div className="absolute rounded-full" style={{
          left: '50%', top: '70%', width: 7, height: 7,
          marginLeft: -3.5, background: 'rgba(255,255,255,0.45)',
        }} />

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
        <div className="flex justify-between items-center">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Montant de la mise</p>
          <span className="text-xs text-slate-500">
            But = <span className="text-emerald-400 font-semibold">+{(effBet * PENALTY_WIN_MULT).toFixed(4)} TON</span>
          </span>
        </div>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
          <input type="number" value={bet} min={0.01} max={50} step={0.01}
            onChange={e => { const v = +e.target.value; if (!isNaN(v)) setBet(Math.max(0.01, Math.min(50, v))); }}
            className="flex-1 bg-transparent text-xl font-bold text-white outline-none" />
          <span className="text-sm font-bold text-slate-500">TON</span>
        </div>
        <BetQuickButtons setBet={setBet} maxBal={currentUser.balanceMain} />
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
// CRASH
// ══════════════════════════════════════════════════════════════════

function rollCrash(streak: number): number {
  const he = streak >= 2 ? 0.68 : streak >= 1 ? 0.80 : 0.90;
  const r  = Math.random();
  if (r < (1 - he)) return 1.0;
  return Math.max(1.01, +(he / (1 - r)).toFixed(2));
}

const CRASH_INIT_HIST = [2.43, 1.00, 5.67, 1.23, 8.91, 1.00, 3.14, 1.87, 12.0, 1.00];
const CRASH_PLAYERS = ['Marco T.', 'Léa R.', 'Yusuf K.', 'Chen W.', 'Amira S.', 'Dmytro P.'];

type CrashPhase = 'waiting' | 'flying' | 'crashed';
type LiveBet = { user: string; bet: number; cashout: number | null; color: string };

const PLAYER_COLORS = ['text-blue-400', 'text-purple-400', 'text-amber-400', 'text-emerald-400', 'text-pink-400', 'text-teal-400'];

// Chart constants
const CHART_VB_W = 298, CHART_VB_H = 128;
const CHART_X0 = 38, CHART_Y0 = 8, CHART_W = 252, CHART_H = 108;
const Y_LABELS = [1.5, 2.5, 4.0, 6.5];
const X_TICKS  = [6, 12, 18, 24, 30]; // seconds

function multToY(m: number): number {
  return CHART_Y0 + CHART_H - Math.min(CHART_H, Math.max(0, (m - 1) / (8 - 1) * CHART_H));
}
function timeToX(ms: number): number {
  return CHART_X0 + Math.min(CHART_W, ms / 30000 * CHART_W);
}

const CrashGame: React.FC<{ onBack: () => void; streak: number; onResult: OnResult }> = ({ onBack, streak, onResult }) => {
  const { currentUser, placeGameBet } = useAppStore();
  const [bet, setBet]              = useState(0.01);
  const [autoCash, setAutoCash]    = useState('');
  const [phase, setPhase]          = useState<CrashPhase>('waiting');
  const [mult, setMult]            = useState(1.00);
  const [crashAt, setCrashAt]      = useState(2.00);
  const [cashedOut, setCashedOut]  = useState<number | null>(null);
  const [history, setHistory]      = useState<number[]>(CRASH_INIT_HIST);
  const [liveBets, setLiveBets]    = useState<LiveBet[]>([]);
  const [elapsed, setElapsed]      = useState(0);
  const [chartPath, setChartPath]  = useState('');
  const intervalRef                = useRef<ReturnType<typeof setInterval> | null>(null);
  const multRef                    = useRef(1.00);
  const cashedRef                  = useRef<number | null>(null);
  const activeBetRef               = useRef(0);
  const elapsedRef                 = useRef(0);
  const tickRef                    = useRef(0);
  const pathPointsRef              = useRef<Array<[number, number]>>([]);

  const effBet   = Math.min(bet, currentUser.balanceMain);
  const canBet   = phase === 'waiting' && effBet >= 0.01 && currentUser.balanceMain >= 0.01;
  const canCash  = phase === 'flying' && cashedRef.current === null;

  const startRound = () => {
    if (!canBet) return;
    const crash = rollCrash(streak);
    setCrashAt(crash);
    activeBetRef.current = effBet;
    multRef.current = 1.00;
    cashedRef.current = null;
    elapsedRef.current = 0;
    tickRef.current = 0;
    pathPointsRef.current = [[CHART_X0, CHART_Y0 + CHART_H]];
    setMult(1.00);
    setCashedOut(null);
    setElapsed(0);
    setChartPath(`M${CHART_X0},${CHART_Y0 + CHART_H}`);
    setPhase('flying');

    const fakes: LiveBet[] = CRASH_PLAYERS.map((u, i) => ({
      user: u,
      bet: +(Math.random() * 4 + 0.1).toFixed(2),
      cashout: null,
      color: PLAYER_COLORS[i],
    }));
    setLiveBets(fakes);

    intervalRef.current = setInterval(() => {
      elapsedRef.current += 80;
      multRef.current = +(multRef.current * 1.012).toFixed(2);
      tickRef.current += 1;
      setMult(multRef.current);
      setElapsed(elapsedRef.current);

      // Update chart path every 4 ticks
      if (tickRef.current % 4 === 0) {
        const x = timeToX(elapsedRef.current);
        const y = multToY(multRef.current);
        pathPointsRef.current.push([x, y]);
        const pts = pathPointsRef.current;
        if (pts.length >= 2) {
          let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
          for (let i = 1; i < pts.length; i++) {
            d += ` L${pts[i][0].toFixed(1)},${pts[i][1].toFixed(1)}`;
          }
          setChartPath(d);
        }
      }

      // Auto-cashout
      const ac = parseFloat(autoCash);
      if (!isNaN(ac) && ac >= 1.01 && cashedRef.current === null && multRef.current >= ac) {
        doFlushCashout(multRef.current);
      }

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
  };

  const cashout = () => {
    if (!canCash) return;
    doFlushCashout(multRef.current);
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const reset = () => {
    setPhase('waiting'); setMult(1.00); setCashedOut(null);
    cashedRef.current = null; setLiveBets([]);
    setChartPath(''); pathPointsRef.current = [];
  };

  const isCrashed = phase === 'crashed' && cashedOut === null;
  const curX = timeToX(elapsed);
  const curY = multToY(mult);

  // Build fill path (area under curve)
  const fillPath = chartPath
    ? `${chartPath} L${curX.toFixed(1)},${(CHART_Y0 + CHART_H).toFixed(1)} L${CHART_X0},${(CHART_Y0 + CHART_H).toFixed(1)} Z`
    : '';

  return (
    <div className="pb-4" style={{ background: '#060a18', minHeight: '100%' }}>
      <div style={{ background: '#0d1021', borderBottom: '1px solid #1e2847' }} className="px-4 pt-4 pb-3 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #1e2847' }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h2 className="text-base font-bold text-white">Crash 🚀</h2>
            <p className="text-[11px]" style={{ color: '#64748b' }}>Encaissez avant que la fusée explose !</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #1e2847' }} className="px-3 py-1.5 rounded-xl text-right">
            <p className="text-[10px] uppercase" style={{ color: '#64748b' }}>Solde</p>
            <p className="text-sm font-bold" style={{ color: '#f8fafc' }}>{currentUser.balanceMain.toFixed(3)} TON</p>
          </div>
        </div>

        {/* History chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {history.slice(0, 10).map((h, i) => (
            <span key={i} style={{
              flexShrink: 0, fontSize: 11, fontWeight: 700,
              padding: '2px 8px', borderRadius: 20,
              background: h < 2 ? 'rgba(239,68,68,0.18)' : h < 5 ? 'rgba(79,111,240,0.18)' : 'rgba(34,197,94,0.18)',
              color: h < 2 ? '#ef4444' : h < 5 ? '#818cf8' : '#22c55e',
            }}>
              ● {h.toFixed(2)}
            </span>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ background: '#060a18', position: 'relative', padding: '12px 0 8px' }}>
        <svg width="100%" viewBox={`0 0 ${CHART_VB_W} ${CHART_VB_H}`} preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block' }}>
          <defs>
            <linearGradient id="cFillGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.03" />
            </linearGradient>
            <linearGradient id="cFillRed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.03" />
            </linearGradient>
          </defs>

          {/* Background speed lines */}
          {Array.from({ length: 10 }, (_, i) => {
            const x1 = CHART_X0 + (i / 9) * CHART_W;
            return (
              <line key={i}
                x1={x1} y1={CHART_Y0 + CHART_H}
                x2={x1 + 30} y2={CHART_Y0}
                stroke="rgba(255,255,255,0.025)" strokeWidth="1" />
            );
          })}

          {/* Y-axis grid lines + labels */}
          {Y_LABELS.map(yv => {
            const y = multToY(yv);
            return (
              <g key={yv}>
                <line x1={CHART_X0} y1={y} x2={CHART_X0 + CHART_W} y2={y}
                  stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeDasharray="4,3" />
                <text x={CHART_X0 - 4} y={y + 4} textAnchor="end" fontSize="9" fill="#64748b">{yv.toFixed(1)}×</text>
              </g>
            );
          })}

          {/* X-axis ticks */}
          {X_TICKS.map(sec => {
            const x = timeToX(sec * 1000);
            return (
              <g key={sec}>
                <line x1={x} y1={CHART_Y0 + CHART_H} x2={x} y2={CHART_Y0 + CHART_H + 4}
                  stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                <text x={x} y={CHART_VB_H - 1} textAnchor="middle" fontSize="8" fill="#64748b">{sec}</text>
              </g>
            );
          })}

          {/* Bottom axis line */}
          <line x1={CHART_X0} y1={CHART_Y0 + CHART_H} x2={CHART_X0 + CHART_W} y2={CHART_Y0 + CHART_H}
            stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

          {/* Curve fill */}
          {fillPath && phase !== 'waiting' && (
            <path d={fillPath} fill={isCrashed ? 'url(#cFillRed)' : 'url(#cFillGreen)'} />
          )}

          {/* Curve stroke */}
          {chartPath && phase !== 'waiting' && (
            <path d={`${chartPath} L${curX.toFixed(1)},${curY.toFixed(1)}`}
              fill="none"
              stroke={isCrashed ? '#ef4444' : '#22c55e'}
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Rocket / explosion at tip */}
          {phase !== 'waiting' && (
            <text x={curX} y={curY - 4} textAnchor="middle" fontSize="14">
              {isCrashed ? '💥' : '🚀'}
            </text>
          )}

          {/* Big multiplier overlay */}
          <text x={CHART_X0 + CHART_W / 2} y={CHART_Y0 + CHART_H / 2 - 6} textAnchor="middle"
            fontSize="28" fontWeight="900"
            fill={isCrashed ? '#ef4444' : cashedOut !== null ? '#22c55e' : '#f8fafc'}
            style={{ fontVariantNumeric: 'tabular-nums' }}>
            {isCrashed ? `${crashAt.toFixed(2)}×` : `${mult.toFixed(2)}×`}
          </text>
          <text x={CHART_X0 + CHART_W / 2} y={CHART_Y0 + CHART_H / 2 + 14} textAnchor="middle"
            fontSize="11" fill={isCrashed ? '#ef4444' : cashedOut !== null ? '#22c55e' : '#64748b'}>
            {isCrashed ? '💥 CRASH !' : cashedOut !== null ? `✓ +${(activeBetRef.current * cashedOut).toFixed(4)} TON` : phase === 'flying' ? '🚀 En vol…' : 'Prêt à lancer'}
          </text>
        </svg>
      </div>

      {/* Cashout CTA */}
      {canCash && (
        <div className="px-4 pb-3">
          <button onClick={cashout}
            className="w-full py-4 rounded-xl font-black text-lg text-emerald-950 active:scale-[0.98] transition-all shadow-lg"
            style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: '0 4px 20px rgba(34,197,94,0.35)' }}>
            ENCAISSER · {(activeBetRef.current * mult).toFixed(4)} TON
          </button>
        </div>
      )}

      {/* Live players table */}
      {liveBets.length > 0 && (
        <div style={{ background: '#0d1021', border: '1px solid #1e2847' }} className="mx-4 rounded-xl overflow-hidden mb-3">
          <div style={{ borderBottom: '1px solid #1e2847' }} className="grid grid-cols-4 px-3 py-2">
            {['JOUEUR', '@', 'MISE', 'PROFIT'].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
            ))}
          </div>
          {/* Current user row */}
          <div style={{ background: 'rgba(79,111,240,0.12)', borderBottom: '1px solid #1e2847' }} className="grid grid-cols-4 px-3 py-2 items-center">
            <span style={{ fontSize: 12, fontWeight: 700, color: '#4f6ff0' }}>Vous</span>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              {cashedOut !== null ? `×${cashedOut.toFixed(2)}` : isCrashed ? '—' : '—'}
            </span>
            <span style={{ fontSize: 12, color: '#f8fafc' }}>{effBet.toFixed(2)}</span>
            <span style={{ fontSize: 12, fontWeight: 700 }}>
              {cashedOut !== null
                ? <span style={{ color: '#22c55e' }}>+{(activeBetRef.current * cashedOut - activeBetRef.current).toFixed(2)}</span>
                : isCrashed
                  ? <span style={{ color: '#ef4444' }}>-{activeBetRef.current.toFixed(2)}</span>
                  : <span style={{ color: '#4f6ff0' }}>En vol…</span>}
            </span>
          </div>
          {liveBets.map((lb, i) => (
            <div key={i} style={{ borderBottom: i < liveBets.length - 1 ? '1px solid rgba(30,40,71,0.5)' : 'none' }}
              className="grid grid-cols-4 px-3 py-2 items-center">
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{lb.user}</span>
              <span style={{ fontSize: 12, color: lb.cashout !== null ? '#22c55e' : isCrashed ? '#ef4444' : '#64748b' }}>
                {lb.cashout !== null ? `×${lb.cashout.toFixed(2)}` : isCrashed ? 'CRASH' : 'En vol…'}
              </span>
              <span style={{ fontSize: 12, color: '#f8fafc' }}>{lb.bet.toFixed(2)}</span>
              <span style={{ fontSize: 12, fontWeight: 700 }}>
                {lb.cashout !== null
                  ? <span style={{ color: '#22c55e' }}>+{(lb.bet * lb.cashout - lb.bet).toFixed(2)}</span>
                  : isCrashed
                    ? <span style={{ color: '#ef4444' }}>-{lb.bet.toFixed(2)}</span>
                    : <span style={{ color: '#4f6ff0' }}>…</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Bet controls */}
      <div style={{ background: '#0d1021', border: '1px solid #1e2847' }} className="mx-4 rounded-xl p-4 space-y-3">
        <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Montant de la mise</p>
        <div style={{ background: '#080c1e', border: '1px solid #1e2847', borderRadius: 12 }} className="flex items-center px-3 py-2.5">
          <input type="number" value={bet} min={0.01} max={50} step={0.01}
            onChange={e => { const v = +e.target.value; if (!isNaN(v)) setBet(Math.max(0.01, Math.min(50, v))); }}
            style={{ flex: 1, background: 'transparent', color: '#f8fafc', fontSize: 20, fontWeight: 700, outline: 'none', border: 'none' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>TON</span>
        </div>
        <BetQuickButtons setBet={setBet} maxBal={currentUser.balanceMain} />

        {/* Profit if won */}
        <div className="grid grid-cols-2 gap-2">
          <div style={{ background: '#080c1e', border: '1px solid #1e2847', borderRadius: 10 }} className="px-3 py-2">
            <p style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Profit si gagné</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#22c55e' }}>
              +{(effBet * (parseFloat(autoCash) || 2) - effBet).toFixed(4)} TON
            </p>
          </div>
          <div style={{ background: '#080c1e', border: '1px solid #1e2847', borderRadius: 10 }} className="px-3 py-2">
            <p style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Chance de gagner</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
              {Math.min(97, (97 / (parseFloat(autoCash) || 2))).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Auto cashout */}
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Encaissement auto (×)</p>
          <div style={{ background: '#080c1e', border: '1px solid #1e2847', borderRadius: 12 }} className="flex items-center px-3 py-2.5 gap-2">
            <input type="number" value={autoCash} placeholder="2.00" min={1.01} step={0.01}
              onChange={e => setAutoCash(e.target.value)}
              style={{ flex: 1, background: 'transparent', color: '#f8fafc', fontSize: 16, fontWeight: 600, outline: 'none', border: 'none' }} />
            {autoCash && (
              <button onClick={() => setAutoCash('')} style={{ color: '#64748b', fontSize: 13 }}>✕</button>
            )}
          </div>
        </div>

        {phase === 'crashed' ? (
          <button onClick={reset}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid #1e2847' }}
            className="w-full py-3 rounded-xl font-bold text-sm text-white hover:opacity-90 transition-all flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4" /> Nouvelle partie
          </button>
        ) : (
          <button onClick={startRound} disabled={!canBet}
            style={canBet ? {
              background: 'linear-gradient(135deg,#4f6ff0,#6366f1)',
              boxShadow: '0 4px 16px rgba(79,111,240,0.35)',
            } : { background: 'rgba(255,255,255,0.05)', cursor: 'not-allowed' }}
            className="w-full py-3.5 rounded-xl font-black text-sm text-white active:scale-[0.98] transition-all flex items-center justify-center gap-2 tracking-widest uppercase">
            {currentUser.balanceMain < 0.01 ? 'Solde insuffisant' : `Miser au prochain tour · ${effBet.toFixed(2)} TON`}
          </button>
        )}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
// MINES
// ══════════════════════════════════════════════════════════════════

const GRID_COLS = 5, GRID_ROWS = 4, GRID_SIZE = 20;

function minesMult(n: number, k: number): number {
  if (k === 0) return 1.0;
  let p = 1;
  for (let i = 0; i < k; i++) p *= (GRID_SIZE - n - i) / (GRID_SIZE - i);
  return +(0.97 / p).toFixed(2);
}

function effectiveMines(selected: number, streak: number): number {
  const extra = streak >= 2 ? 2 : streak >= 1 ? 1 : 0;
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
  const { currentUser, placeGameBet } = useAppStore();
  const [bet, setBet]             = useState(0.01);
  const [mineCount, setMineCount] = useState<number>(3);
  const [phase, setPhase]         = useState<MinesPhase>('waiting');
  const [minePos, setMinePos]     = useState<Set<number>>(new Set());
  const [revealed, setRevealed]   = useState<Set<number>>(new Set());
  const [safeCount, setSafeCount] = useState(0);
  const [hinting, setHinting]     = useState(false);
  const [feedTab, setFeedTab]     = useState<'all' | 'mine'>('all');
  const [feed, setFeed]           = useState<MinesFeedEntry[]>(MINES_FEED_INIT);
  const [myFeed, setMyFeed]       = useState<MinesFeedEntry[]>([]);
  const activeBetRef              = useRef(0);
  const effMinesRef               = useRef<number>(mineCount);

  const effBet   = Math.min(bet, currentUser.balanceMain);
  const curMult  = minesMult(mineCount, safeCount);
  const curWin   = +(activeBetRef.current * curMult).toFixed(6);
  const nextMult = minesMult(mineCount, safeCount + 1);
  const firstCaseMult = minesMult(mineCount, 1);
  const maxPossibleMult = minesMult(mineCount, GRID_SIZE - mineCount);

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
      const entry: MinesFeedEntry = { username: 'Vous', bet: activeBetRef.current, payout: 0, profit: -activeBetRef.current, mines: mineCount };
      setFeed(f => [entry, ...f.slice(0, 9)]);
      setMyFeed(f => [entry, ...f.slice(0, 9)]);
    } else {
      const ns = safeCount + 1;
      setSafeCount(ns);
      if (ns === GRID_SIZE - effMinesRef.current) {
        const win = +(activeBetRef.current * minesMult(mineCount, ns)).toFixed(6);
        placeGameBet(activeBetRef.current, win);
        onResult(true);
        setPhase('won');
        const entry: MinesFeedEntry = { username: 'Vous', bet: activeBetRef.current, payout: win, profit: +(win - activeBetRef.current).toFixed(4), mines: mineCount };
        setFeed(f => [entry, ...f.slice(0, 9)]);
        setMyFeed(f => [entry, ...f.slice(0, 9)]);
      }
    }
  };

  const hint = () => {
    if (phase !== 'playing' || hinting) return;
    const safe = Array.from({ length: GRID_SIZE }, (_, i) => i)
      .filter(i => !minePos.has(i) && !revealed.has(i));
    if (safe.length === 0) return;
    const pick = safe[Math.floor(Math.random() * safe.length)];
    setHinting(true);
    setTimeout(() => {
      revealTile(pick);
      setHinting(false);
    }, 600);
    const cost = +(activeBetRef.current * 0.10).toFixed(6);
    placeGameBet(cost, 0);
  };

  const cashout = () => {
    if (phase !== 'playing' || safeCount === 0) return;
    placeGameBet(activeBetRef.current, curWin);
    onResult(true);
    setPhase('won');
    const entry: MinesFeedEntry = { username: 'Vous', bet: activeBetRef.current, payout: curWin, profit: +(curWin - activeBetRef.current).toFixed(4), mines: mineCount };
    setFeed(f => [entry, ...f.slice(0, 9)]);
    setMyFeed(f => [entry, ...f.slice(0, 9)]);
  };

  const reset = () => { setPhase('waiting'); setRevealed(new Set()); setMinePos(new Set()); setSafeCount(0); setHinting(false); };

  const displayFeed = feedTab === 'all' ? feed : myFeed;

  return (
    <div className="pb-4" style={{ background: '#060a18', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ background: '#0d1021', borderBottom: '1px solid #1e2847' }} className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #1e2847' }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h2 className="text-base font-bold" style={{ color: '#f8fafc' }}>Mines 💣</h2>
            <p className="text-[11px]" style={{ color: '#64748b' }}>Évitez les mines · Encaissez au bon moment</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #1e2847' }} className="px-3 py-1.5 rounded-xl text-right">
            <p className="text-[10px] uppercase" style={{ color: '#64748b' }}>Solde</p>
            <p className="text-sm font-bold" style={{ color: '#f8fafc' }}>{currentUser.balanceMain.toFixed(3)} TON</p>
          </div>
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
                style={{
                  aspectRatio: '1',
                  background: showBoom ? 'rgba(239,68,68,0.3)' :
                               showGem  ? 'rgba(34,197,94,0.25)' :
                               showGhost ? 'rgba(239,68,68,0.08)' :
                               phase === 'playing' ? '#1a2240' : '#111830',
                  border: showBoom ? '2px solid rgba(239,68,68,0.6)' :
                          showGem  ? '2px solid rgba(34,197,94,0.45)' :
                          showGhost ? '1px solid rgba(239,68,68,0.2)' :
                          phase === 'playing' ? '1px solid #2a3a6e' : '1px solid #1e2847',
                  borderRadius: 12,
                  fontSize: 18,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s, border-color 0.15s, transform 0.1s',
                  cursor: phase === 'playing' && !isRev ? 'pointer' : 'default',
                  opacity: showGhost ? 0.5 : 1,
                }}
                onMouseEnter={e => { if (phase === 'playing' && !isRev) (e.currentTarget as HTMLButtonElement).style.background = '#243059'; }}
                onMouseLeave={e => { if (phase === 'playing' && !isRev) (e.currentTarget as HTMLButtonElement).style.background = '#1a2240'; }}
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
            <BetQuickButtons setBet={setBet} maxBal={currentUser.balanceMain} />

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
              disabled={effBet < 0.01 || currentUser.balanceMain < 0.01}
              style={effBet >= 0.01 && currentUser.balanceMain >= 0.01 ? {
                background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                boxShadow: '0 4px 16px rgba(239,68,68,0.3)',
              } : { background: 'rgba(255,255,255,0.05)', cursor: 'not-allowed' }}
              className="w-full py-3.5 rounded-xl font-black text-sm text-white active:scale-[0.98] transition-all tracking-widest uppercase">
              💣 Commencer · {effBet.toFixed(2)} TON
            </button>
          </div>
        )}

        {/* Playing controls */}
        {phase === 'playing' && (
          <div className="flex gap-2">
            {safeCount > 0 && (
              <button onClick={cashout}
                style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: '0 4px 16px rgba(34,197,94,0.3)' }}
                className="flex-1 py-3 rounded-xl font-black text-sm text-emerald-950 active:scale-[0.98] transition-all">
                ENCAISSER · {curWin.toFixed(4)} TON
              </button>
            )}
            <button onClick={hint}
              disabled={hinting || currentUser.balanceMain < activeBetRef.current * 0.1}
              style={{ background: 'rgba(79,111,240,0.12)', border: '1px solid rgba(79,111,240,0.25)' }}
              className={`${safeCount > 0 ? 'w-14' : 'flex-1'} py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-1 ${
                hinting ? 'animate-pulse' : ''
              }`}
              >
              <span style={{ color: '#4f6ff0' }}>{safeCount > 0 ? '💡' : '💡 Indice (−10%)'}</span>
            </button>
          </div>
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
    accent: '#f59e0b',
    borderColor: 'rgba(245,158,11,0.25)',
    bgColor: 'rgba(245,158,11,0.08)',
    btnGrad: 'linear-gradient(135deg,#f59e0b,#eab308)',
    btnText: '#451a03',
    stats: '~29% avantage · ×5 max',
  },
  {
    id: 'penalty' as ActiveGame,
    title: 'Penalty Kick',
    desc: 'Tirez au but · Marquez pour ×1.8',
    emoji: '⚽',
    accent: '#22c55e',
    borderColor: 'rgba(34,197,94,0.25)',
    bgColor: 'rgba(34,197,94,0.08)',
    btnGrad: 'linear-gradient(135deg,#22c55e,#16a34a)',
    btnText: '#052e16',
    stats: '~14% avantage · ×1.8',
  },
  {
    id: 'crash' as ActiveGame,
    title: 'Crash',
    desc: 'Multipliez avant le crash · Sans limite',
    emoji: '🚀',
    accent: '#4f6ff0',
    borderColor: 'rgba(79,111,240,0.25)',
    bgColor: 'rgba(79,111,240,0.08)',
    btnGrad: 'linear-gradient(135deg,#4f6ff0,#6366f1)',
    btnText: '#fff',
    stats: '~10% avantage · illimité',
  },
  {
    id: 'mines' as ActiveGame,
    title: 'Mines',
    desc: 'Évitez les mines · Encaissez au bon moment',
    emoji: '💣',
    accent: '#ef4444',
    borderColor: 'rgba(239,68,68,0.25)',
    bgColor: 'rgba(239,68,68,0.08)',
    btnGrad: 'linear-gradient(135deg,#ef4444,#dc2626)',
    btnText: '#fff',
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
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #1e2847' }} className="px-3 py-2 rounded-xl text-right">
          <p className="text-[10px] uppercase" style={{ color: '#64748b' }}>Solde</p>
          <p className="text-sm font-bold" style={{ color: '#f8fafc' }}>{currentUser.balanceMain.toFixed(3)} TON</p>
        </div>
      </div>

      {/* Game catalog */}
      <div className="space-y-3">
        {CATALOG.map((game, i) => (
          <div key={i} style={{ background: '#0d1021', border: `1px solid ${game.borderColor}`, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ background: game.bgColor, padding: '16px' }} className="flex items-center gap-4">
              <div style={{
                width: 56, height: 56, borderRadius: 14, flexShrink: 0,
                background: `rgba(0,0,0,0.3)`, border: `1px solid ${game.borderColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
              }}>
                {game.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#f8fafc', marginBottom: 2 }}>{game.title}</h3>
                <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.4 }}>{game.desc}</p>
                <p style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{game.stats}</p>
              </div>
              <button onClick={() => setActiveGame(game.id)}
                style={{
                  flexShrink: 0, padding: '10px 18px',
                  fontWeight: 800, fontSize: 13, borderRadius: 12,
                  background: game.btnGrad, color: game.btnText,
                  boxShadow: `0 4px 14px ${game.accent}40`,
                  cursor: 'pointer', transition: 'opacity 0.15s, transform 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}
                onMouseDown={e => (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.96)'}
                onMouseUp={e => (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'}
              >
                Jouer
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Live activity feed */}
      <div style={{ background: '#0d1021', border: '1px solid #1e2847', borderRadius: 16 }} className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4" style={{ color: '#f59e0b' }} />
          <h3 className="text-sm font-semibold" style={{ color: '#f8fafc' }}>Activité récente</h3>
        </div>
        <div className="space-y-2">
          {FEED_DATA.map((f, i) => (
            <div key={i} className="flex items-center justify-between py-1.5" style={{
              borderBottom: i < FEED_DATA.length - 1 ? '1px solid rgba(30,40,71,0.6)' : 'none',
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
                <p style={{ fontSize: 10, color: '#64748b' }}>{f.time}</p>
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
            <p style={{ fontSize: 15, fontWeight: 700, color: '#5eead4' }}>4 jeux</p>
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
