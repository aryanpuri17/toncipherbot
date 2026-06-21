import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { adminFetch } from '../../utils/adminFetch';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import { Key, Hash, Wallet, Bell, Server, Terminal, Shield, Users, Gift, CreditCard, Plus, MessageSquare, Edit2, Trash2, Zap } from 'lucide-react';

export const AdminConfig: React.FC = () => {
  const { platformConfig, updatePlatformConfig, activatePromoEvent, deactivatePromoEvent } = useAppStore();
  const [activeTab, setActiveTab] = useState('bot');
  const [saved, setSaved] = useState(false);

  // Streak milestones local edit state
  const [milestones, setMilestones] = useState(
    () => [...(platformConfig.streakMilestones ?? [])]
  );
  const saveMilestones = () => {
    updatePlatformConfig({ streakMilestones: milestones });
    // Persist server-side so every user's app picks them up
    void adminFetch('/api/admin/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'streakMilestones', value: milestones }),
    }).catch(() => {});
  };

  const [broadcastMsg,     setBroadcastMsg]     = useState('');
  const [broadcastPin,     setBroadcastPin]     = useState(false);
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastResult,  setBroadcastResult]  = useState('');

  const handleBroadcast = async () => {
    if (!broadcastMsg.trim()) return;
    setBroadcastLoading(true);
    setBroadcastResult('');
    try {
      const res = await adminFetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: broadcastMsg, pin: broadcastPin, parseMode: 'HTML' }),
      });
      const d = await res.json() as { success?: boolean; sent?: number; failed?: number; error?: string };
      if (d.success) {
        setBroadcastResult(`✅ Sent to ${d.sent} users (${d.failed} failed)`);
        setBroadcastMsg('');
      } else {
        setBroadcastResult(`❌ Error: ${d.error}`);
      }
    } catch {
      setBroadcastResult('❌ Network error');
    } finally {
      setBroadcastLoading(false);
    }
  };

  // Promo event form state
  const [eventMult,  setEventMult]  = useState(2);
  const [eventHours, setEventHours] = useState(24);
  const [eventLabel, setEventLabel] = useState('');
  const currentEvent = platformConfig.promoEvent;
  const isEventLive  = currentEvent?.active && new Date(currentEvent.endsAt) > new Date();

  // Withdrawal notification channel — persisted server-side (the bot posts
  // withdrawal requests / approvals / rejections there)
  const [wdChannel,      setWdChannel]      = useState('');
  const [wdChannelSaved, setWdChannelSaved] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle');
  React.useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then((cfg: { withdrawalChannel?: string }) => {
        if (typeof cfg.withdrawalChannel === 'string') setWdChannel(cfg.withdrawalChannel);
      })
      .catch(() => {});
  }, []);
  const saveWdChannel = async () => {
    setWdChannelSaved('saving');
    try {
      const res = await adminFetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'withdrawalChannel', value: wdChannel.trim() }),
      });
      setWdChannelSaved(res.ok ? 'ok' : 'error');
    } catch {
      setWdChannelSaved('error');
    }
    setTimeout(() => setWdChannelSaved('idle'), 2500);
  };

  const handleSave = async () => {
    // Strip sensitive credentials — those stay as env vars server-side
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { botToken: _bt, apiId: _ai, apiHash: _ah, databaseUrl: _du, ...rest } = platformConfig;
    try {
      await adminFetch('/api/admin/config/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs: rest }),
      });
    } catch { /* silent — Zustand + localStorage already updated */ }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const tabs = [
    { id: 'bot',           label: 'Bot',          icon: <Terminal className="w-4 h-4" /> },
    { id: 'telegram',      label: 'Telegram',     icon: <Hash className="w-4 h-4" /> },
    { id: 'wallet',        label: 'Wallet',       icon: <Wallet className="w-4 h-4" /> },
    { id: 'referral',      label: 'Referral',     icon: <Gift className="w-4 h-4" /> },
    { id: 'antifraud',     label: 'Anti-Fraud',   icon: <Shield className="w-4 h-4" /> },
    { id: 'withdrawals',   label: 'Withdrawals',  icon: <CreditCard className="w-4 h-4" /> },
    { id: 'tasks',         label: 'Tasks',        icon: <Users className="w-4 h-4" /> },
    { id: 'system',        label: 'System',       icon: <Server className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications',icon: <Bell className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white">Configuration</h2>
        <p className="text-slate-400 text-sm mt-1">Global platform settings — everything is configurable here</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/5 pb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === tab.id ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:bg-white/5'}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bot Settings */}
      {activeTab === 'bot' && (
        <div className="space-y-6">
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Key className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-white">API Telegram</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Bot Token</label>
                <input type="password" value={platformConfig.botToken} onChange={e => updatePlatformConfig({ botToken: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white font-mono" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Bot Username</label>
                <input type="text" value={platformConfig.botUsername} onChange={e => updatePlatformConfig({ botUsername: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">API ID</label>
                <input type="password" value={platformConfig.apiId} onChange={e => updatePlatformConfig({ apiId: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white font-mono" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">API Hash</label>
                <input type="password" value={platformConfig.apiHash} onChange={e => updatePlatformConfig({ apiHash: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white font-mono" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 mb-1.5">Database URL</label>
                <input type="password" value={platformConfig.databaseUrl} onChange={e => updatePlatformConfig({ databaseUrl: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white font-mono" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Telegram Settings */}
      {activeTab === 'telegram' && (
        <div className="space-y-6">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Main Channels & Groups</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Main channel</label>
                <input type="text" value={platformConfig.mainChannel} onChange={e => updatePlatformConfig({ mainChannel: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Main group</label>
                <input type="text" value={platformConfig.mainGroup} onChange={e => updatePlatformConfig({ mainGroup: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Support bot</label>
                <input type="text" value={platformConfig.supportBot} onChange={e => updatePlatformConfig({ supportBot: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Announcements channel</label>
                <input type="text" value={platformConfig.announcementChannel} onChange={e => updatePlatformConfig({ announcementChannel: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-1">Withdrawal channel</h3>
            <p className="text-xs text-slate-500 mb-4">
              The bot posts every withdrawal request, approval, and rejection here.
              Format: <span className="font-mono">@MyChannel</span> or <span className="font-mono">-100xxxxxxxxxx</span>.
              The bot must be an <b>administrator</b> of the channel to post.
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={wdChannel}
                onChange={e => setWdChannel(e.target.value)}
                placeholder="@TonCipher_Pays ou -100xxxxxxxxxx"
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white font-mono"
              />
              <button
                onClick={() => void saveWdChannel()}
                disabled={wdChannelSaved === 'saving'}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${wdChannelSaved === 'ok' ? 'bg-emerald-500/20 text-emerald-400' : wdChannelSaved === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'} disabled:opacity-50`}
              >
                {wdChannelSaved === 'saving' ? '…' : wdChannelSaved === 'ok' ? '✓ Saved' : wdChannelSaved === 'error' ? 'Error — admin key?' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Settings */}
      {activeTab === 'wallet' && (
        <div className="space-y-6">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Wallet Configuration</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 mb-1.5">Main wallet address</label>
                <input type="text" value={platformConfig.mainWallet} onChange={e => updatePlatformConfig({ mainWallet: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white font-mono" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Hot Wallet threshold ($)</label>
                <input type="number" value={platformConfig.hotWalletThreshold} onChange={e => updatePlatformConfig({ hotWalletThreshold: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
                <p className="text-[10px] text-slate-500 mt-1">Alert if balance drops below</p>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Cold Wallet threshold ($)</label>
                <input type="number" value={platformConfig.coldWalletThreshold} onChange={e => updatePlatformConfig({ coldWalletThreshold: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
                <p className="text-[10px] text-slate-500 mt-1">Auto transfer to cold wallet</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Referral Settings */}
      {activeTab === 'referral' && (
        <div className="space-y-6">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-1">Referral program</h3>
            <p className="text-xs text-slate-400 mb-4">Reward paid to the referrer when a friend joins or completes tasks.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Reward per referral (GRAM)</label>
                <input type="number" step="0.001" min="0" value={platformConfig.referralBonusSignup} onChange={e => updatePlatformConfig({ referralBonusSignup: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
                <p className="text-[10px] text-slate-500 mt-1">GRAM credited to the referrer when a new user signs up via their link</p>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Commission per task (%)</label>
                <input type="number" min="0" max="100" value={platformConfig.referralBonusDepositPercent} onChange={e => updatePlatformConfig({ referralBonusDepositPercent: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
                <p className="text-[10px] text-slate-500 mt-1">% of each GRAM reward earned by a referral that goes to the referrer</p>
              </div>
            </div>
            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs text-slate-400">Referral link</label>
                <span className="text-[10px] text-blue-400">Auto-generated from bot name</span>
              </div>
              <div className="px-3 py-2 bg-white/[0.03] border border-white/5 rounded-lg text-xs text-slate-300 font-mono break-all">
                https://t.me/<span className="text-blue-400">{platformConfig.botUsername}</span>/<span className="text-emerald-400">{(platformConfig as {appShortName?: string}).appShortName ?? 'app'}</span>?startapp=r_<span className="text-amber-400">TELEGRAMID</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Anti-Fraud Settings */}
      {activeTab === 'antifraud' && (
        <div className="space-y-6">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Anti-Fraud Settings</h3>
            <div className="space-y-4">
              <ToggleSwitch enabled={platformConfig.antifraudEnabled} onChange={v => updatePlatformConfig({ antifraudEnabled: v })} label="Anti-fraud system enabled" />
              <ToggleSwitch enabled={platformConfig.vpnDetectionEnabled} onChange={v => updatePlatformConfig({ vpnDetectionEnabled: v })} label="VPN/Proxy detection" />
              <ToggleSwitch enabled={platformConfig.deviceFingerprintEnabled} onChange={v => updatePlatformConfig({ deviceFingerprintEnabled: v })} label="Device fingerprinting" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Max accounts per device</label>
                <input type="number" min="1" value={platformConfig.maxAccountsPerDevice} onChange={e => updatePlatformConfig({ maxAccountsPerDevice: parseInt(e.target.value) || 1 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Max accounts per IP</label>
                <input type="number" min="1" value={platformConfig.maxAccountsPerIP} onChange={e => updatePlatformConfig({ maxAccountsPerIP: parseInt(e.target.value) || 1 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Suspicious activity threshold (score)</label>
                <input type="number" min="1" max="100" value={platformConfig.suspiciousActivityThreshold} onChange={e => updatePlatformConfig({ suspiciousActivityThreshold: parseInt(e.target.value) || 50 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Auto-ban threshold (score)</label>
                <input type="number" min="1" max="100" value={platformConfig.autobanThreshold} onChange={e => updatePlatformConfig({ autobanThreshold: parseInt(e.target.value) || 90 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Settings */}
      {activeTab === 'withdrawals' && (
        <div className="space-y-6">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Withdrawal Settings</h3>
            <div className="space-y-4">
              <ToggleSwitch enabled={platformConfig.autoWithdrawalEnabled} onChange={v => updatePlatformConfig({ autoWithdrawalEnabled: v })} label="Automatic withdrawals" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Max auto amount ($)</label>
                <input type="number" min="0" value={platformConfig.autoWithdrawalMaxAmount} onChange={e => updatePlatformConfig({ autoWithdrawalMaxAmount: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Manual review threshold ($)</label>
                <input type="number" min="0" value={platformConfig.withdrawalReviewThreshold} onChange={e => updatePlatformConfig({ withdrawalReviewThreshold: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Min interval between withdrawals (h)</label>
                <input type="number" min="0" value={platformConfig.minWithdrawalInterval} onChange={e => updatePlatformConfig({ minWithdrawalInterval: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Verification required above ($)</label>
                <input type="number" min="0" value={platformConfig.requireVerificationAbove} onChange={e => updatePlatformConfig({ requireVerificationAbove: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Global daily limit ($)</label>
                <input type="number" min="0" value={platformConfig.globalDailyWithdrawalLimit} onChange={e => updatePlatformConfig({ globalDailyWithdrawalLimit: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Max pending withdrawals</label>
                <input type="number" min="1" value={platformConfig.maxPendingWithdrawals} onChange={e => updatePlatformConfig({ maxPendingWithdrawals: parseInt(e.target.value) || 100 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Settings */}
      {activeTab === 'tasks' && (
        <div className="space-y-6">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Task Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Verification timeout (sec)</label>
                <input type="number" min="5" value={platformConfig.taskVerificationTimeout} onChange={e => updatePlatformConfig({ taskVerificationTimeout: parseInt(e.target.value) || 30 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Global cooldown (min)</label>
                <input type="number" min="0" value={platformConfig.taskCooldownGlobal} onChange={e => updatePlatformConfig({ taskCooldownGlobal: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Max tasks per day</label>
                <input type="number" min="1" value={platformConfig.maxDailyTasks} onChange={e => updatePlatformConfig({ maxDailyTasks: parseInt(e.target.value) || 50 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Bonus task multiplier</label>
                <input type="number" step="0.1" min="1" value={platformConfig.bonusTaskMultiplier} onChange={e => updatePlatformConfig({ bonusTaskMultiplier: parseFloat(e.target.value) || 1 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Settings */}
      {activeTab === 'deposits' && (
        <div className="space-y-6">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Deposit Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Deposit bonus (%)</label>
                <input type="number" min="0" max="100" value={platformConfig.depositBonusPercent} onChange={e => updatePlatformConfig({ depositBonusPercent: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">First deposit bonus ($)</label>
                <input type="number" min="0" value={platformConfig.firstDepositBonus} onChange={e => updatePlatformConfig({ firstDepositBonus: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Min deposit for bonus ($)</label>
                <input type="number" min="0" value={platformConfig.minDepositForBonus} onChange={e => updatePlatformConfig({ minDepositForBonus: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Global daily limit ($)</label>
                <input type="number" min="0" value={platformConfig.globalDailyDepositLimit} onChange={e => updatePlatformConfig({ globalDailyDepositLimit: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Settings */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">System Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                <div>
                  <p className="text-sm text-red-400 font-medium">Maintenance mode</p>
                  <p className="text-xs text-slate-400">Disables user access</p>
                </div>
                <ToggleSwitch enabled={platformConfig.maintenanceMode} onChange={v => updatePlatformConfig({ maintenanceMode: v })} />
              </div>
              {platformConfig.maintenanceMode && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Maintenance message</label>
                  <input type="text" value={platformConfig.maintenanceMessage} onChange={e => updatePlatformConfig({ maintenanceMessage: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
                </div>
              )}
              <ToggleSwitch enabled={platformConfig.registrationEnabled} onChange={v => updatePlatformConfig({ registrationEnabled: v })} label="Registrations enabled" />
            </div>
          </div>
        </div>
      )}

      {/* Admin Notifications */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Admin Notifications</h3>
            <div className="space-y-4">
              <ToggleSwitch enabled={platformConfig.adminNotifyDeposit} onChange={v => updatePlatformConfig({ adminNotifyDeposit: v })} label="Notify deposits" />
              <ToggleSwitch enabled={platformConfig.adminNotifyWithdrawal} onChange={v => updatePlatformConfig({ adminNotifyWithdrawal: v })} label="Notify withdrawals" />
              <ToggleSwitch enabled={platformConfig.adminNotifyFraud} onChange={v => updatePlatformConfig({ adminNotifyFraud: v })} label="Notify fraud alerts" />
              <ToggleSwitch enabled={platformConfig.adminNotifyNewUser} onChange={v => updatePlatformConfig({ adminNotifyNewUser: v })} label="Notify new users" />
            </div>
            <div className="mt-4">
              <label className="block text-xs text-slate-400 mb-1.5">Chat ID for notifications</label>
              <input type="text" value={platformConfig.adminChatId} onChange={e => updatePlatformConfig({ adminChatId: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
            </div>
          </div>
        </div>
      )}

      {/* Streaks & Events */}
      {activeTab === 'streaks' && (
        <div className="space-y-6">
          {/* Streak per day */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Daily streak bonus</h3>
            <div className="max-w-xs">
              <label className="block text-xs text-slate-400 mb-1.5">Bonus per login day (TON)</label>
              <input
                type="number" step="0.01" min="0"
                value={platformConfig.streakBonusPerDay}
                onChange={e => updatePlatformConfig({ streakBonusPerDay: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white"
              />
              <p className="text-[10px] text-slate-500 mt-1">This bonus is credited from day 2 of the streak.</p>
            </div>
          </div>

          {/* Streak milestones */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Streak milestones</h3>
                <p className="text-xs text-slate-400 mt-0.5">One-time bonus credited when a milestone is reached</p>
              </div>
              <button
                onClick={() => setMilestones(m => [...m, { day: (m[m.length - 1]?.day ?? 0) + 7, bonus: 0.10 }])}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/25 text-blue-400 text-xs font-semibold hover:bg-blue-500/25 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {milestones.map((m, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/5">
                  <div className="text-lg flex-shrink-0">🔥</div>
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider">Day</label>
                      <input
                        type="number" min="1"
                        value={m.day}
                        onChange={e => setMilestones(prev => prev.map((x, j) => j === i ? { ...x, day: parseInt(e.target.value) || 1 } : x))}
                        className="w-full mt-0.5 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider">Bonus TON</label>
                      <input
                        type="number" step="0.01" min="0"
                        value={m.bonus}
                        onChange={e => setMilestones(prev => prev.map((x, j) => j === i ? { ...x, bonus: parseFloat(e.target.value) || 0 } : x))}
                        className="w-full mt-0.5 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => setMilestones(prev => prev.filter((_, j) => j !== i))}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {milestones.length === 0 && (
                <p className="text-center text-xs text-slate-500 py-4">No milestones configured</p>
              )}
            </div>
            <button
              onClick={saveMilestones}
              className="mt-4 w-full py-2.5 rounded-xl bg-blue-500/15 border border-blue-500/25 text-blue-400 text-sm font-semibold hover:bg-blue-500/25 transition-all"
            >
              ✓ Save milestones
            </button>
          </div>

          {/* Promo Event */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-white">Global promo event</h3>
            </div>

            {isEventLive ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-lg flex-shrink-0">⚡</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-amber-300">Active event — ×{currentEvent!.multiplier}</p>
                    <p className="text-xs text-amber-200/70 truncate">{currentEvent!.label}</p>
                    <p className="text-xs text-amber-400/60 mt-0.5">
                      Ends: {new Date(currentEvent!.endsAt).toLocaleString('en-US')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={deactivatePromoEvent}
                  className="w-full py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm font-semibold hover:bg-red-500/20 transition-all"
                >
                  🛑 Disable event
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-400">Activate a global multiplier that applies to all tasks and shows as a banner on the home screen.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Multiplier</label>
                    <select
                      value={eventMult}
                      onChange={e => setEventMult(parseFloat(e.target.value))}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white"
                    >
                      {[1.5, 2, 3, 5].map(v => (
                        <option key={v} value={v} className="bg-slate-900">×{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Duration</label>
                    <select
                      value={eventHours}
                      onChange={e => setEventHours(parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white"
                    >
                      {[1, 6, 12, 24, 48, 72].map(h => (
                        <option key={h} value={h} className="bg-slate-900">{h < 24 ? `${h}h` : `${h / 24}d`}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Event name (optional)</label>
                  <input
                    type="text"
                    value={eventLabel}
                    onChange={e => setEventLabel(e.target.value)}
                    placeholder={`×${eventMult} on all tasks`}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-600"
                  />
                </div>
                <button
                  onClick={() => activatePromoEvent(eventMult, eventHours, eventLabel.trim() || `×${eventMult} on all tasks`)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/35 text-amber-400 text-sm font-bold hover:from-amber-500/30 hover:to-orange-500/30 transition-all flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Launch event ×{eventMult} · {eventHours < 24 ? `${eventHours}h` : `${eventHours / 24}d`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Broadcast ───────────────────────────────────── */}
      <div className="glass-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white">📢 Broadcast</h3>
        <p className="text-xs text-slate-400">Send a Telegram message to all active users at once — useful for announcements, new features, or promotions.</p>
        <textarea
          value={broadcastMsg}
          onChange={e => setBroadcastMsg(e.target.value)}
          placeholder="Write your message here… (HTML supported: <b>, <i>, <a href=''>)"
          rows={5}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 resize-none"
        />
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <input type="checkbox" checked={broadcastPin} onChange={e => setBroadcastPin(e.target.checked)} className="rounded" />
            Pin message
          </label>
        </div>
        {broadcastResult && (
          <p className={`text-xs font-semibold ${broadcastResult.startsWith('✅') ? 'text-emerald-400' : 'text-red-400'}`}>
            {broadcastResult}
          </p>
        )}
        <button
          onClick={() => { void handleBroadcast(); }}
          disabled={broadcastLoading || !broadcastMsg.trim()}
          className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-bold transition-colors"
        >
          {broadcastLoading ? '⏳ Sending…' : '📤 Send to all'}
        </button>
      </div>

      {/* Save Button */}
      <div className="flex justify-end items-center gap-3">
        {saved && <span className="text-sm text-emerald-400 font-medium">✓ Configuration saved</span>}
        <button onClick={() => { void handleSave(); }} className={`px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all ${saved ? 'bg-emerald-600/80' : 'btn-primary'}`}>
          💾 Save configuration
        </button>
      </div>
    </div>
  );
};

export const AdminNotifications: React.FC = () => {
  const { notifications, messageTemplates, openModal, updateMessageTemplate, deleteMessageTemplate } = useAppStore();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Messages & Templates</h2>
          <p className="text-slate-400 text-sm mt-1">All bot messages are configurable here</p>
        </div>
        <button onClick={() => openModal('messageTemplate')} className="btn-primary px-4 py-2.5 rounded-xl text-sm font-medium text-white flex items-center gap-2">
          <Plus className="w-4 h-4" /> New template
        </button>
      </div>

      {/* Message Templates */}
      <div className="space-y-3">
        {messageTemplates.map(t => (
          <div key={t.id} className="glass-card p-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-white">{t.name}</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 text-slate-400">{t.key}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-400">{t.category}</span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 font-mono">{t.content.slice(0, 100)}...</p>
                {t.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {t.variables.map(v => (
                      <span key={v} className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/10 text-amber-400">{'{' + v + '}'}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openModal('messageTemplate', { template: t })} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => deleteMessageTemplate(t.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
                <ToggleSwitch enabled={t.isActive} onChange={v => updateMessageTemplate(t.id, { isActive: v })} size="sm" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Notifications */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Recent notifications</h3>
        <div className="space-y-2">
          {notifications.slice(0, 5).map(n => (
            <div key={n.id} className={`flex items-start gap-3 p-3 rounded-lg ${!n.isRead ? 'bg-blue-500/5 border border-blue-500/10' : 'bg-white/[0.02]'}`}>
              <span className="text-sm mt-0.5">
                {n.type === 'deposit' ? '💰' : n.type === 'withdrawal' ? '📤' : n.type === 'reward' ? '🎁' : n.type === 'level' ? '⬆️' : n.type === 'alert' ? '🚨' : '📢'}
              </span>
              <div className="flex-1">
                <p className="text-sm text-white font-medium">{n.title}</p>
                <p className="text-xs text-slate-400">{n.message}</p>
                <p className="text-[10px] text-slate-500 mt-1">{new Date(n.createdAt).toLocaleString('en-US')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
