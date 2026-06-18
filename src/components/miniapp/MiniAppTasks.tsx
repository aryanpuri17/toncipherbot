import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import {
  Hash, Users, Bot, Calendar, Star, CheckCircle, ExternalLink, Plus,
  AlertCircle, Flame, Loader2, ShieldCheck, Clock, FileText, Send, X, RotateCcw,
  Play, Globe,
} from 'lucide-react';
import { haptic } from '../../lib/haptics';

// ── Platform logo SVGs ─────────────────────────────────────────────────────────

const TelegramLogo: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="50" fill="#29B6F6"/>
    <path fill="white" d="M14 49l16 6 6 19c.4 1.3 2 1.7 2.9.8l9-7.5 17.5 12.8c1.2.9 2.9.2 3.2-1.2L84 21c.4-1.8-1.3-3.3-3-2.6L14 46.5c-1.7.6-1.7 3 0 2.5z"/>
  </svg>
);

const YouTubeLogo: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="22" fill="#FF0000"/>
    <path fill="white" d="M71 36.5c-.8-3-3.2-5.4-6.2-6.2C59.5 29 50 29 50 29s-9.5 0-14.8 1.3c-3 .8-5.4 3.2-6.2 6.2C27.7 41.8 27.7 50 27.7 50s0 8.2 1.3 13.5c.8 3 3.2 5.4 6.2 6.2C40.5 71 50 71 50 71s9.5 0 14.8-1.3c3-.8 5.4-3.2 6.2-6.2 1.3-5.3 1.3-13.5 1.3-13.5s0-8.2-1.3-13.5zM44 60V40l18 10-18 10z"/>
  </svg>
);

const XLogo: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="22" fill="#000000"/>
    <path fill="white" d="M18 18h23l11.5 16.5L66 18h16L57.5 46 82 82H59L46 64.5 30 82H14l26-30.5L18 18zm8 7l38 48h8L34 25h-8zm35 0L28 75h-8l33-41.5L52 25h9z"/>
  </svg>
);

const InstagramLogo: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="ig-g" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#FFDC80"/>
        <stop offset="20%" stopColor="#FCAF45"/>
        <stop offset="40%" stopColor="#F77737"/>
        <stop offset="60%" stopColor="#F56040"/>
        <stop offset="80%" stopColor="#C13584"/>
        <stop offset="100%" stopColor="#405DE6"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="22" fill="url(#ig-g)"/>
    <circle cx="50" cy="50" r="19" fill="none" stroke="white" strokeWidth="6"/>
    <circle cx="72" cy="28" r="5" fill="white"/>
  </svg>
);

const TikTokLogo: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="22" fill="#010101"/>
    <path fill="#69C9D0" d="M63 20c1 8 7 13 16 14v10c-6 0-11-2-16-6v28c0 13-10 24-23 24S17 79 17 66s10-24 23-24c2 0 3 .2 5 .5v11C43 53 42 53 40 53c-7 0-13 6-13 13s6 13 13 13 13-6 13-13V20h10z"/>
    <path fill="#EE1D52" d="M60 17c2 9 8 15 17 16v9c-5 0-10-2-15-5v28c0 14-11 25-24 25S14 78 14 64s11-25 24-25c2 0 4 .2 5 .4V54c-2-.3-3-.4-5-.4-8 0-14 7-14 15s6 14 14 14 14-6 14-15V17h8z"/>
    <path fill="white" d="M61 18c2 9 8 15 17 16v9c-5 0-10-2-14-5v28c0 14-11 25-24 25S16 80 16 66s11-25 24-25c2 0 3 .2 5 .4V52c-1-.2-3-.3-5-.3-8 0-14 7-14 15s6 14 14 14 14-6 14-14V18h7z"/>
  </svg>
);

const DiscordLogo: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="22" fill="#5865F2"/>
    <path fill="white" d="M74 29c-7-3-14-4-14-4l-1 2c5 1 9 3 14 6-6-3-13-6-23-6s-17 3-23 6c5-3 9-5 14-6l-1-2s-7 1-14 4C19 44 16 61 16 61c8 9 20 9 20 9l4-5c-6-2-11-5-14-9 6 4 15 7 24 7s18-3 24-7c-3 4-8 7-14 9l4 5s12 0 20-9c0 0-3-17-10-32zm-31 27c-3 0-6-3-6-7s3-7 6-7 6 3 6 7-3 7-6 7zm21 0c-3 0-6-3-6-7s3-7 6-7 6 3 6 7-3 7-6 7z"/>
  </svg>
);

function getPlatformLogo(url: string, type: string, size = 30): React.ReactNode {
  const u = (url ?? '').toLowerCase();
  if (type === 'join_channel' || type === 'join_group' || type === 'start_bot' ||
      u.includes('t.me/') || u.includes('telegram.me') || u.includes('telegram.org'))
    return <TelegramLogo size={size} />;
  if (u.includes('youtube.com') || u.includes('youtu.be'))
    return <YouTubeLogo size={size} />;
  if (u.includes('twitter.com') || u.includes('x.com'))
    return <XLogo size={size} />;
  if (u.includes('instagram.com'))
    return <InstagramLogo size={size} />;
  if (u.includes('tiktok.com'))
    return <TikTokLogo size={size} />;
  if (u.includes('discord.gg') || u.includes('discord.com'))
    return <DiscordLogo size={size} />;
  return null;
}

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
  join_channel:   { icon: <Hash className="w-4 h-4" />,     color: 'bg-blue-500/20 text-blue-400',     label: 'Canal' },
  join_group:     { icon: <Users className="w-4 h-4" />,    color: 'bg-purple-500/20 text-purple-400', label: 'Groupe' },
  start_bot:      { icon: <Bot className="w-4 h-4" />,      color: 'bg-cyan-500/20 text-cyan-400',     label: 'Bot' },
  daily:          { icon: <Calendar className="w-4 h-4" />, color: 'bg-amber-500/20 text-amber-400',   label: 'Quotidien' },
  special:        { icon: <Star className="w-4 h-4" />,     color: 'bg-pink-500/20 text-pink-400',     label: 'Spécial' },
  watch_video:    { icon: <Play className="w-4 h-4" />,     color: 'bg-red-500/20 text-red-400',       label: 'Vidéo' },
  social:         { icon: <Globe className="w-4 h-4" />,    color: 'bg-orange-500/20 text-orange-400', label: 'Social' },
  invite_friends: { icon: <Users className="w-4 h-4" />,    color: 'bg-violet-500/20 text-violet-400', label: 'Parrainage' },
};


type TaskPhase = 'idle' | 'too_early' | 'ready' | 'verifying' | 'not_subscribed' | 'completing' | 'done'
  | 'needs_bot_confirm'  // start_bot API tasks: timer done, awaiting bot deep-link confirmation
  | 'needs_proof'        // social API tasks: timer done, awaiting screenshot via bot
  | 'proof_pending';     // social: screenshot sent, awaiting admin approval

const REQUIRED_MS         = 30_000; // bots: 30s
const CHANNEL_REQUIRED_MS = 5_000;  // channels/groups: 5s
const VIDEO_REQUIRED_MS   = 20_000; // videos: 20s
const SOCIAL_REQUIRED_MS  = 5_000;  // social follow/like: 5s
const MAX_VERIFY_GRACE_MS = 30 * 60_000; // 30-min window after timer expires to verify
const departKey = (id: string) => `tc_task_depart_${id}`;

type DepartEntry = { ts: number; ms: number; type?: string; source?: 'platform' | 'api' };

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
  watch_video:    { glow: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  social:         { glow: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  invite_friends: { glow: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
};

const getColors = (type: string) => COLORS[type] ?? { glow: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' };

// ── Component ──────────────────────────────────────────────────────────────────

export const MiniAppTasks: React.FC = () => {
  const {
    tasks, completedTaskIds, completeTask, creditReferralBonus,
    setMiniAppPage, currentUser, taskSubmissions, submitTaskProof, platformConfig,
  } = useAppStore();

  const botName = platformConfig.botUsername || 'TonCipher_bot';

  const eventPromo = platformConfig.promoEvent;
  const isEventActive = eventPromo?.active && new Date(eventPromo.endsAt) > new Date();
  const eventMult = isEventActive ? eventPromo!.multiplier : 1;

  const [taskStates, setTaskStates] = useState<Record<string, { phase: TaskPhase }>>({});
  const timerRefs                   = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const allCardsRef                 = useRef<CardTask[]>([]);
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
      if (!entry) { localStorage.removeItem(key); return; }
      const elapsed     = now - entry.ts;
      const remainingMs = entry.ms - elapsed;

      const afterPhase = (e: DepartEntry): TaskPhase =>
        e.source === 'api' && e.type === 'start_bot' ? 'needs_bot_confirm'
        : e.source === 'api' && e.type === 'social'   ? 'needs_proof'
        : 'ready';

      if (remainingMs <= 0) {
        // Stale entry from a previous session — clear it, force re-join
        if (elapsed > entry.ms + MAX_VERIFY_GRACE_MS) {
          localStorage.removeItem(key);
          return;
        }
        setTaskStates(prev => ({ ...prev, [id]: { phase: afterPhase(entry) } }));
      } else {
        setTaskStates(prev => ({ ...prev, [id]: { phase: 'too_early' } }));
        const autoKey = `depart_auto_${id}`;
        if (!timerRefs.current[autoKey]) {
          timerRefs.current[autoKey] = setTimeout(() => {
            delete timerRefs.current[autoKey];
            setTaskStates(prev => ({ ...prev, [id]: { phase: afterPhase(entry) } }));
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
        setApiTasks(prev => prev.some(t => t.id === task.id) ? prev : [task, ...prev]);
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
      isInstant:        t.type === 'daily' || t.type === 'special' || t.type === 'invite_friends',
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
  allCardsRef.current = allCards;

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
      message: `+${reward.toFixed(4)} GRAM crédité.`, isRead: false,
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
    const waitMs  = card.type === 'start_bot' ? REQUIRED_MS : card.type === 'watch_video' ? VIDEO_REQUIRED_MS : card.type === 'social' ? SOCIAL_REQUIRED_MS : CHANNEL_REQUIRED_MS;
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

    if (card.type === 'invite_friends') {
      setMiniAppPage('referral');
      return;
    }

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

    const waitMs  = card.type === 'start_bot' ? REQUIRED_MS : card.type === 'watch_video' ? VIDEO_REQUIRED_MS : card.type === 'social' ? SOCIAL_REQUIRED_MS : CHANNEL_REQUIRED_MS;
    const autoKey = `depart_auto_${card.id}`;
    if (timerRefs.current[autoKey]) { clearTimeout(timerRefs.current[autoKey]); delete timerRefs.current[autoKey]; }
    localStorage.setItem(departKey(card.id), JSON.stringify({ ts: Date.now(), ms: waitMs, type: card.type, source: card.source }));
    setPhase(card.id, 'too_early');

    // Determine target phase after timer
    const afterTimerPhase = (type: string, source: string): TaskPhase =>
      source === 'api' && type === 'start_bot' ? 'needs_bot_confirm'
      : source === 'api' && type === 'social'   ? 'needs_proof'
      : 'ready';

    timerRefs.current[autoKey] = setTimeout(() => {
      delete timerRefs.current[autoKey];
      setPhase(card.id, afterTimerPhase(card.type, card.source));
    }, waitMs);
  };

  // ── Direct complete — no timer check (used after external verification) ─────
  const directComplete = async (card: CardTask) => {
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

  // ── Bot confirmation check (start_bot API tasks) ──────────────────────────
  const handleBotConfirm = async (card: CardTask) => {
    haptic.impact('light');
    setPhase(card.id, 'verifying');
    try {
      const res = await fetch(`/api/check-bot-verify?telegramId=${currentUser.telegramId}&taskId=${card.id}`);
      const { verified } = await res.json() as { verified: boolean };
      if (verified) {
        await directComplete(card);
      } else {
        setPhase(card.id, 'needs_bot_confirm');
        haptic.error();
      }
    } catch {
      setPhase(card.id, 'needs_bot_confirm');
    }
  };

  // ── Poll for approved social proofs every 6 s ─────────────────────────────
  useEffect(() => {
    const poll = setInterval(async () => {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('tc_proof_sent_'));
      if (keys.length === 0) return;
      const tid = useAppStore.getState().currentUser.telegramId;
      for (const key of keys) {
        const taskId = key.replace('tc_proof_sent_', '');
        try {
          const res = await fetch(`/api/check-social-proof?telegramId=${tid}&taskId=${taskId}`);
          const { status } = await res.json() as { status: string };
          if (status === 'approved') {
            localStorage.removeItem(key);
            const card = allCardsRef.current.find(c => c.id === taskId);
            if (card) await directComplete(card);
          } else if (status === 'rejected') {
            localStorage.removeItem(key);
            localStorage.setItem(`tc_proof_rejected_${taskId}`, '1');
            setPhase(taskId, 'not_subscribed');
          }
        } catch { /* ignore — no server in local dev */ }
      }
    }, 6000);
    return () => clearInterval(poll);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleVerify = async (card: CardTask) => {
    haptic.impact('light');
    setPhase(card.id, 'verifying');
    await new Promise<void>(r => setTimeout(r, 800));

    const entry   = parseDeparture(localStorage.getItem(departKey(card.id)));
    const elapsed  = entry ? Date.now() - entry.ts : 0;
    const verified = entry != null
      && elapsed >= entry.ms
      && elapsed <= entry.ms + MAX_VERIFY_GRACE_MS;

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

  const handleReportAbuse = async (taskId: string) => {
    try {
      await fetch('/api/report-proof-abuse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: currentUser.telegramId, taskId }),
      });
      localStorage.removeItem(`tc_proof_rejected_${taskId}`);
      setPhase(taskId, 'needs_proof');
    } catch { /* ignore */ }
  };

  // ── Filter state ─────────────────────────────────────────────────────────────

  const [activeFilter, setActiveFilter] = React.useState<'all' | 'daily' | 'special' | 'channel' | 'bot' | 'video' | 'social'>('all');

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
      ? 'Démarrer'
      : card.type === 'watch_video'
      ? 'Regarder'
      : card.type === 'social'
      ? 'Suivre'
      : card.type === 'daily'
      ? 'Réclamer'
      : card.type === 'invite_friends'
      ? 'Inviter'
      : 'Faire';

    const notSubbedMsg = card.type === 'start_bot'
      ? 'Confirmation non reçue. Ouvrez le bot via le lien de confirmation, attendez quelques secondes, puis réessayez.'
      : card.type === 'watch_video'
      ? 'Temps insuffisant — regardez la vidéo jusqu\'à la fin (20s min).'
      : card.type === 'social'
      ? 'Preuve refusée. Effectuez l\'action, puis renvoyez un screenshot plus clair.'
      : 'Temps insuffisant — rejoignez et restez quelques secondes.';

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
              overflow: 'hidden',
            }}>
              {isDone ? (
                <CheckCircle style={{ width: 22, height: 22, color: '#34d399' }} />
              ) : (() => {
                const logo = getPlatformLogo(card.targetUrl ?? '', card.type, 36);
                if (logo) return logo;
                if (card.icon) return <span style={{ fontSize: 22 }}>{card.icon}</span>;
                if (avatarBg) return <span style={{ fontSize: 18, fontWeight: 700, color: avatarBg }}>{card.title.charAt(0).toUpperCase()}</span>;
                return <span style={{ color: glow }}>{React.cloneElement(config.icon as React.ReactElement<{ style?: React.CSSProperties }>, { style: { width: 22, height: 22 } })}</span>;
              })()}
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
              <div style={{ fontSize: 9, color: '#475569', marginTop: 1 }}>GRAM</div>
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
              {actionLabel}
              {!card.isInstant && card.type !== 'invite_friends' && (
                <ExternalLink style={{ width: 13, height: 13 }} />
              )}
            </button>
          )}

          {/* TOO EARLY — prominent countdown */}
          {phase === 'too_early' && (
            <div>
              <div style={{
                borderRadius: 14, marginBottom: 8, overflow: 'hidden',
                background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.22)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
                  {/* Large circular countdown */}
                  <div style={{ position: 'relative', width: 58, height: 58, flexShrink: 0 }}>
                    <svg width="58" height="58" viewBox="0 0 58 58" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="29" cy="29" r="25" fill="none" stroke="rgba(245,158,11,0.12)" strokeWidth="3.5" />
                      <circle
                        cx="29" cy="29" r="25" fill="none"
                        stroke={remainingSec === 0 ? '#34d399' : '#f59e0b'} strokeWidth="3.5"
                        strokeDasharray={`${2 * Math.PI * 25}`}
                        strokeDashoffset={`${2 * Math.PI * 25 * (remainingSec / Math.max(totalSec, 1))}`}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
                      />
                    </svg>
                    <div style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: remainingSec >= 100 ? 13 : 17, fontWeight: 900, color: remainingSec === 0 ? '#34d399' : '#f59e0b', lineHeight: 1 }}>
                        {remainingSec === 0 ? '✓' : remainingSec}
                      </span>
                      {remainingSec > 0 && (
                        <span style={{ fontSize: 7, fontWeight: 700, color: 'rgba(245,158,11,0.55)', letterSpacing: '0.08em', marginTop: 1 }}>SEC</span>
                      )}
                    </div>
                  </div>

                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24', margin: 0, marginBottom: 4 }}>
                      {card.type === 'start_bot'
                        ? 'Restez dans le bot…'
                        : card.type === 'watch_video'
                        ? 'Regardez la vidéo…'
                        : card.type === 'social'
                        ? 'Effectuez l\'action…'
                        : `Rejoignez le ${card.type === 'join_channel' ? 'canal' : 'groupe'}…`}
                    </p>
                    {remainingSec > 0 ? (
                      <p style={{ fontSize: 10, color: '#92400e', margin: 0 }}>
                        Vérification dans <strong style={{ color: '#f59e0b' }}>{remainingSec}s</strong>
                      </p>
                    ) : (
                      <p style={{ fontSize: 10, fontWeight: 700, color: '#34d399', margin: 0 }}>
                        ✓ Prêt — cliquez sur Vérifier
                      </p>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: 2, background: 'rgba(245,158,11,0.1)' }}>
                  <div style={{
                    height: '100%',
                    background: remainingSec === 0 ? '#34d399' : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                    width: `${((totalSec - remainingSec) / Math.max(totalSec, 1)) * 100}%`,
                    transition: 'width 0.9s linear, background 0.3s',
                  }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {card.targetUrl && (
                  <button
                    onClick={() => handleJoin(card)}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 12,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                      color: '#64748b', fontSize: 11, fontWeight: 600,
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
                    flex: 2, padding: '10px 0', borderRadius: 12,
                    background: remainingSec > 0 ? 'rgba(245,158,11,0.07)' : 'rgba(59,130,246,0.18)',
                    border: remainingSec > 0 ? '1px solid rgba(245,158,11,0.18)' : '1px solid rgba(59,130,246,0.4)',
                    color: remainingSec > 0 ? 'rgba(245,158,11,0.5)' : '#60a5fa',
                    fontSize: 12, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    cursor: remainingSec > 0 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s',
                  }}
                >
                  <ShieldCheck style={{ width: 13, height: 13 }} />
                  {remainingSec > 0 ? `Vérifier dans ${remainingSec}s` : 'Vérifier maintenant'}
                </button>
              </div>
            </div>
          )}

          {/* READY */}
          {phase === 'ready' && !notSubbed && (
            <button
              onClick={() => void handleVerify(card)}
              style={{
                width: '100%', padding: '11px 0', borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(99,102,241,0.2))',
                border: '1px solid rgba(59,130,246,0.4)',
                color: '#60a5fa', fontSize: 12, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                cursor: 'pointer',
              }}
            >
              <ShieldCheck style={{ width: 14, height: 14 }} /> Vérifier maintenant
            </button>
          )}

          {/* NEEDS BOT CONFIRM — start_bot API tasks */}
          {phase === 'needs_bot_confirm' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{
                padding: '10px 12px', borderRadius: 12,
                background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.22)',
                fontSize: 11, color: '#67e8f9', lineHeight: 1.5,
              }}>
                ✅ Timer validé. Confirmez votre visite via notre bot pour recevoir la récompense.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => openUrl(`https://t.me/${botName}?start=vb_${card.id}_${currentUser.telegramId}`)}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 12,
                    background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.3)',
                    color: '#22d3ee', fontSize: 11, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    cursor: 'pointer',
                  }}
                >
                  Confirmer dans le bot
                </button>
                <button
                  onClick={() => void handleBotConfirm(card)}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 12,
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

          {/* NEEDS PROOF — social API tasks */}
          {phase === 'needs_proof' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{
                padding: '10px 12px', borderRadius: 12,
                background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.22)',
                fontSize: 11, color: '#fb923c', lineHeight: 1.5,
              }}>
                📸 Action effectuée ? Envoyez un screenshot au bot pour valider votre preuve.
              </div>
              <button
                onClick={() => {
                  openUrl(`https://t.me/${botName}?start=sp_${card.id}_${currentUser.telegramId}`);
                  localStorage.setItem(`tc_proof_sent_${card.id}`, '1');
                  setPhase(card.id, 'proof_pending');
                }}
                style={{
                  width: '100%', padding: '10px 0', borderRadius: 12,
                  background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)',
                  color: '#fb923c', fontSize: 12, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  cursor: 'pointer',
                }}
              >
                📸 Envoyer la preuve au bot
              </button>
            </div>
          )}

          {/* PROOF PENDING — waiting for admin */}
          {phase === 'proof_pending' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 14px', borderRadius: 12,
              background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)',
            }}>
              <Loader2 style={{ width: 14, height: 14, color: '#fb923c', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#fb923c', margin: 0 }}>En attente de validation</p>
                <p style={{ fontSize: 10, color: '#78350f', margin: 0 }}>Notre équipe vérifie votre preuve — notification par bot</p>
              </div>
            </div>
          )}

          {/* NOT SUBSCRIBED */}
          {notSubbed && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '10px 12px', borderRadius: 12,
                background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.22)',
              }}>
                <AlertCircle style={{ width: 14, height: 14, color: '#f87171', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 11, color: '#f87171', margin: 0, lineHeight: 1.4 }}>
                  {notSubbedMsg}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {card.targetUrl && (
                  <button
                    onClick={() => handleJoin(card)}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 12,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                      color: '#64748b', fontSize: 11, fontWeight: 600,
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
                    flex: 2, padding: '10px 0', borderRadius: 12,
                    background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.35)',
                    color: '#60a5fa', fontSize: 11, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    cursor: 'pointer',
                  }}
                >
                  <ShieldCheck style={{ width: 12, height: 12 }} /> Réessayer
                </button>
              </div>
              {card.type === 'social' && (() => {
                const wasRejected = !!localStorage.getItem(`tc_proof_rejected_${card.id}`);
                return wasRejected ? (
                  <button
                    onClick={() => void handleReportAbuse(card.id)}
                    style={{
                      marginTop: 6,
                      width: '100%', padding: '9px 0', borderRadius: 12,
                      background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
                      color: '#fbbf24', fontSize: 11, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      cursor: 'pointer',
                    }}
                  >
                    🚨 Contester ce refus
                  </button>
                ) : null;
              })()}
            </div>
          )}

          {/* VERIFYING */}
          {phase === 'verifying' && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '11px 0', borderRadius: 12,
              background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.18)',
            }}>
              <Loader2 style={{ width: 14, height: 14, color: '#60a5fa', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#60a5fa' }}>
                {card.type === 'watch_video' ? 'Vérification YouTube…'
                  : card.type === 'social' ? 'Vérification réseau social…'
                  : 'Vérification Telegram…'}
              </span>
            </div>
          )}

          {/* COMPLETING */}
          {phase === 'completing' && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '11px 0', borderRadius: 12,
              background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.18)',
            }}>
              <Loader2 style={{ width: 14, height: 14, color: '#34d399', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#34d399' }}>
                Crédit de <strong>+{displayReward.toFixed(4)} GRAM</strong> en cours…
              </span>
            </div>
          )}

          {/* DONE */}
          {phase === 'done' && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 12,
              background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.2)',
            }}>
              <TaskDoneCheck />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#34d399' }}>Récompense créditée !</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#4ade80' }}>+{displayReward.toFixed(4)} GRAM</div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const totalAvailable = allCards.length + promoTasks.length;

  const getFilteredCards = (): CardTask[] => {
    switch (activeFilter) {
      case 'daily':   return allCards.filter(c => c.type === 'daily');
      case 'special': return allCards.filter(c => c.type === 'special');
      case 'channel': return allCards.filter(c => c.type === 'join_channel' || c.type === 'join_group');
      case 'bot':     return allCards.filter(c => c.type === 'start_bot');
      case 'video':   return allCards.filter(c => c.type === 'watch_video');
      case 'social':  return allCards.filter(c => c.type === 'social');
      default:        return allCards;
    }
  };

  const filteredCards = getFilteredCards();
  const showPromo = activeFilter === 'all' || activeFilter === 'special';


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
                  +{currentUser.todayEarnings.toFixed(2)} GRAM
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
            { key: 'all',     label: 'Toutes',       count: allCards.length,                                                               always: true },
            { key: 'daily',   label: '📅 Quotidien', count: allCards.filter(c => c.type === 'daily').length,                               always: true },
            { key: 'special', label: '⭐ Spécial',   count: allCards.filter(c => c.type === 'special').length + promoTasks.length,         always: true },
            { key: 'channel', label: '📢 Canaux',    count: allCards.filter(c => c.type === 'join_channel' || c.type === 'join_group').length, always: true },
            { key: 'bot',     label: '🤖 Bots',      count: allCards.filter(c => c.type === 'start_bot').length,                          always: true },
            { key: 'video',   label: '▶️ Vidéos',    count: allCards.filter(c => c.type === 'watch_video').length,                        always: false },
            { key: 'social',  label: '🌐 Social',    count: allCards.filter(c => c.type === 'social').length,                             always: false },
          ] as { key: typeof activeFilter; label: string; count: number; always: boolean }[])
          .filter(f => f.always || f.count > 0)
          .map(f => (
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
                      <div style={{ fontSize: 9, color: '#475569', marginTop: 1 }}>GRAM</div>
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
                    <div style={{ fontSize: 9, color: '#475569', marginTop: 1 }}>GRAM</div>
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
