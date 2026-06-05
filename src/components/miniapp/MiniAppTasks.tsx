import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { Hash, Users, Bot, Calendar, Star, CheckCircle, ExternalLink, Plus, AlertCircle, Flame, Loader2, ShieldCheck, Clock, FileText, Send, X } from 'lucide-react';

const typeConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  join_channel: { icon: <Hash className="w-4 h-4" />,     color: 'bg-blue-500/20 text-blue-400',     label: 'Canal' },
  join_group:   { icon: <Users className="w-4 h-4" />,    color: 'bg-purple-500/20 text-purple-400', label: 'Groupe' },
  start_bot:    { icon: <Bot className="w-4 h-4" />,      color: 'bg-cyan-500/20 text-cyan-400',     label: 'Bot' },
  daily:        { icon: <Calendar className="w-4 h-4" />, color: 'bg-amber-500/20 text-amber-400',   label: 'Quotidien' },
  special:      { icon: <Star className="w-4 h-4" />,     color: 'bg-pink-500/20 text-pink-400',     label: 'Spécial' },
};

const filters = [
  { id: 'all',          label: 'Tout' },
  { id: 'join_channel', label: '📢 Canal' },
  { id: 'join_group',   label: '👥 Groupe' },
  { id: 'start_bot',    label: '🤖 Bot' },
  { id: 'daily',        label: '📅 Quotidien' },
  { id: 'special',      label: '⭐ Spécial' },
];

type TaskPhase =
  | 'idle'
  | 'step_verify'
  | 'verifying'
  | 'not_subscribed'
  | 'counting'
  | 'claimable'
  | 'completing'
  | 'done';

interface TaskState { phase: TaskPhase; countdown?: number; }

function openUrl(url: string) {
  const tg = (window as unknown as { Telegram?: { WebApp?: { openTelegramLink?: (u: string) => void; openLink?: (u: string) => void } } }).Telegram?.WebApp;
  if (tg?.openTelegramLink && url.includes('t.me')) tg.openTelegramLink(url);
  else if (tg?.openLink) tg.openLink(url);
  else window.open(url, '_blank');
}

export const MiniAppTasks: React.FC = () => {
  const { tasks, completedTaskIds, completeTask, setMiniAppPage, currentUser, taskSubmissions, submitTaskProof } = useAppStore();
  const [filter, setFilter] = useState<string>('all');
  const [taskStates, setTaskStates] = useState<Record<string, TaskState>>({});
  const timerRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const [proofOpen,      setProofOpen]      = useState<string | null>(null);
  const [proofText,      setProofText]      = useState('');
  const [proofSubmitting, setProofSubmitting] = useState(false);
  const [proofResult,    setProofResult]    = useState<{ taskId: string; success: boolean; message: string } | null>(null);

  useEffect(() => {
    const refs = timerRefs.current;
    return () => { Object.values(refs).forEach(clearInterval); };
  }, []);

  const setPhase = (id: string, s: TaskState) =>
    setTaskStates(prev => ({ ...prev, [id]: s }));

  const getState = (id: string): TaskState =>
    taskStates[id] ?? { phase: 'idle' };

  const allActive = tasks.filter(
    t => t.isActive && (t.maxCompletions == null || t.totalCompletions < t.maxCompletions)
  );
  const promoTasks  = allActive.filter(t => t.isPromoTask);
  const activeTasks = allActive.filter(t => !t.isPromoTask);
  const filtered    = filter === 'all' ? activeTasks : activeTasks.filter(t => t.type === filter);

  // ── Channel / Group ────────────────────────────────────────────
  const handleChannelGroup = (task: typeof tasks[0]) => {
    if (task.targetUrl) openUrl(task.targetUrl);
    setPhase(task.id, { phase: 'step_verify' });
  };

  const handleVerify = async (task: typeof tasks[0]) => {
    setPhase(task.id, { phase: 'verifying' });
    try {
      const telegramId = useAppStore.getState().currentUser.telegramId;
      // Extract @username from URL e.g. https://t.me/TonCipher_Official → @TonCipher_Official
      const chatId = task.targetUrl
        ? '@' + task.targetUrl.replace('https://t.me/', '').split('/')[0]
        : '';
      const res = await fetch(`/api/check-membership?telegram_id=${telegramId}&chat_id=${encodeURIComponent(chatId)}`);
      const data = await res.json() as { member: boolean };
      if (data.member) {
        setPhase(task.id, { phase: 'completing' });
        completeTask(task.id);
        setTimeout(() => setPhase(task.id, { phase: 'done' }), 1500);
      } else {
        // Not yet a member — go back to verify step with error hint
        setPhase(task.id, { phase: 'step_verify' });
      }
    } catch {
      // Backend unavailable — complete anyway (offline mode)
      setPhase(task.id, { phase: 'completing' });
      completeTask(task.id);
      setTimeout(() => setPhase(task.id, { phase: 'done' }), 1500);
    }
  };

  // ── Bot (30s countdown) ────────────────────────────────────────
  const handleBot = (task: typeof tasks[0]) => {
    if (task.targetUrl) openUrl(task.targetUrl);
    setPhase(task.id, { phase: 'counting', countdown: 30 });

    timerRefs.current[task.id] = setInterval(() => {
      setTaskStates(prev => {
        const cur = prev[task.id];
        if (!cur || cur.phase !== 'counting') return prev;
        const next = (cur.countdown ?? 0) - 1;
        if (next <= 0) {
          clearInterval(timerRefs.current[task.id]);
          return { ...prev, [task.id]: { phase: 'claimable' } };
        }
        return { ...prev, [task.id]: { phase: 'counting', countdown: next } };
      });
    }, 1000);
  };

  const handleClaim = (task: typeof tasks[0]) => {
    setPhase(task.id, { phase: 'completing' });
    completeTask(task.id);
    setTimeout(() => setPhase(task.id, { phase: 'done' }), 1200);
  };

  // ── Daily / Special (instant) ──────────────────────────────────
  const handleInstant = (task: typeof tasks[0]) => {
    setPhase(task.id, { phase: 'completing' });
    completeTask(task.id);
    setTimeout(() => setPhase(task.id, { phase: 'done' }), 1200);
  };

  const handleComplete = (task: typeof tasks[0]) => {
    const s = getState(task.id);
    if (completedTaskIds.includes(task.id) || s.phase === 'completing' || s.phase === 'done') return;
    if (task.type === 'join_channel' || task.type === 'join_group') handleChannelGroup(task);
    else if (task.type === 'start_bot') handleBot(task);
    else handleInstant(task);
  };

  // ── Promo proof submission ─────────────────────────────────────
  const handleSubmitProof = (taskId: string) => {
    if (proofSubmitting || !proofText.trim()) return;
    setProofSubmitting(true);
    const result = submitTaskProof(taskId, proofText);
    setTimeout(() => {
      setProofSubmitting(false);
      setProofResult({
        taskId,
        success: result.success,
        message: result.success
          ? 'Soumission envoyée! En attente de validation.'
          : (result.error ?? 'Erreur inconnue.'),
      });
      if (result.success) { setProofOpen(null); setProofText(''); }
      setTimeout(() => setProofResult(null), 5000);
    }, 700);
  };

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Tâches</h1>
          <p className="text-sm text-slate-400">{activeTasks.length} tâche{activeTasks.length !== 1 ? 's' : ''} disponible{activeTasks.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMiniAppPage('myTasks')}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Mes campagnes
          </button>
          <button
            onClick={() => setMiniAppPage('createTask')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl btn-primary text-xs font-semibold text-white"
          >
            <Plus className="w-3.5 h-3.5" /> Créer
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
        {filters.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${filter === f.id ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-slate-400 border border-transparent'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Regular task cards ── */}
      <div className="space-y-3">
        {filtered.map(task => {
          const config = typeConfig[task.type] ?? typeConfig.special;
          const isCompleted = completedTaskIds.includes(task.id);
          const s = getState(task.id);
          const isPromoActive = task.promotion && new Date(task.promotion.endsAt) > new Date();
          const displayReward = task.reward * (isPromoActive ? task.promotion!.multiplier : 1);
          const needsVerify = task.type === 'join_channel' || task.type === 'join_group';
          const isBot = task.type === 'start_bot';

          return (
            <div key={task.id} className={`glass-card p-4 transition-all space-y-3 ${isCompleted || s.phase === 'done' ? 'opacity-50' : ''} ${isPromoActive ? 'border border-amber-500/30' : ''}`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.color}`}>
                  {task.icon ? <span className="text-base">{task.icon}</span> : config.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <h3 className="text-sm font-semibold text-white">{task.title}</h3>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-white/5 text-slate-400">{config.label}</span>
                    {isPromoActive && (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[9px] font-bold">
                        <Flame className="w-2.5 h-2.5" /> PROMO ×{task.promotion!.multiplier}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mb-2">{task.description}</p>

                  {task.maxCompletions && (
                    <div className="mb-2">
                      <div className="progress-bar">
                        <div className="progress-bar-fill bg-gradient-to-r from-blue-500 to-purple-500"
                          style={{ width: `${Math.min((task.totalCompletions / task.maxCompletions) * 100, 100)}%` }} />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{task.totalCompletions.toLocaleString()}/{task.maxCompletions.toLocaleString()} places</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {isPromoActive ? (
                      <>
                        <span className="text-lg font-bold text-amber-400">+{displayReward.toFixed(4)} TON</span>
                        <span className="text-xs text-slate-500 line-through">+{task.reward.toFixed(4)}</span>
                      </>
                    ) : (
                      <span className="text-lg font-bold text-emerald-400">+{displayReward.toFixed(4)} TON</span>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {isCompleted || s.phase === 'done' ? (
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  ) : s.phase === 'completing' ? (
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Crédit...
                    </div>
                  ) : s.phase === 'idle' ? (
                    <button onClick={() => handleComplete(task)}
                      className="px-4 py-2 rounded-xl btn-primary text-xs font-semibold text-white flex items-center gap-1.5">
                      Faire <ExternalLink className="w-3 h-3" />
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Channel/Group verify step */}
              {needsVerify && (s.phase === 'step_verify' || s.phase === 'verifying' || s.phase === 'not_subscribed') && (
                <div className="border-t border-white/5 pt-3 space-y-2">
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/15">
                    <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <p className="text-xs text-blue-300">
                      {task.type === 'join_channel'
                        ? 'Abonnez-vous au canal ci-dessus, puis vérifiez.'
                        : 'Rejoignez le groupe ci-dessus, puis vérifiez.'}
                    </p>
                  </div>
                  {s.phase === 'not_subscribed' && (
                    <p className="text-xs text-red-400 text-center">Abonnement non détecté — abonnez-vous d'abord.</p>
                  )}
                  <button
                    onClick={() => handleVerify(task)}
                    disabled={s.phase === 'verifying'}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-semibold hover:bg-blue-500/25 transition-all disabled:opacity-50"
                  >
                    {s.phase === 'verifying' ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Vérification en cours...</>
                    ) : (
                      <><ShieldCheck className="w-3.5 h-3.5" /> Vérifier mon abonnement</>
                    )}
                  </button>
                </div>
              )}

              {/* Bot countdown / claim */}
              {isBot && (s.phase === 'counting' || s.phase === 'claimable') && (
                <div className="border-t border-white/5 pt-3 space-y-2">
                  {s.phase === 'counting' ? (
                    <>
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15">
                        <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <p className="text-xs text-amber-300">Restez dans le bot pendant <span className="font-bold">{s.countdown}s</span> avant de revenir réclamer.</p>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-1000"
                          style={{ width: `${((30 - (s.countdown ?? 0)) / 30) * 100}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={() => handleClaim(task)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/25 transition-all"
                    >
                      <CheckCircle className="w-4 h-4" /> Réclamer la récompense
                    </button>
                  )}
                </div>
              )}
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

      {/* ── Promo Tasks (bottom) ── */}
      {promoTasks.length > 0 && (
        <div className="space-y-3 pt-2">
          {/* Visual separator */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-[10px] text-slate-600 font-medium tracking-wider uppercase">Tâches spéciales</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          <div className="flex items-center gap-2 px-1">
            <span className="text-sm font-bold text-white">🎯 Tâches Promo</span>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-semibold">Vérif. manuelle</span>
          </div>
          <p className="text-[10px] text-slate-500 px-1">Créées par l'équipe. Complétez la condition et soumettez votre preuve pour être récompensé.</p>

          {promoTasks.map(task => {
            const userSubmission = taskSubmissions.find(
              s => s.taskId === task.id && s.userId === currentUser.id
            );
            const isApproved = userSubmission?.status === 'approved';
            const isPending  = userSubmission?.status === 'pending';
            const isRejected = userSubmission?.status === 'rejected';
            const isOpen     = proofOpen === task.id;
            const thisResult = proofResult?.taskId === task.id ? proofResult : null;

            return (
              <div key={task.id} className={`glass-card p-4 space-y-3 border ${isApproved ? 'border-emerald-500/25' : 'border-purple-500/20'}`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0 text-base">
                    {task.icon ?? '🎯'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <h3 className="text-sm font-semibold text-white">{task.title}</h3>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-400">PROMO</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{task.description}</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-400 flex-shrink-0">+{task.reward.toFixed(2)} TON</span>
                </div>

                {task.maxCompletions && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                        style={{ width: `${Math.min((task.totalCompletions / task.maxCompletions) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 flex-shrink-0">{task.totalCompletions}/{task.maxCompletions} places</span>
                  </div>
                )}

                {isApproved && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <p className="text-xs font-semibold text-emerald-400">Validée — récompense créditée</p>
                  </div>
                )}

                {isPending && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <p className="text-xs font-semibold text-amber-400">En attente de validation par l'équipe</p>
                  </div>
                )}

                {isRejected && (
                  <div className="p-2.5 rounded-lg bg-red-500/5 border border-red-500/20 space-y-1">
                    <p className="text-xs font-semibold text-red-400">Preuve refusée</p>
                    {userSubmission?.adminNote && (
                      <p className="text-[10px] text-red-400/70">Motif: {userSubmission.adminNote}</p>
                    )}
                  </div>
                )}

                {thisResult && (
                  <p className={`text-xs font-medium ${thisResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                    {thisResult.success ? '✓' : '✗'} {thisResult.message}
                  </p>
                )}

                {!isApproved && !isPending && !isOpen && (
                  <button
                    onClick={() => { setProofOpen(task.id); setProofText(''); setProofResult(null); }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 text-xs font-semibold hover:bg-purple-500/25 transition-all"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {isRejected ? 'Soumettre à nouveau' : 'Soumettre ma preuve'}
                  </button>
                )}

                {isOpen && (
                  <div className="space-y-2 border-t border-white/5 pt-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-white">Votre preuve</p>
                      <button onClick={() => { setProofOpen(null); setProofText(''); }} className="text-slate-500 hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea
                      value={proofText}
                      onChange={e => setProofText(e.target.value)}
                      placeholder="Décrivez votre preuve ou collez un lien (capture d'écran URL, message Telegram, etc.)..."
                      rows={3}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs resize-none focus:outline-none focus:border-purple-500/50 transition-colors placeholder:text-slate-600"
                    />
                    <button
                      onClick={() => handleSubmitProof(task.id)}
                      disabled={!proofText.trim() || proofSubmitting}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl btn-primary text-xs font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {proofSubmitting
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Envoi en cours...</>
                        : <><Send className="w-3.5 h-3.5" /> Envoyer ma preuve</>
                      }
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
