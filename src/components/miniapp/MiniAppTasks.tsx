import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { Hash, Users, Bot, UserPlus, Calendar, Star, CheckCircle, ExternalLink, Plus, AlertCircle } from 'lucide-react';

const typeConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  join_channel: { icon: <Hash className="w-4 h-4" />, color: 'bg-blue-500/20 text-blue-400', label: 'Canal' },
  join_group: { icon: <Users className="w-4 h-4" />, color: 'bg-purple-500/20 text-purple-400', label: 'Groupe' },
  start_bot: { icon: <Bot className="w-4 h-4" />, color: 'bg-cyan-500/20 text-cyan-400', label: 'Bot' },
  invite_friends: { icon: <UserPlus className="w-4 h-4" />, color: 'bg-emerald-500/20 text-emerald-400', label: 'Invitation' },
  daily: { icon: <Calendar className="w-4 h-4" />, color: 'bg-amber-500/20 text-amber-400', label: 'Quotidien' },
  special: { icon: <Star className="w-4 h-4" />, color: 'bg-pink-500/20 text-pink-400', label: 'Spécial' },
  social: { icon: <Star className="w-4 h-4" />, color: 'bg-orange-500/20 text-orange-400', label: 'Social' },
  watch_video: { icon: <Star className="w-4 h-4" />, color: 'bg-red-500/20 text-red-400', label: 'Vidéo' },
};

export const MiniAppTasks: React.FC = () => {
  const { tasks, completedTaskIds, completeTask, setMiniAppPage } = useAppStore();
  const [filter, setFilter] = useState<string>('all');
  const [justCompleted, setJustCompleted] = useState<string | null>(null);

  const activeTasks = tasks.filter(t => t.isActive);
  const filtered = filter === 'all' ? activeTasks : activeTasks.filter(t => t.type === filter);

  const handleComplete = (task: typeof tasks[0]) => {
    if (completedTaskIds.includes(task.id)) return;

    // Open target URL in Telegram WebApp if available
    if (task.targetUrl) {
      const tg = (window as unknown as { Telegram?: { WebApp?: { openTelegramLink?: (url: string) => void; openLink?: (url: string) => void } } }).Telegram?.WebApp;
      if (tg?.openTelegramLink && task.targetUrl.includes('t.me')) {
        tg.openTelegramLink(task.targetUrl);
      } else if (tg?.openLink) {
        tg.openLink(task.targetUrl);
      } else {
        window.open(task.targetUrl, '_blank');
      }
    }

    completeTask(task.id);
    setJustCompleted(task.id);
    setTimeout(() => setJustCompleted(null), 2000);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Tâches</h1>
          <p className="text-sm text-slate-400">{activeTasks.length} tâches disponibles</p>
        </div>
        <button
          onClick={() => setMiniAppPage('createTask')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl btn-primary text-xs font-semibold text-white"
        >
          <Plus className="w-3.5 h-3.5" /> Créer
        </button>
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
          const config = typeConfig[task.type] ?? typeConfig.special;
          const isCompleted = completedTaskIds.includes(task.id);
          const isJustDone = justCompleted === task.id;

          return (
            <div key={task.id} className={`glass-card p-4 transition-all ${isCompleted ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.color}`}>
                  {task.icon ? <span className="text-base">{task.icon}</span> : config.icon}
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
                        <div className="progress-bar-fill bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: `${Math.min((task.totalCompletions / task.maxCompletions) * 100, 100)}%` }} />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{task.totalCompletions}/{task.maxCompletions} places</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-emerald-400">+{task.reward.toFixed(2)} TON</span>
                    {task.rewardType === 'bonus' && <span className="text-[10px] text-purple-400 font-medium">(Bonus)</span>}
                    {task.rewardType === 'xp' && <span className="text-[10px] text-amber-400 font-medium">(XP)</span>}
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  ) : isJustDone ? (
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 animate-pulse">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  ) : (
                    <button
                      onClick={() => handleComplete(task)}
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

        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10">
            <AlertCircle className="w-8 h-8 text-slate-600" />
            <p className="text-sm text-slate-500">Aucune tâche dans cette catégorie</p>
          </div>
        )}
      </div>
    </div>
  );
};
