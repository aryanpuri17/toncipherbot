import React from 'react';
import { useAppStore } from '../../store/appStore';
import { Users, Settings, ChevronRight, Store, Shield } from 'lucide-react';

export const MiniAppProfile: React.FC = () => {
  const { currentUser: u, setMiniAppPage, setCurrentView, adminUsers } = useAppStore();

  const isAdmin = u.telegramId === 0 ||
    adminUsers.some(a => a.isActive && a.telegramId !== 0 && a.telegramId === u.telegramId);

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Profile Header */}
      <div className="text-center pt-2">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white mx-auto mb-3">
          {u.firstName?.charAt(0) ?? '?'}
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

      {/* Menu */}
      <div className="space-y-2">
        <button onClick={() => setMiniAppPage('referral')} className="w-full glass-card-light p-3.5 flex items-center gap-3 hover:bg-white/[0.04] transition-colors">
          <Users className="w-5 h-5 text-purple-400" />
          <span className="text-sm text-white flex-1 text-left">Parrainage & Primes</span>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
        <button onClick={() => setMiniAppPage('shop')} className="w-full glass-card-light p-3.5 flex items-center gap-3 hover:bg-white/[0.04] transition-colors">
          <Store className="w-5 h-5 text-amber-400" />
          <span className="text-sm text-white flex-1 text-left">Boutique</span>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
        <button onClick={() => setMiniAppPage('settings')} className="w-full glass-card-light p-3.5 flex items-center gap-3 hover:bg-white/[0.04] transition-colors">
          <Settings className="w-5 h-5 text-slate-400" />
          <span className="text-sm text-white flex-1 text-left">Paramètres</span>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        {isAdmin && (
          <button
            onClick={() => { window.location.hash = '#admin'; setCurrentView('admin'); }}
            className="w-full glass-card-light p-3.5 flex items-center gap-3 hover:bg-white/[0.04] transition-colors border border-blue-500/20"
          >
            <Shield className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-white flex-1 text-left">Panel Admin</span>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
        )}
      </div>
    </div>
  );
};
