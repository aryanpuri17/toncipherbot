import React, { useRef, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { Minus, Plus, RotateCcw, Trophy, Zap } from 'lucide-react';

// ── Wheel segments (visual) ────────────────────────────────────────────────
type Segment = { label: string; multiplier: number; color: string };

const SEGMENTS: Segment[] = [
  { label: 'PERDU', multiplier: 0,   color: '#b91c1c' }, // 0 – top
  { label: '×0.5',  multiplier: 0.5, color: '#c2410c' }, // 1
  { label: 'PERDU', multiplier: 0,   color: '#7f1d1d' }, // 2
  { label: '×1.5',  multiplier: 1.5, color: '#92400e' }, // 3
  { label: 'PERDU', multiplier: 0,   color: '#b91c1c' }, // 4
  { label: '×2',    multiplier: 2,   color: '#15803d' }, // 5
  { label: 'PERDU', multiplier: 0,   color: '#7f1d1d' }, // 6
  { label: '×10',   multiplier: 10,  color: '#6d28d9' }, // 7
];

// ── Outcome logic ─────────────────────────────────────────────────────────
// Grand prizes are display only — the house always wins.
type OutcomeRule = { multiplier: number; segmentIndices: number[] };

const PERDU_RULE: OutcomeRule = { multiplier: 0, segmentIndices: [0, 2, 4, 6] };

function pickOutcome(): OutcomeRule {
  return PERDU_RULE;
}

// ── SVG Wheel ──────────────────────────────────────────────────────────────
const CX = 150, CY = 150, R = 138;
const N = SEGMENTS.length;
const ANGLE = 360 / N; // 45°

function polar(deg: number, r = R) {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

// Segment i is centered at i*ANGLE degrees from top (offset -ANGLE/2 → +ANGLE/2)
function segPath(i: number): string {
  const s = polar(i * ANGLE - ANGLE / 2);
  const e = polar(i * ANGLE + ANGLE / 2);
  return `M ${CX} ${CY} L ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R} ${R} 0 0 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)} Z`;
}

const WheelSVG: React.FC<{ rotation: number }> = ({ rotation }) => (
  <svg
    width="280" height="280" viewBox="0 0 300 300"
    style={{
      transform: `rotate(${rotation}deg)`,
      transition: 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)',
      display: 'block',
    }}
  >
    <defs>
      <radialGradient id="gJackpot" cx="50%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.45" />
        <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
      </radialGradient>
    </defs>

    {/* Decorative outer ring */}
    <circle cx={CX} cy={CY} r={R + 4} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="3" />

    {SEGMENTS.map((seg, i) => {
      const midDeg = i * ANGLE;
      const tp = polar(midDeg, R * 0.63);
      const textRot = midDeg - 90;
      return (
        <g key={i}>
          <path d={segPath(i)} fill={seg.color} stroke="#08081a" strokeWidth="2" />
          {seg.multiplier === 10 && (
            <path d={segPath(i)} fill="url(#gJackpot)" />
          )}
          <text
            x={tp.x} y={tp.y}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={11} fontWeight="800" fill="rgba(255,255,255,0.95)"
            transform={`rotate(${textRot},${tp.x},${tp.y})`}
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            {seg.label}
          </text>
        </g>
      );
    })}

    {/* Center hub */}
    <circle cx={CX} cy={CY} r={22} fill="#08081a" stroke="rgba(255,255,255,0.13)" strokeWidth="2" />
    <circle cx={CX} cy={CY} r={15} fill="#1e293b" />
  </svg>
);

// ── Winners ────────────────────────────────────────────────────────────────
type Winner = { username: string; bet: number; win: number; multiplier: number; ago: string };

const INITIAL_WINNERS: Winner[] = [
  { username: '@crypto_king',  bet: 5.0,  win: 50.0,  multiplier: 10,  ago: '2 min' },
  { username: '@ton_hunter',   bet: 2.0,  win: 4.0,   multiplier: 2,   ago: '7 min' },
  { username: '@whale_x',      bet: 1.0,  win: 1.5,   multiplier: 1.5, ago: '13 min' },
  { username: '@anon_777',     bet: 3.0,  win: 0.0,   multiplier: 0,   ago: '19 min' },
  { username: '@moon_bet',     bet: 0.5,  win: 1.0,   multiplier: 2,   ago: '28 min' },
  { username: '@diamond_hd',   bet: 10.0, win: 0.0,   multiplier: 0,   ago: '35 min' },
  { username: '@lucky_99',     bet: 1.5,  win: 2.25,  multiplier: 1.5, ago: '42 min' },
  { username: '@tonmaster',    bet: 0.5,  win: 0.25,  multiplier: 0.5, ago: '56 min' },
];

// ── Bet tiers ──────────────────────────────────────────────────────────────
const MIN_BET = 0.01;
const MAX_BET = 50;
const BET_PRESETS = [0.01, 0.05, 0.1, 0.5, 1, 5];

export const MiniAppGames: React.FC = () => {
  const { currentUser, spinWheelBet } = useAppStore();
  const [bet, setBet] = useState(0.01);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const rotRef = useRef(0);
  const [outcome, setOutcome] = useState<{ seg: Segment; win: number } | null>(null);
  const [winners, setWinners] = useState<Winner[]>(INITIAL_WINNERS);

  const effectiveBet = Math.min(bet, currentUser.balanceMain);
  const canSpin = !spinning && effectiveBet >= MIN_BET && currentUser.balanceMain >= MIN_BET;

  const adjustBet = (delta: number) => {
    setBet(prev => {
      const next = +(prev + delta).toFixed(3);
      return Math.max(MIN_BET, Math.min(MAX_BET, next));
    });
  };

  const handleSpin = () => {
    if (!canSpin) return;

    const rule = pickOutcome();
    const segIdx = rule.segmentIndices[Math.floor(Math.random() * rule.segmentIndices.length)];

    // Segment i is centered at i*ANGLE degrees from top.
    // To bring it to the pointer (top), rotate so that angle becomes 0.
    const target = (360 - segIdx * ANGLE + 360) % 360;
    const cur = rotRef.current % 360;
    let delta = target - cur;
    if (delta < 0) delta += 360;
    const newRot = rotRef.current + 5 * 360 + delta;
    rotRef.current = newRot;
    setRotation(newRot);
    setSpinning(true);
    setOutcome(null);

    const betUsed = Math.min(effectiveBet, currentUser.balanceMain);
    const win = +(betUsed * rule.multiplier).toFixed(6);

    setTimeout(() => {
      setSpinning(false);
      spinWheelBet(betUsed, win);
      setOutcome({ seg: SEGMENTS[segIdx], win });
      // Winners feed stays fabricated — no real wins are added
    }, 4500);
  };

  return (
    <div className="space-y-5 animate-slide-up pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Roue de la Fortune</h1>
          <p className="text-xs text-slate-400 mt-0.5">Misez et tentez votre chance</p>
        </div>
        <div className="glass-card px-3 py-2 text-right">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Solde</p>
          <p className="text-sm font-bold text-white">{currentUser.balanceMain.toFixed(3)} TON</p>
        </div>
      </div>

      {/* Wheel */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          {/* Fixed pointer at top */}
          <div
            className="absolute z-10"
            style={{
              top: '-2px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '10px solid transparent',
              borderRight: '10px solid transparent',
              borderTop: '20px solid #f8fafc',
              filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))',
            }}
          />
          <div className="w-[280px] h-[280px] rounded-full shadow-[0_0_48px_rgba(109,40,217,0.22)]">
            <WheelSVG rotation={rotation} />
          </div>
        </div>

        {/* Result */}
        {outcome && !spinning && (
          <div className={`w-full text-center px-4 py-3 rounded-xl font-semibold text-sm animate-fade-in ${
            outcome.seg.multiplier >= 2   ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400' :
            outcome.seg.multiplier > 0    ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400' :
                                            'bg-red-500/15 border border-red-500/30 text-red-400'
          }`}>
            {outcome.seg.multiplier === 0   && '😔 Dommage… Tentez encore votre chance !'}
            {outcome.seg.multiplier === 0.5 && `🟡 ×0.5 — ${outcome.win.toFixed(4)} TON récupérés`}
            {outcome.seg.multiplier === 1.5 && `🟢 ×1.5 — Vous gagnez ${outcome.win.toFixed(4)} TON !`}
            {outcome.seg.multiplier === 2   && `🎉 ×2 — Vous doublez ! +${outcome.win.toFixed(4)} TON`}
            {outcome.seg.multiplier === 10  && `🎰 JACKPOT ×10 — +${outcome.win.toFixed(4)} TON !!!`}
          </div>
        )}
      </div>

      {/* Bet & Spin */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Mise</span>
          <span className="text-slate-600">Min {MIN_BET} · Max {MAX_BET} TON</span>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => adjustBet(-0.01)}
            className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all">
            <Minus className="w-4 h-4" />
          </button>
          <input
            type="number" value={bet} min={MIN_BET} max={MAX_BET} step={0.01}
            onChange={e => { const v = +e.target.value; if (!isNaN(v)) setBet(Math.max(MIN_BET, Math.min(MAX_BET, v))); }}
            className="flex-1 bg-transparent text-center text-xl font-bold text-white outline-none"
          />
          <button onClick={() => adjustBet(0.01)}
            className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Quick bets — 6 paliers en 2 rangées */}
        <div className="grid grid-cols-3 gap-2">
          {BET_PRESETS.map(q => (
            <button key={q} onClick={() => setBet(q)}
              className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                bet === q ? 'bg-purple-500/30 text-purple-300 border border-purple-500/40' : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}>
              {q < 1 ? `${q} TON` : `${q} TON`}
            </button>
          ))}
        </div>

        <button onClick={handleSpin} disabled={!canSpin}
          className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            canSpin
              ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white hover:from-purple-500 hover:to-violet-500 active:scale-[0.98] shadow-lg shadow-purple-500/20'
              : 'bg-white/5 text-slate-600 cursor-not-allowed'
          }`}>
          {spinning
            ? <><RotateCcw className="w-4 h-4 animate-spin" /> La roue tourne…</>
            : currentUser.balanceMain < MIN_BET
            ? 'Solde insuffisant — Déposez des TON'
            : <><Zap className="w-4 h-4" /> Tourner ({effectiveBet.toFixed(2)} TON)</>
          }
        </button>
      </div>

      {/* Odds table */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Tableau des gains</h3>
        <div className="space-y-1.5">
          {[
            { label: '×10 JACKPOT', desc: 'Mise × 10',            cls: 'text-purple-400 bg-purple-500/10' },
            { label: '×2',          desc: 'Mise × 2',             cls: 'text-emerald-400 bg-emerald-500/8' },
            { label: '×1.5',        desc: 'Mise × 1.5',           cls: 'text-amber-400 bg-amber-500/8' },
            { label: '×0.5',        desc: 'Remboursement partiel', cls: 'text-orange-400 bg-orange-500/8' },
            { label: 'PERDU',       desc: 'Mise perdue',           cls: 'text-red-400 bg-red-500/8' },
          ].map(row => (
            <div key={row.label} className={`flex items-center justify-between px-3 py-1.5 rounded-lg ${row.cls.split(' ')[1]}`}>
              <span className={`text-sm font-bold ${row.cls.split(' ')[0]}`}>{row.label}</span>
              <span className="text-xs text-slate-500">{row.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Winners feed */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">Derniers joueurs</h3>
        </div>
        <div className="space-y-2">
          {winners.map((w, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
              <div className="flex items-center gap-2.5">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  w.multiplier >= 10 ? 'bg-purple-500/30 text-purple-300' :
                  w.multiplier >= 2  ? 'bg-emerald-500/25 text-emerald-300' :
                  w.multiplier > 0   ? 'bg-amber-500/25 text-amber-300' :
                                       'bg-red-500/15 text-red-500'
                }`}>
                  {w.multiplier === 0 ? '✗' : `×${w.multiplier}`}
                </span>
                <span className="text-sm text-white">{w.username}</span>
              </div>
              <div className="text-right">
                <span className={`text-sm font-semibold ${w.win > w.bet ? 'text-emerald-400' : w.win > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
                  {w.win > 0 ? `+${w.win.toFixed(2)} TON` : `−${w.bet.toFixed(2)} TON`}
                </span>
                <span className="text-[10px] text-slate-600 block">{w.ago}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
