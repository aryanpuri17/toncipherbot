import React, { useRef, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { Minus, Plus, RotateCcw, Trophy, Zap } from 'lucide-react';

// ── Segments visuels ───────────────────────────────────────────────────────
type Segment = { label: string; multiplier: number; fill: string; text: string };

// 8 segments, alternance chaud/foncé + jackpot violet
const SEGMENTS: Segment[] = [
  { label: 'PERDU', multiplier: 0,   fill: '#78350f', text: '#fde68a' }, // 0
  { label: '×0.4',  multiplier: 0.4, fill: '#d97706', text: '#fff7ed' }, // 1
  { label: '×1',    multiplier: 1,   fill: '#f59e0b', text: '#1c0a00' }, // 2
  { label: 'PERDU', multiplier: 0,   fill: '#92400e', text: '#fde68a' }, // 3
  { label: '×3',    multiplier: 3,   fill: '#d97706', text: '#fff7ed' }, // 4
  { label: '×5',    multiplier: 5,   fill: '#f59e0b', text: '#1c0a00' }, // 5
  { label: 'PERDU', multiplier: 0,   fill: '#78350f', text: '#fde68a' }, // 6
  { label: '×10',   multiplier: 10,  fill: '#6d28d9', text: '#fde68a' }, // 7 – JACKPOT
];

// ── RNG pondéré — EV ≈ 0.73 → ~27% house edge ────────────────────────────
// Le ×10 JACKPOT est affiché sur la roue mais ne sort JAMAIS.
// Les autres prix sortent rarement — la maison gagne toujours en moyenne.
type Outcome = { multiplier: number; weight: number; segIndices: number[] };

const OUTCOMES: Outcome[] = [
  { multiplier: 0,   weight: 50, segIndices: [0, 3, 6] }, // 50% PERDU
  { multiplier: 0.4, weight: 22, segIndices: [1] },        // 22% récupère 40%
  { multiplier: 1,   weight: 15, segIndices: [2] },        // 15% remboursé
  { multiplier: 3,   weight: 8,  segIndices: [4] },        //  8% ×3
  { multiplier: 5,   weight: 5,  segIndices: [5] },        //  5% ×5
  // Segment 7 (×10) : présent sur la roue visuellement, probabilité = 0 → impossible
];

function pickOutcome(): Outcome {
  let r = Math.random() * 100;
  for (const o of OUTCOMES) {
    r -= o.weight;
    if (r <= 0) return o;
  }
  return OUTCOMES[0];
}

// ── SVG Wheel ──────────────────────────────────────────────────────────────
const CX = 150, CY = 150, R = 124;
const N = SEGMENTS.length;    // 8
const ANGLE = 360 / N;        // 45°

function polar(deg: number, r = R) {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

// Segment i centré à i*ANGLE° depuis le haut
function segPath(i: number): string {
  const s = polar(i * ANGLE - ANGLE / 2);
  const e = polar(i * ANGLE + ANGLE / 2);
  return `M ${CX} ${CY} L ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R} ${R} 0 0 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)} Z`;
}

const WheelSVG: React.FC<{ rotation: number }> = ({ rotation }) => {
  const studs = Array.from({ length: 16 }, (_, i) => polar(i * (360 / 16), R + 12));
  return (
    <svg
      width="280" height="280" viewBox="0 0 300 300"
      style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)', display: 'block' }}
    >
      <defs>
        <radialGradient id="jackpotGlow" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Couronne extérieure en bois */}
      <circle cx={CX} cy={CY} r={R + 20} fill="#78350f" />
      <circle cx={CX} cy={CY} r={R + 20} fill="none" stroke="#fbbf24" strokeWidth="2.5" />
      <circle cx={CX} cy={CY} r={R + 2}  fill="none" stroke="#fbbf24" strokeWidth="1.5" />

      {/* Rivets dorés */}
      {studs.map((p, i) => (
        <circle key={i} cx={p.x.toFixed(2)} cy={p.y.toFixed(2)} r={5.5}
          fill="#fbbf24" stroke="#92400e" strokeWidth="1.5" />
      ))}

      {/* Segments */}
      {SEGMENTS.map((seg, i) => {
        const midDeg = i * ANGLE;
        const tp = polar(midDeg, R * 0.61);
        const textRot = midDeg - 90;
        return (
          <g key={i}>
            <path d={segPath(i)} fill={seg.fill} stroke="#78350f" strokeWidth="1.5" />
            {seg.multiplier === 10 && <path d={segPath(i)} fill="url(#jackpotGlow)" />}
            <text
              x={tp.x.toFixed(2)} y={tp.y.toFixed(2)}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={seg.label.length > 3 ? 10 : 12} fontWeight="900" fill={seg.text}
              transform={`rotate(${textRot},${tp.x.toFixed(2)},${tp.y.toFixed(2)})`}
              style={{ userSelect: 'none', pointerEvents: 'none' }}
            >
              {seg.label}
            </text>
          </g>
        );
      })}

      {/* Moyeu central */}
      <circle cx={CX} cy={CY} r={26} fill="#78350f" stroke="#fbbf24" strokeWidth="2" />
      <circle cx={CX} cy={CY} r={18} fill="#92400e" />
      <circle cx={CX} cy={CY} r={10} fill="#fbbf24" opacity="0.25" />
    </svg>
  );
};

// ── Feed de gagnants fictifs ───────────────────────────────────────────────
type FakeWin = { username: string; bet: number; win: number; mult: number; ago: string };

const FAKE_FEED: FakeWin[] = [
  { username: '@cryptoking',  bet: 5.0,  win: 25.0,  mult: 5,   ago: '1 min' },
  { username: '@ton_hunter',  bet: 0.1,  win: 0.04,  mult: 0.4, ago: '4 min' },
  { username: '@whale_x',     bet: 10.0, win: 0.0,   mult: 0,   ago: '8 min' },
  { username: '@anon_777',    bet: 1.0,  win: 3.0,   mult: 3,   ago: '14 min' },
  { username: '@moon_bet',    bet: 0.5,  win: 0.5,   mult: 1,   ago: '20 min' },
  { username: '@diamond_hd',  bet: 0.05, win: 0.0,   mult: 0,   ago: '27 min' },
  { username: '@lucky_99',    bet: 2.0,  win: 20.0,  mult: 10,  ago: '35 min' },
  { username: '@tonmaster',   bet: 0.1,  win: 0.04,  mult: 0.4, ago: '42 min' },
  { username: '@big_spender', bet: 50.0, win: 0.0,   mult: 0,   ago: '51 min' },
  { username: '@crypto_pp',   bet: 0.5,  win: 1.5,   mult: 3,   ago: '59 min' },
];

// ── Composant principal ────────────────────────────────────────────────────
const MIN_BET = 0.01;
const MAX_BET = 50;
const BET_PRESETS = [0.01, 0.05, 0.1, 0.5, 1, 5];

export const MiniAppGames: React.FC = () => {
  const { currentUser, spinWheelBet } = useAppStore();
  const [bet, setBet] = useState(0.01);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const rotRef = useRef(0);
  const [result, setResult] = useState<{ seg: Segment; win: number } | null>(null);

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
    const outcome = pickOutcome();
    const segIdx = outcome.segIndices[Math.floor(Math.random() * outcome.segIndices.length)];

    // Amener le centre du segment segIdx sous le pointeur (haut = 0°)
    const target = (360 - segIdx * ANGLE + 360) % 360;
    const cur = rotRef.current % 360;
    let delta = target - cur;
    if (delta < 0) delta += 360;
    const newRot = rotRef.current + 5 * 360 + delta;
    rotRef.current = newRot;
    setRotation(newRot);
    setSpinning(true);
    setResult(null);

    const betUsed = Math.min(effectiveBet, currentUser.balanceMain);
    const win = +(betUsed * outcome.multiplier).toFixed(6);

    setTimeout(() => {
      setSpinning(false);
      spinWheelBet(betUsed, win);
      setResult({ seg: SEGMENTS[segIdx], win });
    }, 4500);
  };

  const prizeFor = (mult: number) => (effectiveBet * mult).toFixed(mult < 1 ? 4 : 3);

  return (
    <div className="space-y-5 animate-slide-up pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Roue de la Fortune</h1>
          <p className="text-xs text-slate-400 mt-0.5">Faites tourner la roue et gagnez des prix !</p>
        </div>
        <div className="glass-card px-3 py-2 text-right">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Solde</p>
          <p className="text-sm font-bold text-white">{currentUser.balanceMain.toFixed(3)} TON</p>
        </div>
      </div>

      {/* Wheel */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          {/* Pointeur fixe */}
          <div className="absolute z-10" style={{
            top: '-4px', left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '12px solid transparent',
            borderRight: '12px solid transparent',
            borderTop: '24px solid #f8fafc',
            filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.7))',
          }} />
          <div className="shadow-[0_0_48px_rgba(251,191,36,0.18)]">
            <WheelSVG rotation={rotation} />
          </div>
        </div>

        {/* Résultat */}
        {result && !spinning && (
          <div className={`w-full text-center px-4 py-3 rounded-xl font-semibold text-sm animate-fade-in ${
            result.seg.multiplier >= 3 ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400' :
            result.seg.multiplier > 0  ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400' :
                                         'bg-red-500/15 border border-red-500/30 text-red-400'
          }`}>
            {result.seg.multiplier === 0   && '😔 Dommage… Bonne chance au prochain tour !'}
            {result.seg.multiplier === 0.4 && `🟡 Vous récupérez 40% — +${result.win.toFixed(4)} TON`}
            {result.seg.multiplier === 1   && `🟡 Mise récupérée — +${result.win.toFixed(4)} TON`}
            {result.seg.multiplier === 3   && `🟢 ×3 — Vous gagnez ${result.win.toFixed(4)} TON !`}
            {result.seg.multiplier === 5   && `🎉 ×5 — Excellent ! +${result.win.toFixed(4)} TON`}
            {result.seg.multiplier === 10  && `🎰 JACKPOT ×10 — +${result.win.toFixed(4)} TON !!!`}
          </div>
        )}
      </div>

      {/* Mise & bouton */}
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

        {/* Paliers rapides — 2 rangées × 3 */}
        <div className="grid grid-cols-3 gap-2">
          {BET_PRESETS.map(q => (
            <button key={q} onClick={() => setBet(q)}
              className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                bet === q
                  ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}>
              {q} TON
            </button>
          ))}
        </div>

        <button onClick={handleSpin} disabled={!canSpin}
          className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            canSpin
              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-amber-950 hover:from-amber-400 hover:to-yellow-400 active:scale-[0.98] shadow-lg shadow-amber-500/25'
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

      {/* Tableau des gains dynamique selon la mise actuelle */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Gains possibles pour {effectiveBet.toFixed(2)} TON
        </h3>
        <div className="space-y-1.5">
          {[
            { label: '×10 JACKPOT', mult: 10,  cls: 'text-purple-400 bg-purple-500/10' },
            { label: '×5',          mult: 5,   cls: 'text-emerald-400 bg-emerald-500/8' },
            { label: '×3',          mult: 3,   cls: 'text-green-400 bg-green-500/8' },
            { label: '×1',          mult: 1,   cls: 'text-amber-400 bg-amber-500/8' },
            { label: '×0.4',        mult: 0.4, cls: 'text-orange-400 bg-orange-500/8' },
            { label: 'PERDU',       mult: 0,   cls: 'text-red-400 bg-red-500/8' },
          ].map(row => {
            const [tc, bg] = row.cls.split(' ');
            return (
              <div key={row.label} className={`flex items-center justify-between px-3 py-1.5 rounded-lg ${bg}`}>
                <span className={`text-sm font-bold ${tc}`}>{row.label}</span>
                <span className="text-sm text-white font-mono">
                  {row.mult > 0 ? `+${prizeFor(row.mult)} TON` : '—'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feed fictif */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">Derniers joueurs</h3>
        </div>
        <div className="space-y-2">
          {FAKE_FEED.map((w, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
              <div className="flex items-center gap-2.5">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  w.mult >= 10 ? 'bg-purple-500/30 text-purple-300' :
                  w.mult >= 3  ? 'bg-emerald-500/25 text-emerald-300' :
                  w.mult > 0   ? 'bg-amber-500/25 text-amber-300' :
                                 'bg-red-500/15 text-red-500'
                }`}>
                  {w.mult === 0 ? '✗' : `×${w.mult}`}
                </span>
                <span className="text-sm text-white">{w.username}</span>
              </div>
              <div className="text-right">
                <span className={`text-sm font-semibold ${
                  w.win > w.bet ? 'text-emerald-400' : w.win > 0 ? 'text-amber-400' : 'text-slate-600'
                }`}>
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
