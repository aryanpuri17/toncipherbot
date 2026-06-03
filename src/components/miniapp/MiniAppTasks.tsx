import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { Hash, Users, Bot, UserPlus, Calendar, Star, CheckCircle, ExternalLink } from 'lucide-react';

const typeConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  join_channel: { icon: <Hash className="w-4 h-4" />, color: 'bg-blue-500/20 text-blue-400', label: 'Canal' },
  join_group: { icon: <Users className="w-4 h-4" />, color: 'bg-purple-500/20 text-purple-400', label: 'Groupe' },
  start_bot: { icon: <Bot className="w-4 h-4" />, color: 'bg-cyan-500/20 text-cyan-400', label: 'Bot' },
  invite_friends: { icon: <UserPlus className="w-4 h-4" />, color: 'bg-emerald-500/20 text-emerald-400', label: 'Invitation' },
  daily: { icon: <Calendar className="w-4 h-4" />, color: 'bg-amber-500/20 text-amber-400', label: 'Quotidien' },
  special: { icon: <Star className="w-4 h-4" />, color: 'bg-pink-500/20 text-pink-400', label: 'Spécial' },
};

export const MiniAppTasks: React.FC = () => {
  const { tasks } = useAppStore();
  const [filter, setFilter] = useState<string>('all');
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  const activeTasks = tasks.filter(t => t.isActive);
  const filtered = filter === 'all' ? activeTasks : activeTasks.filter(t => t.type === filter);

  const handleComplete = (taskId: string) => {
    setCompletedTasks(prev => new Set(prev).add(taskId));
  };

  const filters = [
    { id: 'all', label: 'Tout' },
    { id: 'join_channel', label: '📢 Canal' },
    { id: 'join_group', label: '👥 Groupe' },
    { id: 'start_bot', label: '🤖 Bot' },
    { id: 'daily', label: '📅 Quotidien' },
    { id: 'special', label: '⭐ Spécial' },
  ];

  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h1 className="text-xl font-bold text-white">Tâches</h1>
        <p className="text-sm text-slate-400">{activeTasks.length} tâches disponibles</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${filter === f.id ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-slate-400 border border-transparent'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filtered.map(task => {
          const config = typeConfig[task.type];
          const isCompleted = completedTasks.has(task.id);

          return (
            <div key={task.id} className={`glass-card p-4 transition-all ${isCompleted ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.color}`}>
                  {config.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-sm font-semibold text-white">{task.title}</h3>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-white/5 text-slate-400">
                      {config.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">{task.description}</p>

                  {task.maxCompletions && (
                    <div className="mb-2">
                      <div className="progress-bar">
                        <div className="progress-bar-fill bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: `${(task.totalCompletions / task.maxCompletions) * 100}%` }} />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{task.totalCompletions}/{task.maxCompletions} places</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-emerald-400">+${task.reward.toFixed(2)}</span>
                    {task.rewardType === 'bonus' && <span className="text-[10px] text-purple-400 font-medium">(Bonus)</span>}
                    {task.rewardType === 'xp' && <span className="text-[10px] text-amber-400 font-medium">(XP)</span>}
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  ) : (
                    <button
                      onClick={() => handleComplete(task.id)}
                      className="px-4 py-2 rounded-xl btn-primary text-xs font-semibold text-white flex items-center gap-1.5"
                    >
                      Faire <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
