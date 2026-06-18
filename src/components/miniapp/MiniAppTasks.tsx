import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import {
  Hash, Users, Bot, Calendar, Star, CheckCircle, ExternalLink, Plus,
  AlertCircle, Flame, Loader2, ShieldCheck, Clock, FileText, Send, X, RotateCcw,
} from 'lucide-react';
import { haptic } from '../../lib/haptics';

const TaskDoneCheck: React.FC = () => (
  <div className="relative w-9 h-9 flex items-center justify-center flex-shrink-0">
    {/* Ring pulse */}
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 36 36">
      <circle
        cx="18" cy="18" r="16" fill="none" stroke="rgba(52,211,153,0.5)" strokeWidth="2"
        style={{ animation: 'ringPulse 0.6s ease-out forwards' }}
      />
    </svg>
    {/* Circle + check */}
    <svg className="w-9 h-9" viewBox="0 0 36 36">
      <circle
        cx="18" cy="18" r="15" fill="none" stroke="#34d399" strokeWidth="2"
        strokeDasharray="95" strokeDashoffset="95"
        style={{ animation: 'checkDraw 0.35s ease-out forwards' }}
      />
      <polyline
        points="11,18 16,23 25,13" fill="none" stroke="#34d399" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray="22" strokeDashoffset="22"
        style={{ animation: 'checkDraw 0.3s 0.4s ease-out forwards' }}
      />
    </svg>
  </div>
);

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

const SECTIONS: { type: string; label: string; icon: string; creatable: boolean; groupBefore?: string; color: string }[] = [
  { type: 'daily',        label: 'Tâches quotidiennes', icon: '📅', creatable: false, color: 'text-amber-400'   },
  { type: 'special',      label: 'Tâches spéciales',    icon: '⭐', creatable: false, color: 'text-pink-400'    },
  { type: 'join_channel', label: 'Canaux',               icon: '📢', creatable: true,  color: 'text-blue-400',   groupBefore: 'Communautés Telegram' },
  { type: 'join_group',   label: 'Groupes',              icon: '👥', creatable: true,  color: 'text-purple-400' },
  { type: 'start_bot',    label: 'Bots & Mini Apps',     icon: '🤖', creatable: true,  color: 'text-cyan-400',   groupBefore: 'Applications' },
];

type TaskPhase = 'idle' | 'too_early' | 'ready' | 'verifying' | 'not_subscribed' | 'completing' | 'done';

const REQUIRED_MS         = 30_000; // bots: 30s
const CHANNEL_REQUIRED_MS = 5_000;  // channels/groups: 5s
const departKey = (id: string) => `tc_task_depart_${id}`;

type DepartEntry = { ts: number; ms: number };

function openUrl(url: string) {
  const tg = (window as unknown as { Telegram?: { WebApp?: { openTelegramLink?: (u: string) => void; openLink?: (u: string) => void } } }).Telegram?.WebApp;
  if (tg?.openTelegramLink && url.includes('t.me')) tg.openTelegramLink(url);
  else if (tg?.openLink) tg.openLink(url);
  else window.open(url, '_blank');
}

function taskAvatarColor(name: string): string {
  const hue = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return `hsl(${hue}, 60%, 45%)`;
}

// ── Color map per task type ────────────────────────────────────────────────────

const COLORS: Record<string, { glow: string; bg: string }> = {
  join_channel: { glow: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  join_group:   { glow: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  start_bot:    { glow: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  daily:        { glow: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  special:      { glow: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
};

const getColors = (type: string) => COLORS[type] ?? { glow: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' };

// ── Component ──────────────────────────────────────────────────────────────────

export const MiniAppTasks: React.FC = () => {
  const {
    tasks, completedTaskIds, completeTask, creditReferralBonus,
    setMiniAppPage, currentUser, taskSubmissions, submitTaskProof, platformConfig,
  } = useAppStore();

  const eventPromo = platformConfig.promoEvent;
  const isEventActive = eventPromo?.active && new Date(eventPromo.endsAt) > new Date();
  const eventMult = isEventActive ? eventPromo!.multiplier : 1;

  const [taskStates, setTaskStates] = useState<Record<string, { phase: TaskPhase }>>({});
  const timerRefs                   = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [tick, setTick]             = useState(0); // 1-second ticker for countdown display

  const [apiTasks,            setApiTasks]            = useState<ApiTask[]>([]);
  const [completedApiTaskIds, setCompletedApiTaskIds] = useState<string[]>([]);

  const [proofOpen,       setProofOpen]       = useState<string | null>(null);
  const [proofText,       setProofText]       = useState('');
  const [proofImage,      setProofImage]      = useState<string | null>(null);
  const [proofSubmitting, setProofSubmitting] = useState(false);
  const [proofResult,     setProofResult]     = useState<{ taskId: string; success: boolean; message: string } | null>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const setPhase = (id: string, phase: TaskPhase) =>
    setTaskStates(prev => ({ ...prev, [id]: { phase } }));
  const getPhase = (id: string): TaskPhase =>
    taskStates[id]?.phase ?? 'idle';

  // Parse departure entry (supports legacy plain-timestamp format)
  const parseDeparture = (raw: string | null): DepartEntry | null => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as DepartEntry;
      if (parsed.ts && parsed.ms) return parsed;
    } catch { /* legacy */ }
    const ts = parseInt(raw, 10);
    return isNaN(ts) ? null : { ts, ms: REQUIRED_MS };
  };

  // Check departure times and update phases on return from external app
  const checkDepartures = () => {
    const now  = Date.now();
    const keys = Object.keys(localStorage).filter(k => k.startsWith('tc_task_depart_'));
    keys.forEach(key => {
      const id      = key.replace('tc_task_depart_', '');
      const entry   = parseDeparture(localStorage.getItem(key));
      if (!entry) return;
      const remainingMs = entry.ms - (now - entry.ts);

      if (remainingMs <= 0) {
        setTaskStates(prev => ({ ...prev, [id]: { phase: 'ready' } }));
      } else {
        setTaskStates(prev => ({ ...prev, [id]: { phase: 'too_early' } }));
        const autoKey = `depart_auto_${id}`;
        if (!timerRefs.current[autoKey]) {
          timerRefs.current[autoKey] = setTimeout(() => {
            delete timerRefs.current[autoKey];
            setTaskStates(prev => ({ ...prev, [id]: { phase: 'ready' } }));
          }, remainingMs);
        }
      }
    });
  };

  // ── Effects ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const snap = timerRefs.current;
    return () => { Object.values(snap).forEach(clearTimeout); };
  }, []);

  // 1-second ticker so too_early cards show a live countdown
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Restore departure timers on mount + listen for app return
  useEffect(() => {
    checkDepartures();

    const onVisible = () => { if (document.visibilityState === 'visible') checkDepartures(); };
    document.addEventListener('visibilitychange', onVisible);

    const tg = (window as unknown as { Telegram?: { WebApp?: { onEvent?: (e: string, cb: () => void) => void; offEvent?: (e: string, cb: () => void) => void } } }).Telegram?.WebApp;
    tg?.onEvent?.('activated', checkDepartures);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      tg?.offEvent?.('activated', checkDepartures);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load server tasks on mount (user-created tasks visible to all)
  useEffect(() => {
    const tid = useAppStore.getState().currentUser.telegramId;
    fetch(`/api/user-tasks/available?telegram_id=${tid}`)
      .then(r => r.json())
      .then((data: ApiTask[]) => setApiTasks(data))
      .catch(() => {}); // no server in local dev — silently ignore

    // SSE: subscribe to real-time task lifecycle events
    const es = new EventSource('/api/tasks/stream');

    es.addEventListener('task_approved', (e: MessageEvent) => {
      try {
        const task = JSON.parse(e.data) as ApiTask;
        const myId = useAppStore.getState().currentUser.telegramId;
        setApiTasks(prev => {
          if (prev.some(t => t.id === task.id)) return prev;
          return [task, ...prev];
        });
        void myId;
      } catch { /* ignore malformed */ }
    });

    es.addEventListener('task_updated', (e: MessageEvent) => {
      try {
        const patch = JSON.parse(e.data) as { id: string; totalCompletions: number };
        setApiTasks(prev => prev.map(t => t.id === patch.id ? { ...t, totalCompletions: patch.totalCompletions } : t));
      } catch { /* ignore */ }
    });

    es.addEventListener('task_removed', (e: MessageEvent) => {
      try {
        const { id } = JSON.parse(e.data) as { id: string };
        setApiTasks(prev => prev.filter(t => t.id !== id));
      } catch { /* ignore */ }
    });

    return () => { es.close(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Build unified card pool ──────────────────────────────────────────────────

  const promoTasks = tasks.filter(t => t.isActive && t.isPromoTask);
  const allActive  = tasks.filter(
    t => t.isActive && !t.isPromoTask &&
         (t.maxCompletions == null || t.totalCompletions < t.maxCompletions)
  );

  const platformCards: CardTask[] = allActive.map(t => {
    const promoActive = t.promotion && new Date(t.promotion.endsAt) > new Date();
    const taskMult = promoActive ? t.promotion!.multiplier : (eventMult > 1 ? eventMult : undefined);
    return {
      id:               t.id,
      source:           'platform',
      type:             t.type,
      title:            t.title,
      description:      t.description,
      targetUrl:        t.targetUrl,
      reward:           t.reward,
      promoMultiplier:  taskMult,
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

  // ── Completion helpers ───────────────────────────────────────────────────────

  const _creditLocally = (taskId: string, reward: number) => {
    const state = useAppStore.getState();
    state.updateUser(state.currentUser.id, {
      balanceMain:    state.currentUser.balanceMain    + reward,
      totalEarnings:  state.currentUser.totalEarnings  + reward,
      todayEarnings:  state.currentUser.todayEarnings  + reward,
      tasksCompleted: state.currentUser.tasksCompleted + 1,
    });
    creditReferralBonus(reward);
    state.addNotification({
      type: 'reward', title: 'Tâche complétée !',
      message: `+${reward.toFixed(4)} TON crédité.`, isRead: false,
    });
    setCompletedApiTaskIds(prev => [...prev, taskId]);
    setApiTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const creditApiTask = async (taskId: string, reward: number): Promise<boolean> => {
    const telegramId = useAppStore.getState().currentUser.telegramId;
    if (!telegramId) {
      _creditLocally(taskId, reward);
      return true;
    }
    try {
      const res  = await fetch(`/api/user-tasks/${taskId}/complete`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ telegramId }),
      });
      const data = await res.json() as { success?: boolean; reward?: number; error?: string };
      if (data.success) {
        _creditLocally(taskId, typeof data.reward === 'number' ? data.reward : reward);
        return true;
      }
      setPhase(taskId, 'not_subscribed');
      haptic.error();
      return false;
    } catch {
      _creditLocally(taskId, reward);
      return true;
    }
  };

  // ── Action handlers ──────────────────────────────────────────────────────────

  const handleJoin = (card: CardTask) => {
    if (!card.targetUrl) return;
    const waitMs  = card.type === 'start_bot' ? REQUIRED_MS : CHANNEL_REQUIRED_MS;
    const autoKey = `depart_auto_${card.id}`;
    if (timerRefs.current[autoKey]) { clearTimeout(timerRefs.current[autoKey]); delete timerRefs.current[autoKey]; }
    localStorage.setItem(departKey(card.id), JSON.stringify({ ts: Date.now(), ms: waitMs }));
    setPhase(card.id, 'too_early');
    timerRefs.current[autoKey] = setTimeout(() => {
      delete timerRefs.current[autoKey];
      setPhase(card.id, 'ready');
    }, waitMs);
    openUrl(card.targetUrl);
  };

  const handleStart = (card: CardTask) => {
    const phase = getPhase(card.id);
    if (phase === 'completing' || phase === 'done') return;
    if (card.source === 'platform' && completedTaskIds.includes(card.id)) return;
    if (card.source === 'api'      && completedApiTaskIds.includes(card.id)) return;

    haptic.impact('light');

    if (card.isInstant) {
      setPhase(card.id, 'completing');
      completeTask(card.id);
      timerRefs.current[card.id] = setTimeout(() => {
        setPhase(card.id, 'done');
        haptic.success();
        timerRefs.current[`rm_${card.id}`] = setTimeout(() => {
          setTaskStates(prev => { const n = { ...prev }; delete n[card.id]; return n; });
        }, 2000);
      }, 1200);
      return;
    }

    if (card.targetUrl) openUrl(card.targetUrl);

    const waitMs  = card.type === 'start_bot' ? REQUIRED_MS : CHANNEL_REQUIRED_MS;
    const autoKey = `depart_auto_${card.id}`;
    if (timerRefs.current[autoKey]) { clearTimeout(timerRefs.current[autoKey]); delete timerRefs.current[autoKey]; }
    localStorage.setItem(departKey(card.id), JSON.stringify({ ts: Date.now(), ms: waitMs }));
    setPhase(card.id, 'too_early');
    timerRefs.current[autoKey] = setTimeout(() => {
      delete timerRefs.current[autoKey];
      setPhase(card.id, 'ready');
    }, waitMs);
  };

  const handleVerify = async (card: CardTask) => {
    haptic.impact('light');
    setPhase(card.id, 'verifying');
    await new Promise<void>(r => setTimeout(r, 800));

    const entry = parseDeparture(localStorage.getItem(departKey(card.id)));
    const verified = entry != null && (Date.now() - entry.ts) >= entry.ms;

    if (!verified) {
      setPhase(card.id, 'not_subscribed');
      haptic.error();
      return;
    }

    localStorage.removeItem(departKey(card.id));
    const autoKey = `depart_auto_${card.id}`;
    if (timerRefs.current[autoKey]) { clearTimeout(timerRefs.current[autoKey]); delete timerRefs.current[autoKey]; }
    setPhase(card.id, 'completing');
    if (card.source === 'api') {
      const ok = await creditApiTask(card.id, card.reward);
      if (!ok) return;
    } else {
      completeTask(card.id);
    }
    timerRefs.current[card.id] = setTimeout(() => {
      setPhase(card.id, 'done');
      haptic.success();
      timerRefs.current[`rm_${card.id}`] = setTimeout(() => {
        setTaskStates(prev => { const n = { ...prev }; delete n[card.id]; return n; });
      }, 2000);
    }, 1500);
  };

  // ── Promo proof ──────────────────────────────────────────────────────────────

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 1200;
        const scale = Math.min(1, maxW / img.width);
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setProofImage(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmitProof = (taskId: string) => {
    if (proofSubmitting || (!proofText.trim() && !proofImage)) return;
    setProofSubmitting(true);
    const result = submitTaskProof(taskId, proofText, proofImage ?? undefined);
    setTimeout(() => {
      setProofSubmitting(false);
      setProofResult({
        taskId,
        success: result.success,
        message: result.success ? 'Soumission envoyée ! En attente de validation.' : (result.error ?? 'Erreur.'),
      });
      if (result.success) { setProofOpen(null); setProofText(''); setProofImage(null); }
      setTimeout(() => setProofResult(null), 5000);
    }, 700);
  };

  // ── Filter state ─────────────────────────────────────────────────────────────

  const [activeFilter, setActiveFilter] = React.useState<'all' | 'daily' | 'special' | 'channel' | 'bot'>('all');

  // ── Card renderer ────────────────────────────────────────────────────────────

  const renderCard = (card: CardTask) => {
    const config      = typeConfig[card.type] ?? typeConfig.special;
    const phase       = getPhase(card.id);
    const isCompleted = (card.source === 'platform' && completedTaskIds.includes(card.id)) ||
                        (card.source === 'api'      && completedApiTaskIds.includes(card.id));

    if (isCompleted && phase !== 'completing' && phase !== 'done') return null;

    const isDone         = isCompleted || phase === 'done';
    const displayReward  = card.reward * (card.promoMultiplier ?? 1);
    const avatarBg       = card.source === 'api' ? taskAvatarColor(card.title) : null;
    const { glow, bg }   = getColors(card.type);

    const _dEntry = phase === 'too_early' ? parseDeparture(localStorage.getItem(departKey(card.id))) : null;
    void tick;
    const remainingSec = _dEntry ? Math.max(0, Math.ceil((_dEntry.ms - (Date.now() - _dEntry.ts)) / 1000)) : 0;
    const totalSec = _dEntry ? Math.ceil(_dEntry.ms / 1000) : 30;

    const actionLabel = card.type === 'join_channel' || card.type === 'join_group'
      ? 'Rejoindre'
      : card.type === 'start_bot'
      ? 'Lancer'
      : 'Faire';

    const isBot     = card.type === 'start_bot';
    const notSubbed = phase === 'not_subscribed';

    const hasProgress = card.maxCompletions != null && card.maxCompletions > 0;
    const progressPct = hasProgress
      ? Math.min((card.totalCompletions / card.maxCompletions!) * 100, 100)
      : 0;

    return (
      <div
        key={card.id}
        style={{
          borderRadius: 18,
          border: `1px solid ${glow}28`,
          overflow: 'hidden',
          background: isDone ? 'rgba(52,211,153,0.04)' : 'rgba(255,255,255,0.03)',
        }}
      >
        {/* Promo accent stripe */}
        {card.promoMultiplier && (
          <div style={{ height: 2, background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }} />
        )}

        {/* Card body */}
        <div style={{ padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>

            {/* Icon */}
            <div style={{
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: avatarBg ? `${avatarBg}33` : bg,
              border: `1px solid ${avatarBg ?? glow}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isDone ? (
                <CheckCircle style={{ width: 22, height: 22, color: '#34d399' }} />
              ) : card.icon ? (
                <span style={{ fontSize: 22 }}>{card.icon}</span>
              ) : avatarBg ? (
                <span style={{ fontSize: 18, fontWeight: 700, color: avatarBg }}>
                  {card.title.charAt(0).toUpperCase()}
                </span>
              ) : (
                <span style={{ color: glow }}>
                  {React.cloneElement(config.icon as React.ReactElement<{ style?: React.CSSProperties }>, { style: { width: 22, height: 22 } })}
                </span>
              )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>{card.title}</span>
                {card.promoMultiplier && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    padding: '2px 6px', borderRadius: 6,
                    background: 'rgba(245,158,11,0.15)', color: '#fbbf24',
                    fontSize: 9, fontWeight: 700,
                  }}>
                    <Flame style={{ width: 9, height: 9 }} /> &times;{card.promoMultiplier}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 11, color: '#64748b', margin: 0, lineHeight: 1.4 }}>{card.description}</p>
            </div>

            {/* Reward */}
            <div style={{ flexShrink: 0, textAlign: 'right' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: card.promoMultiplier ? '#fbbf24' : '#4ade80' }}>
                +{displayReward.toFixed(4)}
              </div>
              <div style={{ fontSize: 9, color: '#475569', marginTop: 1 }}>TON</div>
              {card.promoMultiplier && (
                <div style={{ fontSize: 10, color: '#475569', textDecoration: 'line-through', marginTop: 2 }}>
                  +{card.reward.toFixed(4)}
                </div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {hasProgress && (
            <div style={{ marginTop: 10, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
              <div style={{
                height: '100%', borderRadius: 99, background: glow,
                width: `${progressPct}%`, transition: 'width 0.3s ease',
              }} />
            </div>
          )}
        </div>

        {/* Action zone */}
        <div style={{ padding: '0 14px 14px' }}>

          {/* IDLE */}
          {phase === 'idle' && !isDone && (
            <button
              onClick={() => handleStart(card)}
              style={{
                width: '100%', padding: '10px 0', borderRadius: 12,
                background: bg, border: `1px solid ${glow}45`,
                color: glow, fontSize: 12, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                cursor: 'pointer',
              }}
            >
              {actionLabel} <ExternalLink style={{ width: 13, height: 13 }} />
            </button>
          )}

          {/* TOO EARLY */}
          {phase === 'too_early' && (
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 12, marginBottom: 8,
                background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
              }}>
                {/* Circular countdown */}
                <div style={{ position: 'relative', width: 35, height: 35, flexShrink: 0 }}>
                  <svg width="35" height="35" viewBox="0 0 35 35" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="17.5" cy="17.5" r="14" fill="none" stroke="rgba(245,158,11,0.15)" strokeWidth="2.5" />
                    <circle
                      cx="17.5" cy="17.5" r="14" fill="none" stroke="#f59e0b" strokeWidth="2.5"
                      strokeDasharray={`${2 * Math.PI * 14}`}
                      strokeDashoffset={`${2 * Math.PI * 14 * (remainingSec / totalSec)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 800, color: '#f59e0b',
                  }}>{remainingSec}s</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600, margin: 0, marginBottom: 2 }}>
                    {isBot
                      ? 'Restez dans le bot au moins 30s'
                      : `Rejoignez le ${card.type === 'join_channel' ? 'canal' : 'groupe'} puis revenez`}
                  </p>
                  <p style={{ fontSize: 10, color: '#92400e', margin: 0 }}>
                    Vérification disponible dans {remainingSec}s
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {card.targetUrl && (
                  <button
                    onClick={() => handleJoin(card)}
                    style={{
                      flex: 1, padding: '9px 0', borderRadius: 12,
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      color: '#94a3b8', fontSize: 11, fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      cursor: 'pointer',
                    }}
                  >
                    <RotateCcw style={{ width: 12, height: 12 }} /> Retourner
                  </button>
                )}
                <button
                  disabled={remainingSec > 0}
                  onClick={remainingSec === 0 ? () => void handleVerify(card) : undefined}
                  style={{
                    flex: 2, padding: '9px 0', borderRadius: 12,
                    background: remainingSec > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(59,130,246,0.15)',
                    border: remainingSec > 0 ? '1px solid rgba(245,158,11,0.2)' : '1px solid rgba(59,130,246,0.35)',
                    color: remainingSec > 0 ? '#f59e0b' : '#60a5fa',
                    fontSize: 11, fontWeight: 700,
                    opacity: remainingSec > 0 ? 0.6 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    cursor: remainingSec > 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <ShieldCheck style={{ width: 12, height: 12 }} />
                  {remainingSec > 0 ? `Vérifier (${remainingSec}s)` : 'Vérifier'}
                </button>
              </div>
            </div>
          )}

          {/* READY */}
          {phase === 'ready' && !notSubbed && (
            <button
              onClick={() => void handleVerify(card)}
              style={{
                width: '100%', padding: '10px 0', borderRadius: 12,
                background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.35)',
                color: '#60a5fa', fontSize: 12, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                cursor: 'pointer',
              }}
            >
              <ShieldCheck style={{ width: 14, height: 14 }} /> Vérifier
            </button>
          )}

          {/* NOT SUBSCRIBED */}
          {notSubbed && (
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 10, marginBottom: 8,
                background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
              }}>
                <AlertCircle style={{ width: 13, height: 13, color: '#f87171', flexShrink: 0 }} />
                <p style={{ fontSize: 10, color: '#f87171', margin: 0 }}>
                  {isBot ? "Bot non démarré — envoyez /start d'abord." : "Abonnement non détecté — rejoignez d'abord."}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {card.targetUrl && (
                  <button
                    onClick={() => handleJoin(card)}
                    style={{
                      flex: 1, padding: '9px 0', borderRadius: 12,
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      color: '#94a3b8', fontSize: 11, fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      cursor: 'pointer',
                    }}
                  >
                    <RotateCcw style={{ width: 12, height: 12 }} /> Retourner
                  </button>
                )}
                <button
                  onClick={() => void handleVerify(card)}
                  style={{
                    flex: 2, padding: '9px 0', borderRadius: 12,
                    background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.35)',
                    color: '#60a5fa', fontSize: 11, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    cursor: 'pointer',
                  }}
                >
                  <ShieldCheck style={{ width: 12, height: 12 }} /> Vérifier
                </button>
              </div>
            </div>
          )}

          {/* VERIFYING */}
          {phase === 'verifying' && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '10px 0', borderRadius: 12,
              background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
            }}>
              <Loader2 style={{ width: 14, height: 14, color: '#60a5fa', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#60a5fa' }}>Vérification...</span>
            </div>
          )}

          {/* COMPLETING */}
          {phase === 'completing' && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '10px 0', borderRadius: 12,
              background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)',
            }}>
              <Loader2 style={{ width: 14, height: 14, color: '#34d399', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#34d399' }}>Crédit en cours...</span>
            </div>
          )}

          {/* DONE */}
          {phase === 'done' && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '6px 0',
            }}>
              <TaskDoneCheck />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#34d399' }}>Récompense créditée !</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const totalAvailable = allCards.length;

  const getFilteredCards = (): CardTask[] => {
    switch (activeFilter) {
      case 'daily':   return allCards.filter(c => c.type === 'daily');
      case 'special': return allCards.filter(c => c.type === 'special');
      case 'channel': return allCards.filter(c => c.type === 'join_channel' || c.type === 'join_group');
      case 'bot':     return allCards.filter(c => c.type === 'start_bot');
      default:        return allCards;
    }
  };

  const filteredCards = getFilteredCards();
  const showPromo = activeFilter === 'all' || activeFilter === 'special';

  // Keep SECTIONS defined for completeness, suppress unused warning
  void SECTIONS;

  return (
    <div className="animate-slide-up" style={{ paddingBottom: 8 }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.3px', margin: 0 }}>Tâches</h1>
            <p style={{ fontSize: 12, color: '#475569', marginTop: 2, marginBottom: 0 }}>
              {totalAvailable} disponible{totalAvailable > 1 ? 's' : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {currentUser.todayEarnings > 0 && (
              <div style={{
                padding: '5px 10px', borderRadius: 10,
                background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#34d399' }}>
                  +{currentUser.todayEarnings.toFixed(2)} TON
                </span>
              </div>
            )}
            <button
              onClick={() => setMiniAppPage('myTasks')}
              style={{
                padding: '6px 12px', borderRadius: 10,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                color: '#64748b', fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Mes campagnes
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {([
            { key: 'all',     label: 'Toutes',       count: allCards.length },
            { key: 'daily',   label: '📅 Quotidien', count: allCards.filter(c => c.type === 'daily').length },
            { key: 'special', label: '⭐ Spécial',   count: allCards.filter(c => c.type === 'special').length + promoTasks.length },
            { key: 'channel', label: '📢 Canaux',    count: allCards.filter(c => c.type === 'join_channel' || c.type === 'join_group').length },
            { key: 'bot',     label: '🤖 Bots',      count: allCards.filter(c => c.type === 'start_bot').length },
          ] as { key: typeof activeFilter; label: string; count: number }[]).map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
                background: activeFilter === f.key ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
                border: activeFilter === f.key ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.07)',
                color: activeFilter === f.key ? '#60a5fa' : '#64748b',
              }}
            >
              {f.label}{f.count > 0 ? ` (${f.count})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Task list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredCards.map(card => renderCard(card))}

        {/* Promo tasks (shown in 'all' and 'special' filters) */}
        {showPromo && promoTasks.map(task => {
          const isAutoReferral = task.verificationMethod === 'auto_referral';

          // ── AUTO-REFERRAL task ──────────────────────────────────────────────
          if (isAutoReferral) {
            const required   = task.requiredCount ?? 3;
            const count      = currentUser.referralDailyCount;
            const isComplete = completedTaskIds.includes(task.id);
            const isEligible = count >= required;
            const pct        = Math.min((count / required) * 100, 100);

            return (
              <div
                key={task.id}
                style={{
                  borderRadius: 18,
                  border: isComplete ? '1px solid rgba(52,211,153,0.25)' : '1px solid rgba(139,92,246,0.25)',
                  overflow: 'hidden',
                  background: 'rgba(139,92,246,0.04)',
                }}
              >
                <div style={{ padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                      background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                    }}>
                      {task.icon ?? '🏆'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>{task.title}</span>
                        <span style={{
                          padding: '2px 6px', borderRadius: 6,
                          background: 'rgba(139,92,246,0.2)', color: '#a78bfa',
                          fontSize: 9, fontWeight: 700,
                        }}>PROMO</span>
                      </div>
                      <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4, margin: 0 }}>{task.description}</p>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#4ade80' }}>+{task.reward.toFixed(4)}</div>
                      <div style={{ fontSize: 9, color: '#475569', marginTop: 1 }}>TON</div>
                    </div>
                  </div>

                  {/* Referral progress */}
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: '#64748b' }}>Filleuls aujourd'hui</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: isEligible ? '#34d399' : '#94a3b8' }}>
                        {count} / {required}
                      </span>
                    </div>
                    <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.08)' }}>
                      <div style={{
                        height: '100%', borderRadius: 99,
                        background: isEligible
                          ? 'linear-gradient(90deg, #10b981, #34d399)'
                          : 'linear-gradient(90deg, #8b5cf6, #ec4899)',
                        width: `${pct}%`, transition: 'width 0.3s ease',
                      }} />
                    </div>
                  </div>
                </div>

                <div style={{ padding: '0 14px 14px' }}>
                  {isComplete ? (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '9px 12px', borderRadius: 12,
                      background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.2)',
                    }}>
                      <CheckCircle style={{ width: 14, height: 14, color: '#34d399', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#34d399' }}>Validée — récompense créditée</span>
                    </div>
                  ) : isEligible ? (
                    <button
                      onClick={() => completeTask(task.id)}
                      style={{
                        width: '100%', padding: '10px 0', borderRadius: 12,
                        background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                        border: 'none', color: '#fff', fontSize: 12, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        cursor: 'pointer',
                      }}
                    >
                      <CheckCircle style={{ width: 14, height: 14 }} />
                      Récupérer ma récompense
                    </button>
                  ) : (
                    <button
                      onClick={() => setMiniAppPage('referral')}
                      style={{
                        width: '100%', padding: '10px 0', borderRadius: 12,
                        background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)',
                        color: '#a78bfa', fontSize: 12, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        cursor: 'pointer',
                      }}
                    >
                      <Users style={{ width: 14, height: 14 }} />
                      Inviter des amis ({required - count} restant{required - count > 1 ? 's' : ''})
                    </button>
                  )}
                </div>
              </div>
            );
          }

          // ── MANUAL task ─────────────────────────────────────────────────────
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
              style={{
                borderRadius: 18,
                border: isApproved ? '1px solid rgba(52,211,153,0.25)' : '1px solid rgba(139,92,246,0.25)',
                overflow: 'hidden',
                background: isApproved ? 'rgba(52,211,153,0.04)' : 'rgba(139,92,246,0.04)',
              }}
            >
              <div style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                    background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                  }}>
                    {task.icon ?? '🎯'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>{task.title}</span>
                      <span style={{
                        padding: '2px 6px', borderRadius: 6,
                        background: 'rgba(139,92,246,0.2)', color: '#a78bfa',
                        fontSize: 9, fontWeight: 700,
                      }}>PROMO</span>
                    </div>
                    <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4, margin: 0 }}>{task.description}</p>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#4ade80' }}>+{task.reward.toFixed(4)}</div>
                    <div style={{ fontSize: 9, color: '#475569', marginTop: 1 }}>TON</div>
                  </div>
                </div>
              </div>

              <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>

                {isApproved && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '9px 12px', borderRadius: 12,
                    background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.2)',
                  }}>
                    <CheckCircle style={{ width: 14, height: 14, color: '#34d399', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#34d399' }}>Validée — récompense créditée</span>
                  </div>
                )}

                {isPending && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '9px 12px', borderRadius: 12,
                    background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)',
                  }}>
                    <Clock style={{ width: 14, height: 14, color: '#fbbf24', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#fbbf24' }}>En attente de validation par l'équipe</span>
                  </div>
                )}

                {isRejected && (
                  <div style={{
                    padding: '9px 12px', borderRadius: 12,
                    background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
                  }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#f87171', margin: 0, marginBottom: userSubmission?.adminNote ? 3 : 0 }}>
                      Preuve refusée
                    </p>
                    {userSubmission?.adminNote && (
                      <p style={{ fontSize: 10, color: 'rgba(248,113,113,0.7)', margin: 0 }}>Motif : {userSubmission.adminNote}</p>
                    )}
                  </div>
                )}

                {thisResult && (
                  <p style={{ fontSize: 11, fontWeight: 600, color: thisResult.success ? '#34d399' : '#f87171', margin: 0 }}>
                    {thisResult.success ? '✓' : '✗'} {thisResult.message}
                  </p>
                )}

                {!isApproved && !isPending && !isOpen && (
                  <button
                    onClick={() => { setProofOpen(task.id); setProofText(''); setProofResult(null); }}
                    style={{
                      width: '100%', padding: '10px 0', borderRadius: 12,
                      background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)',
                      color: '#a78bfa', fontSize: 12, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      cursor: 'pointer',
                    }}
                  >
                    <FileText style={{ width: 14, height: 14 }} />
                    {isRejected ? 'Soumettre à nouveau' : 'Soumettre ma preuve'}
                  </button>
                )}

                {isOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc' }}>Votre preuve</span>
                      <button
                        onClick={() => { setProofOpen(null); setProofText(''); setProofImage(null); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', padding: 0 }}
                      >
                        <X style={{ width: 16, height: 16 }} />
                      </button>
                    </div>

                    {proofImage ? (
                      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
                        <img
                          src={proofImage} alt="Capture d'écran"
                          style={{ width: '100%', maxHeight: 192, objectFit: 'contain', display: 'block', background: 'rgba(255,255,255,0.04)' }}
                        />
                        <button
                          onClick={() => setProofImage(null)}
                          style={{
                            position: 'absolute', top: 8, right: 8,
                            background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
                            width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: '#fff',
                          }}
                        >
                          <X style={{ width: 12, height: 12 }} />
                        </button>
                      </div>
                    ) : (
                      <label style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: 6, padding: 16, borderRadius: 12,
                        border: '2px dashed rgba(255,255,255,0.12)', cursor: 'pointer',
                      }}>
                        <span style={{ fontSize: 24 }}>📸</span>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', margin: 0 }}>Ajouter une capture d'écran</p>
                        <p style={{ fontSize: 10, color: '#64748b', margin: 0 }}>Appuyez pour choisir ou prendre une photo</p>
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageSelect} />
                      </label>
                    )}

                    <textarea
                      value={proofText}
                      onChange={e => setProofText(e.target.value)}
                      placeholder="Description optionnelle ou lien…"
                      rows={2}
                      style={{
                        width: '100%', padding: '10px 12px', boxSizing: 'border-box',
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 10, color: '#f8fafc', fontSize: 12, resize: 'none',
                        outline: 'none', fontFamily: 'inherit',
                      }}
                    />

                    <button
                      onClick={() => handleSubmitProof(task.id)}
                      disabled={(!proofText.trim() && !proofImage) || proofSubmitting}
                      style={{
                        width: '100%', padding: '10px 0', borderRadius: 12,
                        background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                        border: 'none', color: '#fff', fontSize: 12, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        cursor: (!proofText.trim() && !proofImage) || proofSubmitting ? 'not-allowed' : 'pointer',
                        opacity: (!proofText.trim() && !proofImage) || proofSubmitting ? 0.45 : 1,
                      }}
                    >
                      {proofSubmitting
                        ? <><Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} /> Envoi...</>
                        : <><Send style={{ width: 13, height: 13 }} /> Envoyer ma preuve</>}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {filteredCards.length === 0 && !(showPromo && promoTasks.length > 0) && (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
          <p style={{ color: '#475569', fontSize: 13, fontWeight: 600 }}>Aucune tâche dans cette catégorie</p>
        </div>
      )}

      {/* Create task CTA */}
      <button
        onClick={() => setMiniAppPage('createTask')}
        style={{
          width: '100%', padding: '12px 0', borderRadius: 14,
          background: 'rgba(59,130,246,0.06)', border: '1px dashed rgba(59,130,246,0.25)',
          color: '#3b82f6', fontSize: 12, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          marginTop: 16, cursor: 'pointer',
        }}
      >
        <Plus style={{ width: 14, height: 14 }} /> Créer une tâche sponsorisée
      </button>

    </div>
  );
};
