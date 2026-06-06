import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import {
  Hash, Users, Bot, Calendar, Star, CheckCircle, ExternalLink, Plus,
  AlertCircle, Flame, Loader2, ShieldCheck, Clock, FileText, Send, X,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ApiTask {
  id: string;
  type: string;
  title: string;
  description: string;
  targetUrl: string;
  reward: number;
  totalCompletions: number;
  maxCompletions: number;
}

interface CardTask {
  id: string;
  source: 'platform' | 'api';
  type: string;
  title: string;
  description: string;
  targetUrl?: string;
  reward: number;
  promoMultiplier?: number;
  totalCompletions: number;
  maxCompletions?: number;
  icon?: string;
  isInstant: boolean;
}

// ── Static config ──────────────────────────────────────────────────────────────

const typeConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  join_channel: { icon: <Hash className="w-4 h-4" />,     color: 'bg-blue-500/20 text-blue-400',     label: 'Canal' },
  join_group:   { icon: <Users className="w-4 h-4" />,    color: 'bg-purple-500/20 text-purple-400', label: 'Groupe' },
  start_bot:    { icon: <Bot className="w-4 h-4" />,      color: 'bg-cyan-500/20 text-cyan-400',     label: 'Bot' },
  daily:        { icon: <Calendar className="w-4 h-4" />, color: 'bg-amber-500/20 text-amber-400',   label: 'Quotidien' },
  special:      { icon: <Star className="w-4 h-4" />,     color: 'bg-pink-500/20 text-pink-400',     label: 'Spécial' },
};

const SECTIONS: { type: string; label: string; icon: string; creatable: boolean }[] = [
  { type: 'daily',        label: 'Tâches quotidiennes', icon: '📅', creatable: false },
  { type: 'special',      label: 'Tâches spéciales',    icon: '⭐', creatable: false },
  { type: 'join_channel', label: 'Canaux Telegram',     icon: '📢', creatable: true  },
  { type: 'join_group',   label: 'Groupes Telegram',    icon: '👥', creatable: true  },
  { type: 'start_bot',    label: 'Bots & Mini Apps',    icon: '🤖', creatable: true  },
];

type TaskPhase = 'idle' | 'step_verify' | 'verifying' | 'not_subscribed' | 'completing' | 'done';

function openUrl(url: string) {
  const tg = (window as unknown as { Telegram?: { WebApp?: { openTelegramLink?: (u: string) => void; openLink?: (u: string) => void } } }).Telegram?.WebApp;
  if (tg?.openTelegramLink && url.includes('t.me')) tg.openTelegramLink(url);
  else if (tg?.openLink) tg.openLink(url);
  else window.open(url, '_blank');
}

// ── Component ──────────────────────────────────────────────────────────────────

export const MiniAppTasks: React.FC = () => {
  const {
    tasks, completedTaskIds, completeTask,
    setMiniAppPage, currentUser, taskSubmissions, submitTaskProof,
  } = useAppStore();

  const [taskStates,    setTaskStates]    = useState<Record<string, { phase: TaskPhase }>>({});
  const timerRefs                          = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const [apiTasks,            setApiTasks]            = useState<ApiTask[]>([]);
  const [completedApiTaskIds, setCompletedApiTaskIds] = useState<string[]>([]);

  const [proofOpen,       setProofOpen]       = useState<string | null>(null);
  const [proofText,       setProofText]       = useState('');
  const [proofSubmitting, setProofSubmitting] = useState(false);
  const [proofResult,     setProofResult]     = useState<{ taskId: string; success: boolean; message: string } | null>(null);

  useEffect(() => {
    const refs = timerRefs.current;
    return () => { Object.values(refs).forEach(clearTimeout); };
  }, []);

  useEffect(() => {
    const tid = useAppStore.getState().currentUser.telegramId;
    if (!tid) return;
    fetch(`/api/user-tasks/available?telegram_id=${tid}`)
      .then(r => r.json())
      .then((data: ApiTask[]) => setApiTasks(data))
      .catch(() => {});
  }, []);

  const setPhase = (id: string, phase: TaskPhase) =>
    setTaskStates(prev => ({ ...prev, [id]: { phase } }));
  const getPhase = (id: string): TaskPhase =>
    taskStates[id]?.phase ?? 'idle';

  // ── Build unified card pool ──────────────────────────────────────
  const promoTasks = tasks.filter(t => t.isActive && t.isPromoTask);
  const allActive  = tasks.filter(
    t => t.isActive && !t.isPromoTask &&
         (t.maxCompletions == null || t.totalCompletions < t.maxCompletions)
  );

  const platformCards: CardTask[] = allActive.map(t => {
    const promoActive = t.promotion && new Date(t.promotion.endsAt) > new Date();
    return {
      id:               t.id,
      source:           'platform',
      type:             t.type,
      title:            t.title,
      description:      t.description,
      targetUrl:        t.targetUrl,
      reward:           t.reward,
      promoMultiplier:  promoActive ? t.promotion!.multiplier : undefined,
      totalCompletions: t.totalCompletions,
      maxCompletions:   t.maxCompletions,
      icon:             t.icon,
      isInstant:        t.type === 'daily' || t.type === 'special',
    };
  });

  const apiCards: CardTask[] = apiTasks
    .filter(t => !completedApiTaskIds.includes(t.id))
    .map(t => ({
      id:               t.id,
      source:           'api' as const,
      type:             t.type,
      title:            t.title,
      description:      t.description,
      targetUrl:        t.targetUrl,
      reward:           t.reward,
      totalCompletions: t.totalCompletions,
      maxCompletions:   t.maxCompletions,
      isInstant:        false,
    }));

  const allCards = [...platformCards, ...apiCards];

  // ── Completion helpers ───────────────────────────────────────────
  const creditApiTask = async (taskId: string, reward: number) => {
    try {
      const telegramId = useAppStore.getState().currentUser.telegramId;
      const res  = await fetch(`/api/user-tasks/${taskId}/complete`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ telegramId }),
      });
      const data = await res.json() as { success: boolean; reward?: number };
      if (data.success) {
        const earned = data.reward ?? reward;
        const state  = useAppStore.getState();
        state.updateUser(state.currentUser.id, {
          balanceMain:    state.currentUser.balanceMain    + earned,
          totalEarnings:  state.currentUser.totalEarnings  + earned,
          todayEarnings:  state.currentUser.todayEarnings  + earned,
          tasksCompleted: state.currentUser.tasksCompleted + 1,
        });
        state.addNotification({
          type: 'reward', title: 'Tâche complétée !',
          message: `+${earned.toFixed(4)} TON crédité.`, isRead: false,
        });
        setCompletedApiTaskIds(prev => [...prev, taskId]);
        setApiTasks(prev => prev.filter(t => t.id !== taskId));
      } else {
        setPhase(taskId, 'step_verify');
      }
    } catch {
      const state = useAppStore.getState();
      state.updateUser(state.currentUser.id, { balanceMain: state.currentUser.balanceMain + reward });
      setCompletedApiTaskIds(prev => [...prev, taskId]);
      setApiTasks(prev => prev.filter(t => t.id !== taskId));
    }
  };

  // ── Unified action handlers ──────────────────────────────────────
  const handleStart = (card: CardTask) => {
    const phase = getPhase(card.id);
    if (phase === 'completing' || phase === 'done') return;
    if (card.source === 'platform' && completedTaskIds.includes(card.id)) return;
    if (card.source === 'api'      && completedApiTaskIds.includes(card.id)) return;

    if (card.isInstant) {
      setPhase(card.id, 'completing');
      completeTask(card.id);
      timerRefs.current[card.id] = setTimeout(() => setPhase(card.id, 'done'), 1200);
      return;
    }
    if (card.targetUrl) openUrl(card.targetUrl);
    setPhase(card.id, 'step_verify');
  };

  const handleVerify = async (card: CardTask) => {
    setPhase(card.id, 'verifying');
    const telegramId = useAppStore.getState().currentUser.telegramId;

    const succeed = async () => {
      setPhase(card.id, 'completing');
      if (card.source === 'api') {
        await creditApiTask(card.id, card.reward);
      } else {
        completeTask(card.id);
      }
      timerRefs.current[card.id] = setTimeout(() => setPhase(card.id, 'done'), 1500);
    };

    try {
      if (card.type === 'start_bot') {
        const res  = await fetch(`/api/check-bot-start?telegram_id=${telegramId}`);
        const data = await res.json() as { started: boolean };
        if (data.started) await succeed();
        else setPhase(card.id, 'not_subscribed');
      } else {
        const chatId = card.targetUrl
          ? '@' + card.targetUrl.replace('https://t.me/', '').split('/')[0]
          : '';
        const res  = await fetch(`/api/check-membership?telegram_id=${telegramId}&chat_id=${encodeURIComponent(chatId)}`);
        const data = await res.json() as { member: boolean };
        if (data.member) await succeed();
        else setPhase(card.id, 'not_subscribed');
      }
    } catch {
      await succeed();
    }
  };

  // ── Promo proof ─────────────────────────────────────────────────
  const handleSubmitProof = (taskId: string) => {
    if (proofSubmitting || !proofText.trim()) return;
    setProofSubmitting(true);
    const result = submitTaskProof(taskId, proofText);
    setTimeout(() => {
      setProofSubmitting(false);
      setProofResult({
        taskId,
        success: result.success,
        message: result.success ? 'Soumission envoyée ! En attente de validation.' : (result.error ?? 'Erreur.'),
      });
      if (result.success) { setProofOpen(null); setProofText(''); }
      setTimeout(() => setProofResult(null), 5000);
    }, 700);
  };

  // ── Card renderer ────────────────────────────────────────────────
  const renderCard = (card: CardTask) => {
    const config      = typeConfig[card.type] ?? typeConfig.special;
    const phase       = getPhase(card.id);
    const isCompleted = (card.source === 'platform' && completedTaskIds.includes(card.id)) ||
                        (card.source === 'api'      && completedApiTaskIds.includes(card.id));
    const isDone      = isCompleted || phase === 'done';
    const displayReward = card.reward * (card.promoMultiplier ?? 1);
    const needsVerify = card.type === 'join_channel' || card.type === 'join_group';
    const isBot       = card.type === 'start_bot';
    const notSubbed   = phase === 'not_subscribed';

    return (
      <div
        key={card.id}
        className={`glass-card p-4 transition-all space-y-3 ${isDone ? 'opacity-50' : ''} ${card.promoMultiplier ? 'border border-amber-500/30' : ''}`}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.color}`}>
            {card.icon ? <span className="text-base">{card.icon}</span> : config.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <h3 className="text-sm font-semibold text-white">{card.title}</h3>
              {card.promoMultiplier && (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[9px] font-bold">
                  <Flame className="w-2.5 h-2.5" /> ×{card.promoMultiplier}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mb-2">{card.description}</p>

            {card.maxCompletions && (
              <div className="mb-2">
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill bg-gradient-to-r from-blue-500 to-purple-500"
                    style={{ width: `${Math.min((card.totalCompletions / card.maxCompletions) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {card.totalCompletions.toLocaleString()}/{card.maxCompletions.toLocaleString()} places
                </p>
              </div>
            )}

            <div className="flex items-center gap-2">
              {card.promoMultiplier ? (
                <>
                  <span className="text-lg font-bold text-amber-400">+{displayReward.toFixed(4)} TON</span>
                  <span className="text-xs text-slate-500 line-through">+{card.reward.toFixed(4)}</span>
                </>
              ) : (
                <span className="text-lg font-bold text-emerald-400">+{displayReward.toFixed(4)} TON</span>
              )}
            </div>
          </div>

          {/* Action button */}
          <div className="flex-shrink-0">
            {isDone ? (
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <CheckCircle className="w-5 h-5" />
              </div>
            ) : phase === 'completing' ? (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Crédit...
              </div>
            ) : phase === 'idle' ? (
              <button
                onClick={() => handleStart(card)}
                className="px-4 py-2 rounded-xl btn-primary text-xs font-semibold text-white flex items-center gap-1.5"
              >
                Faire <ExternalLink className="w-3 h-3" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Verify step — channel / group */}
        {needsVerify && (phase === 'step_verify' || phase === 'verifying' || notSubbed) && (
          <div className="border-t border-white/5 pt-3 space-y-2">
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/15">
              <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <p className="text-xs text-blue-300">
                {card.type === 'join_channel'
                  ? 'Abonnez-vous au canal ci-dessus, puis vérifiez.'
                  : 'Rejoignez le groupe ci-dessus, puis vérifiez.'}
              </p>
            </div>
            {notSubbed && (
              <p className="text-xs text-red-400 text-center">Abonnement non détecté — abonnez-vous d'abord.</p>
            )}
            <button
              onClick={() => void handleVerify(card)}
              disabled={phase === 'verifying'}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-semibold hover:bg-blue-500/25 transition-all disabled:opacity-50"
            >
              {phase === 'verifying'
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Vérification en cours...</>
                : <><ShieldCheck className="w-3.5 h-3.5" /> Vérifier mon abonnement</>}
            </button>
          </div>
        )}

        {/* Verify step — bot */}
        {isBot && (phase === 'step_verify' || phase === 'verifying' || notSubbed) && (
          <div className="border-t border-white/5 pt-3 space-y-2">
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/15">
              <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <p className="text-xs text-blue-300">Envoyez /start au bot ci-dessus, puis vérifiez.</p>
            </div>
            {notSubbed && (
              <p className="text-xs text-red-400 text-center">
                Bot non démarré — envoyez /start d'abord.
              </p>
            )}
            <button
              onClick={() => void handleVerify(card)}
              disabled={phase === 'verifying'}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-semibold hover:bg-blue-500/25 transition-all disabled:opacity-50"
            >
              {phase === 'verifying'
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Vérification en cours...</>
                : <><ShieldCheck className="w-3.5 h-3.5" /> Vérifier</>}
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────────
  const totalAvailable = allCards.length;

  return (
    <div className="space-y-6 animate-slide-up">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Tâches</h1>
          <p className="text-sm text-slate-400">
            {totalAvailable} tâche{totalAvailable !== 1 ? 's' : ''} disponible{totalAvailable !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setMiniAppPage('myTasks')}
          className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          Mes campagnes
        </button>
      </div>

      {/* Sections */}
      {SECTIONS.map(section => {
        const cards = allCards.filter(c => c.type === section.type);
        if (!section.creatable && cards.length === 0) return null;

        return (
          <div key={section.type} className="space-y-3">
            {/* Section header */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{section.icon}</span>
                {section.label}
              </h2>
              {section.creatable && (
                <button
                  onClick={() => setMiniAppPage('createTask')}
                  className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                  title="Créer une tâche"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Cards or empty state */}
            {cards.length === 0 ? (
              <div className="glass-card p-5 flex flex-col items-center gap-2 text-center">
                <AlertCircle className="w-6 h-6 text-slate-600" />
                <p className="text-xs text-slate-500">Aucune tâche</p>
                <button
                  onClick={() => setMiniAppPage('createTask')}
                  className="text-xs text-blue-400 hover:underline"
                >
                  Créer une tâche →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {cards.map(card => renderCard(card))}
              </div>
            )}
          </div>
        );
      })}

      {/* Promo / Special tasks */}
      {promoTasks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-[10px] text-slate-600 font-medium tracking-wider uppercase">Tâches Promo</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          <p className="text-[10px] text-slate-500 px-1">
            Complétez la condition et soumettez votre preuve pour être récompensé.
          </p>

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
              <div
                key={task.id}
                className={`glass-card p-4 space-y-3 border ${isApproved ? 'border-emerald-500/25' : 'border-purple-500/20'}`}
              >
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
                    <span className="text-[10px] text-slate-500 flex-shrink-0">
                      {task.totalCompletions}/{task.maxCompletions} places
                    </span>
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
                      <p className="text-[10px] text-red-400/70">Motif : {userSubmission.adminNote}</p>
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
                      placeholder="Décrivez votre preuve ou collez un lien…"
                      rows={3}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs resize-none focus:outline-none focus:border-purple-500/50 placeholder:text-slate-600"
                    />
                    <button
                      onClick={() => handleSubmitProof(task.id)}
                      disabled={!proofText.trim() || proofSubmitting}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl btn-primary text-xs font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {proofSubmitting
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Envoi...</>
                        : <><Send className="w-3.5 h-3.5" /> Envoyer ma preuve</>}
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
