import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { haptic } from '../../lib/haptics';

interface Props { onDone: () => void; }

type PlatformConfig = ReturnType<typeof useAppStore.getState>['platformConfig'];
type CurrentUser = ReturnType<typeof useAppStore.getState>['currentUser'];


export const MiniAppOnboarding: React.FC<Props> = ({ onDone }) => {
  const [slide, setSlide] = useState(0);
  const { platformConfig, currentUser } = useAppStore();
  const SLIDES = 5;

  const complete = () => {
    try { localStorage.setItem('tc_onboarded', '1'); } catch {}
    onDone();
  };

  const next = () => {
    haptic.impact('light');
    if (slide < SLIDES - 1) setSlide(s => s + 1);
    else complete();
  };

  const skip = () => {
    haptic.selection();
    complete();
  };

  const isLastSlide = slide === SLIDES - 1;

  const btnLabel = isLastSlide ? "Launch the app →" : 'Next →';

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'linear-gradient(180deg,#0f0c29 0%,#1a1a2e 40%,#16213e 100%)' }}>
      {/* Skip */}
      <div className="flex justify-end px-5 pt-5 shrink-0">
        <button onClick={skip} className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
          Skip
        </button>
      </div>

      {/* Slide content */}
      <div key={slide} className="flex-1 flex flex-col items-center justify-center px-5 page-enter overflow-y-auto">
        {slide === 0 && <Slide0 />}
        {slide === 1 && <Slide1 />}
        {slide === 2 && <Slide2 platformConfig={platformConfig} />}
        {slide === 3 && <Slide3 />}
        {slide === 4 && <Slide4 platformConfig={platformConfig} currentUser={currentUser} />}
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

// ── Slide 0 : Welcome ───────────────────────────────────────────────
const Slide0: React.FC = () => (
  <div className="flex flex-col items-center text-center gap-6 w-full">
    <div className="animate-float relative">
      <div className="w-24 h-24 rounded-full flex items-center justify-center text-5xl select-none"
        style={{
          background: 'linear-gradient(135deg, #0098EA 0%, #0B5EA8 100%)',
          boxShadow: '0 0 40px rgba(0,152,234,0.5), 0 0 80px rgba(0,152,234,0.2)',
        }}>
        💎
      </div>
      <div className="absolute inset-0 rounded-full animate-ping opacity-20"
        style={{ background: 'radial-gradient(circle, #0098EA, transparent)' }} />
    </div>

    <div className="space-y-3">
      <h1 className="text-3xl font-black text-white leading-tight">
        Welcome to<br />
        <span className="gradient-text">TonCipher</span>
      </h1>
      <p className="text-slate-400 text-base leading-relaxed max-w-xs">
        The Telegram platform that lets you earn real{' '}
        <span className="text-white font-semibold">TON</span> — in just a few clicks.
      </p>
    </div>

    <div className="flex flex-col gap-2 w-full max-w-xs">
      {[
        { icon: '✅', label: 'Real-time TON withdrawals',  color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
        { icon: '🔒', label: 'Secure · TON Blockchain',    color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20'       },
        { icon: '⚡', label: 'Earn from your first minute', color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20'     },
      ].map((p, i) => (
        <div
          key={i}
          className={`flex items-center gap-2 px-4 py-2 rounded-full border animate-pop-in ${p.bg}`}
          style={{ animationDelay: `${0.1 + i * 0.1}s` }}
        >
          <span>{p.icon}</span>
          <span className={`text-xs font-semibold ${p.color}`}>{p.label}</span>
        </div>
      ))}
    </div>
  </div>
);

// ── Slide 1 : Dashboard ─────────────────────────────────────────────
const Slide1: React.FC = () => (
  <div className="w-full flex flex-col items-center gap-5">
    <div className="text-center">
      <h2 className="text-2xl font-black text-white">Your dashboard</h2>
      <p className="text-slate-400 text-sm mt-1">Track your earnings in real time</p>
    </div>

    {/* Mock balance card */}
    <div className="card-sheen animated-gradient w-full rounded-3xl p-5 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0B1F3A 0%, #0D2847 40%, #083060 100%)',
        border: '1px solid rgba(0,152,234,0.25)',
        boxShadow: '0 0 40px rgba(0,152,234,0.15)',
      }}>
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,152,234,0.25), transparent)' }} />
      <p className="text-xs text-[#7DD4FC] font-semibold uppercase tracking-widest mb-1">Available balance</p>
      <p className="text-4xl font-black text-white">
        2.45 <span className="text-[#0098EA] text-2xl">TON</span>
      </p>
      <p className="text-xs text-blue-200/50 mt-0.5">≈ $12.30</p>
      <div className="mt-4 flex gap-2">
        <div className="flex-1 rounded-2xl bg-white/10 px-3 py-2 text-center">
          <p className="text-xs text-slate-400">Total earned</p>
          <p className="text-sm font-bold text-white">5.20 TON</p>
        </div>
        <div className="flex-1 rounded-2xl bg-white/10 px-3 py-2 text-center">
          <p className="text-xs text-slate-400">Tasks</p>
          <p className="text-sm font-bold text-white">47</p>
        </div>
        <div className="flex-1 rounded-2xl bg-amber-500/20 border border-amber-500/30 px-3 py-2 text-center">
          <p className="text-xs text-amber-400">Streak</p>
          <p className="text-sm font-bold text-amber-300">🔥 7d</p>
        </div>
      </div>
    </div>

    <p className="text-xs text-slate-500 text-center max-w-xs">
      Come back every day to keep your streak alive and boost your earnings
    </p>
  </div>
);

// ── Slide 2 : Tasks ─────────────────────────────────────────────────
const MOCK_TASKS = [
  { icon: '📢', title: 'Join @TonCipherOfficial', sub: 'Telegram channel', reward: '+0.05 TON', color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
  { icon: '🐦', title: 'Follow on Twitter / X',   sub: 'Social network',   reward: '+0.03 TON', color: 'text-sky-400',    bg: 'bg-sky-500/10 border-sky-500/20'   },
  { icon: '🤖', title: 'Start @TonCipherBot',      sub: 'Telegram bot',    reward: '+0.02 TON', color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
];

const Slide2: React.FC<{ platformConfig: PlatformConfig }> = ({ platformConfig }) => (
  <div className="w-full flex flex-col gap-4">
    <div className="text-center">
      <h2 className="text-2xl font-black text-white">Earn with tasks</h2>
      <p className="text-slate-400 text-sm mt-1">Every mission = TON credited instantly</p>
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
              Start →
            </span>
          </div>
        </div>
      ))}
    </div>

    <div className="text-center px-4 py-2 rounded-2xl bg-white/5 border border-white/10">
      <p className="text-xs text-slate-400">
        Up to <span className="text-white font-semibold">+{platformConfig.referralBonusSignup.toFixed(2)} TON</span> per task
        · New missions every day
      </p>
    </div>
  </div>
);

// ── Slide 3 : Games ─────────────────────────────────────────────────
const MOCK_GAMES = [
  { icon: '🎲', name: 'Dice',  sub: '×2 to ×49',      grad: 'from-amber-600/30 to-amber-900/20 border-amber-500/30'      },
  { icon: '🚀', name: 'Crash', sub: 'up to ×100',      grad: 'from-red-600/30 to-red-900/20 border-red-500/30'            },
  { icon: '💎', name: 'Mines', sub: 'strategy',        grad: 'from-violet-600/30 to-violet-900/20 border-violet-500/30'   },
  { icon: '🗼', name: 'Tower', sub: 'cash out anytime', grad: 'from-emerald-600/30 to-emerald-900/20 border-emerald-500/30' },
];

const Slide3: React.FC = () => (
  <div className="w-full flex flex-col gap-4">
    <div className="text-center">
      <h2 className="text-2xl font-black text-white">Play &amp; multiply</h2>
      <p className="text-slate-400 text-sm mt-1">4 games, hundreds of ways to win</p>
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
      Play with your earned TON — withdraw at any time
    </p>
  </div>
);

// ── Slide 4 : Referral ──────────────────────────────────────────────
const Slide4: React.FC<{ platformConfig: PlatformConfig; currentUser: CurrentUser }> = ({ platformConfig, currentUser }) => {
  const code        = currentUser?.referralCode || 'TC-XXXXX';
  const pct         = platformConfig.referralBonusDepositPercent ?? 5;
  const signupBonus = platformConfig.referralBonusSignup ?? 0;

  return (
    <div className="w-full flex flex-col items-center gap-4 text-center">
      <div>
        <h2 className="text-2xl font-black text-white">Invite your friends</h2>
        <p className="text-slate-400 text-sm mt-1">Two rewards with every invitation</p>
      </div>

      {/* Two reward cards side by side */}
      <div className="w-full grid grid-cols-2 gap-3">
        <div className="flex flex-col items-center gap-1 p-4 rounded-2xl bg-gradient-to-br from-amber-600/30 to-amber-900/20 border border-amber-500/30">
          <p className="text-3xl font-black text-amber-300">+{signupBonus.toFixed(2)}</p>
          <p className="text-xs font-semibold text-white">TON / friend joined</p>
          <p className="text-[10px] text-slate-400 text-center">upon sign-up</p>
        </div>
        <div className="flex flex-col items-center gap-1 p-4 rounded-2xl bg-gradient-to-br from-emerald-600/30 to-emerald-900/20 border border-emerald-500/30">
          <p className="text-3xl font-black text-emerald-300">{pct}%</p>
          <p className="text-xs font-semibold text-white">on their tasks</p>
          <p className="text-[10px] text-slate-400 text-center">forever, no limit</p>
        </div>
      </div>

      {/* Steps */}
      <div className="w-full flex flex-col gap-2">
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
          <span className="text-lg shrink-0">1️⃣</span>
          <p className="text-xs text-slate-300 text-left">Your friend signs up → you receive <span className="text-amber-400 font-bold">+{signupBonus.toFixed(2)} TON</span></p>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
          <span className="text-lg shrink-0">2️⃣</span>
          <p className="text-xs text-slate-300 text-left">They complete tasks → you receive <span className="text-emerald-400 font-bold">{pct}%</span> of every reward</p>
        </div>
      </div>

      {/* Referral code preview */}
      <div className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
        <p className="text-xs text-slate-500">Your code</p>
        <span className="text-sm font-black text-white tracking-widest">{code}</span>
      </div>
    </div>
  );
};

