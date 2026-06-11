import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { Settings, ChevronRight, Store, Shield } from 'lucide-react';

type TgRawUser = { id?: number; username?: string; first_name?: string; last_name?: string; photo_url?: string };

function readTgUser(): TgRawUser | null {
  try {
    const tg = (window as { Telegram?: { WebApp?: { initDataUnsafe?: { user?: TgRawUser } } } }).Telegram?.WebApp;
    return tg?.initDataUnsafe?.user ?? null;
  } catch { return null; }
}

export const MiniAppProfile: React.FC = () => {
  const { currentUser: u, setMiniAppPage, setCurrentView, adminUsers, initFromTelegram } = useAppStore();

  // Safety net: if store still has placeholder data but Telegram data is available, initialize now.
  // This handles cases where App.tsx's useEffect ran before window.Telegram was ready.
  useEffect(() => {
    if (u.telegramId !== 0) return;
    const tgUser = readTgUser();
    if (tgUser?.id) {
      initFromTelegram({
        id: tgUser.id,
        first_name: tgUser.first_name ?? '',
        last_name: tgUser.last_name,
        username: tgUser.username,
        photo_url: tgUser.photo_url,
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Read Telegram WebApp directly as the most reliable source.
  // This covers the case where the store still has mock defaults (telegramId: 0 / username: 'vous').
  const tgRaw = readTgUser();
  const isMockData = u.telegramId === 0;

  const profile = {
    telegramId: u.telegramId !== 0 ? u.telegramId : (tgRaw?.id ?? 0),
    firstName:  !isMockData ? u.firstName  : (tgRaw?.first_name ?? u.firstName),
    lastName:   !isMockData ? u.lastName   : (tgRaw?.last_name  ?? u.lastName ?? ''),
    username:   !isMockData ? u.username   : (tgRaw?.username   ?? u.username),
    avatarUrl:  u.avatarUrl ?? tgRaw?.photo_url,
  };

  const uId   = profile.telegramId;
  const uName = profile.username?.toLowerCase() ?? '';

  const isAdmin = uId === 0 ||
    adminUsers.some(a =>
      a.isActive && (
        (a.telegramId !== 0 && a.telegramId === uId) ||
        (a.username !== '' && a.username.toLowerCase() === uName)
      )
    );

  const [imgError, setImgError] = useState(false);

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Profile Header */}
      <div className="text-center pt-2">
        {profile.avatarUrl && !imgError ? (
          <img
            src={profile.avatarUrl}
            alt={profile.firstName}
            onError={() => setImgError(true)}
            className="w-20 h-20 rounded-full object-cover mx-auto mb-3"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white mx-auto mb-3">
            {profile.firstName?.charAt(0) ?? '?'}
          </div>
        )}
        <h1 className="text-lg font-bold text-white">{profile.firstName} {profile.lastName}</h1>
        <p className="text-sm text-slate-400">@{profile.username}</p>
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

      {/* Debug chip — shows real Telegram ID and username for admin verification */}
      <div className="glass-card p-3 text-center opacity-60">
        <p className="text-[10px] text-slate-500 font-mono">
          ID: {uId} · @{profile.username}
        </p>
      </div>
    </div>
  );
};
