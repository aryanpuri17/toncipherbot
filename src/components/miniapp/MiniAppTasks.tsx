import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import {
  Hash, Users, Bot, Calendar, Star, CheckCircle,
  Loader2, ShieldCheck, Clock, Send,
  Play, Globe, ChevronRight,
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
const VIDEO_REQUIRED_MS   = 30_000; // videos: 30s
const SOCIAL_REQUIRED_MS  = 30_000; // social/YouTube: 30s minimum
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

const _getColors = (type: string) => COLORS[type] ?? { glow: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' };
void _getColors;

// ── Component ──────────────────────────────────────────────────────────────────

export const MiniAppTasks: React.FC = () => {
  const {
    tasks, completedTaskIds, completeTask, creditReferralBonus,
    setMiniAppPage, currentUser, platformConfig,
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
        const entryType = entry.type ?? '';
        if (entryType !== 'social' && entryType !== 'watch_video' && !timerRefs.current[autoKey]) {
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

  // Ticker to re-evaluate departure state periodically
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 2000);
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
    localStorage.setItem(departKey(card.id), JSON.stringify({ ts: Date.now(), ms: waitMs, type: card.type, source: card.source }));
    setPhase(card.id, 'too_early');
    // Social/video: no in-memory timer — only a real return to app (checkDepartures) can unlock verify
    if (card.type !== 'social' && card.type !== 'watch_video') {
      timerRefs.current[autoKey] = setTimeout(() => {
        delete timerRefs.current[autoKey];
        setPhase(card.id, 'ready');
      }, waitMs);
    }
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

  // ── Card renderer ────────────────────────────────────────────────────────────

  const handlePromoComplete = async (task: { id: string; reward: number }) => {
    completeTask(task.id);
    haptic.success();
  };

  const renderCard = (card: CardTask) => {
    const config      = typeConfig[card.type] ?? typeConfig.special;
    const phase       = getPhase(card.id);
    const isCompleted = (card.source === 'platform' && completedTaskIds.includes(card.id)) ||
                        (card.source === 'api'      && completedApiTaskIds.includes(card.id));

    if (isCompleted && phase !== 'completing' && phase !== 'done') return null;

    const isDone        = isCompleted || phase === 'done';
    const displayReward = card.reward * (card.promoMultiplier ?? 1);
    const avatarBg      = card.source === 'api' ? taskAvatarColor(card.title) : null;

    const _dEntry = phase === 'too_early' ? parseDeparture(localStorage.getItem(departKey(card.id))) : null;
    void tick;
    const remainingSec = _dEntry ? Math.max(0, Math.ceil((_dEntry.ms - (Date.now() - _dEntry.ts)) / 1000)) : 0;
    const isSocialOrVideo = card.type === 'social' || card.type === 'watch_video';

    const icon = (() => {
      if (isDone) return <CheckCircle style={{ width: 26, height: 26, color: '#34d399' }} />;
      const logo = getPlatformLogo(card.targetUrl ?? '', card.type, 34);
      if (logo) return logo;
      if (card.icon) return <span style={{ fontSize: 24 }}>{card.icon}</span>;
      if (avatarBg) return <span style={{ fontSize: 18, fontWeight: 800, color: avatarBg }}>{card.title.charAt(0).toUpperCase()}</span>;
      return <span style={{ color: '#64748b' }}>{React.cloneElement(config.icon as React.ReactElement<{ style?: React.CSSProperties }>, { style: { width: 22, height: 22 } })}</span>;
    })();

    const hasProgress = card.maxCompletions != null && card.maxCompletions > 0;
    const notSubbed   = phase === 'not_subscribed';

    const arrowBtn = (onClick: () => void, disabled = false) => (
      <button
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: disabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.09)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <ChevronRight style={{ width: 18, height: 18, color: disabled ? '#334155' : '#94a3b8' }} />
      </button>
    );

    return (
      <div key={card.id} style={{
        background: isDone ? 'rgba(52,211,153,0.04)' : 'rgba(255,255,255,0.04)',
        borderRadius: 14,
        border: isDone ? '1px solid rgba(52,211,153,0.15)' : '1px solid rgba(255,255,255,0.06)',
        overflow: 'hidden',
      }}>
        {/* Promo accent */}
        {card.promoMultiplier && (
          <div style={{ height: 2, background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }} />
        )}

        <div style={{ padding: '12px 14px' }}>
          {/* Top row: icon + title/desc */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, flexShrink: 0,
              background: avatarBg ? `${avatarBg}22` : 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            }}>
              {icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>{card.title}</span>
                {card.promoMultiplier && (
                  <span style={{ padding: '1px 5px', borderRadius: 5, background: 'rgba(245,158,11,0.15)', color: '#fbbf24', fontSize: 9, fontWeight: 700 }}>
                    ×{card.promoMultiplier}
                  </span>
                )}
              </div>
              {card.description && (
                <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0', lineHeight: 1.4 }}>{card.description}</p>
              )}
            </div>
          </div>

          {/* Bottom row: reward + action */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 15 }}>🪙</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: card.promoMultiplier ? '#fbbf24' : '#60a5fa' }}>
                {displayReward.toFixed(3)}
              </span>
              <span style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>GRAM</span>
              {hasProgress && (
                <span style={{ fontSize: 11, color: '#64748b', marginLeft: 4 }}>
                  {card.totalCompletions}/{card.maxCompletions}
                </span>
              )}
            </div>

            {/* Action button based on phase */}
            {isDone && (
              <div style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#34d399' }}>✓ Fait</span>
              </div>
            )}
            {!isDone && phase === 'idle' && arrowBtn(() => handleStart(card))}
            {!isDone && phase === 'ready' && !notSubbed && (
              <button onClick={() => void handleVerify(card)} style={{
                padding: '8px 14px', borderRadius: 10,
                background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)',
                color: '#34d399', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <ShieldCheck style={{ width: 13, height: 13 }} /> Vérifier
              </button>
            )}
            {!isDone && (phase === 'verifying' || phase === 'completing') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Loader2 style={{ width: 16, height: 16, color: phase === 'completing' ? '#34d399' : '#60a5fa', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 11, color: phase === 'completing' ? '#34d399' : '#60a5fa' }}>
                  {phase === 'completing' ? 'Crédit…' : 'Vérif…'}
                </span>
              </div>
            )}
            {!isDone && phase === 'too_early' && !isSocialOrVideo && arrowBtn(() => {}, true)}
            {!isDone && phase === 'too_early' && isSocialOrVideo && arrowBtn(() => handleJoin(card))}
            {!isDone && (phase === 'not_subscribed' || phase === 'needs_bot_confirm' || phase === 'needs_proof' || phase === 'proof_pending') && arrowBtn(() => void handleVerify(card))}
          </div>
        </div>

        {/* Phase strip at bottom of card */}
        {phase === 'too_early' && (
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            padding: '8px 14px',
            background: isSocialOrVideo ? 'rgba(245,158,11,0.05)' : 'rgba(59,130,246,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          }}>
            {isSocialOrVideo ? (
              <>
                <span style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600 }}>⚠️ Revenu trop tôt — retournez et revenez</span>
                <button onClick={() => handleJoin(card)} style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24', fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                  Retourner
                </button>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite` }} />
                  ))}
                  <span style={{ fontSize: 11, color: '#60a5fa', fontWeight: 600 }}>En cours de vérification…</span>
                </div>
                {remainingSec === 0 && (
                  <button onClick={() => void handleVerify(card)} style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                    Vérifier
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {notSubbed && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 14px', background: 'rgba(239,68,68,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#f87171', fontWeight: 600 }}>Adhésion non détectée</span>
            <button onClick={() => void handleVerify(card)} style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
              Réessayer
            </button>
          </div>
        )}

        {phase === 'needs_bot_confirm' && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 14px', background: 'rgba(6,182,212,0.05)', display: 'flex', gap: 8 }}>
            <button onClick={() => openUrl(`https://t.me/${botName}?start=vb_${card.id}_${currentUser.telegramId}`)} style={{ flex: 1, padding: '7px 0', borderRadius: 8, background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.3)', color: '#22d3ee', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              Confirmer dans le bot
            </button>
            <button onClick={() => void handleBotConfirm(card)} style={{ flex: 1, padding: '7px 0', borderRadius: 8, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <ShieldCheck style={{ width: 12, height: 12 }} /> Vérifier
            </button>
          </div>
        )}

        {phase === 'needs_proof' && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 14px', background: 'rgba(249,115,22,0.05)' }}>
            <button onClick={() => { openUrl(`https://t.me/${botName}?start=sp_${card.id}_${currentUser.telegramId}`); localStorage.setItem(`tc_proof_sent_${card.id}`, '1'); setPhase(card.id, 'proof_pending'); }} style={{ width: '100%', padding: '7px 0', borderRadius: 8, background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)', color: '#fb923c', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <Send style={{ width: 12, height: 12 }} /> Envoyer la preuve au bot
            </button>
          </div>
        )}

        {phase === 'proof_pending' && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 14px', background: 'rgba(100,116,139,0.05)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock style={{ width: 13, height: 13, color: '#64748b' }} />
            <span style={{ fontSize: 11, color: '#64748b' }}>En attente de validation…</span>
            <button onClick={() => void handleVerify(card)} style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: 7, background: 'rgba(100,116,139,0.15)', border: '1px solid rgba(100,116,139,0.25)', color: '#94a3b8', fontSize: 10, cursor: 'pointer' }}>
              Vérifier
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const telegramCards = allCards.filter(c => c.type === 'join_channel' || c.type === 'join_group' || c.type === 'start_bot');
  const socialCards   = allCards.filter(c => c.type === 'social');
  const videoCards    = allCards.filter(c => c.type === 'watch_video');
  const totalAvailable = allCards.length + promoTasks.length;

  const SectionHead = ({ title, hint, infoOnly }: { title: string; hint?: string; infoOnly?: boolean }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 4 }}>
      <span style={{ fontSize: 17, fontWeight: 800, color: '#f8fafc' }}>{title}</span>
      {!infoOnly && hint && (
        <button
          onClick={() => { localStorage.setItem('tc_create_type_hint', hint); setMiniAppPage('createTask'); }}
          style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#94a3b8', fontSize: 20, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >+</button>
      )}
      {infoOnly && (
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Star style={{ width: 15, height: 15, color: '#f59e0b' }} />
        </div>
      )}
    </div>
  );

  const EmptyCard = ({ text }: { text: string }) => (
    <div style={{ padding: '16px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
      <p style={{ fontSize: 12, color: '#334155', margin: 0 }}>{text}</p>
    </div>
  );

  return (
    <div className="animate-slide-up" style={{ paddingBottom: 8 }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.3px', margin: 0 }}>Tâches</h1>
            <p style={{ fontSize: 12, color: '#475569', marginTop: 2, marginBottom: 0 }}>
              {totalAvailable} disponible{totalAvailable > 1 ? 's' : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {currentUser.todayEarnings > 0 && (
              <div style={{ padding: '5px 10px', borderRadius: 10, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#34d399' }}>+{currentUser.todayEarnings.toFixed(2)} GRAM</span>
              </div>
            )}
            <button onClick={() => setMiniAppPage('myTasks')} style={{ padding: '6px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              Mes campagnes
            </button>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Telegram */}
        <div>
          <SectionHead title="Telegram" hint="join_channel" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {telegramCards.length === 0
              ? <EmptyCard text="No tasks" />
              : telegramCards.map(c => renderCard(c))}
          </div>
        </div>

        {/* Réseaux sociaux */}
        <div>
          <SectionHead title="Réseaux sociaux" hint="social" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {socialCards.length === 0
              ? <EmptyCard text="No tasks" />
              : socialCards.map(c => renderCard(c))}
          </div>
        </div>

        {/* YouTube */}
        <div>
          <SectionHead title="YouTube" hint="watch_video" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {videoCards.length === 0
              ? <EmptyCard text="No tasks" />
              : videoCards.map(c => renderCard(c))}
          </div>
        </div>

        {/* Promo / Spécial */}
        {promoTasks.length > 0 && (
          <div>
            <SectionHead title="⭐ Promo" infoOnly />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {promoTasks.map(task => {
                const isAutoReferral = task.verificationMethod === 'auto_referral';
                if (isAutoReferral) {
                  const required   = task.requiredCount ?? 3;
                  const count      = currentUser.referralDailyCount;
                  const isComplete = completedTaskIds.includes(task.id);
                  const isEligible = count >= required;
                  const pct        = Math.min((count / required) * 100, 100);
                  return (
                    <div key={task.id} style={{ background: isComplete ? 'rgba(52,211,153,0.04)' : 'rgba(139,92,246,0.05)', borderRadius: 14, border: isComplete ? '1px solid rgba(52,211,153,0.15)' : '1px solid rgba(139,92,246,0.2)', overflow: 'hidden' }}>
                      <div style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                            {task.icon ?? '🏆'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>{task.title}</span>
                            <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0', lineHeight: 1.4 }}>{task.description}</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 15 }}>🪙</span>
                            <span style={{ fontSize: 13, fontWeight: 800, color: '#60a5fa' }}>{task.reward.toFixed(3)}</span>
                            <span style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>GRAM</span>
                          </div>
                          <span style={{ fontSize: 12, color: isEligible ? '#4ade80' : '#64748b', fontWeight: 700 }}>{count}/{required}</span>
                        </div>
                        <div style={{ marginTop: 8, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)' }}>
                          <div style={{ height: '100%', borderRadius: 99, background: isEligible ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#8b5cf6,#ec4899)', width: `${pct}%`, transition: 'width 0.3s' }} />
                        </div>
                      </div>
                      {!isComplete && isEligible && (
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 14px' }}>
                          <button onClick={() => void handlePromoComplete(task)} style={{ width: '100%', padding: '8px 0', borderRadius: 10, background: 'linear-gradient(135deg,rgba(52,211,153,0.2),rgba(16,185,129,0.2))', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                            Réclamer la récompense
                          </button>
                        </div>
                      )}
                      {isComplete && (
                        <div style={{ borderTop: '1px solid rgba(52,211,153,0.1)', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <CheckCircle style={{ width: 14, height: 14, color: '#34d399' }} />
                          <span style={{ fontSize: 11, color: '#34d399', fontWeight: 700 }}>Complété !</span>
                        </div>
                      )}
                    </div>
                  );
                }
                // Regular promo task — use renderCard
                return renderCard({ ...task, source: 'platform' as const, type: task.type as CardTask['type'], isInstant: false });
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
