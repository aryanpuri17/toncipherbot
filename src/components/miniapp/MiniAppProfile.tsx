import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { Copy, CheckCircle, Share2, Settings, ChevronRight } from 'lucide-react';

export const MiniAppProfile: React.FC = () => {
  const { currentUser: u, setMiniAppPage, setCurrentView } = useAppStore();
  const [copied, setCopied] = useState(false);

  const referralLink = `https://t.me/toncipherbot?start=${u.referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Profile Header */}
      <div className="text-center pt-2">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white mx-auto mb-3">
          {u.firstName[0]}
        </div>
        <h1 className="text-lg font-bold text-white">{u.firstName} {u.lastName}</h1>
        <p className="text-sm text-slate-400">@{u.username}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{u.tasksCompleted}</p>
          <p className="text-xs text-slate-400">Tâches complétées</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-purple-400">{u.referralCount}</p>
          <p className="text-xs text-slate-400">Filleuls</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-lg font-bold text-white">{u.totalEarnings.toFixed(2)} TON</p>
          <p className="text-xs text-slate-400">Total gagné</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-lg font-bold text-emerald-400">{u.todayEarnings.toFixed(2)} TON</p>
          <p className="text-xs text-slate-400">Aujourd'hui</p>
        </div>
      </div>

      {/* Referral */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Share2 className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">Lien de parrainage</h3>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 px-3 py-2.5 bg-white/5 rounded-lg text-xs text-slate-300 font-mono truncate">
            {referralLink}
          </div>
          <button onClick={handleCopy} className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors flex-shrink-0">
            {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-slate-400">Code: <span className="text-blue-400 font-mono">{u.referralCode}</span></p>
      </div>

      {/* Menu */}
      <div className="space-y-2">
        <button onClick={() => { window.location.hash = '#admin'; setCurrentView('admin'); }} className="w-full glass-card-light p-3.5 flex items-center gap-3 hover:bg-white/[0.04] transition-colors">
          <span className="text-lg">🛡️</span>
          <span className="text-sm text-white flex-1 text-left">Admin Panel</span>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
        <button onClick={() => setMiniAppPage('settings')} className="w-full glass-card-light p-3.5 flex items-center gap-3 hover:bg-white/[0.04] transition-colors">
          <Settings className="w-5 h-5 text-slate-400" />
          <span className="text-sm text-white flex-1 text-left">Paramètres</span>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
      </div>
    </div>
  );
};
