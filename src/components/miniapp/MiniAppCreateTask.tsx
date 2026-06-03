import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { AlertCircle } from 'lucide-react';

export const MiniAppCreateTask: React.FC = () => {
  const { setMiniAppPage, addTask, currentUser, updateUser } = useAppStore();
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'join_channel',
    targetUrl: '',
    reward: '0.10',
    maxCompletions: '100',
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const reward = parseFloat(form.reward) || 0;
  const maxComp = parseInt(form.maxCompletions) || 0;
  const totalCost = reward * maxComp;
  const isValidCost = !isNaN(totalCost) && totalCost > 0;

  const typeIcons: Record<string, string> = {
    join_channel: '📢',
    join_group: '👥',
    start_bot: '🤖',
    social: '⭐',
  };

  const handleSubmit = () => {
    setError('');

    if (!form.title.trim()) { setError('Le titre est requis'); return; }
    if (form.type !== 'social' && !form.targetUrl.trim()) { setError("L'URL Telegram est requise"); return; }
    if (form.type !== 'social' && !form.targetUrl.startsWith('https://t.me/')) {
      setError("L'URL doit commencer par https://t.me/");
      return;
    }
    if (reward < 0.01) { setError('Récompense minimum: 0.01 TON'); return; }
    if (maxComp < 1) { setError('Nombre de complétions minimum: 1'); return; }
    if (currentUser.balanceMain < totalCost) {
      setError(`Solde insuffisant. Coût total: ${totalCost.toFixed(2)} TON`);
      return;
    }

    updateUser(currentUser.id, { balanceMain: currentUser.balanceMain - totalCost });

    addTask({
      type: form.type as 'join_channel' | 'join_group' | 'start_bot' | 'social',
      title: form.title.trim(),
      description: form.description.trim() || `Complétez cette tâche pour gagner ${reward.toFixed(2)} TON`,
      reward,
      rewardType: 'main',
      targetUrl: form.targetUrl.trim() || undefined,
      isActive: true,
      maxCompletions: maxComp,
      verificationMethod: 'auto',
      priority: 5,
      icon: typeIcons[form.type] ?? '⭐',
    });

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-slide-up">
        <div className="text-5xl">✅</div>
        <h2 className="text-xl font-bold text-white">Tâche créée!</h2>
        <p className="text-sm text-slate-400 text-center px-4">
          {totalCost.toFixed(2)} TON déduits de votre solde.<br />
          Votre tâche est maintenant visible par tous les utilisateurs.
        </p>
        <button
          onClick={() => setMiniAppPage('tasks')}
          className="btn-primary px-6 py-3 rounded-xl text-sm font-semibold text-white"
        >
          Voir les tâches
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMiniAppPage('tasks')}
          className="p-2 rounded-lg hover:bg-white/5 text-slate-400"
        >
          ←
        </button>
        <h1 className="text-xl font-bold text-white">Créer une tâche</h1>
      </div>

      <div className="glass-card p-4 space-y-4">
        {/* Title */}
        <div>
          <p className="text-xs text-slate-400 mb-2">Titre *</p>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="Ex: Rejoindre mon canal"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        {/* Description */}
        <div>
          <p className="text-xs text-slate-400 mb-2">Description</p>
          <input
            type="text"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Décrivez la tâche (optionnel)"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        {/* Type */}
        <div>
          <p className="text-xs text-slate-400 mb-2">Type</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'join_channel', label: '📢 Canal Telegram' },
              { value: 'join_group', label: '👥 Groupe Telegram' },
              { value: 'start_bot', label: '🤖 Démarrer un bot' },
              { value: 'social', label: '⭐ Action sociale' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setForm({ ...form, type: opt.value })}
                className={`py-2.5 px-3 rounded-xl text-xs font-medium text-left transition-all ${form.type === opt.value ? 'bg-blue-500/15 border border-blue-500/40 text-white' : 'glass-card-light text-slate-400'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Target URL */}
        {form.type !== 'social' && (
          <div>
            <p className="text-xs text-slate-400 mb-2">URL Telegram *</p>
            <input
              type="url"
              value={form.targetUrl}
              onChange={e => setForm({ ...form, targetUrl: e.target.value })}
              placeholder="https://t.me/votre_canal"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
            />
          </div>
        )}

        {/* Reward & Max completions */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-slate-400 mb-2">Récompense (TON)</p>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={form.reward}
              onChange={e => setForm({ ...form, reward: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-2">Nb. complétions</p>
            <input
              type="number"
              min="1"
              value={form.maxCompletions}
              onChange={e => setForm({ ...form, maxCompletions: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-blue-500/50"
            />
          </div>
        </div>
      </div>

      {/* Cost Summary */}
      <div className="glass-card-light p-4 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Coût total ({reward.toFixed(2)} × {maxComp})</span>
          <span className="text-amber-400 font-semibold">{isValidCost ? totalCost.toFixed(2) : '—'} TON</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Votre solde</span>
          <span className={`font-semibold ${currentUser.balanceMain >= totalCost ? 'text-emerald-400' : 'text-red-400'}`}>
            {currentUser.balanceMain.toFixed(2)} TON
          </span>
        </div>
      </div>

      {error && (
        <div className="glass-card-light p-3 border-red-500/20 bg-red-500/5 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <button
        onClick={handleSubmit}
        className="w-full btn-primary py-3.5 rounded-xl text-sm font-semibold text-white"
      >
        Créer la tâche — {isValidCost ? totalCost.toFixed(2) : '0.00'} TON
      </button>
    </div>
  );
};
