import React from 'react';
import { useAppStore } from '../../store/appStore';
import { ArrowUpRight, ArrowDownLeft, ListTodo, Gift, Zap, ChevronRight, TrendingUp } from 'lucide-react';

export const MiniAppDashboard: React.FC = () => {
  const { currentUser: u, setMiniAppPage, tasks } = useAppStore();
  const activeTasks = tasks.filter(t => t.isActive);

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm">Bonjour 👋</p>
          <h1 className="text-xl font-bold text-white">{u.firstName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400">Nv.{u.level}</span>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
            {u.firstName[0]}
          </div>
        </div>
      </div>

      {/* Balance Card */}
      <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-blue-600/90 via-purple-600/80 to-pink-500/70 glow-blue">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)]" />
        <div className="relative">
          <p className="text-blue-100 text-sm mb-1">Solde total</p>
          <p className="text-3xl font-bold text-white mb-1">
            ${(u.balanceMain + u.balanceBonus + u.balanceReferral + u.balanceRewards).toFixed(2)}
          </p>
          <div className="flex items-center gap-1 text-emerald-300 text-xs">
            <TrendingUp className="w-3 h-3" />
            <span>+${u.todayEarnings.toFixed(2)} aujourd'hui</span>
          </div>

          <div className="flex gap-3 mt-4">
            <button onClick={() => setMiniAppPage('deposit')} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 transition-colors text-white text-sm font-medium backdrop-blur-sm">
              <ArrowDownLeft className="w-4 h-4" />
              Déposer
            </button>
            <button onClick={() => setMiniAppPage('withdraw')} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 transition-colors text-white text-sm font-medium backdrop-blur-sm">
              <ArrowUpRight className="w-4 h-4" />
              Retirer
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="glass-card-light p-3 text-center">
          <p className="text-lg font-bold text-white">{u.tasksCompleted}</p>
          <p className="text-[10px] text-slate-400">Tâches</p>
        </div>
        <div className="glass-card-light p-3 text-center">
          <p className="text-lg font-bold text-white">{u.referralCount}</p>
          <p className="text-[10px] text-slate-400">Filleuls</p>
        </div>
        <div className="glass-card-light p-3 text-center">
          <p className="text-lg font-bold text-white">🔥{u.streak}</p>
          <p className="text-[10px] text-slate-400">Streak</p>
        </div>
        <div className="glass-card-light p-3 text-center">
          <p className="text-lg font-bold text-amber-400">{u.xp}</p>
          <p className="text-[10px] text-slate-400">XP</p>
        </div>
      </div>

      {/* Daily Reward */}
      <button className="w-full glass-card p-4 flex items-center gap-3 hover:border-amber-500/20 transition-all group">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
          <Gift className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-white">Récompense quotidienne</p>
          <p className="text-xs text-slate-400">Réclamez votre bonus journalier</p>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <span className="text-xs font-semibold text-amber-400">+0.10$</span>
        </div>
      </button>

      {/* Active Tasks Preview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Tâches disponibles</h2>
          <button onClick={() => setMiniAppPage('tasks')} className="text-xs text-blue-400 flex items-center gap-1 hover:underline">
            Voir tout <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="space-y-2">
          {activeTasks.slice(0, 3).map(task => (
            <div key={task.id} className="glass-card-light p-3.5 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${task.type === 'join_channel' ? 'bg-blue-500/20 text-blue-400' : task.type === 'join_group' ? 'bg-purple-500/20 text-purple-400' : task.type === 'start_bot' ? 'bg-cyan-500/20 text-cyan-400' : task.type === 'daily' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                <ListTodo className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{task.title}</p>
                <p className="text-xs text-slate-400">{task.description}</p>
              </div>
              <span className="text-sm font-bold text-emerald-400 flex-shrink-0">+${task.reward.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
