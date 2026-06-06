import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import { Hash, Users, Bot, UserPlus, Calendar, Star, ExternalLink, Edit2, Trash2, Plus, Tv, AlertCircle, Flame, CheckCircle, XCircle, Clock, FileText, Sparkles, RefreshCw, Loader2 } from 'lucide-react';

interface AdminUserTask {
  id: string;
  creatorId: number;
  type: string;
  title: string;
  description: string;
  targetUrl: string;
  reward: number;
  totalBudget: number;
  spent: number;
  status: string;
  completions: number;
  maxCompletions: number;
  adminNote: string;
  createdAt: string;
  approvedAt: string | null;
  username: string;
  firstName: string;
}

const taskTypeIcons: Record<string, React.ReactNode> = {
  join_channel: <Hash className="w-4 h-4" />,
  join_group: <Users className="w-4 h-4" />,
  start_bot: <Bot className="w-4 h-4" />,
  invite_friends: <UserPlus className="w-4 h-4" />,
  daily: <Calendar className="w-4 h-4" />,
  special: <Star className="w-4 h-4" />,
  social: <Star className="w-4 h-4" />,
  watch_video: <Tv className="w-4 h-4" />,
};

const taskTypeLabels: Record<string, string> = {
  join_channel: 'Canal',
  join_group: 'Groupe',
  start_bot: 'Bot',
  invite_friends: 'Invitation',
  daily: 'Quotidien',
  special: 'Spécial',
  social: 'Social',
  watch_video: 'Vidéo',
};

const taskTypeColors: Record<string, string> = {
  join_channel: 'bg-blue-500/20 text-blue-400',
  join_group: 'bg-purple-500/20 text-purple-400',
  start_bot: 'bg-cyan-500/20 text-cyan-400',
  invite_friends: 'bg-emerald-500/20 text-emerald-400',
  daily: 'bg-amber-500/20 text-amber-400',
  special: 'bg-pink-500/20 text-pink-400',
  social: 'bg-orange-500/20 text-orange-400',
  watch_video: 'bg-red-500/20 text-red-400',
};

export const AdminTasks: React.FC = () => {
  const { tasks, updateTask, deleteTask, openModal, taskSubmissions, reviewTaskSubmission } = useAppStore();
  const [rejectNotes,      setRejectNotes]      = useState<Record<string, string>>({});
  const [rejectOpen,       setRejectOpen]       = useState<string | null>(null);

  // User-created tasks from backend
  const [userTasks,        setUserTasks]        = useState<AdminUserTask[]>([]);
  const [userTasksLoading, setUserTasksLoading] = useState(true);
  const [utRejectOpen,     setUtRejectOpen]     = useState<string | null>(null);
  const [utRejectNotes,    setUtRejectNotes]    = useState<Record<string, string>>({});
  const [utActionLoading,  setUtActionLoading]  = useState<string | null>(null);
  const [utFilter,         setUtFilter]         = useState<string>('pending_approval');

  const fetchUserTasks = async () => {
    setUserTasksLoading(true);
    try {
      const res  = await fetch(`/api/admin/user-tasks?status=${utFilter}`);
      const data = await res.json() as AdminUserTask[];
      setUserTasks(data);
    } catch { /* offline */ }
    finally { setUserTasksLoading(false); }
  };

  useEffect(() => { void fetchUserTasks(); }, [utFilter]);

  const handleUtApprove = async (id: string) => {
    setUtActionLoading(id);
    try {
      await fetch(`/api/admin/user-tasks/${id}/approve`, { method: 'POST' });
      await fetchUserTasks();
    } finally { setUtActionLoading(null); }
  };

  const handleUtReject = async (id: string) => {
    setUtActionLoading(id);
    try {
      await fetch(`/api/admin/user-tasks/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: utRejectNotes[id]?.trim() || '' }),
      });
      setUtRejectOpen(null);
      setUtRejectNotes(prev => { const n = { ...prev }; delete n[id]; return n; });
      await fetchUserTasks();
    } finally { setUtActionLoading(null); }
  };

  const pendingUserTasksCount = userTasks.filter(t => t.status === 'pending_approval').length;

  const pendingSubmissions = taskSubmissions.filter(s => s.status === 'pending');
  const allSubmissions     = taskSubmissions;

  const handleApprove = (id: string) => reviewTaskSubmission(id, 'approved');
  const handleReject  = (id: string) => {
    reviewTaskSubmission(id, 'rejected', rejectNotes[id]?.trim() || undefined);
    setRejectOpen(null);
    setRejectNotes(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  function timeAgo(iso: string) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return 'À l\'instant';
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
    return `Il y a ${Math.floor(diff / 86400)} j`;
  }

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
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {Object.entries(taskTypeLabels).map(([type, label]) => {
          const count = tasks.filter(t => t.type === type).length;
          return (
            <div key={type} className="glass-card-light p-3 text-center">
              <div className={`w-8 h-8 rounded-lg ${taskTypeColors[type]} flex items-center justify-center mx-auto mb-2`}>
                {taskTypeIcons[type]}
              </div>
              <p className="text-[10px] text-slate-400">{label}</p>
              <p className="text-lg font-bold text-white">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Aucune tâche configurée</p>
          <button onClick={() => openModal('task')} className="mt-4 btn-primary px-4 py-2 rounded-xl text-sm font-medium text-white">
            Créer la première tâche
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => {
            const isPromoActive = task.promotion && new Date(task.promotion.endsAt) > new Date();
            return (
              <div key={task.id} className={`glass-card p-5 hover:border-white/10 transition-all ${isPromoActive ? 'border border-amber-500/20' : ''}`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl ${taskTypeColors[task.type] ?? 'bg-white/10 text-slate-400'} flex items-center justify-center flex-shrink-0`}>
                    {task.icon ? <span className="text-base">{task.icon}</span> : taskTypeIcons[task.type]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-sm font-semibold text-white">{task.title}</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 text-slate-400">
                        {taskTypeLabels[task.type] ?? task.type}
                      </span>
                      {isPromoActive && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[9px] font-bold">
                          <Flame className="w-2.5 h-2.5" /> PROMO ×{task.promotion!.multiplier}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mb-2">{task.description}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="text-emerald-400 font-semibold">+{task.reward.toFixed(2)} TON</span>
                      {isPromoActive && <span className="text-amber-400">→ +{(task.reward * task.promotion!.multiplier).toFixed(2)} TON (promo)</span>}
                      <span>✅ {task.totalCompletions.toLocaleString()} complétions</span>
                      {task.maxCompletions && <span>📊 Max: {task.maxCompletions}</span>}
                      {task.cooldownHours && <span>⏱️ Cooldown: {task.cooldownHours}h</span>}
                      {task.expiresAt && <span>📅 Expire: {new Date(task.expiresAt).toLocaleDateString('fr-FR')}</span>}
                      {task.promotion && <span className="text-amber-400/70">Promo jusqu'au {new Date(task.promotion.endsAt).toLocaleDateString('fr-FR')}</span>}
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
                        style={{ width: `${Math.min((task.totalCompletions / task.maxCompletions) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── User-created tasks (marketplace) ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" /> Campagnes utilisateurs
            </h3>
            <p className="text-slate-400 text-sm mt-0.5">
              Tâches créées par les utilisateurs — approbation requise
              {pendingUserTasksCount > 0 && <span className="ml-2 text-amber-400 font-semibold">({pendingUserTasksCount} en attente)</span>}
            </p>
          </div>
          <button onClick={() => void fetchUserTasks()} className="p-2 rounded-lg hover:bg-white/5 text-slate-500">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {[
            { value: 'pending_approval', label: 'En attente' },
            { value: 'active',           label: 'Actives' },
            { value: 'all',              label: 'Toutes' },
          ].map(f => (
            <button key={f.value} onClick={() => setUtFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${utFilter === f.value ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'glass-card-light text-slate-400'}`}>
              {f.label}
            </button>
          ))}
        </div>

        {userTasksLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
          </div>
        ) : userTasks.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-400">Aucune campagne {utFilter === 'pending_approval' ? 'en attente' : ''}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {userTasks.map(task => {
              const isActionLoading = utActionLoading === task.id;
              const isRejectOpen    = utRejectOpen === task.id;
              const statusMap: Record<string, string> = {
                pending_approval: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                active:           'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                paused:           'bg-amber-500/10 text-amber-400 border-amber-500/20',
                rejected:         'bg-red-500/10 text-red-400 border-red-500/20',
                depleted:         'bg-white/5 text-slate-400 border-white/10',
              };
              const statusCls = statusMap[task.status] ?? statusMap.pending_approval;

              return (
                <div key={task.id} className={`glass-card p-4 space-y-3 border ${task.status === 'pending_approval' ? 'border-amber-500/20' : 'border-white/5'}`}>
                  <div className="flex items-start gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-white">{task.title}</span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-lg border ${statusCls}`}>{task.status}</span>
                      </div>
                      <p className="text-xs text-slate-400 mb-1">{task.description}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-slate-500">
                        <span>👤 {task.firstName} @{task.username || 'inconnu'} (<code>{task.creatorId}</code>)</span>
                        <span>🔗 <a href={task.targetUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">{task.targetUrl}</a></span>
                        <span>💰 {task.reward.toFixed(4)} TON/exec — Budget: {task.totalBudget.toFixed(3)} TON</span>
                        <span>📊 {task.completions}/{task.maxCompletions} complétions</span>
                        <span>🕐 {timeAgo(task.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {task.adminNote && (
                    <p className="text-xs text-slate-500">Note: <span className="text-slate-400">{task.adminNote}</span></p>
                  )}

                  {task.status === 'pending_approval' && !isRejectOpen && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => void handleUtApprove(task.id)}
                        disabled={isActionLoading}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/25 transition-all disabled:opacity-40"
                      >
                        {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle className="w-3.5 h-3.5" /> Approuver</>}
                      </button>
                      <button
                        onClick={() => setUtRejectOpen(task.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Refuser
                      </button>
                    </div>
                  )}

                  {isRejectOpen && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={utRejectNotes[task.id] ?? ''}
                        onChange={e => setUtRejectNotes(prev => ({ ...prev, [task.id]: e.target.value }))}
                        placeholder="Motif du refus (optionnel)..."
                        className="w-full px-3 py-2 bg-white/5 border border-red-500/20 rounded-xl text-white text-xs focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => void handleUtReject(task.id)}
                          disabled={isActionLoading}
                          className="flex-1 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold disabled:opacity-40"
                        >
                          {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Confirmer le refus'}
                        </button>
                        <button onClick={() => setUtRejectOpen(null)} className="flex-1 py-2 rounded-xl bg-white/5 text-slate-400 text-xs">Annuler</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Promo Task Submissions ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Soumissions de preuves</h3>
            <p className="text-slate-400 text-sm mt-0.5">
              {pendingSubmissions.length} en attente · {allSubmissions.length} total
            </p>
          </div>
          {pendingSubmissions.length > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/20 text-amber-400 text-xs font-semibold">
              {pendingSubmissions.length} à traiter
            </span>
          )}
        </div>

        {allSubmissions.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <FileText className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-400">Aucune soumission pour l'instant</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allSubmissions.map(sub => {
              const task = tasks.find(t => t.id === sub.taskId);
              const isRejectOpen = rejectOpen === sub.id;

              return (
                <div key={sub.id} className={`glass-card p-4 space-y-3 border ${sub.status === 'approved' ? 'border-emerald-500/20' : sub.status === 'rejected' ? 'border-red-500/15 opacity-70' : 'border-amber-500/20'}`}>
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${sub.status === 'approved' ? 'bg-emerald-500/20' : sub.status === 'rejected' ? 'bg-red-500/20' : 'bg-amber-500/20'}`}>
                      {sub.status === 'approved' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : sub.status === 'rejected' ? <XCircle className="w-4 h-4 text-red-400" /> : <Clock className="w-4 h-4 text-amber-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">@{sub.username}</span>
                        <span className="text-[10px] text-slate-500">→</span>
                        <span className="text-xs text-slate-300 truncate">{task?.title ?? sub.taskId}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{timeAgo(sub.createdAt)}</p>
                    </div>
                    <div>
                      {sub.status === 'approved' && <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">Approuvé</span>}
                      {sub.status === 'rejected' && <span className="text-xs font-medium text-red-400 bg-red-500/10 px-2 py-1 rounded-lg">Refusé</span>}
                      {sub.status === 'pending' && <span className="text-xs font-medium text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg">En attente</span>}
                    </div>
                  </div>

                  {/* Proof text */}
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/8">
                    <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Preuve soumise</p>
                    <p className="text-xs text-slate-300 leading-relaxed break-all">{sub.proofText}</p>
                  </div>

                  {sub.adminNote && (
                    <p className="text-xs text-slate-500">Note admin: <span className="text-slate-400">{sub.adminNote}</span></p>
                  )}

                  {/* Actions — pending only */}
                  {sub.status === 'pending' && (
                    <div className="space-y-2">
                      {!isRejectOpen ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(sub.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/25 transition-all"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Approuver
                          </button>
                          <button
                            onClick={() => setRejectOpen(sub.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Refuser
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={rejectNotes[sub.id] ?? ''}
                            onChange={e => setRejectNotes(prev => ({ ...prev, [sub.id]: e.target.value }))}
                            placeholder="Motif du refus (optionnel)..."
                            className="w-full px-3 py-2 bg-white/5 border border-red-500/20 rounded-xl text-white text-xs focus:outline-none focus:border-red-500/40"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleReject(sub.id)}
                              className="flex-1 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/25 transition-all"
                            >
                              Confirmer le refus
                            </button>
                            <button
                              onClick={() => setRejectOpen(null)}
                              className="flex-1 py-2 rounded-xl bg-white/5 text-slate-400 text-xs font-medium hover:bg-white/10 transition-all"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
