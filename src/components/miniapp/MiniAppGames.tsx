import React, { useRef, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { ArrowLeft, Lock, Minus, Plus, RotateCcw, Trophy, Zap } from 'lucide-react';

// ══════════════════════════════════════════════════════════════════
// ROUE DE LA FORTUNE — Wheel game
// ══════════════════════════════════════════════════════════════════

// 10 segments (36° chacun)
// Segment 9 (×10 JACKPOT) : affiché sur la roue mais JAMAIS tiré au sort.
type Seg = { label: string; mult: number; fill: string; text: string };

const SEGS: Seg[] = [
  { label: 'PERDU', mult: 0,   fill: '#78350f', text: '#fde68a' }, // 0
  { label: '×0.4',  mult: 0.4, fill: '#c2410c', text: '#fff7ed' }, // 1
  { label: '×1',    mult: 1,   fill: '#d97706', text: '#fff7ed' }, // 2
  { label: 'PERDU', mult: 0,   fill: '#92400e', text: '#fde68a' }, // 3
  { label: '×2',    mult: 2,   fill: '#15803d', text: '#dcfce7' }, // 4
  { label: '×3',    mult: 3,   fill: '#1d4ed8', text: '#dbeafe' }, // 5
  { label: 'PERDU', mult: 0,   fill: '#78350f', text: '#fde68a' }, // 6
  { label: '×5',    mult: 5,   fill: '#0f766e', text: '#ccfbf1' }, // 7
  { label: 'PERDU', mult: 0,   fill: '#92400e', text: '#fde68a' }, // 8
  { label: '×10',   mult: 10,  fill: '#7c3aed', text: '#fde68a' }, // 9 → JAMAIS GAGNABLE
];

// ── Probabilités réelles (poids sum = 100) ──────────────────────
// EV = 0.4×0.22 + 1×0.18 + 2×0.12 + 3×0.05 + 5×0.01 = 0.708
// House edge ≈ 29%
// Segment 9 (×10) volontairement absent → probabilité réelle = 0
type Rule = { mult: number; weight: number; idx: number[] };

const RULES: Rule[] = [
  { mult: 0,   weight: 42, idx: [0, 3, 6, 8] }, // 42% PERDU
  { mult: 0.4, weight: 22, idx: [1] },            // 22% retour partiel
  { mult: 1,   weight: 18, idx: [2] },            // 18% remboursé
  { mult: 2,   weight: 12, idx: [4] },            // 12% ×2
  { mult: 3,   weight: 5,  idx: [5] },            //  5% ×3
  { mult: 5,   weight: 1,  idx: [7] },            //  1% ×5
  // idx:9 absent → segment ×10 jamais atteint
];
// Vérification : 42+22+18+12+5+1 = 100 ✓

function rollWheel(): Rule {
  let r = Math.random() * 100;
  for (const rule of RULES) {
    r -= rule.weight;
    if (r <= 0) return rule;
  }
  return RULES[0];
}

// ── Géométrie SVG ────────────────────────────────────────────────
const CX = 150, CY = 150, WRADIUS = 118;
const SEG_COUNT = SEGS.length;   // 10
const SEG_DEG = 360 / SEG_COUNT; // 36°

function pt(deg: number, r = WRADIUS) {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

// Segment i centré à i×36° depuis le haut
function arcPath(i: number): string {
  const s = pt(i * SEG_DEG - SEG_DEG / 2);
  const e = pt(i * SEG_DEG + SEG_DEG / 2);
  return `M${CX} ${CY} L${s.x.toFixed(2)} ${s.y.toFixed(2)} A${WRADIUS} ${WRADIUS} 0 0 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}Z`;
}

const WheelSVG: React.FC<{ rotation: number }> = ({ rotation }) => {
  // 20 rivets régulièrement espacés autour de la couronne
  const studs = Array.from({ length: 20 }, (_, i) => pt(i * 18, WRADIUS + 13));

  return (
    <svg
      width="280" height="280" viewBox="0 0 300 300"
      style={{
        transform: `rotate(${rotation}deg)`,
        transition: 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)',
        display: 'block',
      }}
    >
      <defs>
        <radialGradient id="jackpotGlow" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Couronne extérieure */}
      <circle cx={CX} cy={CY} r={WRADIUS + 20} fill="#78350f" />
      <circle cx={CX} cy={CY} r={WRADIUS + 20} fill="none" stroke="#fbbf24" strokeWidth="2.5" />
      <circle cx={CX} cy={CY} r={WRADIUS + 2}  fill="none" stroke="#fbbf24" strokeWidth="1.5" />

      {/* Rivets dorés */}
      {studs.map((p, i) => (
        <circle key={i} cx={p.x.toFixed(2)} cy={p.y.toFixed(2)}
          r={5} fill="#fbbf24" stroke="#92400e" strokeWidth="1.5" />
      ))}

      {/* Segments */}
      {SEGS.map((seg, i) => {
        const midDeg = i * SEG_DEG;
        const tp = pt(midDeg, WRADIUS * 0.62);
        const textRot = midDeg - 90;
        return (
          <g key={i}>
            <path d={arcPath(i)} fill={seg.fill} stroke="#78350f" strokeWidth="1.5" />
            {seg.mult === 10 && <path d={arcPath(i)} fill="url(#jackpotGlow)" />}
            <text
              x={tp.x.toFixed(2)} y={tp.y.toFixed(2)}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={seg.label.length > 3 ? 9 : 11}
              fontWeight="900" fill={seg.text}
              transform={`rotate(${textRot},${tp.x.toFixed(2)},${tp.y.toFixed(2)})`}
              style={{ userSelect: 'none', pointerEvents: 'none' }}
            >
              {seg.label}
            </text>
          </g>
        );
      })}

      {/* Moyeu central */}
      <circle cx={CX} cy={CY} r={25} fill="#78350f" stroke="#fbbf24" strokeWidth="2" />
      <circle cx={CX} cy={CY} r={17} fill="#92400e" />
      <circle cx={CX} cy={CY} r={9}  fill="#fbbf24" opacity="0.25" />
    </svg>
  );
};

// ── Feed fictif de joueurs ───────────────────────────────────────
type FeedEntry = { username: string; bet: number; win: number; mult: number; time: string };

const FAKE_FEED: FeedEntry[] = [
  { username: '@cryptoking',   bet: 5.0,  win: 25.0, mult: 5,   time: '1 min' },
  { username: '@ton_hunter',   bet: 0.1,  win: 0.04, mult: 0.4, time: '5 min' },
  { username: '@whale_x',      bet: 10.0, win: 0.0,  mult: 0,   time: '9 min' },
  { username: '@anon_777',     bet: 1.0,  win: 2.0,  mult: 2,   time: '15 min' },
  { username: '@moon_bet',     bet: 0.5,  win: 0.5,  mult: 1,   time: '22 min' },
  { username: '@diamond_hd',   bet: 0.05, win: 0.0,  mult: 0,   time: '30 min' },
  { username: '@lucky_99',     bet: 2.0,  win: 6.0,  mult: 3,   time: '38 min' },
  { username: '@tonmaster',    bet: 0.1,  win: 0.1,  mult: 1,   time: '47 min' },
  { username: '@big_spender',  bet: 50.0, win: 0.0,  mult: 0,   time: '56 min' },
];

// ── Composant Wheel Game ─────────────────────────────────────────
const MIN_BET = 0.01;
const MAX_BET = 50;
const BET_PRESETS = [0.01, 0.05, 0.1, 0.5, 1, 5];

const WheelGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { currentUser, spinWheelBet } = useAppStore();
  const [bet, setBet] = useState(0.01);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const rotRef = useRef(0);
  const [result, setResult] = useState<{ seg: Seg; win: number } | null>(null);

  const effectiveBet = Math.min(bet, currentUser.balanceMain);
  const canSpin = !spinning && effectiveBet >= MIN_BET && currentUser.balanceMain >= MIN_BET;

  const adjustBet = (delta: number) =>
    setBet(prev => Math.max(MIN_BET, Math.min(MAX_BET, +(prev + delta).toFixed(3))));

  const handleSpin = () => {
    if (!canSpin) return;

    const rule = rollWheel();
    const segIdx = rule.idx[Math.floor(Math.random() * rule.idx.length)];

    // Calcul de la rotation pour amener le centre du segment segIdx sous le pointeur (0° = haut)
    const target = (360 - segIdx * SEG_DEG + 360) % 360;
    const current = rotRef.current % 360;
    let delta = target - current;
    if (delta < 0) delta += 360;
    const newRot = rotRef.current + 5 * 360 + delta;
    rotRef.current = newRot;
    setRotation(newRot);
    setSpinning(true);
    setResult(null);

    const usedBet = Math.min(effectiveBet, currentUser.balanceMain);
    const winAmount = +(usedBet * rule.mult).toFixed(6);

    setTimeout(() => {
      setSpinning(false);
      spinWheelBet(usedBet, winAmount);
      setResult({ seg: SEGS[segIdx], win: winAmount });
    }, 4500);
  };

  const prizeFor = (mult: number) =>
    (effectiveBet * mult).toFixed(mult < 1 ? 4 : 3);

  return (
    <div className="space-y-5 pb-4">
      {/* En-tête */}
      <div className="flex items-center gap-3">
        <button onClick={onBack}
          className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h2 className="text-base font-bold text-white">Roue de la Fortune</h2>
          <p className="text-[11px] text-slate-500">Faites tourner la roue et gagnez des TON !</p>
        </div>
        <div className="glass-card px-3 py-1.5 text-right">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Solde</p>
          <p className="text-sm font-bold text-white">{currentUser.balanceMain.toFixed(3)} TON</p>
        </div>
      </div>

      {/* Roue */}
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

        {/* Bannière de résultat */}
        {result && !spinning && (
          <div className={`w-full text-center px-4 py-3 rounded-xl font-semibold text-sm animate-fade-in ${
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
            {result.seg.mult === 10  && `🎰 JACKPOT ×10 — +${result.win.toFixed(4)} TON !!!`}
          </div>
        )}
      </div>

      {/* Contrôles de mise */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex justify-between text-xs">
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

        {/* 6 paliers rapides — 2 rangées × 3 */}
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

      {/* Tableau des gains (dynamique selon la mise) */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Gains possibles · mise {effectiveBet.toFixed(2)} TON
        </h3>
        <div className="space-y-1.5">
          {([
            { label: '×10', note: 'Jackpot — décoration', val: null,         color: 'text-purple-400/50 line-through', bg: 'bg-purple-500/5' },
            { label: '×5',  note: 'Très rare',            val: prizeFor(5),  color: 'text-teal-400',    bg: 'bg-teal-500/10' },
            { label: '×3',  note: 'Rare',                 val: prizeFor(3),  color: 'text-blue-400',    bg: 'bg-blue-500/10' },
            { label: '×2',  note: '',                     val: prizeFor(2),  color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: '×1',  note: 'Remboursement',        val: prizeFor(1),  color: 'text-amber-400',   bg: 'bg-amber-500/10' },
            { label: '×0.4',note: 'Retour partiel',       val: prizeFor(0.4),color: 'text-orange-400',  bg: 'bg-orange-500/10' },
            { label: 'PERDU',note: '',                    val: null,         color: 'text-red-400',     bg: 'bg-red-500/10' },
          ] as const).map(row => (
            <div key={row.label} className={`flex items-center justify-between px-3 py-1.5 rounded-lg ${row.bg}`}>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${row.color}`}>{row.label}</span>
                {row.note ? <span className="text-[10px] text-slate-600">{row.note}</span> : null}
              </div>
              <span className="text-sm text-white font-mono">
                {row.val != null ? `+${row.val} TON` : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Feed fictif */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">Derniers joueurs</h3>
        </div>
        <div className="space-y-2">
          {FAKE_FEED.map((entry, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
              <div className="flex items-center gap-2.5">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  entry.mult >= 5 ? 'bg-teal-500/30 text-teal-300' :
                  entry.mult >= 2 ? 'bg-emerald-500/25 text-emerald-300' :
                  entry.mult > 0  ? 'bg-amber-500/25 text-amber-300' :
                                    'bg-red-500/15 text-red-500'
                }`}>
                  {entry.mult === 0 ? '✗' : `×${entry.mult}`}
                </span>
                <span className="text-sm text-white">{entry.username}</span>
              </div>
              <div className="text-right">
                <span className={`text-sm font-semibold ${
                  entry.win > entry.bet ? 'text-emerald-400' :
                  entry.win > 0        ? 'text-amber-400'   : 'text-slate-600'
                }`}>
                  {entry.win > 0 ? `+${entry.win.toFixed(2)} TON` : `−${entry.bet.toFixed(2)} TON`}
                </span>
                <span className="text-[10px] text-slate-600 block">{entry.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
// GAMES HUB — lobby d'entrée, scalable pour ajouter d'autres jeux
// ══════════════════════════════════════════════════════════════════

type ActiveGame = 'wheel' | null;

const CATALOG = [
  {
    id: 'wheel' as ActiveGame,
    title: 'Roue de la Fortune',
    description: 'Faites tourner la roue · Gagnez jusqu\'à ×5 votre mise',
    emoji: '🎡',
    available: true,
    badge: null as string | null,
  },
  {
    id: null,
    title: 'Pile ou Face',
    description: 'Doublez votre mise en une seule décision',
    emoji: '🪙',
    available: false,
    badge: 'Bientôt',
  },
  {
    id: null,
    title: 'Mines',
    description: 'Évitez les mines et multipliez vos gains',
    emoji: '💣',
    available: false,
    badge: 'Bientôt',
  },
] as const;

export const MiniAppGames: React.FC = () => {
  const [activeGame, setActiveGame] = useState<ActiveGame>(null);

  if (activeGame === 'wheel') {
    return <WheelGame onBack={() => setActiveGame(null)} />;
  }

  return (
    <div className="space-y-5 animate-slide-up pb-4">
      <div>
        <h1 className="text-lg font-bold text-white">Jeux</h1>
        <p className="text-xs text-slate-400 mt-0.5">Misez vos TON et tentez votre chance</p>
      </div>

      {/* Catalogue de jeux */}
      <div className="space-y-3">
        {CATALOG.map((game, i) => (
          <div key={i} className={`glass-card p-4 ${!game.available ? 'opacity-55' : ''}`}>
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                game.available
                  ? 'bg-amber-500/15 border border-amber-500/25'
                  : 'bg-white/5 border border-white/10'
              }`}>
                {game.emoji}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-white">{game.title}</h3>
                  {game.badge && (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-slate-700/80 text-slate-400 px-2 py-0.5 rounded-full">
                      <Lock className="w-2.5 h-2.5" />
                      {game.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5 leading-snug">{game.description}</p>
              </div>

              {game.available && game.id && (
                <button
                  onClick={() => setActiveGame(game.id)}
                  className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-amber-950 font-bold text-sm rounded-xl hover:from-amber-400 hover:to-yellow-400 active:scale-95 transition-all shadow-md shadow-amber-500/20"
                >
                  Jouer
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Infos rapides */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Infos</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-white/5 rounded-xl py-3">
            <p className="text-base font-bold text-amber-400">0.01</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Mise min (TON)</p>
          </div>
          <div className="bg-white/5 rounded-xl py-3">
            <p className="text-base font-bold text-teal-400">×5</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Gain max réel</p>
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
