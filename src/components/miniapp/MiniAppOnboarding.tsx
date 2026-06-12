import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { haptic } from '../../lib/haptics';

interface Props { onDone: () => void; }

const SLIDES = 3;

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
  const { platformConfig, updateUser } = useAppStore();

  const complete = (claimBonus: boolean) => {
    if (claimBonus && platformConfig.welcomeBonusEnabled && platformConfig.welcomeBonusAmount > 0) {
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
    if (slide < SLIDES - 1) {
      setSlide(s => s + 1);
    } else {
      complete(true);
    }
  };

  const skip = () => {
    haptic.selection();
    complete(false);
  };

  const isLastSlide = slide === SLIDES - 1;
  const bonusEnabled = platformConfig.welcomeBonusEnabled && platformConfig.welcomeBonusAmount > 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'linear-gradient(180deg,#0f0c29 0%,#1a1a2e 40%,#16213e 100%)' }}>
      {/* Skip button */}
      <div className="flex justify-end px-5 pt-5">
        <button
          onClick={skip}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
        >
          Passer
        </button>
      </div>

      {/* Slide content */}
      <div key={slide} className="flex-1 flex flex-col items-center justify-center px-6 page-enter">
        {slide === 0 && <Slide0 />}
        {slide === 1 && <Slide1 platformConfig={platformConfig} />}
        {slide === 2 && <Slide2 bonusEnabled={bonusEnabled} bonusAmount={platformConfig.welcomeBonusAmount} />}
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 py-4">
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
      <div className="px-6 pb-10">
        <button
          onClick={next}
          className="tap-scale w-full py-4 rounded-2xl font-bold text-base text-white btn-primary shadow-lg shadow-blue-500/20"
        >
          {isLastSlide
            ? (bonusEnabled ? `🎁 Réclamer ${platformConfig.welcomeBonusAmount.toFixed(2)} TON !` : 'Accéder à l\'app →')
            : 'Suivant →'}
        </button>
      </div>
    </div>
  );
};

// ── Slide 0: Bienvenue ──────────────────────────────────────────────
const Slide0: React.FC = () => (
  <div className="flex flex-col items-center text-center gap-6">
    <div className="animate-float text-7xl select-none">💎</div>
    <div className="space-y-3">
      <h1 className="text-3xl font-black text-white leading-tight">
        Bienvenue sur<br />
        <span className="gradient-text">TonCipher</span>
      </h1>
      <p className="text-slate-400 text-base leading-relaxed max-w-xs">
        Gagnez des <span className="text-white font-semibold">TON réels</span> en accomplissant des missions, en jouant et en invitant vos amis.
      </p>
    </div>
    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      <span className="text-xs font-semibold text-emerald-400">Retraits TON disponibles</span>
    </div>
  </div>
);

// ── Slide 1: Comment gagner ─────────────────────────────────────────
const Slide1: React.FC<{ platformConfig: ReturnType<typeof useAppStore.getState>['platformConfig'] }> = ({ platformConfig }) => {
  const ways = [
    { icon: '📋', label: 'Tâches',    desc: `Rejoignez canaux · bots`, reward: `+${platformConfig.referralBonusSignup.toFixed(2)} TON / tâche`, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    { icon: '🎰', label: 'Jeux',      desc: 'Wheel · Crash · Mines…',   reward: 'jusqu\'à ×10 la mise',                                         color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
    { icon: '👥', label: 'Parrainage',desc: 'Invitez vos amis',         reward: `+${platformConfig.referralBonusSignup.toFixed(2)} TON / ami`,   color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  ];
  return (
    <div className="w-full flex flex-col gap-5">
      <div className="text-center">
        <h2 className="text-2xl font-black text-white">Comment gagner ?</h2>
        <p className="text-slate-400 text-sm mt-1">3 façons de gagner des TON</p>
      </div>
      <div className="space-y-3">
        {ways.map(w => (
          <div key={w.label} className={`animate-pop-in flex items-center gap-4 p-4 rounded-2xl border ${w.bg}`}>
            <div className="text-3xl">{w.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-sm">{w.label}</p>
              <p className="text-xs text-slate-400">{w.desc}</p>
            </div>
            <div className={`text-xs font-bold text-right shrink-0 ${w.color}`}>{w.reward}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Slide 2: Bonus ──────────────────────────────────────────────────
const Slide2: React.FC<{ bonusEnabled: boolean; bonusAmount: number }> = ({ bonusEnabled, bonusAmount }) => (
  <div className="relative flex flex-col items-center text-center gap-6 w-full">
    <CoinRain show={bonusEnabled} />
    {bonusEnabled ? (
      <>
        <div className="text-6xl animate-pop-in select-none">🎁</div>
        <div className="space-y-2">
          <p className="text-slate-400 text-sm font-semibold uppercase tracking-widest">Bonus de bienvenue</p>
          <p className="text-5xl font-black text-white">
            +{bonusAmount.toFixed(2)} <span className="text-blue-400">TON</span>
          </p>
          <p className="text-slate-400 text-sm">Crédité immédiatement sur votre solde</p>
        </div>
        <div className="px-5 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-xs text-emerald-400 font-semibold">Aucun dépôt requis · Retrait possible dès 0.1 TON</p>
        </div>
      </>
    ) : (
      <>
        <div className="text-6xl animate-float select-none">🚀</div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white">Vous êtes prêt !</h2>
          <p className="text-slate-400 text-base">Commencez à gagner dès maintenant</p>
        </div>
      </>
    )}
  </div>
);
