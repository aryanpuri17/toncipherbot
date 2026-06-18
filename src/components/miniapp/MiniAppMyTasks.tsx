import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import {
  Hash, Users, Bot, TrendingUp, Pause, Play, Trash2, PlusCircle,
  AlertCircle, X, Loader2, Clock, RefreshCw,
} from 'lucide-react';

const typeConfig: Record<string, { icon: React.ReactNode; bg: string; text: string; label: string }> = {
  join_channel: { icon: <Hash className="w-4 h-4" />,  bg: 'bg-blue-500/20',   text: 'text-blue-400',   label: 'Canal'  },
  join_group:   { icon: <Users className="w-4 h-4" />, bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Groupe' },
  start_bot:    { icon: <Bot className="w-4 h-4" />,   bg: 'bg-cyan-500/20',   text: 'text-cyan-400',   label: 'Bot'    },
};

interface ApiUserTask {
  id: string;
  type: string;
  title: string;
  description: string;
  targetUrl: string;
  reward: number;
  totalBudget: number;
  spent: number;
  status: 'pending_approval' | 'active' | 'paused' | 'rejected' | 'depleted';
  completions: number;
  maxCompletions: number;
  adminNote: string;
  createdAt: string;
  approvedAt: string | null;
}

const statusMap: Record<string, { label: string; dot: string; cls: string }> = {
  pending_approval: { label: 'En attente',  dot: 'bg-amber-400',   cls: 'text-amber-400 bg-amber-500/10 border-amber-500/25'      },
  active:           { label: 'Active',      dot: 'bg-emerald-400', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' },
  paused:           { label: 'En pause',    dot: 'bg-amber-400',   cls: 'text-amber-400 bg-amber-500/10 border-amber-500/25'      },
  rejected:         { label: 'Refusée',     dot: 'bg-red-400',     cls: 'text-red-400 bg-red-500/10 border-red-500/25'            },
  depleted:         { label: 'Terminée',    dot: 'bg-slate-500',   cls: 'text-slate-400 bg-white/5 border-white/10'               },
};

const StatusBadge: React.FC<{ status: ApiUserTask['status'] }> = ({ status }) => {
  const cfg = statusMap[status] ?? statusMap.pending_approval;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

export const MiniAppMyTasks: React.FC = () => {
  const { currentUser, setMiniAppPage, updateUser, platformConfig, addPlatformRevenue } = useAppStore();

  const priceFixed = platformConfig.taskPricePerExecution ?? 0.05;
  const feeRate    = platformConfig.taskCreationFeeRate   ?? 0.15;

  const [tasks,         setTasks]         = useState<ApiUserTask[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [budgetTaskId,  setBudgetTaskId]  = useState<string | null>(null);
  const [addExecs,      setAddExecs]      = useState('');
  const [budgetError,   setBudgetError]   = useState('');
  const [apiError,      setApiError]      = useState('');

  const fetchTasks = useCallback(async () => {
    const telegramId = currentUser.telegramId;
    if (!telegramId) { setLoading(false); return; }
    try {
      const res  = await fetch(`/api/user-tasks/mine?telegram_id=${telegramId}`);
      const data = await res.json() as ApiUserTask[];
      setTasks(data);

      // Auto-refund rejected tasks
      const pending  = JSON.parse(localStorage.getItem('tc_task_pending')  ?? '[]') as { id: string; amount: number }[];
      const refunded = JSON.parse(localStorage.getItem('tc_task_refunded') ?? '[]') as string[];
      const toRefund = data.filter(t => t.status === 'rejected' && !refunded.includes(t.id));

      let totalRefund = 0;
      const newPending  = [...pending];
      const newRefunded = [...refunded];

      for (const task of toRefund) {
        const idx = newPending.findIndex(p => p.id === task.id);
        if (idx !== -1) {
          totalRefund += newPending[idx].amount;
          newPending.splice(idx, 1);
          newRefunded.push(task.id);
        }
      }
      if (totalRefund > 0) {
        const state = useAppStore.getState();
        state.updateUser(state.currentUser.id, { balanceMain: state.currentUser.balanceMain + totalRefund });
        localStorage.setItem('tc_task_pending',  JSON.stringify(newPending));
        localStorage.setItem('tc_task_refunded', JSON.stringify(newRefunded));
      }
    } catch {
      setApiError('Impossible de charger vos campagnes — vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }, [currentUser.telegramId]);

  useEffect(() => { void fetchTasks(); }, [fetchTasks]);

  const callApi = async (url: string, body: object): Promise<{ success: boolean; refund?: number; status?: string }> => {
    const res  = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await res.json() as { success: boolean; refund?: number; status?: string };
  };

  const handleTogglePause = async (task: ApiUserTask) => {
    setActionLoading(task.id);
    setApiError('');
    try {
      const r = await callApi(`/api/user-tasks/${task.id}/pause`, { telegramId: currentUser.telegramId });
      if (r.success) await fetchTasks();
    } catch { setApiError('Erreur réseau.'); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async (task: ApiUserTask) => {
    setActionLoading(task.id);
    setApiError('');
    try {
      const r = await callApi(`/api/user-tasks/${task.id}/delete`, { telegramId: currentUser.telegramId });
      if (r.success) {
        const refund = r.refund ?? 0;
        if (refund > 0) updateUser(currentUser.id, { balanceMain: useAppStore.getState().currentUser.balanceMain + refund });
        // Remove from localStorage pending if present
        const pending = JSON.parse(localStorage.getItem('tc_task_pending') ?? '[]') as { id: string; amount: number }[];
        localStorage.setItem('tc_task_pending', JSON.stringify(pending.filter(p => p.id !== task.id)));
        await fetchTasks();
      }
    } catch { setApiError('Erreur réseau.'); }
    finally { setActionLoading(null); setConfirmDelete(null); }
  };

  const additionalExecs = Math.max(0, parseInt(addExecs) || 0);
  const additionalCost  = additionalExecs * priceFixed;

  const handleAddBudget = async (task: ApiUserTask) => {
    setBudgetError('');
    if (additionalExecs < 1) { setBudgetError('Entrez un nombre valide.'); return; }
    if (currentUser.balanceMain < additionalCost) {
      setBudgetError(`Solde insuffisant. Disponible: ${currentUser.balanceMain.toFixed(4)} GRAM, requis: ${additionalCost.toFixed(4)} TON.`);
      return;
    }
    setActionLoading(task.id);
    try {
      const r = await callApi(`/api/user-tasks/${task.id}/fund`, {
        telegramId:      currentUser.telegramId,
        extraExecutions: additionalExecs,
        extraBudget:     additionalCost,
      });
      if (r.success) {
        updateUser(currentUser.id, { balanceMain: useAppStore.getState().currentUser.balanceMain - additionalCost });
        addPlatformRevenue(additionalCost * feeRate);
        // Update localStorage pending
        const pending = JSON.parse(localStorage.getItem('tc_task_pending') ?? '[]') as { id: string; amount: number }[];
        const idx = pending.findIndex(p => p.id === task.id);
        if (idx !== -1) pending[idx].amount += additionalCost;
        localStorage.setItem('tc_task_pending', JSON.stringify(pending));
        setBudgetTaskId(null);
        setAddExecs('');
        await fetchTasks();
      }
    } catch { setBudgetError('Erreur réseau.'); }
    finally { setActionLoading(null); }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0098EA' }} />
        <p className="text-sm text-slate-500">Chargement de vos campagnes…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMiniAppPage('tasks')}
            className="p-2 rounded-lg hover:bg-white/5 text-slate-400 transition-colors"
          >←</button>
          <div>
            <h1 className="text-xl font-bold text-white">Mes campagnes</h1>
            {tasks.length > 0 && (
              <p className="text-xs font-medium" style={{ color: '#0098EA' }}>
                {tasks.length} campagne{tasks.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => void fetchTasks()}
          className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {apiError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400">{apiError}</p>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/60 flex items-center justify-center">
            <TrendingUp className="w-7 h-7 text-slate-600" />
          </div>
          <p className="text-sm font-semibold text-slate-400">Aucune campagne créée</p>
          <p className="text-xs text-slate-600 text-center px-6">
            Créez une tâche pour promouvoir votre canal ou bot Telegram.
          </p>
          <button
            onClick={() => setMiniAppPage('createTask')}
            className="mt-2 px-5 py-2.5 rounded-xl btn-primary text-sm font-semibold text-white"
          >
            Créer une tâche
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => {
            const cfg       = typeConfig[task.type] ?? typeConfig.join_channel;
            const remaining = task.maxCompletions - task.completions;
            const isFull    = remaining <= 0;
            const progress  = task.maxCompletions > 0 ? Math.min(task.completions / task.maxCompletions, 1) : 0;
            const isLoading = actionLoading === task.id;

            const isConfirmingDelete = confirmDelete === task.id;
            const isExpandingBudget  = budgetTaskId  === task.id;
            const canManage          = task.status === 'active' || task.status === 'paused';

            return (
              <div
                key={task.id}
                className={`glass-card p-4 space-y-3 transition-all ${task.status === 'rejected' ? 'opacity-60' : ''}`}
              >
                {/* Header row */}
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg} ${cfg.text}`}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-sm font-semibold text-white truncate">{task.title}</h3>
                      <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-semibold ${cfg.bg} ${cfg.text} shrink-0`}>
                        {cfg.label}
                      </span>
                    </div>
                    <StatusBadge status={task.status} />
                    {task.status === 'pending_approval' && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <p className="text-[10px] text-amber-400/80">En attente de validation</p>
                      </div>
                    )}
                    {task.status === 'rejected' && task.adminNote && (
                      <p className="text-[10px] text-red-400/80 mt-1">Motif : {task.adminNote}</p>
                    )}
                    {task.status === 'rejected' && (
                      <p className="text-[10px] text-emerald-400 mt-1">Budget remboursé automatiquement</p>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-[10px] mb-1.5">
                    <span className="text-slate-400 font-medium">{task.completions.toLocaleString()} complétions</span>
                    <span className="text-slate-500">{task.maxCompletions.toLocaleString()} max</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isFull ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                      }`}
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: task.completions.toLocaleString(), label: 'Complétions', color: 'text-white' },
                    { value: task.spent.toFixed(3),             label: 'TON dépensé', color: 'text-orange-400' },
                    { value: remaining.toLocaleString(),         label: 'Restantes',   color: isFull ? 'text-emerald-400' : 'text-slate-300' },
                  ].map(stat => (
                    <div key={stat.label} className="glass-card-light rounded-xl p-2 text-center">
                      <p className={`text-xs font-bold ${stat.color}`}>{stat.value}</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center text-xs px-0.5">
                  <span className="text-slate-500">Budget total</span>
                  <span className="text-amber-400 font-semibold">{task.totalBudget.toFixed(3)} TON</span>
                </div>

                {/* Actions */}
                {canManage && !isFull && !isConfirmingDelete && !isExpandingBudget && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => void handleTogglePause(task)}
                      disabled={isLoading}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all flex-1 justify-center disabled:opacity-40 ${task.status === 'active' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'}`}
                    >
                      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : task.status === 'active' ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5" /> Reprendre</>}
                    </button>
                    <button
                      onClick={() => { setBudgetTaskId(task.id); setAddExecs(''); setBudgetError(''); }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-all flex-1 justify-center"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Budget
                    </button>
                    <button
                      onClick={() => setConfirmDelete(task.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Completed task — delete only */}
                {(isFull || task.status === 'depleted') && !isConfirmingDelete && (
                  <button
                    onClick={() => setConfirmDelete(task.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Supprimer
                  </button>
                )}

                {/* Delete confirmation */}
                {isConfirmingDelete && (
                  <div className="border-t border-white/5 pt-3 space-y-2">
                    <p className="text-xs text-slate-300 font-medium">Supprimer cette campagne ?</p>
                    {remaining > 0 && (task.status === 'active' || task.status === 'paused') && (
                      <p className="text-xs text-emerald-400">
                        Remboursement : <span className="font-bold">+{(remaining * priceFixed).toFixed(4)} TON</span> ({remaining} exécutions non utilisées)
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => void handleDelete(task)}
                        disabled={isLoading}
                        className="flex-1 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/25 transition-all disabled:opacity-40"
                      >
                        {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Supprimer'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="flex-1 py-2 rounded-xl bg-white/5 text-slate-400 text-xs font-medium hover:bg-white/10 transition-all"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}

                {/* Add budget form */}
                {isExpandingBudget && (
                  <div className="border-t border-white/5 pt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-white">Augmenter le budget</p>
                      <button onClick={() => { setBudgetTaskId(null); setBudgetError(''); }} className="text-slate-500 hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-slate-500">Exécutions à ajouter (× {priceFixed.toFixed(4)} GRAM)</p>
                      <input
                        type="number" min="1" value={addExecs}
                        onChange={e => { setAddExecs(e.target.value); setBudgetError(''); }}
                        placeholder="Ex: 500"
                        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-blue-500/50"
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Coût supplémentaire</span>
                      <span className={`font-semibold ${additionalExecs > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                        {additionalExecs > 0 ? `${additionalCost.toFixed(4)} GRAM` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Votre solde</span>
                      <span className={`font-semibold ${currentUser.balanceMain >= additionalCost && additionalCost > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {currentUser.balanceMain.toFixed(4)} GRAM
                      </span>
                    </div>
                    {budgetError && (
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/5 border border-red-500/20">
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-400">{budgetError}</p>
                      </div>
                    )}
                    <button
                      onClick={() => void handleAddBudget(task)}
                      disabled={additionalExecs < 1 || isLoading}
                      className="w-full py-2.5 rounded-xl btn-primary text-xs font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isLoading
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
                        : `Confirmer — ${additionalExecs > 0 ? `${additionalCost.toFixed(4)} GRAM` : '0 GRAM'}`
                      }
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={() => setMiniAppPage('createTask')}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-all"
        style={{ borderColor: 'rgba(0,152,234,0.25)', color: '#0098EA', background: 'rgba(0,152,234,0.06)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,152,234,0.12)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,152,234,0.06)')}
      >
        <PlusCircle className="w-4 h-4" /> Créer une nouvelle tâche
      </button>
    </div>
  );
};
