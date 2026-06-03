import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { Copy, CheckCircle, Share2, Shield, Zap, Award, Settings, ChevronRight, Store } from 'lucide-react';

export const MiniAppProfile: React.FC = () => {
  const { currentUser: u, setMiniAppPage, setCurrentView } = useAppStore();
  const [copied, setCopied] = useState(false);

  const referralLink = `https://t.me/toncipherbot?start=${u.referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const xpForNextLevel = (u.level + 1) * 400;
  const xpProgress = (u.xp % 400) / 400;

  const badgeEmojis: Record<string, string> = {
    early_adopter: '🌟',
    task_master: '🎯',
    referral_king: '👑',
    whale: '🐋',
    streak_champion: '🔥',
  };

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Profile Header */}
      <div className="text-center pt-2">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white mx-auto mb-3 relative">
          {u.firstName[0]}
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-white border-2 border-[#0f0c29]">
            {u.level}
          </div>
        </div>
        <h1 className="text-lg font-bold text-white">{u.firstName} {u.lastName}</h1>
        <p className="text-sm text-slate-400">@{u.username}</p>
      </div>

      {/* XP Progress */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-white">Niveau {u.level}</span>
          </div>
          <span className="text-xs text-slate-400">{u.xp} / {xpForNextLevel} XP</span>
        </div>
        <div className="h-3 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500" style={{ width: `${xpProgress * 100}%` }} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-white">${u.totalEarnings.toFixed(0)}</p>
          <p className="text-xs text-slate-400">Gains totaux</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">${u.todayEarnings.toFixed(2)}</p>
          <p className="text-xs text-slate-400">Gains du jour</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{u.tasksCompleted}</p>
          <p className="text-xs text-slate-400">Tâches</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-purple-400">{u.referralCount}</p>
          <p className="text-xs text-slate-400">Filleuls</p>
        </div>
      </div>

      {/* Streak */}
      <div className="glass-card p-4 flex items-center gap-3 bg-gradient-to-r from-orange-500/10 to-red-500/10">
        <span className="text-3xl">🔥</span>
        <div>
          <p className="text-sm font-semibold text-white">{u.streak} jours de streak!</p>
          <p className="text-xs text-slate-400">Continuez pour gagner des bonus</p>
        </div>
      </div>

      {/* Badges */}
      {u.badges.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-white">Badges ({u.badges.length})</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {u.badges.map(badge => (
              <div key={badge} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <span>{badgeEmojis[badge] || '🏆'}</span>
                <span className="text-xs font-medium text-purple-300">{badge.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
        <button onClick={() => setMiniAppPage('shop')} className="w-full glass-card-light p-3.5 flex items-center gap-3 hover:bg-white/[0.04] transition-colors">
          <Store className="w-5 h-5 text-amber-400" />
          <span className="text-sm text-white flex-1 text-left">Boutique</span>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
        <button onClick={() => setMiniAppPage('rewards')} className="w-full glass-card-light p-3.5 flex items-center gap-3 hover:bg-white/[0.04] transition-colors">
          <Award className="w-5 h-5 text-purple-400" />
          <span className="text-sm text-white flex-1 text-left">Récompenses</span>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
        <button onClick={() => { window.location.hash = '#admin'; setCurrentView('admin'); }} className="w-full glass-card-light p-3.5 flex items-center gap-3 hover:bg-white/[0.04] transition-colors">
          <Shield className="w-5 h-5 text-blue-400" />
          <span className="text-sm text-white flex-1 text-left">Admin Panel</span>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
        <button className="w-full glass-card-light p-3.5 flex items-center gap-3 hover:bg-white/[0.04] transition-colors">
          <Settings className="w-5 h-5 text-slate-400" />
          <span className="text-sm text-white flex-1 text-left">Paramètres</span>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
      </div>
    </div>
  );
};
