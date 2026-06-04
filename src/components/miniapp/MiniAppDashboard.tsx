import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { ArrowUpRight, ArrowDownLeft, ListTodo, ChevronRight, TrendingUp, Flame, Gift, Loader2 } from 'lucide-react';

export const MiniAppDashboard: React.FC = () => {
  const { currentUser: u, setMiniAppPage, tasks, completedTaskIds, redeemPromoCode } = useAppStore();
  const activeTasks = tasks.filter(t => t.isActive && !completedTaskIds.includes(t.id) && !t.isPromoTask);

  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoResult, setPromoResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleRedeemPromo = () => {
    if (!promoCode.trim() || promoLoading) return;
    setPromoLoading(true);
    const result = redeemPromoCode(promoCode.trim());
    setTimeout(() => {
      setPromoLoading(false);
      setPromoResult(
        result.success
          ? { success: true, message: `+${result.reward?.toFixed(2)} TON crédité sur votre compte!` }
          : { success: false, message: result.error ?? 'Erreur inconnue.' }
      );
      if (result.success) setPromoCode('');
      setTimeout(() => setPromoResult(null), 4000);
    }, 700);
  };

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm">Bonjour 👋</p>
          <h1 className="text-xl font-bold text-white">{u.firstName}</h1>
        </div>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
          {u.firstName?.charAt(0) ?? '?'}
        </div>
      </div>

      {/* Balance Card */}
      <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-blue-600/90 via-purple-600/80 to-pink-500/70 glow-blue">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)]" />
        <div className="relative">
          <p className="text-blue-100 text-sm mb-1">Solde total</p>
          <p className="text-3xl font-bold text-white mb-1">{u.balanceMain.toFixed(2)} TON</p>
          <div className="flex items-center gap-1 text-emerald-300 text-xs">
            <TrendingUp className="w-3 h-3" />
            <span>+{u.todayEarnings.toFixed(2)} TON aujourd'hui</span>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setMiniAppPage('deposit')} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 transition-colors text-white text-sm font-medium backdrop-blur-sm">
              <ArrowDownLeft className="w-4 h-4" /> Déposer
            </button>
            <button onClick={() => setMiniAppPage('withdraw')} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 transition-colors text-white text-sm font-medium backdrop-blur-sm">
              <ArrowUpRight className="w-4 h-4" /> Retirer
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-white">{u.tasksCompleted}</p>
          <p className="text-xs text-slate-400">Tâches complétées</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-xl font-bold text-emerald-400">{u.totalEarnings.toFixed(2)} TON</p>
          <p className="text-xs text-slate-400">Total gagné</p>
        </div>
      </div>

      {/* Promo Code */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-amber-400" />
          <p className="text-sm font-semibold text-white">Code promo</p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={promoCode}
            onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoResult(null); }}
            onKeyDown={e => e.key === 'Enter' && handleRedeemPromo()}
            placeholder="Entrez votre code..."
            className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono tracking-widest placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:border-amber-500/50 transition-colors"
          />
          <button
            onClick={handleRedeemPromo}
            disabled={!promoCode.trim() || promoLoading}
            className="px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold hover:bg-amber-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {promoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Activer'}
          </button>
        </div>
        {promoResult && (
          <p className={`text-xs font-medium ${promoResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
            {promoResult.success ? '✓' : '✗'} {promoResult.message}
          </p>
        )}
      </div>

      {/* Active Tasks Preview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Tâches disponibles</h2>
          <button onClick={() => setMiniAppPage('tasks')} className="text-xs text-blue-400 flex items-center gap-1 hover:underline">
            Voir tout <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="space-y-2">
          {activeTasks.slice(0, 3).map(task => {
            const isPromoActive = task.promotion && new Date(task.promotion.endsAt) > new Date();
            const displayReward = task.reward * (isPromoActive ? task.promotion!.multiplier : 1);
            return (
              <div key={task.id} className={`glass-card-light p-3.5 flex items-center gap-3 ${isPromoActive ? 'border border-amber-500/30' : ''}`}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-500/20 text-blue-400 flex-shrink-0">
                  {task.icon ? <span className="text-base">{task.icon}</span> : <ListTodo className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-white truncate">{task.title}</p>
                    {isPromoActive && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[9px] font-bold flex-shrink-0"><Flame className="w-2.5 h-2.5" />×{task.promotion!.multiplier}</span>}
                  </div>
                </div>
                <span className="text-sm font-bold text-emerald-400 flex-shrink-0">+{displayReward.toFixed(2)} TON</span>
              </div>
            );
          })}
          {activeTasks.length === 0 && (
            <p className="text-center text-sm text-slate-500 py-6">Aucune tâche disponible pour l'instant</p>
          )}
        </div>
      </div>
    </div>
  );
};
