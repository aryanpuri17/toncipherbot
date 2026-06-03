import React from 'react';
import { useAppStore } from '../../store/appStore';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import { Hash, Users, Bot, UserPlus, Calendar, Star, ExternalLink, Edit2, Trash2, Plus } from 'lucide-react';

const taskTypeIcons: Record<string, React.ReactNode> = {
  join_channel: <Hash className="w-4 h-4" />,
  join_group: <Users className="w-4 h-4" />,
  start_bot: <Bot className="w-4 h-4" />,
  invite_friends: <UserPlus className="w-4 h-4" />,
  daily: <Calendar className="w-4 h-4" />,
  special: <Star className="w-4 h-4" />,
};

const taskTypeLabels: Record<string, string> = {
  join_channel: 'Canal',
  join_group: 'Groupe',
  start_bot: 'Bot',
  invite_friends: 'Invitation',
  daily: 'Quotidien',
  special: 'Spécial',
};

const taskTypeColors: Record<string, string> = {
  join_channel: 'bg-blue-500/20 text-blue-400',
  join_group: 'bg-purple-500/20 text-purple-400',
  start_bot: 'bg-cyan-500/20 text-cyan-400',
  invite_friends: 'bg-emerald-500/20 text-emerald-400',
  daily: 'bg-amber-500/20 text-amber-400',
  special: 'bg-pink-500/20 text-pink-400',
};

export const AdminTasks: React.FC = () => {
  const { tasks, updateTask, deleteTask, openModal } = useAppStore();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Tâches</h2>
          <p className="text-slate-400 text-sm mt-1">{tasks.length} tâches configurées</p>
        </div>
        <button onClick={() => openModal('task')} className="btn-primary px-4 py-2.5 rounded-xl text-sm font-medium text-white flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouvelle tâche
        </button>
      </div>

      {/* Task Types Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(taskTypeLabels).map(([type, label]) => {
          const count = tasks.filter(t => t.type === type).length;
          return (
            <div key={type} className="glass-card-light p-3 text-center">
              <div className={`w-8 h-8 rounded-lg ${taskTypeColors[type]} flex items-center justify-center mx-auto mb-2`}>
                {taskTypeIcons[type]}
              </div>
              <p className="text-xs text-slate-400">{label}</p>
              <p className="text-lg font-bold text-white">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {tasks.map(task => (
          <div key={task.id} className="glass-card p-5 hover:border-white/10 transition-all">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className={`w-10 h-10 rounded-xl ${taskTypeColors[task.type]} flex items-center justify-center flex-shrink-0`}>
                {taskTypeIcons[task.type]}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-white">{task.title}</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 text-slate-400">
                    {taskTypeLabels[task.type]}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-2">{task.description}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>💰 {task.reward.toFixed(2)} ({task.rewardType})</span>
                  <span>✅ {task.totalCompletions.toLocaleString()} complétions</span>
                  {task.maxCompletions && <span>📊 Max: {task.maxCompletions}</span>}
                  {task.cooldownHours && <span>⏱️ Cooldown: {task.cooldownHours}h</span>}
                  {task.expiresAt && <span>📅 Expire: {new Date(task.expiresAt).toLocaleDateString('fr-FR')}</span>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {task.targetUrl && (
                  <a href={task.targetUrl} target="_blank" rel="noreferrer" className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-blue-400 transition-colors">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                <button onClick={() => openModal('task', { task })} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => deleteTask(task.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
                <ToggleSwitch
                  enabled={task.isActive}
                  onChange={(v) => updateTask(task.id, { isActive: v })}
                  size="sm"
                />
              </div>
            </div>

            {task.maxCompletions && (
              <div className="mt-3 pt-3 border-t border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500">Progression</span>
                  <span className="text-xs text-slate-400">{task.totalCompletions}/{task.maxCompletions}</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill bg-gradient-to-r from-blue-500 to-purple-500"
                    style={{ width: `${(task.totalCompletions / task.maxCompletions) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
