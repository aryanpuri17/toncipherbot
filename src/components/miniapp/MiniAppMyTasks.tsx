import React from 'react';
import { useAppStore } from '../../store/appStore';
import { Hash, Users, Bot, Calendar, PauseCircle, CheckCircle, TrendingUp } from 'lucide-react';

const typeConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  join_channel: { icon: <Hash className="w-4 h-4" />,     color: 'bg-blue-500/20 text-blue-400',   label: 'Canal' },
  join_group:   { icon: <Users className="w-4 h-4" />,    color: 'bg-purple-500/20 text-purple-400', label: 'Groupe' },
  start_bot:    { icon: <Bot className="w-4 h-4" />,      color: 'bg-cyan-500/20 text-cyan-400',   label: 'Bot' },
  daily:        { icon: <Calendar className="w-4 h-4" />, color: 'bg-amber-500/20 text-amber-400', label: 'Quotidien' },
};

export const MiniAppMyTasks: React.FC = () => {
  const { tasks, currentUser, setMiniAppPage } = useAppStore();

  const myTasks = tasks
    .filter(t => t.createdByUserId === currentUser.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center gap-3">
        <button onClick={() => setMiniAppPage('tasks')} className="p-2 rounded-lg hover:bg-white/5 text-slate-400">←</button>
        <div>
          <h1 className="text-xl font-bold text-white">Mes campagnes</h1>
          <p className="text-sm text-slate-400">{myTasks.length} tâche{myTasks.length !== 1 ? 's' : ''} créée{myTasks.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {myTasks.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <TrendingUp className="w-10 h-10 text-slate-600" />
          <p className="text-sm font-medium text-slate-400">Aucune campagne créée</p>
          <p className="text-xs text-slate-600 text-center px-6">Créez votre première tâche pour attirer des utilisateurs vers votre canal ou bot.</p>
          <button
            onClick={() => setMiniAppPage('createTask')}
            className="mt-2 px-5 py-2.5 rounded-xl btn-primary text-sm font-semibold text-white"
          >
            Créer une tâche
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {myTasks.map(task => {
            const cfg = typeConfig[task.type] ?? typeConfig.join_channel;
            const progress = task.maxCompletions
              ? Math.min(task.totalCompletions / task.maxCompletions, 1)
              : 0;
            const remaining = task.maxCompletions
              ? task.maxCompletions - task.totalCompletions
              : null;
            const isFull = remaining !== null && remaining <= 0;
            const budgetSpent = task.totalCompletions * task.reward;
            const budgetTotal = task.maxCompletions ? task.maxCompletions * task.reward : null;

            return (
              <div key={task.id} className={`glass-card p-4 space-y-3 ${!task.isActive || isFull ? 'opacity-60' : ''}`}>
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                    {task.icon ? <span className="text-base">{task.icon}</span> : cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-white truncate">{task.title}</h3>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-white/5 text-slate-400 shrink-0">{cfg.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {isFull ? (
                        <span className="flex items-center gap-1 text-[10px] text-slate-500">
                          <CheckCircle className="w-3 h-3 text-emerald-500" /> Terminée
                        </span>
                      ) : !task.isActive ? (
                        <span className="flex items-center gap-1 text-[10px] text-slate-500">
                          <PauseCircle className="w-3 h-3 text-amber-500" /> Mise en pause
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 font-medium">● Active</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                {task.maxCompletions && (
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                      <span>{task.totalCompletions.toLocaleString()} complétions</span>
                      <span>{task.maxCompletions.toLocaleString()} total</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isFull ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'}`}
                        style={{ width: `${progress * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="glass-card-light rounded-lg p-2 text-center">
                    <p className="text-xs font-bold text-white">{task.totalCompletions}</p>
                    <p className="text-[9px] text-slate-500">Complétions</p>
                  </div>
                  <div className="glass-card-light rounded-lg p-2 text-center">
                    <p className="text-xs font-bold text-orange-400">{budgetSpent.toFixed(3)}</p>
                    <p className="text-[9px] text-slate-500">TON dépensé</p>
                  </div>
                  <div className="glass-card-light rounded-lg p-2 text-center">
                    <p className="text-xs font-bold text-slate-300">{remaining !== null ? remaining.toLocaleString() : '∞'}</p>
                    <p className="text-[9px] text-slate-500">Restantes</p>
                  </div>
                </div>

                {budgetTotal !== null && (
                  <div className="flex justify-between items-center text-xs pt-0.5">
                    <span className="text-slate-500">Budget total alloué</span>
                    <span className="text-amber-400 font-semibold">{budgetTotal.toFixed(3)} TON</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
