import React from 'react';
import { useAppStore } from '../../store/appStore';
import { ArrowUpRight, ArrowDownLeft, ListTodo, ChevronRight, TrendingUp, Flame } from 'lucide-react';

export const MiniAppDashboard: React.FC = () => {
  const { currentUser: u, setMiniAppPage, tasks, completedTaskIds } = useAppStore();
  const activeTasks = tasks.filter(t => t.isActive && !completedTaskIds.includes(t.id));

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm">Bonjour 👋</p>
          <h1 className="text-xl font-bold text-white">{u.firstName}</h1>
        </div>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
          {u.firstName[0]}
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
