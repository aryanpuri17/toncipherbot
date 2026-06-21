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
  // URL-based detection takes priority — a YouTube URL always shows YouTube
  // even if the task type is join_channel
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
  // Telegram: by type or by t.me URL
  if (type === 'join_channel' || type === 'join_group' || type === 'start_bot' ||
      u.includes('t.me/') || u.includes('telegram.me') || u.includes('telegram.org'))
    return <TelegramLogo size={size} />;
  // Type-based fallback for tasks without a URL
  if (type === 'watch_video') return <YouTubeLogo size={size} />;
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
  verificationMethod?: string;
  cooldownHours?: number;
  requiredCount?: number;
}

// ── Static config ──────────────────────────────────────────────────────────────

const typeConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  join_channel:   { icon: <Hash className="w-4 h-4" />,     color: 'bg-blue-500/20 text-blue-400',     label: 'Channel' },
  join_group:     { icon: <Users className="w-4 h-4" />,    color: 'bg-purple-500/20 text-purple-400', label: 'Group' },
  start_bot:      { icon: <Bot className="w-4 h-4" />,      color: 'bg-cyan-500/20 text-cyan-400',     label: 'Bot' },
  daily:          { icon: <Calendar className="w-4 h-4" />, color: 'bg-amber-500/20 text-amber-400',   label: 'Daily' },
  special:        { icon: <Star className="w-4 h-4" />,     color: 'bg-pink-500/20 text-pink-400',     label: 'Special' },
  watch_video:    { icon: <Play className="w-4 h-4" />,     color: 'bg-red-500/20 text-red-400',       label: 'YouTube' },
  social:         { icon: <Globe className="w-4 h-4" />,    color: 'bg-orange-500/20 text-orange-400', label: 'Social' },
  invite_friends: { icon: <Users className="w-4 h-4" />,    color: 'bg-violet-500/20 text-violet-400', label: 'Referral' },
};


type TaskPhase = 'idle' | 'pending' | 'verifying' | 'not_subscribed' | 'completing' | 'done'
  | 'needs_proof'        // manual-verification tasks (Partage Communauté): awaiting screenshot upload
  | 'proof_pending';     // social: screenshot sent, awaiting admin approval

const REQUIRED_MS         = 30_000; // bots: 30s
const CHANNEL_REQUIRED_MS = 5_000;  // channels/groups: 5s
const VIDEO_REQUIRED_MS   = 30_000; // videos: 30s
const SOCIAL_REQUIRED_MS  = 30_000; // social/YouTube: 30s minimum
const departKey = (id: string) => `tc_task_depart_${id}`;

type DepartEntry = { ts: number; ms: number; type?: string; source?: 'platform' | 'api'; leftAt?: number; awayMs?: number };

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

// ── Component ──────────────────────────────────────────────────────────────────

export const MiniAppTasks: React.FC = () => {
  const {
    tasks, completedTaskIds, taskCompletionTimes, completeTaskSecure, creditReferralBonus,
    setMiniAppPage, currentUser, platformConfig,
  } = useAppStore();

  const eventPromo = platformConfig.promoEvent;
  const isEventActive = eventPromo?.active && new Date(eventPromo.endsAt) > new Date();
  const eventMult = isEventActive ? eventPromo!.multiplier : 1;

  const [taskStates, setTaskStates] = useState<Record<string, { phase: TaskPhase }>>({});
  const timerRefs                   = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const allCardsRef                 = useRef<CardTask[]>([]);
  const promoCardsRef               = useRef<CardTask[]>([]);

  const [apiTasks,            setApiTasks]            = useState<ApiTask[]>([]);
  const [completedApiTaskIds, setCompletedApiTaskIds] = useState<string[]>([]);
  const [uploadingProofId, setUploadingProofId] = useState<string | null>(null);
  const [tooEarlyInfo, setTooEarlyInfo] = useState<Record<string, true>>({});
  const [taskErrors, setTaskErrors] = useState<Record<string, string>>({});
  const [countdown, setCountdown] = useState<Record<string, number>>({});


  // ── Helpers ──────────────────────────────────────────────────────────────────

  const setPhase = (id: string, phase: TaskPhase) =>
    setTaskStates(prev => ({ ...prev, [id]: { phase } }));
  const getPhase = (id: string): TaskPhase =>
    taskStates[id]?.phase ?? 'idle';

  type CooldownTask = { id: string; cooldownHours?: number };

  // Returns true when a cooldown task is in completedTaskIds but its cooldown has expired
  const isCooldownExpired = (card: CooldownTask): boolean => {
    if (!completedTaskIds.includes(card.id)) return false;
    const cooldownMs = (card.cooldownHours ?? 0) * 3600_000;
    if (!cooldownMs) return false;
    const lastTime = taskCompletionTimes[card.id];
    return !lastTime || Date.now() - lastTime >= cooldownMs;
  };

  // Returns ms remaining until cooldown expires, or 0 if already expired / no cooldown
  const cooldownRemainingMs = (card: CooldownTask): number => {
    const cooldownMs = (card.cooldownHours ?? 0) * 3600_000;
    if (!cooldownMs) return 0;
    const lastTime = taskCompletionTimes[card.id];
    if (!lastTime) return 0;
    return Math.max(0, lastTime + cooldownMs - Date.now());
  };

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

  // ── Effects ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const snap = timerRefs.current;
    return () => { Object.values(snap).forEach(clearTimeout); };
  }, []);

  // Restore pending phase on mount — critical for Android where the app can be
  // destroyed while the user is in an external app and rebuilt on return.
  useEffect(() => {
    const completedIds = useAppStore.getState().completedTaskIds;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith('tc_task_depart_')) continue;
      const id = key.slice('tc_task_depart_'.length);
      if (completedIds.includes(id)) { localStorage.removeItem(key); continue; }
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as DepartEntry;
        if (!parsed.ts || Date.now() - parsed.ts > 3_600_000) { localStorage.removeItem(key); continue; }
        // App was destroyed while user was away — accumulate that time now
        if (parsed.leftAt) {
          const awayMs = (parsed.awayMs ?? 0) + (Date.now() - parsed.leftAt);
          localStorage.setItem(key, JSON.stringify({ ...parsed, awayMs, leftAt: undefined }));
        }
      } catch { localStorage.removeItem(key); continue; }
      setPhase(id, 'pending');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Track real time spent outside the mini-app using visibility + blur/focus events.
  // On hide: stamp leftAt. On show: accumulate awayMs, warn immediately if too short.
  useEffect(() => {
    const onHide = () => {
      const now = Date.now();
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith('tc_task_depart_')) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try {
          const entry = JSON.parse(raw) as DepartEntry;
          if (entry.leftAt) continue;
          localStorage.setItem(key, JSON.stringify({ ...entry, leftAt: now }));
        } catch { /* ignore */ }
      }
    };

    const onShow = () => {
      const now = Date.now();
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith('tc_task_depart_')) continue;
        const id = key.slice('tc_task_depart_'.length);
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try {
          const entry = JSON.parse(raw) as DepartEntry;
          if (!entry.leftAt) continue;
          const awayMs = (entry.awayMs ?? 0) + (now - entry.leftAt);
          localStorage.setItem(key, JSON.stringify({ ...entry, awayMs, leftAt: undefined }));
          if (awayMs < entry.ms) {
            setTooEarlyInfo(prev => ({ ...prev, [id]: true }));
            haptic.error();
          } else {
            setTooEarlyInfo(prev => { const n = { ...prev }; delete n[id]; return n; });
          }
        } catch { /* ignore */ }
      }
    };

    const onVisChange = () => { if (document.hidden) onHide(); else onShow(); };
    document.addEventListener('visibilitychange', onVisChange);
    window.addEventListener('blur', onHide);
    window.addEventListener('focus', onShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisChange);
      window.removeEventListener('blur', onHide);
      window.removeEventListener('focus', onShow);
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
      cooldownHours:    t.cooldownHours,
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

  const allCards = [...platformCards, ...apiCards].filter(c => c.type !== 'daily');
  allCardsRef.current = allCards;
  promoCardsRef.current = promoTasks.map(t => ({
    id: t.id, source: 'platform' as const, type: t.type, title: t.title,
    description: t.description, targetUrl: t.targetUrl, reward: t.reward,
    totalCompletions: t.totalCompletions, maxCompletions: t.maxCompletions,
    icon: t.icon, isInstant: false, verificationMethod: t.verificationMethod,
    cooldownHours: t.cooldownHours, requiredCount: t.requiredCount,
  }));

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
      type: 'reward', title: 'Task completed!',
      message: `+${reward.toFixed(4)} GRAM credited.`, isRead: false,
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
    const initData = (window as unknown as { Telegram?: { WebApp?: { initData?: string } } })
      ?.Telegram?.WebApp?.initData ?? '';
    try {
      const res  = await fetch(`/api/user-tasks/${taskId}/complete`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ telegramId, initData }),
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

  /** Record server-side that the user left (best-effort — server may be sleeping). */
  const recordDepart = (taskId: string) => {
    const tid = useAppStore.getState().currentUser.telegramId;
    if (!tid) return;
    const initData = (window as unknown as { Telegram?: { WebApp?: { initData?: string } } })
      ?.Telegram?.WebApp?.initData ?? '';
    void fetch('/api/task/depart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegramId: tid, taskId, initData }),
    }).catch(() => { /* silent — client-side timer still works */ });
  };

  const handleStart = async (card: CardTask) => {
    const phase = getPhase(card.id);
    if (phase === 'completing' || phase === 'done') return;
    if (card.source === 'platform' && completedTaskIds.includes(card.id) && !isCooldownExpired(card)) return;
    if (card.source === 'api'      && completedApiTaskIds.includes(card.id)) return;

    haptic.impact('light');

    if (card.type === 'invite_friends') {
      setMiniAppPage('referral');
      return;
    }

    if (card.isInstant) {
      setPhase(card.id, 'completing');
      const res = await completeTaskSecure(card.id);
      if (!res.success) {
        setTaskErrors(prev => ({ ...prev, [card.id]: res.error ?? 'Server error' }));
        setPhase(card.id, 'not_subscribed');
        haptic.error();
        return;
      }
      timerRefs.current[card.id] = setTimeout(() => {
        setPhase(card.id, 'done');
        haptic.success();
        timerRefs.current[`rm_${card.id}`] = setTimeout(() => {
          setTaskStates(prev => { const n = { ...prev }; delete n[card.id]; return n; });
        }, 2000);
      }, 1200);
      return;
    }

    // Manual verification tasks (e.g. "Partage Communauté"): skip timer, go to proof submission directly
    if (card.verificationMethod === 'manual') {
      setPhase(card.id, 'needs_proof');
      return;
    }

    if (card.targetUrl) openUrl(card.targetUrl);
    const waitMs = card.type === 'start_bot' ? REQUIRED_MS : card.type === 'watch_video' ? VIDEO_REQUIRED_MS : card.type === 'social' ? SOCIAL_REQUIRED_MS : CHANNEL_REQUIRED_MS;
    localStorage.setItem(departKey(card.id), JSON.stringify({ ts: Date.now(), ms: waitMs, type: card.type, source: card.source }));
    recordDepart(card.id);
    setPhase(card.id, 'pending');

    // Pre-warm membership cache: fire a background check 4s after user leaves
    // so the result is cached when they come back and click Verify
    if (card.type === 'join_channel' || card.type === 'join_group') {
      const chatRefMatch = card.targetUrl?.match(/t\.me\/([^/?+]+)/);
      const chatRef = chatRefMatch?.[1];
      if (chatRef && !chatRef.startsWith('+')) {
        timerRefs.current[`pre_${card.id}`] = setTimeout(async () => {
          const initData = (window as unknown as { Telegram?: { WebApp?: { initData?: string } } })?.Telegram?.WebApp?.initData ?? '';
          try {
            await fetch(
              `/api/check-membership?telegram_id=${currentUser.telegramId}&chat_id=${encodeURIComponent(`@${chatRef}`)}`,
              { headers: initData ? { 'X-Init-Data': initData } : {} },
            );
          } catch { /* silent */ }
        }, 4000);
      }
    }

    // Start countdown for timer-based tasks
    if (waitMs > CHANNEL_REQUIRED_MS) {
      const seconds = Math.ceil(waitMs / 1000);
      setCountdown(prev => ({ ...prev, [card.id]: seconds }));
      let remaining = seconds;
      const tick = () => {
        remaining -= 1;
        if (remaining <= 0) {
          setCountdown(prev => { const n = { ...prev }; delete n[card.id]; return n; });
        } else {
          setCountdown(prev => ({ ...prev, [card.id]: remaining }));
          timerRefs.current[`cd_${card.id}`] = setTimeout(tick, 1000);
        }
      };
      timerRefs.current[`cd_${card.id}`] = setTimeout(tick, 1000);
    }
  };

  // ── Direct complete — no timer check (used after external verification) ─────
  const directComplete = async (card: CardTask) => {
    localStorage.removeItem(departKey(card.id));
    setPhase(card.id, 'completing');
    if (card.source === 'api') {
      const ok = await creditApiTask(card.id, card.reward);
      if (!ok) return;
    } else {
      const res = await completeTaskSecure(card.id);
      if (!res.success) {
        setTaskErrors(prev => ({ ...prev, [card.id]: res.error ?? 'Server error' }));
        setPhase(card.id, 'not_subscribed');
        haptic.error();
        return;
      }
    }
    timerRefs.current[card.id] = setTimeout(() => {
      setPhase(card.id, 'done');
      haptic.success();
      timerRefs.current[`rm_${card.id}`] = setTimeout(() => {
        setTaskStates(prev => { const n = { ...prev }; delete n[card.id]; return n; });
      }, 2000);
    }, 1500);
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
          const initData = (window as unknown as { Telegram?: { WebApp?: { initData?: string } } })?.Telegram?.WebApp?.initData ?? '';
          const res = await fetch(`/api/check-social-proof?telegramId=${tid}&taskId=${taskId}`, {
            headers: initData ? { 'X-Init-Data': initData } : {},
          });
          const { status } = await res.json() as { status: string };
          if (status === 'approved') {
            localStorage.removeItem(key);
            const card = allCardsRef.current.find(c => c.id === taskId) ?? promoCardsRef.current.find(c => c.id === taskId);
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

    const isTimerTask   = card.type === 'social' || card.type === 'watch_video' || card.type === 'start_bot';
    const isChannelTask = card.type === 'join_channel' || card.type === 'join_group';

    // ── Timer tasks: check real time spent outside the mini-app ──────────────
    if (isTimerTask) {
      const entry    = parseDeparture(localStorage.getItem(departKey(card.id)));
      const required = entry?.ms ?? REQUIRED_MS;
      const awayMs   = entry?.awayMs ?? 0;
      if (!entry || awayMs < required) {
        setTooEarlyInfo(prev => ({ ...prev, [card.id]: true }));
        haptic.error();
        return; // instant feedback — no spinner shown
      }
      setTooEarlyInfo(prev => { const n = { ...prev }; delete n[card.id]; return n; });
    }

    // ── Channel/group tasks: real membership check (10s timeout, 1 retry) ───────
    if (isChannelTask) {
      setPhase(card.id, 'verifying');
      if (card.targetUrl) {
        const chatRefMatch = card.targetUrl.match(/t\.me\/([^/?+]+)/);
        const chatRef = chatRefMatch?.[1];
        if (chatRef && !chatRef.startsWith('+')) {
          const memberInitData = (window as unknown as { Telegram?: { WebApp?: { initData?: string } } })?.Telegram?.WebApp?.initData ?? '';
          const checkMembership = async (): Promise<boolean | null> => {
            try {
              const ctrl = new AbortController();
              const tId  = setTimeout(() => ctrl.abort(), 10000);
              const res  = await fetch(
                `/api/check-membership?telegram_id=${currentUser.telegramId}&chat_id=${encodeURIComponent(`@${chatRef}`)}`,
                { signal: ctrl.signal, headers: memberInitData ? { 'X-Init-Data': memberInitData } : {} },
              );
              clearTimeout(tId);
              const { member } = await res.json() as { member: boolean };
              return member;
            } catch { return null; /* timeout / network error */ }
          };
          let isMember = await checkMembership();
          if (isMember === false) {
            // One automatic retry after 800ms (cache makes it near-instant)
            await new Promise(r => setTimeout(r, 800));
            isMember = await checkMembership();
          }
          if (isMember === false) { setPhase(card.id, 'not_subscribed'); haptic.error(); return; }
          // null = timeout/error → allow through (server will re-verify)
        }
      }
    }

    // ── All checks passed — credit ─────────────────────────────────────────────
    localStorage.removeItem(departKey(card.id));
    const autoKey = `depart_auto_${card.id}`;
    if (timerRefs.current[autoKey]) { clearTimeout(timerRefs.current[autoKey]); delete timerRefs.current[autoKey]; }
    setPhase(card.id, 'completing');

    if (card.source === 'api') {
      const ok = await creditApiTask(card.id, card.reward);
      if (!ok) return;
    } else {
      const res = await completeTaskSecure(card.id);
      if (!res.success) {
        setTaskErrors(prev => ({ ...prev, [card.id]: res.error ?? 'Server error' }));
        setPhase(card.id, 'not_subscribed');
        haptic.error();
        return;
      }
    }
    timerRefs.current[card.id] = setTimeout(() => {
      setPhase(card.id, 'done');
      haptic.success();
      timerRefs.current[`rm_${card.id}`] = setTimeout(() => {
        setTaskStates(prev => { const n = { ...prev }; delete n[card.id]; return n; });
      }, 2000);
    }, 1000);
  };

  // ── Card renderer ────────────────────────────────────────────────────────────

  const handlePromoComplete = async (task: { id: string; reward: number }) => {
    const res = await completeTaskSecure(task.id);
    if (res.success) haptic.success();
  };

  // ── Signature colour tokens ────────────────────────────────────────────────
  const SIG        = '#8B5CF6';
  const SIG_LIGHT  = '#C4B5FD';
  const SIG_GLOW   = 'rgba(139,92,246,0.20)';
  const SIG_BG     = 'rgba(139,92,246,0.06)';
  const SIG_BORDER = 'rgba(139,92,246,0.16)';
  const SIG_ICON   = 'rgba(139,92,246,0.14)';

  const renderCard = (card: CardTask) => {
    const config      = typeConfig[card.type] ?? typeConfig.special;
    const phase       = getPhase(card.id);
    const isCompleted = (card.source === 'platform' && completedTaskIds.includes(card.id) && !isCooldownExpired(card)) ||
                        (card.source === 'api'      && completedApiTaskIds.includes(card.id));

    // Cooldown state: task is completed but has a cooldown that hasn't expired yet
    const inCooldown = card.source === 'platform' && card.cooldownHours
      && completedTaskIds.includes(card.id) && !isCooldownExpired(card)
      && phase !== 'completing' && phase !== 'done';

    if (isCompleted && !inCooldown && phase !== 'completing' && phase !== 'done') return null;

    const isDone        = (isCompleted && !inCooldown) || phase === 'done';
    const displayReward = card.reward * (card.promoMultiplier ?? 1);
    const avatarBg      = card.source === 'api' ? taskAvatarColor(card.title) : null;

    const cardBg     = inCooldown ? 'rgba(245,158,11,0.05)' : isDone ? 'rgba(52,211,153,0.07)' : SIG_BG;
    const cardBorder = inCooldown ? '1px solid rgba(245,158,11,0.2)' : isDone ? '1px solid rgba(52,211,153,0.22)' : `1px solid ${SIG_BORDER}`;
    const iconBg     = inCooldown ? 'rgba(245,158,11,0.12)' : isDone ? 'rgba(52,211,153,0.18)' : (avatarBg ? `${avatarBg}22` : SIG_ICON);
    const iconBorder = inCooldown ? '1px solid rgba(245,158,11,0.25)' : isDone ? '1px solid rgba(52,211,153,0.3)' : `1px solid ${SIG_BORDER}`;
    const iconGlow   = inCooldown ? '0 4px 14px rgba(245,158,11,0.15)' : isDone ? '0 4px 14px rgba(52,211,153,0.25)' : `0 4px 14px ${SIG_GLOW}`;
    const badgeLabel = inCooldown ? '⏳ COOLDOWN' : isDone ? '✓ DONE' : (config.label ?? 'TASK');
    const badgeBg    = inCooldown ? 'rgba(245,158,11,0.15)' : isDone ? 'rgba(52,211,153,0.18)' : SIG_ICON;
    const badgeColor = inCooldown ? '#f59e0b' : isDone ? '#34d399' : SIG_LIGHT;
    const accentLine = inCooldown ? '#f59e0b' : isDone ? '#34d399' : SIG;

    const icon = (() => {
      if (isDone) return <CheckCircle style={{ width: 26, height: 26, color: '#34d399' }} />;
      const logo = getPlatformLogo(card.targetUrl ?? '', card.type, 34);
      if (logo) return logo;
      if (card.icon) return <span style={{ fontSize: 24 }}>{card.icon}</span>;
      if (avatarBg) return <span style={{ fontSize: 18, fontWeight: 800, color: avatarBg }}>{card.title.charAt(0).toUpperCase()}</span>;
      return <span style={{ color: SIG_LIGHT }}>{React.cloneElement(config.icon as React.ReactElement<{ style?: React.CSSProperties }>, { style: { width: 22, height: 22 } })}</span>;
    })();

    const hasProgress = card.maxCompletions != null && card.maxCompletions > 0;

    const arrowBtn = (onClick: () => void, disabled = false) => (
      <button
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: disabled ? 'rgba(255,255,255,0.03)' : SIG_ICON,
          border: disabled ? '1px solid rgba(255,255,255,0.06)' : `1px solid ${SIG_BORDER}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <ChevronRight style={{ width: 18, height: 18, color: disabled ? '#334155' : SIG_LIGHT }} />
      </button>
    );

    return (
      <div key={card.id} style={{ background: cardBg, borderRadius: 16, border: cardBorder, overflow: 'hidden', position: 'relative' }}>
        {/* Type badge */}
        <span style={{
          position: 'absolute', top: 10, right: 10, zIndex: 2,
          fontSize: 8, fontWeight: 800, padding: '2px 7px', borderRadius: 20,
          background: badgeBg, color: badgeColor,
          border: `1px solid ${badgeColor}44`, letterSpacing: '0.07em',
        }}>{badgeLabel}</span>

        {/* Promo accent */}
        {card.promoMultiplier && (
          <div style={{ height: 2, background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }} />
        )}

        <div style={{ padding: '12px 14px' }}>
          {/* Top row: icon + title/desc */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: iconBg, border: iconBorder, boxShadow: iconGlow,
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            }}>
              {icon}
            </div>
            <div style={{ flex: 1, minWidth: 0, paddingRight: 44 }}>
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

          {/* Accent line */}
          <div style={{ margin: '10px 0 0', height: '1.5px', borderRadius: 99, width: '40%', background: `linear-gradient(90deg,${accentLine},transparent)` }} />

          {/* Bottom row: reward + action */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="16" height="16" viewBox="0 0 56 56" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="28" cy="28" r="28" fill="#0098EA"/>
                <path d="M37.5603 15.6277H18.4386C14.9228 15.6277 12.7547 19.4202 14.5145 22.4798L26.9572 44.1141C27.5004 45.0567 28.8567 45.0567 29.3999 44.1141L41.8427 22.4798C43.6025 19.4202 41.4344 15.6277 37.5603 15.6277Z" fill="white"/>
                <path opacity="0.5" d="M28.0001 15.6277H18.4386C14.9228 15.6277 12.7547 19.4202 14.5145 22.4798L20.2931 32.4371L28.0001 15.6277Z" fill="white"/>
              </svg>
              <span style={{ fontSize: 13, fontWeight: 800, color: card.promoMultiplier ? '#fbbf24' : SIG_LIGHT }}>
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
            {inCooldown && (() => {
              const remaining = cooldownRemainingMs(card);
              const h = Math.floor(remaining / 3600_000);
              const m = Math.floor((remaining % 3600_000) / 60_000);
              const label = h > 0 ? `${h}h ${m}m` : `${m}m`;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <Clock style={{ width: 12, height: 12, color: '#f59e0b' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b' }}>{label}</span>
                </div>
              );
            })()}
            {isDone && (
              <div style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#34d399' }}>✓ Done</span>
              </div>
            )}
            {!isDone && !inCooldown && phase === 'idle' && arrowBtn(() => handleStart(card))}
            {!isDone && (phase === 'verifying' || phase === 'completing') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Loader2 style={{ width: 16, height: 16, color: phase === 'completing' ? '#34d399' : '#60a5fa', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 11, color: phase === 'completing' ? '#34d399' : '#60a5fa' }}>
                  {phase === 'completing' ? 'Crediting reward…' : 'Checking membership…'}
                </span>
              </div>
            )}
            {!isDone && phase === 'pending' && arrowBtn(() => {
              if (card.targetUrl) openUrl(card.targetUrl);
              setTooEarlyInfo(prev => { const n = { ...prev }; delete n[card.id]; return n; });
            }, false)}
            {!isDone && phase === 'not_subscribed' && arrowBtn(() => {
              if (card.targetUrl) { openUrl(card.targetUrl); setPhase(card.id, 'pending'); }
            }, false)}
          </div>
        </div>

        {/* Phase strip at bottom of card */}
        {phase === 'pending' && (
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            padding: '10px 14px',
            background: tooEarlyInfo[card.id] ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          }}>
            {tooEarlyInfo[card.id] ? (
              <>
                <span style={{ fontSize: 11, color: '#f87171', fontWeight: 600 }}>
                  Too early — go back for a bit longer
                </span>
                <button
                  onClick={() => {
                    if (card.targetUrl) openUrl(card.targetUrl);
                    setTooEarlyInfo(prev => { const n = { ...prev }; delete n[card.id]; return n; });
                  }}
                  style={{
                    padding: '6px 12px', borderRadius: 8, flexShrink: 0,
                    background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                    color: '#f87171', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <ChevronRight style={{ width: 12, height: 12 }} /> Go back
                </button>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  <Loader2 style={{ width: 14, height: 14, color: '#fbbf24', animation: 'spin 2s linear infinite', flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    {(card.type === 'join_channel' || card.type === 'join_group') ? (
                      <span style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600 }}>
                        Join the channel, then click Verify
                      </span>
                    ) : countdown[card.id] !== undefined ? (
                      <span style={{ fontSize: 11, color: '#fbbf24', fontWeight: 700 }}>
                        ⏳ Stay on the page — {countdown[card.id]}s remaining
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: '#34d399', fontWeight: 700 }}>
                        ✅ Ready! Click Verify now
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => void handleVerify(card)}
                  disabled={countdown[card.id] !== undefined && (card.type === 'social' || card.type === 'watch_video' || card.type === 'start_bot')}
                  style={{
                    padding: '6px 12px', borderRadius: 8, flexShrink: 0,
                    background: countdown[card.id] !== undefined ? 'rgba(100,116,139,0.15)' : 'rgba(52,211,153,0.15)',
                    border: `1px solid ${countdown[card.id] !== undefined ? 'rgba(100,116,139,0.3)' : 'rgba(52,211,153,0.3)'}`,
                    color: countdown[card.id] !== undefined ? '#64748b' : '#34d399',
                    fontSize: 11, fontWeight: 700, cursor: countdown[card.id] !== undefined ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                  <ShieldCheck style={{ width: 12, height: 12 }} /> Verify
                </button>
              </>
            )}
          </div>
        )}

        {phase === 'not_subscribed' && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 14px', background: 'rgba(239,68,68,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#f87171', fontWeight: 600, flex: 1 }}>
              {taskErrors[card.id] ?? (
                (card.type === 'join_channel' || card.type === 'join_group')
                  ? "Not a member — join the channel first"
                  : (card.type === 'social' || card.type === 'watch_video')
                    ? 'Too early — stay 30s in the external app'
                    : 'Not verified — try again'
              )}
            </span>
            <button onClick={() => { setTaskErrors(prev => { const n = { ...prev }; delete n[card.id]; return n; }); void handleVerify(card); }} style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
              Retry
            </button>
          </div>
        )}

        {phase === 'needs_proof' && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 14px', background: 'rgba(249,115,22,0.05)' }}>
            <input
              id={`proof-file-${card.id}`}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploadingProofId(card.id);
                const fd = new FormData();
                fd.append('file', file);
                fd.append('telegramId', String(currentUser.telegramId));
                fd.append('taskId', card.id);
                fd.append('initData', (window as unknown as { Telegram?: { WebApp?: { initData?: string } } })?.Telegram?.WebApp?.initData ?? '');
                try {
                  const res = await fetch('/api/submit-proof', { method: 'POST', body: fd });
                  if (res.ok) {
                    localStorage.setItem(`tc_proof_sent_${card.id}`, '1');
                    setPhase(card.id, 'proof_pending');
                  } else {
                    alert('Upload error. Please try again.');
                  }
                } catch {
                  alert('Network error. Please try again.');
                } finally {
                  setUploadingProofId(null);
                  e.target.value = '';
                }
              }}
            />
            <label
              htmlFor={`proof-file-${card.id}`}
              style={{
                width: '100%', padding: '7px 0', borderRadius: 8,
                background: uploadingProofId === card.id ? 'rgba(100,116,139,0.12)' : 'rgba(249,115,22,0.12)',
                border: `1px solid ${uploadingProofId === card.id ? 'rgba(100,116,139,0.3)' : 'rgba(249,115,22,0.3)'}`,
                color: uploadingProofId === card.id ? '#64748b' : '#fb923c',
                fontSize: 11, fontWeight: 700, cursor: uploadingProofId === card.id ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                pointerEvents: uploadingProofId === card.id ? 'none' : 'auto',
              }}
            >
              {uploadingProofId === card.id
                ? <><Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} /> Uploading…</>
                : <><Send style={{ width: 12, height: 12 }} /> 📸 Send a screenshot</>
              }
            </label>
          </div>
        )}

        {phase === 'proof_pending' && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 14px', background: 'rgba(100,116,139,0.05)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock style={{ width: 13, height: 13, color: '#64748b' }} />
            <span style={{ fontSize: 11, color: '#64748b' }}>Awaiting approval…</span>
            <button onClick={() => void handleVerify(card)} style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: 7, background: 'rgba(100,116,139,0.15)', border: '1px solid rgba(100,116,139,0.25)', color: '#94a3b8', fontSize: 10, cursor: 'pointer' }}>
              Verify
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const telegramCards = allCards.filter(c => c.type === 'join_channel' || c.type === 'join_group' || c.type === 'start_bot');
  const socialCards   = allCards.filter(c => c.type === 'social' || c.type === 'watch_video');
  const totalAvailable = allCards.filter(c => (!completedTaskIds.includes(c.id) || isCooldownExpired(c)) && !completedApiTaskIds.includes(c.id)).length
    + promoTasks.filter(c => !completedTaskIds.includes(c.id) || isCooldownExpired(c)).length;

  const SectionHead = ({ title, hint, infoOnly }: { title: string; hint?: string; infoOnly?: boolean }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 3, height: 18, borderRadius: 99, background: `linear-gradient(180deg,${SIG},${SIG}55)`, flexShrink: 0 }} />
        <span style={{ fontSize: 15, fontWeight: 800, color: '#f8fafc' }}>{title}</span>
      </div>
      {!infoOnly && hint && (
        <button
          onClick={() => { localStorage.setItem('tc_create_type_hint', hint); setMiniAppPage('createTask'); }}
          style={{
            width: 30, height: 30, borderRadius: 9,
            background: SIG_ICON, border: `1px solid ${SIG_BORDER}`,
            color: SIG_LIGHT, fontSize: 18, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >+</button>
      )}
      {infoOnly && (
        <div style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Star style={{ width: 14, height: 14, color: '#f59e0b' }} />
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
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.3px', margin: 0 }}>Tasks</h1>
            <p style={{ fontSize: 12, color: '#475569', marginTop: 2, marginBottom: 0 }}>
              {totalAvailable} available
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ padding: '6px 12px', borderRadius: 10, background: 'linear-gradient(135deg,rgba(52,211,153,0.15),rgba(59,130,246,0.1))', border: '1px solid rgba(52,211,153,0.3)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#34d399' }}>{currentUser.balanceMain.toFixed(2)}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#6ee7b7', letterSpacing: '0.05em' }}>GRAM</span>
            </div>
            <button onClick={() => setMiniAppPage('myTasks')} style={{ padding: '6px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              My Campaigns
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

        {/* Réseaux sociaux & YouTube (combined, bottom before promo) */}
        <div>
          <SectionHead title="Social Media" hint="social" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {socialCards.length === 0
              ? <EmptyCard text="No tasks" />
              : socialCards.map(c => renderCard(c))}
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
                  const isComplete = completedTaskIds.includes(task.id) && !isCooldownExpired(task);
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
                            <svg width="16" height="16" viewBox="0 0 56 56" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="28" cy="28" r="28" fill="#0098EA"/>
                <path d="M37.5603 15.6277H18.4386C14.9228 15.6277 12.7547 19.4202 14.5145 22.4798L26.9572 44.1141C27.5004 45.0567 28.8567 45.0567 29.3999 44.1141L41.8427 22.4798C43.6025 19.4202 41.4344 15.6277 37.5603 15.6277Z" fill="white"/>
                <path opacity="0.5" d="M28.0001 15.6277H18.4386C14.9228 15.6277 12.7547 19.4202 14.5145 22.4798L20.2931 32.4371L28.0001 15.6277Z" fill="white"/>
              </svg>
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
                            Claim Reward
                          </button>
                        </div>
                      )}
                      {isComplete && (
                        <div style={{ borderTop: '1px solid rgba(52,211,153,0.1)', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <CheckCircle style={{ width: 14, height: 14, color: '#34d399' }} />
                          <span style={{ fontSize: 11, color: '#34d399', fontWeight: 700 }}>Completed!</span>
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
