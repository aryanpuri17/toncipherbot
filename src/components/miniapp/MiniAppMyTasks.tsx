import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../../store/appStore';
import {
  TrendingUp, Pause, Play, Trash2, PlusCircle,
  AlertCircle, X, Loader2, Clock, RefreshCw,
} from 'lucide-react';

const TelegramLogo: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="tgGrad2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#2AABEE"/><stop offset="100%" stopColor="#229ED9"/></linearGradient></defs>
    <rect width="100" height="100" rx="22" fill="url(#tgGrad2)"/>
    <path fill="white" d="M22 49l11 4 4 13 6-8 13 10 11-42-45 23zm14 5l22-14-17 19 6 9-11-14z"/>
  </svg>
);
const YouTubeLogo: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="22" fill="#FF0000"/>
    <path fill="white" d="M71 36.5c-.8-3-3.2-5.4-6.2-6.2C59.5 29 50 29 50 29s-9.5 0-14.8 1.3c-3 .8-5.4 3.2-6.2 6.2C27.7 41.8 27.7 50 27.7 50s0 8.2 1.3 13.5c.8 3 3.2 5.4 6.2 6.2C40.5 71 50 71 50 71s9.5 0 14.8-1.3c3-.8 5.4-3.2 6.2-6.2 1.3-5.3 1.3-13.5 1.3-13.5s0-8.2-1.3-13.5zM44 60V40l18 10-18 10z"/>
  </svg>
);
const XLogo: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="22" fill="#000000"/>
    <path fill="white" d="M18 18h23l11.5 16.5L66 18h16L57.5 46 82 82H59L46 64.5 30 82H14l26-30.5L18 18zm8 7l38 48h8L34 25h-8zm35 0L28 75h-8l33-41.5L52 25h9z"/>
  </svg>
);
const InstagramLogo: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="ig2" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#FFDC80"/><stop offset="25%" stopColor="#FCAF45"/><stop offset="50%" stopColor="#F77737"/><stop offset="75%" stopColor="#F56040"/><stop offset="87%" stopColor="#FD1D1D"/><stop offset="100%" stopColor="#833AB4"/></linearGradient></defs>
    <rect width="100" height="100" rx="22" fill="url(#ig2)"/>
    <rect x="25" y="25" width="50" height="50" rx="14" fill="none" stroke="white" strokeWidth="6"/>
    <circle cx="50" cy="50" r="13" fill="none" stroke="white" strokeWidth="6"/>
    <circle cx="68" cy="32" r="4" fill="white"/>
  </svg>
);
const TikTokLogo: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="22" fill="#010101"/>
    <path fill="#00f2ea" d="M57 20h-9v41a8 8 0 1 1-8-8v-9a17 17 0 1 0 17 17V37a26 26 0 0 0 15 5v-9a17 17 0 0 1-15-13z"/>
    <path fill="#ff0050" d="M59 20h-9v41a8 8 0 1 1-8-8v-9a17 17 0 1 0 17 17V37a26 26 0 0 0 13 4v-9a17 17 0 0 1-13-12z"/>
  </svg>
);
const DiscordLogo: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="22" fill="#5865F2"/>
    <path fill="white" d="M69 27a48 48 0 0 0-12-4l-2 4a44 44 0 0 0-10 0l-2-4a48 48 0 0 0-12 4C22 42 19 57 20 71a49 49 0 0 0 15 8l3-4a32 32 0 0 1-5-2l1-3a35 35 0 0 0 32 0l1 3a32 32 0 0 1-5 2l3 4a49 49 0 0 0 15-8c2-16-2-31-11-44zM38 62c-3 0-6-3-6-7s3-7 6-7 6 3 6 7-3 7-6 7zm24 0c-3 0-6-3-6-7s3-7 6-7 6 3 6 7-3 7-6 7z"/>
  </svg>
);

function getTaskDisplay(url: string, type: string): { icon: React.ReactNode; bg: string; text: string; label: string } {
  const u = (url ?? '').toLowerCase();
  if (u.includes('youtube.com') || u.includes('youtu.be'))
    return { icon: <YouTubeLogo size={18} />, bg: 'bg-red-500/20',    text: 'text-red-400',    label: 'YouTube' };
  if (u.includes('twitter.com') || u.includes('x.com'))
    return { icon: <XLogo size={18} />,       bg: 'bg-slate-500/20',  text: 'text-slate-300',  label: 'X / Twitter' };
  if (u.includes('instagram.com'))
    return { icon: <InstagramLogo size={18} />, bg: 'bg-pink-500/20', text: 'text-pink-400',   label: 'Instagram' };
  if (u.includes('tiktok.com'))
    return { icon: <TikTokLogo size={18} />,  bg: 'bg-slate-500/20',  text: 'text-slate-300',  label: 'TikTok' };
  if (u.includes('discord.gg') || u.includes('discord.com'))
    return { icon: <DiscordLogo size={18} />, bg: 'bg-indigo-500/20', text: 'text-indigo-400', label: 'Discord' };
  const typeMap: Record<string, { icon: React.ReactNode; bg: string; text: string; label: string }> = {
    join_channel: { icon: <TelegramLogo size={18} />, bg: 'bg-blue-500/20',    text: 'text-blue-400',   label: 'Channel'  },
    join_group:   { icon: <TelegramLogo size={18} />, bg: 'bg-purple-500/20',  text: 'text-purple-400', label: 'Group'    },
    start_bot:    { icon: <TelegramLogo size={18} />, bg: 'bg-cyan-500/20',    text: 'text-cyan-400',   label: 'Bot'      },
    watch_video:  { icon: <YouTubeLogo size={18} />,  bg: 'bg-red-500/20',     text: 'text-red-400',    label: 'Video'    },
    social:       { icon: <XLogo size={18} />,        bg: 'bg-orange-500/20',  text: 'text-orange-400', label: 'Social'   },
    special:      { icon: <span style={{fontSize:14}}>⭐</span>, bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Special' },
  };
  return typeMap[type] ?? { icon: <TelegramLogo size={18} />, bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Task' };
}

interface PendingProof {
  id: number;
  taskId: string;
  workerId: number;
  fileId: string;
  status: string;
  createdAt: string;
  taskTitle: string;
  workerName: string;
  workerUsername: string | null;
}

interface ApiUserTask {
  id: string;
  type: string;
  title: string;
  description: string;
  targetUrl: string;
  reward: number;
  totalBudget: number;
  spent: number;
  status: 'pending_approval' | 'active' | 'paused' | 'rejected' | 'depleted';
  completions: number;
  maxCompletions: number;
  adminNote: string;
  createdAt: string;
  approvedAt: string | null;
}

const statusMap: Record<string, { label: string; dot: string; cls: string }> = {
  pending_approval: { label: 'Pending',   dot: 'bg-amber-400',   cls: 'text-amber-400 bg-amber-500/10 border-amber-500/25'      },
  active:           { label: 'Active',    dot: 'bg-emerald-400', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' },
  paused:           { label: 'Paused',    dot: 'bg-amber-400',   cls: 'text-amber-400 bg-amber-500/10 border-amber-500/25'      },
  rejected:         { label: 'Rejected',  dot: 'bg-red-400',     cls: 'text-red-400 bg-red-500/10 border-red-500/25'            },
  depleted:         { label: 'Completed', dot: 'bg-slate-500',   cls: 'text-slate-400 bg-white/5 border-white/10'               },
};

/** Fetches a proof image via JS (X-Init-Data header) and renders it as a blob URL.
 * Avoids putting the initData credential into the URL (logs, referrer, browser history). */
const ProofImage: React.FC<{ proofId: number; telegramId: number; initData: string }> = ({
  proofId, telegramId, initData,
}) => {
  const [src, setSrc] = useState<string | null>(null);
  const prevUrl = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const url = `/api/proof-image/${proofId}?telegramId=${telegramId}`;
    fetch(url, { headers: initData ? { 'X-Init-Data': initData } : {} })
      .then(r => r.ok ? r.blob() : Promise.reject())
      .then(blob => {
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        prevUrl.current = objectUrl;
        setSrc(objectUrl);
      })
      .catch(() => { /* no-op — onError fallback handles missing images */ });
    return () => {
      cancelled = true;
      if (prevUrl.current) { URL.revokeObjectURL(prevUrl.current); prevUrl.current = null; }
    };
  }, [proofId, telegramId, initData]);

  if (!src) return null;
  return (
    <img src={src} alt="Proof"
      style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
  );
};

const StatusBadge: React.FC<{ status: ApiUserTask['status'] }> = ({ status }) => {
  const cfg = statusMap[status] ?? statusMap.pending_approval;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

export const MiniAppMyTasks: React.FC = () => {
  const { currentUser, setMiniAppPage, updateUser, platformConfig, addPlatformRevenue } = useAppStore();

  const priceFixed = platformConfig.taskPricePerExecution ?? 0.05;
  const feeRate    = platformConfig.taskCreationFeeRate   ?? 0.15;

  const [tasks,         setTasks]         = useState<ApiUserTask[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [budgetTaskId,  setBudgetTaskId]  = useState<string | null>(null);
  const [addExecs,      setAddExecs]      = useState('');
  const [budgetError,   setBudgetError]   = useState('');
  const [apiError,      setApiError]      = useState('');
  const [pendingProofs,    setPendingProofs]    = useState<PendingProof[]>([]);
  const [proofActionId,    setProofActionId]    = useState<number | null>(null);
  const [proofError,       setProofError]       = useState('');

  const _getInitData = () =>
    (window as unknown as { Telegram?: { WebApp?: { initData?: string } } })?.Telegram?.WebApp?.initData ?? '';

  const fetchTasks = useCallback(async () => {
    const telegramId = currentUser.telegramId;
    if (!telegramId) { setLoading(false); return; }
    try {
      const initData = _getInitData();
      const res  = await fetch(`/api/user-tasks/mine?telegram_id=${telegramId}`, {
        headers: initData ? { 'X-Init-Data': initData } : {},
      });
      const data = await res.json() as ApiUserTask[];
      setTasks(data);

      // Auto-refund rejected tasks
      const pending  = JSON.parse(localStorage.getItem('tc_task_pending')  ?? '[]') as { id: string; amount: number }[];
      const refunded = JSON.parse(localStorage.getItem('tc_task_refunded') ?? '[]') as string[];
      const toRefund = data.filter(t => t.status === 'rejected' && !refunded.includes(t.id));

      let totalRefund = 0;
      const newPending  = [...pending];
      const newRefunded = [...refunded];

      for (const task of toRefund) {
        const idx = newPending.findIndex(p => p.id === task.id);
        if (idx !== -1) {
          totalRefund += newPending[idx].amount;
          newPending.splice(idx, 1);
          newRefunded.push(task.id);
        }
      }
      if (totalRefund > 0) {
        const state = useAppStore.getState();
        state.updateUser(state.currentUser.id, { balanceMain: state.currentUser.balanceMain + totalRefund });
        localStorage.setItem('tc_task_pending',  JSON.stringify(newPending));
        localStorage.setItem('tc_task_refunded', JSON.stringify(newRefunded));
      }
    } catch {
      setApiError('Unable to load your campaigns — please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [currentUser.telegramId]);

  const fetchPendingProofs = useCallback(async () => {
    if (!currentUser.telegramId) return;
    try {
      const initData = _getInitData();
      const res = await fetch(`/api/user-tasks/pending-proofs?telegramId=${currentUser.telegramId}`, {
        headers: initData ? { 'X-Init-Data': initData } : {},
      });
      const data = await res.json() as PendingProof[];
      setPendingProofs(data);
    } catch { /* no server in local dev */ }
  }, [currentUser.telegramId]);

  useEffect(() => {
    void fetchTasks();
    void fetchPendingProofs();
  }, [fetchTasks, fetchPendingProofs]);

  const callApi = async (url: string, body: object): Promise<{ success: boolean; refund?: number; status?: string }> => {
    const res  = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await res.json() as { success: boolean; refund?: number; status?: string };
  };

  const handleTogglePause = async (task: ApiUserTask) => {
    setActionLoading(task.id);
    setApiError('');
    try {
      const r = await callApi(`/api/user-tasks/${task.id}/pause`, { telegramId: currentUser.telegramId, initData: _getInitData() });
      if (r.success) await fetchTasks();
    } catch { setApiError('Network error.'); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async (task: ApiUserTask) => {
    setActionLoading(task.id);
    setApiError('');
    try {
      const r = await callApi(`/api/user-tasks/${task.id}/delete`, { telegramId: currentUser.telegramId, initData: _getInitData() });
      if (r.success) {
        const refund = r.refund ?? 0;
        if (refund > 0) updateUser(currentUser.id, { balanceMain: useAppStore.getState().currentUser.balanceMain + refund });
        // Remove from localStorage pending if present
        const pending = JSON.parse(localStorage.getItem('tc_task_pending') ?? '[]') as { id: string; amount: number }[];
        localStorage.setItem('tc_task_pending', JSON.stringify(pending.filter(p => p.id !== task.id)));
        await fetchTasks();
      }
    } catch { setApiError('Network error.'); }
    finally { setActionLoading(null); setConfirmDelete(null); }
  };

  const additionalExecs = Math.max(0, parseInt(addExecs) || 0);
  const additionalCost  = additionalExecs * priceFixed;

  const handleAddBudget = async (task: ApiUserTask) => {
    setBudgetError('');
    if (additionalExecs < 1) { setBudgetError('Please enter a valid number.'); return; }
    if (currentUser.balanceMain < additionalCost) {
      setBudgetError(`Insufficient balance. Available: ${currentUser.balanceMain.toFixed(4)} GRAM, required: ${additionalCost.toFixed(4)} GRAM.`);
      return;
    }
    setActionLoading(task.id);
    try {
      const r = await callApi(`/api/user-tasks/${task.id}/fund`, {
        telegramId:      currentUser.telegramId,
        initData:        _getInitData(),
        extraExecutions: additionalExecs,
        extraBudget:     additionalCost,
      });
      if (r.success) {
        updateUser(currentUser.id, { balanceMain: useAppStore.getState().currentUser.balanceMain - additionalCost });
        addPlatformRevenue(additionalCost * feeRate);
        // Update localStorage pending
        const pending = JSON.parse(localStorage.getItem('tc_task_pending') ?? '[]') as { id: string; amount: number }[];
        const idx = pending.findIndex(p => p.id === task.id);
        if (idx !== -1) pending[idx].amount += additionalCost;
        localStorage.setItem('tc_task_pending', JSON.stringify(pending));
        setBudgetTaskId(null);
        setAddExecs('');
        await fetchTasks();
      }
    } catch { setBudgetError('Network error.'); }
    finally { setActionLoading(null); }
  };

  const handleReviewProof = async (proof: PendingProof, action: 'approve' | 'reject') => {
    setProofActionId(proof.id);
    setProofError('');
    try {
      const res = await fetch(`/api/social-proof/${proof.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: currentUser.telegramId, action, initData: _getInitData() }),
      });
      const data = await res.json() as { success: boolean };
      if (data.success) {
        setPendingProofs(prev => prev.filter(p => p.id !== proof.id));
      } else {
        setProofError('Validation error.');
      }
    } catch {
      setProofError('Network error.');
    } finally {
      setProofActionId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0098EA' }} />
        <p className="text-sm text-slate-500">Loading your campaigns…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMiniAppPage('tasks')}
            className="p-2 rounded-lg hover:bg-white/5 text-slate-400 transition-colors"
          >←</button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">My Campaigns</h1>
              {pendingProofs.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold border border-orange-500/25 animate-pulse">
                  {pendingProofs.length}
                </span>
              )}
            </div>
            {tasks.length > 0 && (
              <p className="text-xs font-medium" style={{ color: '#0098EA' }}>
                {tasks.length} campaign{tasks.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => void fetchTasks()}
          className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {apiError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400">{apiError}</p>
        </div>
      )}

      {/* Pending proofs section */}
      {pendingProofs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">Pending Proofs</span>
            <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold border border-orange-500/25">
              {pendingProofs.length}
            </span>
          </div>
          {proofError && (
            <p className="text-xs text-red-400">{proofError}</p>
          )}
          {pendingProofs.map(proof => {
            const isActing = proofActionId === proof.id;
            const workerDisplay = proof.workerUsername ? `@${proof.workerUsername}` : proof.workerName;
            return (
              <div key={proof.id} style={{
                background: 'rgba(249,115,22,0.05)',
                border: '1px solid rgba(249,115,22,0.2)',
                borderRadius: 16, overflow: 'hidden',
              }}>
                {/* Screenshot — fetched via JS to keep initData out of the URL */}
                <ProofImage
                  proofId={proof.id}
                  telegramId={currentUser.telegramId}
                  initData={_getInitData()}
                />
                <div style={{ padding: '10px 12px' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#f8fafc', marginBottom: 2 }}>
                    {proof.taskTitle}
                  </p>
                  <p style={{ fontSize: 10, color: '#64748b', marginBottom: 8 }}>
                    by {workerDisplay} · {new Date(proof.createdAt).toLocaleDateString('en-GB')}
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => void handleReviewProof(proof, 'approve')}
                      disabled={isActing}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 10,
                        background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)',
                        color: '#34d399', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        opacity: isActing ? 0.5 : 1,
                      }}
                    >
                      ✅ Approve
                    </button>
                    <button
                      onClick={() => void handleReviewProof(proof, 'reject')}
                      disabled={isActing}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 10,
                        background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                        color: '#f87171', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        opacity: isActing ? 0.5 : 1,
                      }}
                    >
                      ❌ Reject
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/60 flex items-center justify-center">
            <TrendingUp className="w-7 h-7 text-slate-600" />
          </div>
          <p className="text-sm font-semibold text-slate-400">No campaigns created</p>
          <p className="text-xs text-slate-600 text-center px-6">
            Create a task to promote your Telegram channel or bot.
          </p>
          <button
            onClick={() => setMiniAppPage('createTask')}
            className="mt-2 px-5 py-2.5 rounded-xl btn-primary text-sm font-semibold text-white"
          >
            Create a Task
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => {
            const cfg       = getTaskDisplay(task.targetUrl, task.type);
            const remaining = task.maxCompletions - task.completions;
            const isFull    = remaining <= 0;
            const progress  = task.maxCompletions > 0 ? Math.min(task.completions / task.maxCompletions, 1) : 0;
            const isLoading = actionLoading === task.id;

            const isConfirmingDelete = confirmDelete === task.id;
            const isExpandingBudget  = budgetTaskId  === task.id;
            const canManage          = task.status === 'active' || task.status === 'paused';

            return (
              <div
                key={task.id}
                className={`glass-card p-4 space-y-3 transition-all ${task.status === 'rejected' ? 'opacity-60' : ''}`}
              >
                {/* Header row */}
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg} ${cfg.text}`}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-sm font-semibold text-white truncate">{task.title}</h3>
                      <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-semibold ${cfg.bg} ${cfg.text} shrink-0`}>
                        {cfg.label}
                      </span>
                    </div>
                    <StatusBadge status={task.status} />
                    {task.status === 'pending_approval' && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <p className="text-[10px] text-amber-400/80">Awaiting review</p>
                      </div>
                    )}
                    {task.status === 'rejected' && task.adminNote && (
                      <p className="text-[10px] text-red-400/80 mt-1">Reason: {task.adminNote}</p>
                    )}
                    {task.status === 'rejected' && (
                      <p className="text-[10px] text-emerald-400 mt-1">Budget automatically refunded</p>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-[10px] mb-1.5">
                    <span className="text-slate-400 font-medium">{task.completions.toLocaleString()} completions</span>
                    <span className="text-slate-500">{task.maxCompletions.toLocaleString()} max</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isFull ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                      }`}
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: task.completions.toLocaleString(), label: 'Completions', color: 'text-white' },
                    { value: task.spent.toFixed(3),             label: 'TON spent',   color: 'text-orange-400' },
                    { value: remaining.toLocaleString(),         label: 'Remaining',   color: isFull ? 'text-emerald-400' : 'text-slate-300' },
                  ].map(stat => (
                    <div key={stat.label} className="glass-card-light rounded-xl p-2 text-center">
                      <p className={`text-xs font-bold ${stat.color}`}>{stat.value}</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center text-xs px-0.5">
                  <span className="text-slate-500">Total budget</span>
                  <span className="text-amber-400 font-semibold">{task.totalBudget.toFixed(3)} GRAM</span>
                </div>

                {/* Actions */}
                {canManage && !isFull && !isConfirmingDelete && !isExpandingBudget && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => void handleTogglePause(task)}
                      disabled={isLoading}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all flex-1 justify-center disabled:opacity-40 ${task.status === 'active' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'}`}
                    >
                      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : task.status === 'active' ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5" /> Resume</>}
                    </button>
                    <button
                      onClick={() => { setBudgetTaskId(task.id); setAddExecs(''); setBudgetError(''); }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-all flex-1 justify-center"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Add Budget
                    </button>
                    <button
                      onClick={() => setConfirmDelete(task.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Completed task — delete only */}
                {(isFull || task.status === 'depleted') && !isConfirmingDelete && (
                  <button
                    onClick={() => setConfirmDelete(task.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                )}

                {/* Delete confirmation */}
                {isConfirmingDelete && (
                  <div className="border-t border-white/5 pt-3 space-y-2">
                    <p className="text-xs text-slate-300 font-medium">Delete this campaign?</p>
                    {remaining > 0 && (task.status === 'active' || task.status === 'paused') && (
                      <p className="text-xs text-emerald-400">
                        Refund: <span className="font-bold">+{(remaining * priceFixed).toFixed(4)} GRAM</span> ({remaining} unused executions)
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => void handleDelete(task)}
                        disabled={isLoading}
                        className="flex-1 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/25 transition-all disabled:opacity-40"
                      >
                        {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Delete'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="flex-1 py-2 rounded-xl bg-white/5 text-slate-400 text-xs font-medium hover:bg-white/10 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Add budget form */}
                {isExpandingBudget && (
                  <div className="border-t border-white/5 pt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-white">Increase Budget</p>
                      <button onClick={() => { setBudgetTaskId(null); setBudgetError(''); }} className="text-slate-500 hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-slate-500">Executions to add (× {priceFixed.toFixed(4)} GRAM)</p>
                      <input
                        type="number" min="1" value={addExecs}
                        onChange={e => { setAddExecs(e.target.value); setBudgetError(''); }}
                        placeholder="Ex: 500"
                        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-blue-500/50"
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Additional cost</span>
                      <span className={`font-semibold ${additionalExecs > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                        {additionalExecs > 0 ? `${additionalCost.toFixed(4)} GRAM` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Your balance</span>
                      <span className={`font-semibold ${currentUser.balanceMain >= additionalCost && additionalCost > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {currentUser.balanceMain.toFixed(4)} GRAM
                      </span>
                    </div>
                    {budgetError && (
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/5 border border-red-500/20">
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-400">{budgetError}</p>
                      </div>
                    )}
                    <button
                      onClick={() => void handleAddBudget(task)}
                      disabled={additionalExecs < 1 || isLoading}
                      className="w-full py-2.5 rounded-xl btn-primary text-xs font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isLoading
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
                        : `Confirm — ${additionalExecs > 0 ? `${additionalCost.toFixed(4)} GRAM` : '0 GRAM'}`
                      }
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={() => setMiniAppPage('createTask')}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-all"
        style={{ borderColor: 'rgba(0,152,234,0.25)', color: '#0098EA', background: 'rgba(0,152,234,0.06)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,152,234,0.12)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,152,234,0.06)')}
      >
        <PlusCircle className="w-4 h-4" /> Create a New Task
      </button>
    </div>
  );
};
