import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { AlertCircle, Info, Loader2, Clock } from 'lucide-react';

type TaskType = 'join_channel' | 'join_group' | 'start_bot';

const TASK_TYPES: { value: TaskType; icon: string; label: string }[] = [
  { value: 'join_channel', icon: '📢', label: 'Canal Telegram' },
  { value: 'join_group',   icon: '👥', label: 'Groupe Telegram' },
  { value: 'start_bot',    icon: '🤖', label: 'Démarrer un bot' },
];

export const MiniAppCreateTask: React.FC = () => {
  const { setMiniAppPage, currentUser, updateUser, platformConfig, addPlatformRevenue } = useAppStore();

  const feeRate    = platformConfig.taskCreationFeeRate   ?? 0.15;
  const priceFixed = platformConfig.taskPricePerExecution ?? 0.05;
  const minExec    = platformConfig.taskMinExecutions     ?? 100;
  const maxExec    = platformConfig.taskMaxExecutions     ?? 100000;
  const botName    = platformConfig.botUsername           || 'TonCipher_bot';

  const [type,        setType]        = useState<TaskType>('join_channel');
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [targetUrl,   setTargetUrl]   = useState('');
  const [executions,  setExecutions]  = useState(String(minExec));
  const [submitting,  setSubmitting]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [error,       setError]       = useState('');

  const execCount    = Math.max(0, parseInt(executions) || 0);
  const totalCost    = execCount * priceFixed;
  const workerReward = parseFloat((priceFixed * (1 - feeRate)).toFixed(6));
  const platformFee  = totalCost * feeRate;
  const needsAdmin   = type === 'join_channel' || type === 'join_group';

  const handleSubmit = async () => {
    setError('');
    if (!title.trim())      { setError('Le titre est requis'); return; }
    if (!targetUrl.trim())  { setError("L'URL Telegram est requise"); return; }
    if (!targetUrl.startsWith('https://t.me/')) {
      setError("L'URL doit commencer par https://t.me/");
      return;
    }
    if (execCount < minExec) { setError(`Minimum ${minExec} exécutions`); return; }
    if (execCount > maxExec) { setError(`Maximum ${maxExec.toLocaleString()} exécutions`); return; }
    if (currentUser.balanceMain < totalCost) {
      setError(`Solde insuffisant. Coût total : ${totalCost.toFixed(4)} TON`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/user-tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId:     currentUser.telegramId,
          type,
          title:          title.trim(),
          description:    description.trim() || `Complétez cette tâche pour gagner ${workerReward.toFixed(4)} TON`,
          targetUrl:      targetUrl.trim(), // NEVER modified
          reward:         workerReward,
          totalBudget:    totalCost,
          maxCompletions: execCount,
        }),
      });
      const result = await res.json() as { success: boolean; id?: string; error?: string };
      if (!result.success) {
        setError(result.error ?? 'Erreur lors de la création de la tâche.');
        return;
      }

      // Deduct balance locally + track for potential refund
      updateUser(currentUser.id, { balanceMain: currentUser.balanceMain - totalCost });
      addPlatformRevenue(platformFee);

      if (result.id) {
        const pending = JSON.parse(localStorage.getItem('tc_task_pending') ?? '[]') as { id: string; amount: number }[];
        pending.push({ id: result.id, amount: totalCost });
        localStorage.setItem('tc_task_pending', JSON.stringify(pending));
      }

      setSubmitted(true);
    } catch {
      setError('Impossible de soumettre. Vérifiez votre connexion.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-slide-up">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center">
          <Clock className="w-8 h-8 text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-white">En attente d'approbation</h2>
        <p className="text-sm text-slate-400 text-center px-6">
          Votre tâche a été soumise. L'admin va la vérifier avant qu'elle soit publiée.
          Vous serez notifié par le bot.
        </p>
        <p className="text-xs text-amber-400/80 text-center px-6">
          {totalCost.toFixed(4)} TON déduits de votre solde — remboursé si refusé.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setMiniAppPage('myTasks')}
            className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
          >
            Mes campagnes
          </button>
          <button
            onClick={() => setMiniAppPage('tasks')}
            className="px-5 py-2.5 rounded-xl glass-card-light text-sm font-medium text-slate-300"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => setMiniAppPage('tasks')} className="p-2 rounded-lg hover:bg-white/5 text-slate-400">←</button>
        <h1 className="text-xl font-bold text-white">Créer une tâche</h1>
      </div>

      {/* Type selector */}
      <div className="glass-card p-4 space-y-3">
        <p className="text-xs text-slate-400">Catégorie</p>
        <div className="grid grid-cols-2 gap-2">
          {TASK_TYPES.map(opt => (
            <button
              key={opt.value}
              onClick={() => setType(opt.value)}
              className={`py-2.5 px-3 rounded-xl text-xs font-medium text-left transition-all flex items-center gap-2 ${
                type === opt.value
                  ? 'bg-blue-500/15 border border-blue-500/40 text-white'
                  : 'glass-card-light text-slate-400'
              }`}
            >
              <span className="text-base">{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>

        {needsAdmin && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300 leading-relaxed">
              Pour vérifier les abonnements, ajoutez{' '}
              <span className="font-semibold text-amber-200">@{botName}</span>{' '}
              comme administrateur de votre {type === 'join_channel' ? 'canal' : 'groupe'}.
            </p>
          </div>
        )}
      </div>

      {/* Task details */}
      <div className="glass-card p-4 space-y-4">
        <div>
          <p className="text-xs text-slate-400 mb-2">Titre de la tâche *</p>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Ex: Rejoindre mon canal"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        <div>
          <p className="text-xs text-slate-400 mb-2">Description <span className="text-slate-600">(optionnel)</span></p>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Décrivez votre tâche"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        <div>
          <p className="text-xs text-slate-400 mb-2">
            Lien {type === 'join_channel' ? 'du canal' : type === 'join_group' ? 'du groupe' : 'du bot'} *
          </p>
          <input
            type="url"
            value={targetUrl}
            onChange={e => setTargetUrl(e.target.value)}
            placeholder="https://t.me/votre_canal"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        <div>
          <p className="text-xs text-slate-400 mb-2">
            Nombre d'exécutions{' '}
            <span className="text-slate-600">({minExec.toLocaleString()} — {maxExec.toLocaleString()})</span>
          </p>
          <input
            type="number"
            min={minExec}
            max={maxExec}
            step="100"
            value={executions}
            onChange={e => setExecutions(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-blue-500/50"
          />
        </div>
      </div>

      {/* Cost summary */}
      <div className="glass-card-light p-4 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Prix par exécution</span>
          <span className="text-white font-semibold">{priceFixed.toFixed(4)} TON</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Récompense par utilisateur</span>
          <span className="text-emerald-400 font-semibold">+{workerReward.toFixed(4)} TON</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Nombre d'exécutions</span>
          <span className="text-white font-semibold">{execCount > 0 ? execCount.toLocaleString() : '—'}</span>
        </div>
        <div className="h-px bg-white/8 my-1" />
        <div className="flex justify-between text-xs">
          <span className="text-slate-400 font-medium">Coût total</span>
          <span className="text-amber-400 font-bold text-sm">
            {execCount > 0 ? totalCost.toFixed(4) : '—'} TON
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Votre solde</span>
          <span className={`font-semibold ${currentUser.balanceMain >= totalCost && totalCost > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {currentUser.balanceMain.toFixed(4)} TON
          </span>
        </div>
      </div>

      {error && (
        <div className="glass-card-light p-3 border border-red-500/20 bg-red-500/5 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <button
        onClick={() => void handleSubmit()}
        disabled={submitting || execCount < minExec || currentUser.balanceMain < totalCost || totalCost === 0}
        className="w-full btn-primary py-3.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {submitting
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Soumission...</>
          : `Soumettre — ${totalCost > 0 ? totalCost.toFixed(4) : '0.0000'} TON`
        }
      </button>
    </div>
  );
};
