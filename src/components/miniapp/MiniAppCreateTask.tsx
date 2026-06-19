import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { AlertCircle, Info, Loader2, Clock } from 'lucide-react';

type TaskType = 'join_channel' | 'join_group' | 'start_bot' | 'watch_video' | 'social';

const SOCIAL_DOMAINS = ['twitter.com','x.com','instagram.com','tiktok.com','discord.gg','discord.com','facebook.com','linkedin.com','twitch.tv','snapchat.com'];

function isUrlValid(type: TaskType, url: string): boolean {
  if (!url.startsWith('https://')) return false;
  const u = url.toLowerCase();
  if (type === 'join_channel' || type === 'join_group' || type === 'start_bot')
    return u.startsWith('https://t.me/');
  if (type === 'watch_video')
    return u.includes('youtube.com') || u.includes('youtu.be');
  if (type === 'social')
    return SOCIAL_DOMAINS.some(d => u.includes(d));
  return true;
}

const TASK_TYPES: { value: TaskType; icon: string; label: string; urlLabel: string; urlPlaceholder: string; isTelegram: boolean }[] = [
  { value: 'join_channel', icon: '📢', label: 'Canal Telegram',  urlLabel: 'Lien du canal',   urlPlaceholder: 'https://t.me/votre_canal',  isTelegram: true  },
  { value: 'join_group',   icon: '👥', label: 'Groupe Telegram', urlLabel: 'Lien du groupe',  urlPlaceholder: 'https://t.me/votre_groupe', isTelegram: true  },
  { value: 'start_bot',    icon: '🤖', label: 'Démarrer un bot', urlLabel: 'Lien du bot',     urlPlaceholder: 'https://t.me/votre_bot',    isTelegram: true  },
  { value: 'watch_video',  icon: '▶️', label: 'Vidéo YouTube',   urlLabel: 'URL de la vidéo', urlPlaceholder: 'https://youtube.com/watch?v=...', isTelegram: false },
  { value: 'social',       icon: '🌐', label: 'Réseau social',   urlLabel: 'URL du profil',   urlPlaceholder: 'https://instagram.com/... ou https://x.com/...', isTelegram: false },
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
  const currentTypeConf = TASK_TYPES.find(t => t.value === type)!;

  const handleSubmit = async () => {
    setError('');
    if (!title.trim())      { setError('Le titre est requis'); return; }
    if (!targetUrl.trim())  { setError("L'URL est requise"); return; }
    if (!targetUrl.startsWith('https://')) {
      setError("L'URL doit commencer par https://");
      return;
    }
    if (currentTypeConf.isTelegram && !targetUrl.startsWith('https://t.me/')) {
      setError("Pour une tâche Telegram, l'URL doit commencer par https://t.me/");
      return;
    }
    if (type === 'watch_video') {
      const u = targetUrl.toLowerCase();
      if (!u.includes('youtube.com') && !u.includes('youtu.be')) {
        setError("Pour une tâche YouTube, l'URL doit être un lien YouTube (youtube.com ou youtu.be)");
        return;
      }
    }
    if (type === 'social') {
      const u = targetUrl.toLowerCase();
      const allowed = ['twitter.com','x.com','instagram.com','tiktok.com','discord.gg','discord.com','facebook.com','linkedin.com','twitch.tv','snapchat.com'];
      if (!allowed.some(d => u.includes(d))) {
        setError("Pour une tâche réseau social, l'URL doit être un lien d'un réseau reconnu (Instagram, TikTok, Twitter/X, Discord, Facebook…)");
        return;
      }
    }
    if (execCount < minExec) { setError(`Minimum ${minExec} exécutions`); return; }
    if (execCount > maxExec) { setError(`Maximum ${maxExec.toLocaleString()} exécutions`); return; }
    const totalAvailable = currentUser.balanceMain + currentUser.taskCredits;
    if (totalAvailable < totalCost) {
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
          totalBudget:    parseFloat((workerReward * execCount).toFixed(8)),
          maxCompletions: execCount,
        }),
      });
      const result = await res.json() as { success: boolean; id?: string; error?: string };
      if (!result.success) {
        setError(result.error ?? 'Erreur lors de la création de la tâche.');
        return;
      }

      // Deduct task credits first, then balance
      const creditsUsed = Math.min(currentUser.taskCredits, totalCost);
      updateUser(currentUser.id, {
        taskCredits: currentUser.taskCredits - creditsUsed,
        balanceMain: currentUser.balanceMain - (totalCost - creditsUsed),
      });
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-5 animate-slide-up px-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl bg-amber-400/20 blur-xl animate-pulse" />
          <div className="relative w-20 h-20 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <Clock className="w-9 h-9 text-amber-400" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-white">Soumise avec succès</h2>
          <p className="text-sm text-slate-400 leading-relaxed max-w-[260px]">
            Votre tâche est en attente de validation. Vous serez notifié par le bot dès son approbation.
          </p>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <span className="text-xs text-amber-400/80">Déduit :</span>
          <span className="text-sm font-bold text-amber-400">{totalCost.toFixed(4)} TON</span>
          <span className="text-xs text-slate-500">• remboursé si refusé</span>
        </div>

        <div className="flex gap-3 w-full max-w-[280px]">
          <button
            onClick={() => setMiniAppPage('myTasks')}
            className="flex-1 btn-primary py-2.5 rounded-xl text-sm font-semibold text-white"
          >
            Mes campagnes
          </button>
          <button
            onClick={() => setMiniAppPage('tasks')}
            className="flex-1 py-2.5 rounded-xl glass-card-light text-sm font-medium text-slate-300"
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
        <button
          onClick={() => setMiniAppPage('tasks')}
          className="p-2 rounded-lg hover:bg-white/5 text-slate-400 transition-colors"
        >←</button>
        <div>
          <h1 className="text-xl font-bold text-white">Créer une tâche</h1>
          <p className="text-xs text-slate-500">Promouvoir votre canal ou bot</p>
        </div>
      </div>

      {/* Type selector */}
      <div className="glass-card p-4 space-y-3">
        <p className="text-xs font-medium text-slate-400">Type de tâche</p>
        <div className="grid grid-cols-2 gap-2">
          {TASK_TYPES.map(opt => {
            const isActive = type === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => { setType(opt.value); setTargetUrl(''); setError(''); }}
                className="py-2.5 px-3 rounded-xl text-xs font-semibold text-left transition-all flex items-center gap-2 border"
                style={
                  isActive
                    ? { background: 'rgba(0,152,234,0.12)', borderColor: 'rgba(0,152,234,0.35)', color: '#fff' }
                    : { background: 'rgba(255,255,255,0.04)', borderColor: 'transparent', color: '#94a3b8' }
                }
              >
                <span className="text-base">{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {type === 'join_channel' && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300 leading-relaxed">
              Pour vérifier les abonnements, ajoutez{' '}
              <span className="font-semibold text-amber-200">@{botName}</span>{' '}
              comme administrateur de votre canal.
            </p>
          </div>
        )}
        {type === 'join_group' && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300 leading-relaxed">
              Pour vérifier les membres, ajoutez{' '}
              <span className="font-semibold text-amber-200">@{botName}</span>{' '}
              comme administrateur de votre groupe.
            </p>
          </div>
        )}
        {type === 'start_bot' && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-cyan-300 leading-relaxed">
              Entrez le lien de votre bot Telegram. Les utilisateurs appuieront sur Start et devront rester 30 secondes.
            </p>
          </div>
        )}
        {type === 'watch_video' && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <Info className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-300 leading-relaxed">
              Entrez le lien direct de votre vidéo YouTube. Les utilisateurs devront rester <span className="font-semibold">20 secondes</span> sur la page.
            </p>
          </div>
        )}
        {type === 'social' && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <Info className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-orange-300 leading-relaxed">
              Entrez le lien de votre profil ou page. Supporte Instagram, TikTok, X (Twitter), Discord et autres.
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
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#0098EA]/50"
          />
        </div>

        <div>
          <p className="text-xs text-slate-400 mb-2">Description <span className="text-slate-600">(optionnel)</span></p>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Décrivez votre tâche"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#0098EA]/50"
          />
        </div>

        <div>
          <p className="text-xs text-slate-400 mb-2">{currentTypeConf.urlLabel} *</p>
          <input
            type="url"
            value={targetUrl}
            onChange={e => setTargetUrl(e.target.value)}
            placeholder={currentTypeConf.urlPlaceholder}
            className={`w-full px-4 py-3 bg-white/5 rounded-xl text-white text-sm font-mono placeholder:text-slate-600 focus:outline-none border ${
              targetUrl && !isUrlValid(type, targetUrl)
                ? 'border-red-500/60 focus:border-red-500'
                : 'border-white/10 focus:border-[#0098EA]/50'
            }`}
          />
          {targetUrl && !isUrlValid(type, targetUrl) && (
            <p className="text-xs mt-1.5 text-red-400">
              {type === 'watch_video'
                ? '⚠️ Doit être un lien YouTube (youtube.com ou youtu.be)'
                : type === 'social'
                ? '⚠️ Doit être un lien d\'un réseau social reconnu (Instagram, TikTok, Twitter/X, Discord…)'
                : currentTypeConf.isTelegram
                ? '⚠️ Doit commencer par https://t.me/'
                : '⚠️ URL invalide'}
            </p>
          )}
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
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-[#0098EA]/50"
          />
        </div>
      </div>

      {/* Cost summary */}
      <div className="glass-card p-4 space-y-2.5">
        <p className="text-xs font-semibold text-slate-400 mb-1">Récapitulatif</p>

        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Prix par exécution</span>
          <span className="text-white font-semibold">{priceFixed.toFixed(4)} TON</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Nombre d'exécutions</span>
          <span className="text-white font-semibold">{execCount > 0 ? execCount.toLocaleString() : '—'}</span>
        </div>

        <div className="h-px bg-white/[0.06] my-0.5" />

        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-white">Coût total</span>
          <span
            className="text-base font-bold"
            style={{ color: execCount > 0 ? '#f59e0b' : '#64748b' }}
          >
            {execCount > 0 ? `${totalCost.toFixed(4)} TON` : '—'}
          </span>
        </div>

        {currentUser.taskCredits > 0 && execCount > 0 && (
          <div className="flex justify-between text-xs">
            <span style={{ color: '#0098EA' }}>Crédits campagnes</span>
            <span className="font-semibold" style={{ color: '#0098EA' }}>
              -{Math.min(currentUser.taskCredits, totalCost).toFixed(4)} TON
            </span>
          </div>
        )}

        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Votre solde</span>
          <span className={`font-semibold ${
            (currentUser.balanceMain + currentUser.taskCredits) >= totalCost && totalCost > 0
              ? 'text-emerald-400'
              : 'text-slate-400'
          }`}>
            {currentUser.balanceMain.toFixed(4)} TON
            {currentUser.taskCredits > 0 && (
              <span style={{ color: '#0098EA' }}> +{currentUser.taskCredits.toFixed(4)} crédits</span>
            )}
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
        disabled={submitting || execCount < minExec || (currentUser.balanceMain + currentUser.taskCredits) < totalCost || totalCost === 0}
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
