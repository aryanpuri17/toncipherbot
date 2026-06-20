import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { ArrowUpRight, ArrowDownLeft, ListTodo, ChevronRight, TrendingUp, Flame, Gift, Loader2, Users } from 'lucide-react';
import { CountUp } from '../ui/CountUp';
import { haptic } from '../../lib/haptics';

export const MiniAppDashboard: React.FC = () => {
  const { currentUser: u, setMiniAppPage, tasks, completedTaskIds, redeemPromoCode, platformConfig } = useAppStore();
  const activeTasks = tasks.filter(t => t.isActive && !completedTaskIds.includes(t.id) && !t.isPromoTask);

  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoResult, setPromoResult] = useState<{ success: boolean; message: string } | null>(null);

  // Promo event countdown
  const event = platformConfig.promoEvent;
  const isEventActive = event?.active && new Date(event.endsAt) > new Date();
  const [eventTimeLeft, setEventTimeLeft] = useState('');
  useEffect(() => {
    if (!isEventActive) return;
    const update = () => {
      const diff = Math.max(0, new Date(event!.endsAt).getTime() - Date.now());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setEventTimeLeft(h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [isEventActive, event?.endsAt]);

  const handleRedeemPromo = () => {
    if (!promoCode.trim() || promoLoading) return;
    setPromoLoading(true);
    const result = redeemPromoCode(promoCode.trim());
    setTimeout(() => {
      setPromoLoading(false);
      const ok = result.success;
      if (ok) haptic.success(); else haptic.error();
      setPromoResult(
        ok
          ? { success: true, message: `+${(result.reward ?? 0).toFixed(2)} GRAM credited to your account!` }
          : { success: false, message: result.error ?? 'Unknown error.' }
      );
      if (ok) setPromoCode('');
      setTimeout(() => setPromoResult(null), 4000);
    }, 700);
  };

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Promo Event Banner */}
      {isEventActive && (
        <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/20 border border-amber-500/40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(251,191,36,0.12),transparent)]" />
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/25 flex items-center justify-center shrink-0 text-lg">⚡</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-amber-300">LIVE EVENT</p>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 text-[10px] font-bold border border-amber-500/40">
                  ×{event!.multiplier} BONUS
                </span>
              </div>
              <p className="text-xs text-amber-200/80 mt-0.5 truncate">{event!.label}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[10px] text-amber-400/60 uppercase tracking-wider">Ends in</p>
              <p className="text-sm font-bold text-amber-300 font-mono">{eventTimeLeft}</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm">Hello 👋</p>
          <h1 className="text-xl font-bold text-white">{u.firstName}</h1>
        </div>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
          {u.firstName?.charAt(0) ?? '?'}
        </div>
      </div>

      {/* Balance Card */}
      <div className="card-sheen animated-gradient balance-card-ton relative overflow-hidden rounded-3xl p-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.07),transparent)]" />
        {/* Orbe haut-droite */}
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-[#0098EA]/30 blur-2xl pointer-events-none" />
        {/* Orbe bas-gauche */}
        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-[#0098EA]/20 blur-xl pointer-events-none" />
        {/* Watermark */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[80px] leading-none opacity-[0.06] select-none pointer-events-none font-bold text-white">💎</div>
        <div className="relative">
          <p className="text-[#7DD4FC] text-xs font-medium uppercase tracking-widest mb-2">Total balance</p>
          <p className="text-4xl font-bold text-white tracking-tight mb-0.5">
            <CountUp value={u.balanceMain} decimals={2} animateOnMount suffix=" GRAM" />
          </p>
          {u.todayEarnings > 0 ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 mb-4">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-300 text-xs font-semibold">
                +<CountUp value={u.todayEarnings} decimals={2} duration={0.8} /> GRAM today
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 mb-4">
              <span className="text-slate-400 text-xs">No earnings today yet</span>
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => { haptic.impact('light'); setMiniAppPage('deposit'); }}
              className="tap-scale flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 transition-colors text-white text-sm font-medium backdrop-blur-sm"
            >
              <ArrowDownLeft className="w-4 h-4" /> Deposit
            </button>
            <button
              onClick={() => { haptic.impact('light'); setMiniAppPage('withdraw'); }}
              className="tap-scale flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 transition-colors text-white text-sm font-medium backdrop-blur-sm"
            >
              <ArrowUpRight className="w-4 h-4" /> Withdraw
            </button>
          </div>
        </div>
      </div>

      {/* Referral invite banner */}
      <button
        onClick={() => setMiniAppPage('referral')}
        className="tap-scale w-full flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-purple-600/20 via-blue-600/15 to-purple-600/20 border border-purple-500/25 hover:border-purple-500/40 transition-all"
      >
        <div className="w-10 h-10 rounded-xl bg-purple-500/25 flex items-center justify-center shrink-0">
          <Users className="w-5 h-5 text-purple-300" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-white">Invite your friends</p>
          <p className="text-xs text-purple-300">
            {u.referralCount > 0
              ? `${u.referralCount} friend${u.referralCount !== 1 ? 's' : ''} invited · ${(u.referralCount * platformConfig.referralBonusSignup).toFixed(2)} GRAM earned`
              : `Earn ${platformConfig.referralBonusSignup.toFixed(2)} GRAM per friend who signs up`}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-500/30">
          <span className="text-xs font-bold text-purple-300">+{platformConfig.referralBonusSignup.toFixed(0)} GRAM</span>
          <ChevronRight className="w-3.5 h-3.5 text-purple-400" />
        </div>
      </button>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card glass-card p-4 relative overflow-hidden" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.14)', borderRadius: 16 }}>
          <div className="relative">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2.5" style={{ background: 'rgba(139,92,246,0.14)', boxShadow: '0 4px 12px rgba(139,92,246,0.20)' }}>
              <ListTodo className="w-4 h-4" style={{ color: '#C4B5FD' }} />
            </div>
            <p className="text-2xl font-bold text-white leading-none">
              <CountUp value={u.tasksCompleted} decimals={0} animateOnMount />
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Tasks completed</p>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl" style={{ background: 'linear-gradient(90deg,#8B5CF6,transparent)' }} />
          </div>
        </div>
        <div className="stat-card glass-card p-4 relative overflow-hidden" style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: 16 }}>
          <div className="relative">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2.5" style={{ background: 'rgba(16,185,129,0.18)', boxShadow: '0 4px 12px rgba(16,185,129,0.25)' }}>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xl font-bold text-emerald-400 leading-none">
              <CountUp value={u.totalEarnings} decimals={2} animateOnMount suffix=" GRAM" />
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Total earned</p>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl" style={{ background: 'linear-gradient(90deg,#10b981,transparent)' }} />
          </div>
        </div>
      </div>

      {/* Promo Code */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-amber-400" />
          <p className="text-sm font-semibold text-white">Promo code</p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={promoCode}
            onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoResult(null); }}
            onKeyDown={e => e.key === 'Enter' && handleRedeemPromo()}
            placeholder="Enter your code..."
            className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono tracking-widest placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:border-amber-500/50 transition-colors"
          />
          <button
            onClick={handleRedeemPromo}
            disabled={!promoCode.trim() || promoLoading}
            className="tap-scale px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold hover:bg-amber-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {promoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Activate'}
          </button>
        </div>
        {promoResult && (
          <p className={`animate-pop-in text-xs font-medium ${promoResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
            {promoResult.success ? '✓' : '✗'} {promoResult.message}
          </p>
        )}
      </div>

      {/* Active Tasks Preview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div style={{ width: 3, height: 16, borderRadius: 99, background: 'linear-gradient(180deg,#8B5CF6,#8B5CF655)', flexShrink: 0 }} />
            <h2 className="text-sm font-semibold text-white">Available tasks</h2>
          </div>
          <button onClick={() => setMiniAppPage('tasks')} className="text-xs flex items-center gap-1 hover:underline" style={{ color: '#C4B5FD' }}>
            See all <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="space-y-2">
          {activeTasks.slice(0, 3).map(task => {
            const isPromoActive = task.promotion && new Date(task.promotion.endsAt) > new Date();
            const displayReward = task.reward * (isPromoActive ? task.promotion!.multiplier : 1);
            return (
              <div key={task.id} className="p-3.5 flex items-center gap-3" style={{ background: isPromoActive ? 'rgba(245,158,11,0.07)' : 'rgba(139,92,246,0.06)', border: `1px solid ${isPromoActive ? 'rgba(245,158,11,0.25)' : 'rgba(139,92,246,0.14)'}`, borderRadius: 12 }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(139,92,246,0.14)', boxShadow: '0 3px 10px rgba(139,92,246,0.17)' }}>
                  {task.icon ? <span className="text-base">{task.icon}</span> : <ListTodo className="w-4 h-4" style={{ color: '#C4B5FD' }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-white truncate">{task.title}</p>
                    {isPromoActive && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[9px] font-bold flex-shrink-0"><Flame className="w-2.5 h-2.5" />×{task.promotion!.multiplier}</span>}
                  </div>
                </div>
                <span className="text-sm font-bold text-emerald-400 flex-shrink-0">+{displayReward.toFixed(2)} GRAM</span>
              </div>
            );
          })}
          {activeTasks.length === 0 && (
            <p className="text-center text-sm text-slate-500 py-6">No tasks available right now</p>
          )}
        </div>
      </div>
    </div>
  );
};
