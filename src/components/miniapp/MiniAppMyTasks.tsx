import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { Hash, Users, Bot, Calendar, TrendingUp, Pause, Play, Trash2, PlusCircle, AlertCircle, CheckCircle, X } from 'lucide-react';

const typeConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  join_channel: { icon: <Hash className="w-4 h-4" />,     color: 'bg-blue-500/20 text-blue-400',     label: 'Canal' },
  join_group:   { icon: <Users className="w-4 h-4" />,    color: 'bg-purple-500/20 text-purple-400', label: 'Groupe' },
  start_bot:    { icon: <Bot className="w-4 h-4" />,      color: 'bg-cyan-500/20 text-cyan-400',     label: 'Bot' },
  daily:        { icon: <Calendar className="w-4 h-4" />, color: 'bg-amber-500/20 text-amber-400',   label: 'Quotidien' },
};

export const MiniAppMyTasks: React.FC = () => {
  const {
    tasks, currentUser, setMiniAppPage,
    updateTask, deleteTask, updateUser,
    platformConfig, addPlatformRevenue,
  } = useAppStore();

  const feeRate    = platformConfig.taskCreationFeeRate   ?? 0.15;
  const priceFixed = platformConfig.taskPricePerExecution ?? 0.05;

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [budgetTaskId,  setBudgetTaskId]  = useState<string | null>(null);
  const [addExecs,      setAddExecs]      = useState('');
  const [budgetError,   setBudgetError]   = useState('');

  const myTasks = tasks
    .filter(t => t.createdByUserId === currentUser.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // ── Pause / Resume ────────────────────────────────────────────
  const handleTogglePause = (task: typeof tasks[0]) => {
    updateTask(task.id, { isActive: !task.isActive });
  };

  // ── Delete with refund ────────────────────────────────────────
  const handleDelete = (task: typeof tasks[0]) => {
    const remaining = (task.maxCompletions ?? 0) - task.totalCompletions;
    const refund = Math.max(0, remaining) * priceFixed;
    if (refund > 0) {
      updateUser(currentUser.id, { balanceMain: currentUser.balanceMain + refund });
    }
    deleteTask(task.id);
    setConfirmDelete(null);
  };

  // ── Add budget ────────────────────────────────────────────────
  const additionalExecs = Math.max(0, parseInt(addExecs) || 0);
  const additionalCost  = additionalExecs * priceFixed;

  const handleAddBudget = (task: typeof tasks[0]) => {
    setBudgetError('');
    if (additionalExecs < 1) { setBudgetError('Entrez un nombre valide.'); return; }
    if (currentUser.balanceMain < additionalCost) {
      setBudgetError(
        `Solde insuffisant. Disponible: ${currentUser.balanceMain.toFixed(4)} TON, requis: ${additionalCost.toFixed(4)} TON. Veuillez recharger votre compte.`
      );
      return;
    }
    updateUser(currentUser.id, { balanceMain: currentUser.balanceMain - additionalCost });
    addPlatformRevenue(additionalCost * feeRate);
    updateTask(task.id, { maxCompletions: (task.maxCompletions ?? 0) + additionalExecs });
    setBudgetTaskId(null);
    setAddExecs('');
    setBudgetError('');
  };

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
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
            const remaining = task.maxCompletions != null ? task.maxCompletions - task.totalCompletions : null;
            const isFull = remaining !== null && remaining <= 0;
            const progress = task.maxCompletions
              ? Math.min(task.totalCompletions / task.maxCompletions, 1) : 0;
            const budgetSpent = task.totalCompletions * priceFixed;
            const budgetTotal = task.maxCompletions != null ? task.maxCompletions * priceFixed : null;
            const refundable = Math.max(0, remaining ?? 0) * priceFixed;

            const isConfirmingDelete = confirmDelete === task.id;
            const isExpandingBudget  = budgetTaskId === task.id;

            return (
              <div key={task.id} className={`glass-card p-4 space-y-3 transition-all ${!task.isActive && !isFull ? 'opacity-70' : ''}`}>
                {/* Header row */}
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
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                          <CheckCircle className="w-3 h-3" /> Terminée
                        </span>
                      ) : !task.isActive ? (
                        <span className="text-[10px] text-amber-400 font-medium">⏸ En pause</span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 font-medium">● Active</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress */}
                {task.maxCompletions != null && (
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

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
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
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Budget total</span>
                    <span className="text-amber-400 font-semibold">{budgetTotal.toFixed(3)} TON</span>
                  </div>
                )}

                {/* Action buttons */}
                {!isFull && !isConfirmingDelete && !isExpandingBudget && (
                  <div className="flex gap-2 pt-1">
                    {/* Pause / Resume */}
                    <button
                      onClick={() => handleTogglePause(task)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all flex-1 justify-center ${task.isActive ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'}`}
                    >
                      {task.isActive ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5" /> Reprendre</>}
                    </button>
                    {/* Add budget */}
                    <button
                      onClick={() => { setBudgetTaskId(task.id); setAddExecs(''); setBudgetError(''); }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-all flex-1 justify-center"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Budget
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => setConfirmDelete(task.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Delete confirmation */}
                {isConfirmingDelete && (
                  <div className="border-t border-white/5 pt-3 space-y-2">
                    <p className="text-xs text-slate-300 font-medium">Supprimer cette campagne ?</p>
                    {refundable > 0 && (
                      <p className="text-xs text-emerald-400">
                        Remboursement: <span className="font-bold">+{refundable.toFixed(4)} TON</span> ({remaining} exécutions non utilisées)
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(task)}
                        className="flex-1 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/25 transition-all"
                      >
                        Supprimer
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
                      <p className="text-[10px] text-slate-500">Exécutions à ajouter (× {priceFixed.toFixed(4)} TON)</p>
                      <input
                        type="number"
                        min="1"
                        value={addExecs}
                        onChange={e => { setAddExecs(e.target.value); setBudgetError(''); }}
                        placeholder="Ex: 500"
                        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-blue-500/50"
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Coût supplémentaire</span>
                      <span className={`font-semibold ${additionalExecs > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                        {additionalExecs > 0 ? `${additionalCost.toFixed(4)} TON` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Votre solde</span>
                      <span className={`font-semibold ${currentUser.balanceMain >= additionalCost && additionalCost > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {currentUser.balanceMain.toFixed(4)} TON
                      </span>
                    </div>
                    {budgetError && (
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/5 border border-red-500/20">
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-400">{budgetError}</p>
                      </div>
                    )}
                    <button
                      onClick={() => handleAddBudget(task)}
                      disabled={additionalExecs < 1}
                      className="w-full py-2.5 rounded-xl btn-primary text-xs font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Confirmer — {additionalExecs > 0 ? `${additionalCost.toFixed(4)} TON` : '0 TON'}
                    </button>
                  </div>
                )}

                {/* Completed task — delete only (no refund) */}
                {isFull && !isConfirmingDelete && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setConfirmDelete(task.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Supprimer
                    </button>
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
