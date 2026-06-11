import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { adminFetch } from '../../utils/adminFetch';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import { Key, Hash, Wallet, Bell, Server, Terminal, Shield, Users, Gift, CreditCard, Plus, MessageSquare, Edit2, Trash2, Zap, Flame } from 'lucide-react';

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

  // Promo event form state
  const [eventMult,  setEventMult]  = useState(2);
  const [eventHours, setEventHours] = useState(24);
  const [eventLabel, setEventLabel] = useState('');
  const currentEvent = platformConfig.promoEvent;
  const isEventLive  = currentEvent?.active && new Date(currentEvent.endsAt) > new Date();

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const tabs = [
    { id: 'bot',           label: 'Bot',          icon: <Terminal className="w-4 h-4" /> },
    { id: 'telegram',      label: 'Telegram',     icon: <Hash className="w-4 h-4" /> },
    { id: 'wallet',        label: 'Wallet',       icon: <Wallet className="w-4 h-4" /> },
    { id: 'referral',      label: 'Parrainage',   icon: <Gift className="w-4 h-4" /> },
    { id: 'antifraud',     label: 'Anti-Fraude',  icon: <Shield className="w-4 h-4" /> },
    { id: 'withdrawals',   label: 'Retraits',     icon: <CreditCard className="w-4 h-4" /> },
    { id: 'tasks',         label: 'Tâches',       icon: <Users className="w-4 h-4" /> },
    { id: 'deposits',      label: 'Dépôts',       icon: <Wallet className="w-4 h-4" /> },
    { id: 'system',        label: 'Système',      icon: <Server className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications',icon: <Bell className="w-4 h-4" /> },
    { id: 'streaks',       label: 'Streaks & Événements', icon: <Flame className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white">Configuration</h2>
        <p className="text-slate-400 text-sm mt-1">Paramètres globaux de la plateforme - Tout est modifiable ici</p>
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
            <h3 className="text-sm font-semibold text-white mb-4">Canaux & Groupes principaux</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Canal principal</label>
                <input type="text" value={platformConfig.mainChannel} onChange={e => updatePlatformConfig({ mainChannel: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Groupe principal</label>
                <input type="text" value={platformConfig.mainGroup} onChange={e => updatePlatformConfig({ mainGroup: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Bot support</label>
                <input type="text" value={platformConfig.supportBot} onChange={e => updatePlatformConfig({ supportBot: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Canal d'annonces</label>
                <input type="text" value={platformConfig.announcementChannel} onChange={e => updatePlatformConfig({ announcementChannel: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Settings */}
      {activeTab === 'wallet' && (
        <div className="space-y-6">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Configuration Wallet</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 mb-1.5">Adresse du wallet principal</label>
                <input type="text" value={platformConfig.mainWallet} onChange={e => updatePlatformConfig({ mainWallet: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white font-mono" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Seuil Hot Wallet ($)</label>
                <input type="number" value={platformConfig.hotWalletThreshold} onChange={e => updatePlatformConfig({ hotWalletThreshold: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
                <p className="text-[10px] text-slate-500 mt-1">Alerte si balance en-dessous</p>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Seuil Cold Wallet ($)</label>
                <input type="number" value={platformConfig.coldWalletThreshold} onChange={e => updatePlatformConfig({ coldWalletThreshold: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
                <p className="text-[10px] text-slate-500 mt-1">Transfert auto vers cold wallet</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Referral Settings */}
      {activeTab === 'referral' && (
        <div className="space-y-6">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Système de parrainage</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Bonus inscription ($)</label>
                <input type="number" step="0.01" value={platformConfig.referralBonusSignup} onChange={e => updatePlatformConfig({ referralBonusSignup: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Bonus activité ($)</label>
                <input type="number" step="0.01" value={platformConfig.referralBonusActivity} onChange={e => updatePlatformConfig({ referralBonusActivity: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Bonus dépôt ($)</label>
                <input type="number" step="0.01" value={platformConfig.referralBonusDeposit} onChange={e => updatePlatformConfig({ referralBonusDeposit: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">% sur dépôt filleul</label>
                <input type="number" min="0" max="100" value={platformConfig.referralBonusDepositPercent} onChange={e => updatePlatformConfig({ referralBonusDepositPercent: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Niveaux de parrainage</label>
                <input type="number" min="1" max="10" value={platformConfig.referralLevels} onChange={e => updatePlatformConfig({ referralLevels: parseInt(e.target.value) || 1 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Longueur code</label>
                <input type="number" min="4" max="16" value={platformConfig.referralCodeLength} onChange={e => updatePlatformConfig({ referralCodeLength: parseInt(e.target.value) || 8 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs text-slate-400">Lien de parrainage actuel</label>
                <span className="text-[10px] text-blue-400">Dérivé du nom du bot automatiquement</span>
              </div>
              <div className="px-3 py-2 bg-white/[0.03] border border-white/5 rounded-lg text-xs text-slate-300 font-mono break-all">
                https://t.me/<span className="text-blue-400">{platformConfig.botUsername}</span>/<span className="text-emerald-400">{(platformConfig as {appShortName?: string}).appShortName ?? 'app'}</span>?startapp=r_<span className="text-amber-400">TELEGRAMID</span>
              </div>
              <p className="text-[10px] text-slate-500">Format Mini App — ouvre directement l'app. Configurez le short name via BotFather → /newapp.</p>
            </div>
          </div>
        </div>
      )}

      {/* Anti-Fraud Settings */}
      {activeTab === 'antifraud' && (
        <div className="space-y-6">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Paramètres Anti-Fraude</h3>
            <div className="space-y-4">
              <ToggleSwitch enabled={platformConfig.antifraudEnabled} onChange={v => updatePlatformConfig({ antifraudEnabled: v })} label="Système anti-fraude activé" />
              <ToggleSwitch enabled={platformConfig.vpnDetectionEnabled} onChange={v => updatePlatformConfig({ vpnDetectionEnabled: v })} label="Détection VPN/Proxy" />
              <ToggleSwitch enabled={platformConfig.deviceFingerprintEnabled} onChange={v => updatePlatformConfig({ deviceFingerprintEnabled: v })} label="Fingerprint appareil" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Max comptes par appareil</label>
                <input type="number" min="1" value={platformConfig.maxAccountsPerDevice} onChange={e => updatePlatformConfig({ maxAccountsPerDevice: parseInt(e.target.value) || 1 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Max comptes par IP</label>
                <input type="number" min="1" value={platformConfig.maxAccountsPerIP} onChange={e => updatePlatformConfig({ maxAccountsPerIP: parseInt(e.target.value) || 1 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Seuil activité suspecte (score)</label>
                <input type="number" min="1" max="100" value={platformConfig.suspiciousActivityThreshold} onChange={e => updatePlatformConfig({ suspiciousActivityThreshold: parseInt(e.target.value) || 50 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Seuil auto-ban (score)</label>
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
            <h3 className="text-sm font-semibold text-white mb-4">Paramètres de retrait</h3>
            <div className="space-y-4">
              <ToggleSwitch enabled={platformConfig.autoWithdrawalEnabled} onChange={v => updatePlatformConfig({ autoWithdrawalEnabled: v })} label="Retraits automatiques" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Montant max auto ($)</label>
                <input type="number" min="0" value={platformConfig.autoWithdrawalMaxAmount} onChange={e => updatePlatformConfig({ autoWithdrawalMaxAmount: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Seuil revue manuelle ($)</label>
                <input type="number" min="0" value={platformConfig.withdrawalReviewThreshold} onChange={e => updatePlatformConfig({ withdrawalReviewThreshold: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Intervalle min entre retraits (h)</label>
                <input type="number" min="0" value={platformConfig.minWithdrawalInterval} onChange={e => updatePlatformConfig({ minWithdrawalInterval: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Vérification requise au-dessus de ($)</label>
                <input type="number" min="0" value={platformConfig.requireVerificationAbove} onChange={e => updatePlatformConfig({ requireVerificationAbove: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Limite globale journalière ($)</label>
                <input type="number" min="0" value={platformConfig.globalDailyWithdrawalLimit} onChange={e => updatePlatformConfig({ globalDailyWithdrawalLimit: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Max retraits en attente</label>
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
            <h3 className="text-sm font-semibold text-white mb-4">Paramètres des tâches</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Timeout vérification (sec)</label>
                <input type="number" min="5" value={platformConfig.taskVerificationTimeout} onChange={e => updatePlatformConfig({ taskVerificationTimeout: parseInt(e.target.value) || 30 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Cooldown global (min)</label>
                <input type="number" min="0" value={platformConfig.taskCooldownGlobal} onChange={e => updatePlatformConfig({ taskCooldownGlobal: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Max tâches par jour</label>
                <input type="number" min="1" value={platformConfig.maxDailyTasks} onChange={e => updatePlatformConfig({ maxDailyTasks: parseInt(e.target.value) || 50 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Multiplicateur tâches bonus</label>
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
            <h3 className="text-sm font-semibold text-white mb-4">Paramètres de dépôt</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Bonus dépôt (%)</label>
                <input type="number" min="0" max="100" value={platformConfig.depositBonusPercent} onChange={e => updatePlatformConfig({ depositBonusPercent: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Bonus 1er dépôt ($)</label>
                <input type="number" min="0" value={platformConfig.firstDepositBonus} onChange={e => updatePlatformConfig({ firstDepositBonus: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Dépôt min pour bonus ($)</label>
                <input type="number" min="0" value={platformConfig.minDepositForBonus} onChange={e => updatePlatformConfig({ minDepositForBonus: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Limite globale journalière ($)</label>
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
            <h3 className="text-sm font-semibold text-white mb-4">Paramètres système</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                <div>
                  <p className="text-sm text-red-400 font-medium">Mode maintenance</p>
                  <p className="text-xs text-slate-400">Désactive l'accès utilisateur</p>
                </div>
                <ToggleSwitch enabled={platformConfig.maintenanceMode} onChange={v => updatePlatformConfig({ maintenanceMode: v })} />
              </div>
              {platformConfig.maintenanceMode && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Message de maintenance</label>
                  <input type="text" value={platformConfig.maintenanceMessage} onChange={e => updatePlatformConfig({ maintenanceMessage: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
                </div>
              )}
              <ToggleSwitch enabled={platformConfig.registrationEnabled} onChange={v => updatePlatformConfig({ registrationEnabled: v })} label="Inscriptions activées" />
              <ToggleSwitch enabled={platformConfig.welcomeBonusEnabled} onChange={v => updatePlatformConfig({ welcomeBonusEnabled: v })} label="Bonus de bienvenue activé" />
              {platformConfig.welcomeBonusEnabled && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Montant bonus bienvenue ($)</label>
                  <input type="number" step="0.01" min="0" value={platformConfig.welcomeBonusAmount} onChange={e => updatePlatformConfig({ welcomeBonusAmount: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Notifications */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Notifications Admin</h3>
            <div className="space-y-4">
              <ToggleSwitch enabled={platformConfig.adminNotifyDeposit} onChange={v => updatePlatformConfig({ adminNotifyDeposit: v })} label="Notifier les dépôts" />
              <ToggleSwitch enabled={platformConfig.adminNotifyWithdrawal} onChange={v => updatePlatformConfig({ adminNotifyWithdrawal: v })} label="Notifier les retraits" />
              <ToggleSwitch enabled={platformConfig.adminNotifyFraud} onChange={v => updatePlatformConfig({ adminNotifyFraud: v })} label="Notifier les alertes fraude" />
              <ToggleSwitch enabled={platformConfig.adminNotifyNewUser} onChange={v => updatePlatformConfig({ adminNotifyNewUser: v })} label="Notifier les nouveaux utilisateurs" />
            </div>
            <div className="mt-4">
              <label className="block text-xs text-slate-400 mb-1.5">Chat ID pour notifications</label>
              <input type="text" value={platformConfig.adminChatId} onChange={e => updatePlatformConfig({ adminChatId: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white" />
            </div>
          </div>
        </div>
      )}

      {/* Streaks & Événements */}
      {activeTab === 'streaks' && (
        <div className="space-y-6">
          {/* Streak per day */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Bonus de streak quotidien</h3>
            <div className="max-w-xs">
              <label className="block text-xs text-slate-400 mb-1.5">Bonus par jour de connexion (TON)</label>
              <input
                type="number" step="0.01" min="0"
                value={platformConfig.streakBonusPerDay}
                onChange={e => updatePlatformConfig({ streakBonusPerDay: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white"
              />
              <p className="text-[10px] text-slate-500 mt-1">Ce bonus est crédité à partir du jour 2 de streak.</p>
            </div>
          </div>

          {/* Streak milestones */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Paliers de streak</h3>
                <p className="text-xs text-slate-400 mt-0.5">Bonus unique crédité lorsqu'un palier est atteint</p>
              </div>
              <button
                onClick={() => setMilestones(m => [...m, { day: (m[m.length - 1]?.day ?? 0) + 7, bonus: 0.10 }])}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/25 text-blue-400 text-xs font-semibold hover:bg-blue-500/25 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter
              </button>
            </div>
            <div className="space-y-2">
              {milestones.map((m, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/5">
                  <div className="text-lg flex-shrink-0">🔥</div>
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider">Jour</label>
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
                <p className="text-center text-xs text-slate-500 py-4">Aucun palier configuré</p>
              )}
            </div>
            <button
              onClick={saveMilestones}
              className="mt-4 w-full py-2.5 rounded-xl bg-blue-500/15 border border-blue-500/25 text-blue-400 text-sm font-semibold hover:bg-blue-500/25 transition-all"
            >
              ✓ Sauvegarder les paliers
            </button>
          </div>

          {/* Promo Event */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-white">Événement promo global</h3>
            </div>

            {isEventLive ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-lg flex-shrink-0">⚡</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-amber-300">Événement actif — ×{currentEvent!.multiplier}</p>
                    <p className="text-xs text-amber-200/70 truncate">{currentEvent!.label}</p>
                    <p className="text-xs text-amber-400/60 mt-0.5">
                      Fin : {new Date(currentEvent!.endsAt).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={deactivatePromoEvent}
                  className="w-full py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm font-semibold hover:bg-red-500/20 transition-all"
                >
                  🛑 Désactiver l'événement
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-400">Activez un multiplicateur global qui s'applique à toutes les tâches et s'affiche comme bannière sur l'accueil.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Multiplicateur</label>
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
                    <label className="block text-xs text-slate-400 mb-1.5">Durée</label>
                    <select
                      value={eventHours}
                      onChange={e => setEventHours(parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white"
                    >
                      {[1, 6, 12, 24, 48, 72].map(h => (
                        <option key={h} value={h} className="bg-slate-900">{h < 24 ? `${h}h` : `${h / 24}j`}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Nom de l'événement (optionnel)</label>
                  <input
                    type="text"
                    value={eventLabel}
                    onChange={e => setEventLabel(e.target.value)}
                    placeholder={`×${eventMult} sur toutes les tâches`}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-600"
                  />
                </div>
                <button
                  onClick={() => activatePromoEvent(eventMult, eventHours, eventLabel.trim() || `×${eventMult} sur toutes les tâches`)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/35 text-amber-400 text-sm font-bold hover:from-amber-500/30 hover:to-orange-500/30 transition-all flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Lancer l'événement ×{eventMult} · {eventHours < 24 ? `${eventHours}h` : `${eventHours / 24}j`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end items-center gap-3">
        {saved && <span className="text-sm text-emerald-400 font-medium">✓ Configuration sauvegardée</span>}
        <button onClick={handleSave} className={`px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all ${saved ? 'bg-emerald-600/80' : 'btn-primary'}`}>
          💾 Sauvegarder la configuration
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
          <p className="text-slate-400 text-sm mt-1">Tous les messages du bot sont configurables ici</p>
        </div>
        <button onClick={() => openModal('messageTemplate')} className="btn-primary px-4 py-2.5 rounded-xl text-sm font-medium text-white flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouveau template
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
        <h3 className="text-sm font-semibold text-white mb-4">Notifications récentes</h3>
        <div className="space-y-2">
          {notifications.slice(0, 5).map(n => (
            <div key={n.id} className={`flex items-start gap-3 p-3 rounded-lg ${!n.isRead ? 'bg-blue-500/5 border border-blue-500/10' : 'bg-white/[0.02]'}`}>
              <span className="text-sm mt-0.5">
                {n.type === 'deposit' ? '💰' : n.type === 'withdrawal' ? '📤' : n.type === 'reward' ? '🎁' : n.type === 'level' ? '⬆️' : n.type === 'alert' ? '🚨' : '📢'}
              </span>
              <div className="flex-1">
                <p className="text-sm text-white font-medium">{n.title}</p>
                <p className="text-xs text-slate-400">{n.message}</p>
                <p className="text-[10px] text-slate-500 mt-1">{new Date(n.createdAt).toLocaleString('fr-FR')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
