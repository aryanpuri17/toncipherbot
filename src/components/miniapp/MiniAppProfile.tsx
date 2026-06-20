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
      <div className="flex items-center gap-4 pt-2 pb-1">
        <div className="relative flex-shrink-0">
          {profile.avatarUrl && !imgError ? (
            <img
              src={profile.avatarUrl}
              alt={profile.firstName}
              onError={() => setImgError(true)}
              className="w-16 h-16 rounded-2xl object-cover"
              style={{ boxShadow: '0 0 0 2px rgba(139,92,246,0.40)' }}
            />
          ) : (
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
                boxShadow: '0 0 0 2px rgba(139,92,246,0.40), 0 4px 16px rgba(139,92,246,0.22)',
              }}
            >
              {profile.firstName?.charAt(0) ?? '?'}
            </div>
          )}
          {u.loginStreak >= 3 && (
            <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-[10px] font-bold text-white border-2 border-[#0B1140]">
              {u.loginStreak}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-white leading-tight truncate">
            {profile.firstName}{profile.lastName ? ` ${profile.lastName}` : ''}
          </h1>
          <p className="text-sm text-slate-400">@{profile.username}</p>
          <p className="text-[10px] text-slate-600 font-mono mt-0.5">ID: {uId}</p>
        </div>

        {u.loginStreak >= 1 && (
          <div className="flex flex-col items-center flex-shrink-0">
            <span className="text-2xl">🔥</span>
            <span className="text-[10px] text-orange-400 font-bold">{u.loginStreak}j</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            value: u.tasksCompleted,
            label: 'Tasks',
            format: (v: number) => v.toString(),
            color: 'text-violet-300',
            accent: 'rgba(139,92,246,0.06)',
            border: 'rgba(139,92,246,0.16)',
            bar: '#8B5CF6',
            icon: '✅',
          },
          {
            value: u.referralCount,
            label: 'Referrals',
            format: (v: number) => v.toString(),
            color: 'text-violet-300',
            accent: 'rgba(139,92,246,0.06)',
            border: 'rgba(139,92,246,0.16)',
            bar: '#8B5CF6',
            icon: '👥',
          },
          {
            value: u.totalEarnings,
            label: 'Total earned',
            format: (v: number) => `${v.toFixed(2)} GRAM`,
            color: 'text-white',
            accent: 'rgba(0,152,234,0.08)',
            border: 'rgba(0,152,234,0.15)',
            bar: '#0098EA',
            icon: '💎',
          },
          {
            value: u.todayEarnings,
            label: "Today",
            format: (v: number) => `${v.toFixed(2)} GRAM`,
            color: 'text-emerald-400',
            accent: 'rgba(16,185,129,0.08)',
            border: 'rgba(16,185,129,0.15)',
            bar: '#10b981',
            icon: '📈',
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="glass-card p-4 relative overflow-hidden"
            style={{ background: stat.accent, border: `1px solid ${stat.border}` }}
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-base">{stat.icon}</span>
            </div>
            <p className={`text-xl font-bold leading-none ${stat.color}`}>
              {stat.format(stat.value)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">{stat.label}</p>
            <div
              className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b"
              style={{ background: `linear-gradient(90deg, ${stat.bar}, transparent)` }}
            />
          </div>
        ))}
      </div>

      {/* Menu */}
      <div className="space-y-2">
        <button
          onClick={() => setMiniAppPage('shop')}
          className="profile-menu-item w-full p-3.5 flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
            <Store className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-sm text-white flex-1 text-left">Shop</span>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        <button
          onClick={() => setMiniAppPage('settings')}
          className="profile-menu-item w-full p-3.5 flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-500/15 flex items-center justify-center flex-shrink-0">
            <Settings className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-sm text-white flex-1 text-left">Settings</span>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        <button
          onClick={() => {
            const tg = (window as unknown as { Telegram?: { WebApp?: { openTelegramLink?: (u: string) => void } } }).Telegram?.WebApp;
            if (tg?.openTelegramLink) {
              tg.openTelegramLink('https://t.me/puriaryan');
            } else {
              window.open('https://t.me/puriaryan', '_blank');
            }
          }}
          className="profile-menu-item w-full p-3.5 flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center flex-shrink-0">
            <span className="text-base">🎧</span>
          </div>
          <span className="text-sm text-white flex-1 text-left">Support</span>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        {isAdmin && (
          <button
            onClick={() => { window.location.hash = '#admin'; setCurrentView('admin'); }}
            className="profile-menu-item w-full p-3.5 flex items-center gap-3"
            style={{ borderColor: 'rgba(139,92,246,0.28)' }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(139,92,246,0.14)', boxShadow: '0 3px 10px rgba(139,92,246,0.20)' }}>
              <Shield className="w-4 h-4" style={{ color: '#C4B5FD' }} />
            </div>
            <span className="text-sm text-white flex-1 text-left">Panel Admin</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mr-1"
              style={{ background: 'rgba(139,92,246,0.14)', color: '#C4B5FD', border: '1px solid rgba(139,92,246,0.28)' }}>
              ADMIN
            </span>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
        )}
      </div>
    </div>
  );
};
