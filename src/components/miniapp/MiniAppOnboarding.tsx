import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { haptic } from '../../lib/haptics';

interface Props { onDone: () => void; }

type PlatformConfig = ReturnType<typeof useAppStore.getState>['platformConfig'];
type CurrentUser = ReturnType<typeof useAppStore.getState>['currentUser'];

// Stable coin positions — generated once, not on every render
const COIN_SEEDS = Array.from({ length: 18 }, (_, i) => ({
  left:  `${((i * 41 + 7) % 90) + 5}%`,
  delay: `${((i * 0.13) % 0.8).toFixed(2)}s`,
  dur:   `${(1.0 + (i * 0.09) % 0.7).toFixed(2)}s`,
  size:  i % 4 === 0 ? 22 : 14,
}));

const CoinRain: React.FC<{ show: boolean }> = ({ show }) => (
  <>
    <style>{`@keyframes coinFall{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(80px) rotate(360deg);opacity:0}}`}</style>
    {show && COIN_SEEDS.map((c, i) => (
      <div key={i} style={{
        position: 'absolute', left: c.left, top: '28%',
        width: c.size, height: c.size, borderRadius: '50%',
        background: 'linear-gradient(135deg,#fbbf24,#f59e0b)',
        boxShadow: '0 0 6px rgba(251,191,36,0.6)',
        animationName: 'coinFall',
        animationDuration: c.dur,
        animationDelay: c.delay,
        animationTimingFunction: 'ease-in',
        animationFillMode: 'forwards',
        pointerEvents: 'none',
        fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#78350f', fontWeight: 900,
      }}>💎</div>
    ))}
  </>
);

export const MiniAppOnboarding: React.FC<Props> = ({ onDone }) => {
  const [slide, setSlide] = useState(0);
  const { platformConfig, updateUser, currentUser } = useAppStore();
  const bonusEnabled = platformConfig.welcomeBonusEnabled && platformConfig.welcomeBonusAmount > 0;
  const SLIDES = bonusEnabled ? 6 : 5;

  const complete = (claimBonus: boolean) => {
    if (claimBonus && bonusEnabled) {
      haptic.success();
      const bonus = platformConfig.welcomeBonusAmount;
      const u = useAppStore.getState().currentUser;
      updateUser(u.id, {
        balanceMain:   +(u.balanceMain + bonus).toFixed(6),
        totalEarnings: +(u.totalEarnings + bonus).toFixed(6),
      });
    }
    try { localStorage.setItem('tc_onboarded', '1'); } catch {}
    onDone();
  };

  const next = () => {
    haptic.impact('light');
    if (slide < SLIDES - 1) setSlide(s => s + 1);
    else complete(true);
  };

  const skip = () => {
    haptic.selection();
    complete(false);
  };

  const isLastSlide = slide === SLIDES - 1;
  const isBonusSlide = bonusEnabled && isLastSlide;

  let btnLabel: string;
  if (isBonusSlide) btnLabel = `🎁 Réclamer ${platformConfig.welcomeBonusAmount.toFixed(2)} TON !`;
  else if (isLastSlide) btnLabel = "Accéder à l'app →";
  else btnLabel = 'Suivant →';

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'linear-gradient(180deg,#0f0c29 0%,#1a1a2e 40%,#16213e 100%)' }}>
      {/* Skip */}
      <div className="flex justify-end px-5 pt-5 shrink-0">
        <button onClick={skip} className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
          Passer
        </button>
      </div>

      {/* Slide content */}
      <div key={slide} className="flex-1 flex flex-col items-center justify-center px-5 page-enter overflow-y-auto">
        {slide === 0 && <Slide0 />}
        {slide === 1 && <Slide1 />}
        {slide === 2 && <Slide2 platformConfig={platformConfig} />}
        {slide === 3 && <Slide3 />}
        {slide === 4 && <Slide4 platformConfig={platformConfig} currentUser={currentUser} />}
        {slide === 5 && bonusEnabled && <Slide5 bonusAmount={platformConfig.welcomeBonusAmount} />}
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 py-3 shrink-0">
        {Array.from({ length: SLIDES }, (_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width:  i === slide ? 20 : 6,
              height: 6,
              background: i === slide ? '#3b82f6' : 'rgba(255,255,255,0.15)',
            }}
          />
        ))}
      </div>

      {/* CTA button */}
      <div className="px-6 pb-10 shrink-0">
        <button
          onClick={next}
          className="tap-scale w-full py-4 rounded-2xl font-bold text-base text-white btn-primary shadow-lg shadow-blue-500/20"
        >
          {btnLabel}
        </button>
      </div>
    </div>
  );
};

// ── Slide 0 : Bienvenue ─────────────────────────────────────────────
const Slide0: React.FC = () => (
  <div className="flex flex-col items-center text-center gap-6 w-full">
    <div className="animate-float text-7xl select-none">💎</div>
    <div className="space-y-3">
      <h1 className="text-3xl font-black text-white leading-tight">
        Bienvenue sur<br />
        <span className="gradient-text">TonCipher</span>
      </h1>
      <p className="text-slate-400 text-base leading-relaxed max-w-xs">
        La plateforme Telegram qui vous fait gagner de vrais{' '}
        <span className="text-white font-semibold">TON</span> — en quelques clics.
      </p>
    </div>
    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      <span className="text-xs font-semibold text-emerald-400">Retraits TON en temps réel</span>
    </div>
  </div>
);

// ── Slide 1 : Tableau de bord ───────────────────────────────────────
const Slide1: React.FC = () => (
  <div className="w-full flex flex-col items-center gap-5">
    <div className="text-center">
      <h2 className="text-2xl font-black text-white">Votre tableau de bord</h2>
      <p className="text-slate-400 text-sm mt-1">Suivez vos gains en temps réel</p>
    </div>

    {/* Mock balance card */}
    <div className="card-sheen animated-gradient w-full rounded-3xl p-5 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 80% 20%,#60a5fa,transparent 60%)' }}
      />
      <p className="text-xs text-blue-200/70 font-semibold uppercase tracking-widest mb-1">Solde disponible</p>
      <p className="text-4xl font-black text-white">
        2.45 <span className="text-blue-300 text-2xl">TON</span>
      </p>
      <p className="text-xs text-blue-200/50 mt-0.5">≈ 12.30 $</p>
      <div className="mt-4 flex gap-2">
        <div className="flex-1 rounded-2xl bg-white/10 px-3 py-2 text-center">
          <p className="text-xs text-slate-400">Total gagné</p>
          <p className="text-sm font-bold text-white">5.20 TON</p>
        </div>
        <div className="flex-1 rounded-2xl bg-white/10 px-3 py-2 text-center">
          <p className="text-xs text-slate-400">Tâches</p>
          <p className="text-sm font-bold text-white">47</p>
        </div>
        <div className="flex-1 rounded-2xl bg-amber-500/20 border border-amber-500/30 px-3 py-2 text-center">
          <p className="text-xs text-amber-400">Série</p>
          <p className="text-sm font-bold text-amber-300">🔥 7j</p>
        </div>
      </div>
    </div>

    <p className="text-xs text-slate-500 text-center max-w-xs">
      Revenez chaque jour pour maintenir votre série et booster vos gains
    </p>
  </div>
);

// ── Slide 2 : Tâches ───────────────────────────────────────────────
const MOCK_TASKS = [
  { icon: '📢', title: 'Rejoindre @TonCipherOfficial', sub: 'Canal Telegram', reward: '+0.05 TON', color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
  { icon: '🐦', title: 'Suivre sur Twitter / X',       sub: 'Réseau social',  reward: '+0.03 TON', color: 'text-sky-400',    bg: 'bg-sky-500/10 border-sky-500/20'   },
  { icon: '🤖', title: 'Démarrer @TonCipherBot',       sub: 'Bot Telegram',   reward: '+0.02 TON', color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
];

const Slide2: React.FC<{ platformConfig: PlatformConfig }> = ({ platformConfig }) => (
  <div className="w-full flex flex-col gap-4">
    <div className="text-center">
      <h2 className="text-2xl font-black text-white">Gagnez avec les tâches</h2>
      <p className="text-slate-400 text-sm mt-1">Chaque mission = des TON crédités instantanément</p>
    </div>

    <div className="space-y-2.5">
      {MOCK_TASKS.map((t, i) => (
        <div
          key={i}
          className={`flex items-center gap-3 p-3.5 rounded-2xl border ${t.bg} animate-pop-in`}
          style={{ animationDelay: `${i * 0.08}s` }}
        >
          <div className="text-2xl w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 shrink-0">
            {t.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{t.title}</p>
            <p className="text-xs text-slate-400">{t.sub}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className={`text-xs font-bold ${t.color}`}>{t.reward}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-300 whitespace-nowrap">
              Commencer →
            </span>
          </div>
        </div>
      ))}
    </div>

    <div className="text-center px-4 py-2 rounded-2xl bg-white/5 border border-white/10">
      <p className="text-xs text-slate-400">
        Jusqu'à <span className="text-white font-semibold">+{platformConfig.referralBonusSignup.toFixed(2)} TON</span> par tâche
        · Nouvelles missions chaque jour
      </p>
    </div>
  </div>
);

// ── Slide 3 : Jeux ─────────────────────────────────────────────────
const MOCK_GAMES = [
  { icon: '🎡', name: 'Roue',   sub: '×2 à ×10',    grad: 'from-violet-600/30 to-violet-900/20 border-violet-500/30' },
  { icon: '🚀', name: 'Crash',  sub: 'jusqu\'à ×100', grad: 'from-blue-600/30 to-blue-900/20 border-blue-500/30'     },
  { icon: '💣', name: 'Mines',  sub: 'stratégie',    grad: 'from-amber-600/30 to-amber-900/20 border-amber-500/30'  },
  { icon: '🎰', name: 'Jackpot',sub: 'gros lots',    grad: 'from-rose-600/30 to-rose-900/20 border-rose-500/30'     },
];

const Slide3: React.FC = () => (
  <div className="w-full flex flex-col gap-4">
    <div className="text-center">
      <h2 className="text-2xl font-black text-white">Jouez &amp; multipliez</h2>
      <p className="text-slate-400 text-sm mt-1">4 jeux, des centaines de façons de gagner</p>
    </div>

    <div className="grid grid-cols-2 gap-3">
      {MOCK_GAMES.map((g, i) => (
        <div
          key={i}
          className={`flex flex-col items-center gap-2 p-4 rounded-2xl bg-gradient-to-br border animate-pop-in ${g.grad}`}
          style={{ animationDelay: `${i * 0.07}s` }}
        >
          <span className="text-4xl">{g.icon}</span>
          <p className="text-sm font-bold text-white text-center leading-tight">{g.name}</p>
          <span className="text-xs font-semibold text-white/60 bg-white/10 px-2 py-0.5 rounded-full">
            {g.sub}
          </span>
        </div>
      ))}
    </div>

    <p className="text-xs text-slate-500 text-center">
      Jouez avec vos TON gagnés — retirez à tout moment
    </p>
  </div>
);

// ── Slide 4 : Parrainage ────────────────────────────────────────────
const Slide4: React.FC<{ platformConfig: PlatformConfig; currentUser: CurrentUser }> = ({ platformConfig, currentUser }) => {
  const code        = currentUser?.referralCode || 'TC-XXXXX';
  const pct         = platformConfig.referralBonusDepositPercent ?? 5;
  const signupBonus = platformConfig.referralBonusSignup ?? 0;

  return (
    <div className="w-full flex flex-col items-center gap-4 text-center">
      <div>
        <h2 className="text-2xl font-black text-white">Invitez vos amis</h2>
        <p className="text-slate-400 text-sm mt-1">Deux récompenses à chaque invitation</p>
      </div>

      {/* Two reward cards side by side */}
      <div className="w-full grid grid-cols-2 gap-3">
        <div className="flex flex-col items-center gap-1 p-4 rounded-2xl bg-gradient-to-br from-amber-600/30 to-amber-900/20 border border-amber-500/30">
          <p className="text-3xl font-black text-amber-300">+{signupBonus.toFixed(2)}</p>
          <p className="text-xs font-semibold text-white">TON / ami inscrit</p>
          <p className="text-[10px] text-slate-400 text-center">dès l'inscription</p>
        </div>
        <div className="flex flex-col items-center gap-1 p-4 rounded-2xl bg-gradient-to-br from-emerald-600/30 to-emerald-900/20 border border-emerald-500/30">
          <p className="text-3xl font-black text-emerald-300">{pct}%</p>
          <p className="text-xs font-semibold text-white">sur ses tâches</p>
          <p className="text-[10px] text-slate-400 text-center">à vie, sans limite</p>
        </div>
      </div>

      {/* Steps */}
      <div className="w-full flex flex-col gap-2">
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
          <span className="text-lg shrink-0">1️⃣</span>
          <p className="text-xs text-slate-300 text-left">Votre ami s'inscrit → vous recevez <span className="text-amber-400 font-bold">+{signupBonus.toFixed(2)} TON</span></p>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
          <span className="text-lg shrink-0">2️⃣</span>
          <p className="text-xs text-slate-300 text-left">Il accomplit des tâches → vous recevez <span className="text-emerald-400 font-bold">{pct}%</span> de chaque gain</p>
        </div>
      </div>

      {/* Referral code preview */}
      <div className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
        <p className="text-xs text-slate-500">Votre code</p>
        <span className="text-sm font-black text-white tracking-widest">{code}</span>
      </div>
    </div>
  );
};

// ── Slide 5 : Bonus de bienvenue ────────────────────────────────────
const Slide5: React.FC<{ bonusAmount: number }> = ({ bonusAmount }) => (
  <div className="relative flex flex-col items-center text-center gap-6 w-full">
    <CoinRain show />
    <div className="text-6xl animate-pop-in select-none">🎁</div>
    <div className="space-y-2">
      <p className="text-slate-400 text-sm font-semibold uppercase tracking-widest">Bonus de bienvenue</p>
      <p className="text-5xl font-black text-white">
        +{bonusAmount.toFixed(2)} <span className="text-blue-400">TON</span>
      </p>
      <p className="text-slate-400 text-sm">Crédité immédiatement sur votre solde</p>
    </div>
    <div className="px-5 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
      <p className="text-xs text-emerald-400 font-semibold">
        Aucun dépôt requis · Retrait possible dès 0.1 TON
      </p>
    </div>
  </div>
);
