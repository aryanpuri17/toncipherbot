import React, { useEffect } from 'react';
import { useAppStore } from './store/appStore';

// Admin Components
import { AdminSidebar } from './components/admin/AdminSidebar';
import { AdminOverview } from './components/admin/AdminOverview';
import { AdminUsers } from './components/admin/AdminUsers';
import { AdminTasks } from './components/admin/AdminTasks';
import { AdminCampaigns } from './components/admin/AdminCampaigns';
import { AdminDeposits, AdminWithdrawals, AdminWallets, AdminCrypto } from './components/admin/AdminFinance';
import { AdminAntiFraud, AdminLogs, AdminAlerts } from './components/admin/AdminSecurity';
import { AdminReferrals, AdminShop, AdminGamification, AdminChannels, AdminPromoCodes } from './components/admin/AdminEngagement';
import { AdminStatistics } from './components/admin/AdminStatistics';
import { AdminConfig, AdminNotifications } from './components/admin/AdminConfig';
import { ModalManager } from './components/admin/modals';

// Mini App Components
import { MiniAppNav } from './components/miniapp/MiniAppNav';
import { MiniAppDashboard } from './components/miniapp/MiniAppDashboard';
import { MiniAppWallet, MiniAppDeposit, MiniAppWithdraw, MiniAppHistory } from './components/miniapp/MiniAppWallet';
import { MiniAppTasks } from './components/miniapp/MiniAppTasks';
import { MiniAppProfile } from './components/miniapp/MiniAppProfile';
import { MiniAppCreateTask } from './components/miniapp/MiniAppCreateTask';
import { MiniAppMyTasks } from './components/miniapp/MiniAppMyTasks';
import { MiniAppReferral } from './components/miniapp/MiniAppReferral';
import { MiniAppNotifications } from './components/miniapp/MiniAppNotifications';
import { MiniAppShop } from './components/miniapp/MiniAppShop';
import { MiniAppGames } from './components/miniapp/MiniAppGames';

import { Bell, Menu, ChevronRight, Info, Wallet } from 'lucide-react';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { useDepositMonitor } from './hooks/useDepositMonitor';
import { hadSavedBalance } from './store/appStore';
import { processServerTransactions, syncServerTransactions, type ServerTx } from './lib/withdrawalSync';
import { getAdminKey } from './utils/adminFetch';

const MiniAppSettings: React.FC = () => {
  const { setMiniAppPage, platformConfig } = useAppStore();
  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center gap-3">
        <button onClick={() => setMiniAppPage('profile')} className="p-2 rounded-lg hover:bg-white/5 text-slate-400">←</button>
        <div>
          <h1 className="text-xl font-bold text-white">Settings</h1>
          <p className="text-xs text-slate-500">Manage your preferences</p>
        </div>
      </div>
      <div className="space-y-2">
        <button
          onClick={() => setMiniAppPage('notifications')}
          className="w-full glass-card-light p-4 flex items-center gap-3 hover:bg-white/[0.04] transition-colors rounded-2xl"
        >
          <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center flex-shrink-0">
            <Bell className="w-4 h-4 text-violet-400" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-white">Notifications</p>
            <p className="text-xs text-slate-400">Deposits, rewards and alerts</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        <div
          className="glass-card p-4 rounded-2xl"
          style={{ border: '1px solid rgba(0,152,234,0.15)', background: 'rgba(0,152,234,0.04)' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(0,152,234,0.15)' }}>
              <Info className="w-4 h-4" style={{ color: '#0098EA' }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">About</p>
              <p className="text-xs text-slate-400">TonCipher v1.0</p>
            </div>
          </div>
          <div className="space-y-1.5 pl-12">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Bot</span>
              <span className="text-xs font-semibold text-white">@{platformConfig.botUsername || 'TonCipher_bot'}</span>
            </div>
            {platformConfig.mainChannel && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Channel</span>
                <span className="text-xs font-semibold text-white">{platformConfig.mainChannel}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Network</span>
              <span className="text-xs font-semibold" style={{ color: '#0098EA' }}>TON Blockchain</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminPageContent: React.FC = () => {
  const { adminPage } = useAppStore();
  switch (adminPage) {
    case 'overview':      return <AdminOverview />;
    case 'statistics':    return <AdminStatistics />;
    case 'users':         return <AdminUsers />;
    case 'tasks':         return <AdminTasks />;
    case 'campaigns':     return <AdminCampaigns />;
    case 'channels':      return <AdminChannels />;
    case 'wallets':       return <AdminWallets />;
    case 'deposits':      return <AdminDeposits />;
    case 'withdrawals':   return <AdminWithdrawals />;
    case 'crypto':        return <AdminCrypto />;
    case 'referrals':     return <AdminReferrals />;
    case 'shop':          return <AdminShop />;
    case 'gamification':  return <AdminGamification />;
    case 'promoCodes':    return <AdminPromoCodes />;
    case 'antifraud':     return <AdminAntiFraud />;
    case 'logs':          return <AdminLogs />;
    case 'alerts':        return <AdminAlerts />;
    case 'notifications': return <AdminNotifications />;
    case 'config':        return <AdminConfig />;
    default:              return <AdminOverview />;
  }
};

const MiniAppPageContent: React.FC = () => {
  const { miniAppPage } = useAppStore();
  switch (miniAppPage) {
    case 'dashboard':     return <MiniAppDashboard />;
    case 'wallet':        return <MiniAppWallet />;
    case 'deposit':       return <MiniAppDeposit />;
    case 'withdraw':      return <MiniAppWithdraw />;
    case 'history':       return <MiniAppHistory />;
    case 'tasks':         return <MiniAppTasks />;
    case 'leaderboard':   return <MiniAppReferral />;
    case 'profile':       return <MiniAppProfile />;
    case 'createTask':    return <MiniAppCreateTask />;
    case 'myTasks':       return <MiniAppMyTasks />;
    case 'referral':      return <MiniAppReferral />;
    case 'notifications': return <MiniAppNotifications />;
    case 'shop':          return <MiniAppShop />;
    case 'games':         return <MiniAppGames />;
    case 'settings':      return <MiniAppSettings />;
    default:              return <MiniAppDashboard />;
  }
};

const AdminMobileNav: React.FC = () => {
  const { adminPage, setAdminPage } = useAppStore();
  const tabs = [
    { id: 'overview',     icon: '📊', label: 'Home' },
    { id: 'users',        icon: '👥', label: 'Users' },
    { id: 'withdrawals',  icon: '💰', label: 'Finance' },
    { id: 'antifraud',    icon: '🛡️', label: 'Security' },
    { id: 'config',       icon: '⚙️', label: 'Config' },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0d0d1a]/95 backdrop-blur-xl border-t border-white/5 flex lg:hidden">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => setAdminPage(t.id)}
          className={`flex-1 py-2 flex flex-col items-center gap-0.5 transition-colors ${adminPage === t.id ? 'text-blue-400' : 'text-slate-500'}`}
        >
          <span className="text-base leading-none">{t.icon}</span>
          <span className="text-[9px] font-medium">{t.label}</span>
        </button>
      ))}
    </nav>
  );
};

const AdminPanel: React.FC = () => {
  const { adminSidebarOpen, notifications, toggleAdminSidebar, setAdminPage } = useAppStore();
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="admin-bg min-h-screen flex overflow-x-hidden">
      {/* Dark overlay — mobile only, shown when sidebar is open */}
      {adminSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={toggleAdminSidebar}
        />
      )}

      <AdminSidebar />

      {/* Main content — full-width on mobile, shifted on desktop */}
      <div className={`flex-1 min-w-0 transition-all duration-300 ${adminSidebarOpen ? 'lg:ml-64' : 'lg:ml-16'}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-[#0a0a1a]/90 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={toggleAdminSidebar}
              className="p-2 rounded-lg hover:bg-white/5 text-slate-400"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-emerald-400">System online</span>
            </div>

            <div className="flex items-center gap-3 ml-auto">
              <button
                onClick={() => setAdminPage('alerts')}
                className="p-2 rounded-lg hover:bg-white/5 text-slate-400 relative"
                title="Alerts"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              <div className="flex items-center gap-2 pl-3 border-l border-white/10">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                  A
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-white">Admin</p>
                  <p className="text-[10px] text-slate-500">Super Admin</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-6 pb-20 lg:pb-6">
          <AdminPageContent />
        </main>
      </div>

      {/* Mobile bottom navigation — replaces sidebar on small screens */}
      <AdminMobileNav />
    </div>
  );
};

function rawToFriendly(raw: string): string {
  try {
    const [wStr, hex] = raw.split(':');
    if (!hex || hex.length !== 64) return raw;
    const workchain = parseInt(wStr, 10);
    const addrBytes = hex.match(/.{2}/g)!.map(b => parseInt(b, 16));
    const flags = 0x51; // non-bounceable mainnet
    const payload = [flags, workchain & 0xFF, ...addrBytes];
    let crc = 0;
    for (const b of payload) {
      crc ^= b << 8;
      for (let i = 0; i < 8; i++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
    }
    crc &= 0xFFFF;
    const full = new Uint8Array([...payload, (crc >> 8) & 0xFF, crc & 0xFF]);
    let bin = '';
    for (const b of full) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_');
  } catch { return raw; }
}

const MiniAppHeader: React.FC = () => {
  const [tonConnectUI] = useTonConnectUI();
  const tonWallet = useTonWallet();
  const { notifications, currentUser, setMiniAppPage } = useAppStore();
  const isConnected = !!tonWallet;
  const rawAddr = tonWallet?.account.address ?? '';
  const friendlyAddr = rawAddr ? rawToFriendly(rawAddr) : '';
  const shortAddr = friendlyAddr
    ? `${friendlyAddr.slice(0, 6)}…${friendlyAddr.slice(-4)}`
    : '';

  const unreadCount = notifications.filter(n => !n.isRead && (!n.userId || n.userId === currentUser.id)).length;

  return (
    <div className="sticky top-0 z-40 bg-[#0f0c29]/90 backdrop-blur-xl border-b border-white/5 px-4 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <img src="/images/logo.png" alt="TonCipher" className="w-7 h-7 rounded-lg object-cover" />
        <span className="text-sm font-bold text-white">TonCipher</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMiniAppPage('notifications')}
          className="relative p-2 rounded-lg hover:bg-white/5 text-slate-400 transition-colors"
        >
          <Bell className="w-4.5 h-4.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        {isConnected ? (
          <button
            onClick={() => tonConnectUI.openModal()}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {shortAddr}
          </button>
        ) : (
          <button
            onClick={() => tonConnectUI.openModal()}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-colors"
          >
            <Wallet className="w-3.5 h-3.5" />
            Connect
          </button>
        )}
      </div>
    </div>
  );
};

const MiniApp: React.FC = () => {
  useDepositMonitor(); // polls TonAPI every 30s to auto-confirm pending deposits
  const miniAppPage = useAppStore(s => s.miniAppPage);
  return (
    <div className="mini-app-bg min-h-screen max-w-lg mx-auto relative">
      <MiniAppHeader />
      <div key={miniAppPage} className="px-4 pt-4 pb-24 page-enter">
        <MiniAppPageContent />
      </div>
      <MiniAppNav />
    </div>
  );
};

// ── Splash screen — shown while the server wakes up / while fetching init data ──

const SplashScreen: React.FC<{ visible: boolean }> = ({ visible }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'linear-gradient(160deg, #0f0c29 0%, #1a1a2e 50%, #16213e 100%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    transition: 'opacity 0.55s ease, transform 0.55s ease',
    opacity: visible ? 1 : 0,
    transform: visible ? 'scale(1)' : 'scale(1.05)',
    pointerEvents: visible ? 'all' : 'none',
  }}>
    {/* Logo */}
    <div style={{
      width: 84, height: 84, borderRadius: 22, overflow: 'hidden', marginBottom: 22,
      boxShadow: '0 0 0 1px rgba(59,130,246,0.25), 0 0 48px rgba(59,130,246,0.3)',
      animation: 'float 3s ease-in-out infinite',
    }}>
      <img src="/images/logo.png" alt="TonCipher" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>

    {/* Name */}
    <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.3px', marginBottom: 5 }}>
      TonCipher
    </h1>
    <p style={{ fontSize: 12, color: '#475569', marginBottom: 44, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      Earn · Play · Win
    </p>

    {/* 3 bouncing dots */}
    <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%', background: '#3b82f6',
          animation: 'bounce 1.1s ease-in-out infinite',
          animationDelay: `${i * 0.18}s`,
        }} />
      ))}
    </div>
  </div>
);

const API = '';  // same origin — calls go to toncipherbot.onrender.com

export default function App() {
  const { currentView, setCurrentView, initFromTelegram, syncUserFromApi, resetDailyTasks, resetDailyRefTask, checkLoginStreak } = useAppStore();
  // Splash screen: hide once init completes (or after 4s max so it never blocks)
  const [splashVisible, setSplashVisible] = React.useState(true);
  const hideSplash = React.useCallback(() => setSplashVisible(false), []);

  useEffect(() => {
    // Midnight reset — resets daily tasks and withdrawal counter
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem('tc_daily_reset') !== today) {
      localStorage.setItem('tc_daily_reset', today);
      resetDailyTasks();
    }

    // 1am reset — resets daily referral task (Referral Challenge)
    const now = new Date();
    const today1am = `${today}-1am`;
    if (now.getHours() >= 1 && localStorage.getItem('tc_ref_daily_reset_1am') !== today1am) {
      localStorage.setItem('tc_ref_daily_reset_1am', today1am);
      resetDailyRefTask();
    }

    // Promo event + streak milestones live on the backend (admin config is
    // per-device otherwise). Fetch them before crediting the login streak so
    // freshly edited milestones apply, then check the streak either way.
    void (async () => {
      await useAppStore.getState().syncConfigFromBackend();
      checkLoginStreak();
    })();
    // Refresh config periodically so a promo event started by the admin
    // reaches users already in the app (not just on next open)
    const configPoll = setInterval(() => { void useAppStore.getState().syncConfigFromBackend(); }, 5 * 60_000);

    // SSE: receive real-time config updates pushed by admin
    const appEs = new EventSource('/api/tasks/stream');
    appEs.addEventListener('config_updated', () => {
      void useAppStore.getState().syncConfigFromBackend();
    });

    // Poll transaction statuses so an admin approval/rejection reaches the
    // user while the app is open — also re-check when the app regains focus.
    const pollWithdrawals = () => { void syncServerTransactions(useAppStore.getState().currentUser.telegramId); };
    const withdrawalPoll = setInterval(pollWithdrawals, 60_000);
    const onVisibleWd = () => { if (document.visibilityState === 'visible') pollWithdrawals(); };
    document.addEventListener('visibilitychange', onVisibleWd);

    // Sync hash-based routing with store on browser back/forward
    const handleHashChange = () => {
      setCurrentView(window.location.hash === '#admin' ? 'admin' : 'miniapp');
    };
    window.addEventListener('hashchange', handleHashChange);

    // Safety: hide splash after 4s regardless (if server is slow or offline)
    const splashTimeout = setTimeout(hideSplash, 4000);

    void (async () => {
      const isAdminRoute = window.location.hash === '#admin';
      if (!isAdminRoute) setCurrentView('miniapp');

      type TgUser = { id: number; first_name: string; last_name?: string; username?: string; photo_url?: string };
      type TgWebApp = { ready: () => void; expand: () => void; setHeaderColor: (c: string) => void; initData: string; initDataUnsafe?: { user?: TgUser; start_param?: string } };
      const tg = (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp;
      if (!tg) return;

      tg.ready();
      tg.expand();
      tg.setHeaderColor('#0f0c29');
      setCurrentView('miniapp');

      const tgUser = tg.initDataUnsafe?.user;
      if (!tgUser) return;

      initFromTelegram(tgUser);

      const initData = tg.initData ?? '';

      // Run backend calls concurrently: user init + transaction reconciliation
      const [userInitRes, serverTxRes] = await Promise.allSettled([
        fetch(`${API}/api/user/init`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegramId: tgUser.id,
            username:   tgUser.username ?? '',
            firstName:  tgUser.first_name,
            lastName:   tgUser.last_name ?? '',
            photoUrl:   tgUser.photo_url ?? '',
            initData,
          }),
        }),
        fetch(`${API}/api/user/transactions?telegram_id=${tgUser.id}`, {
          headers: { 'X-Init-Data': initData },
        }),
      ]);

      // Fresh device / cleared WebView storage: restore from the server-side
      // balance backup instead of starting from the local defaults.
      let adoptedServerBalance = false;
      if (userInitRes.status === 'fulfilled' && userInitRes.value.ok) {
        const apiData = await userInitRes.value.json() as {
          referralCount: number; referralBalance: number; flagged: boolean;
          banned?: boolean; withdrawalBlocked?: boolean;
          appBalance?: number | null; appTotalEarnings?: number | null;
          appTasksCompleted?: number | null; appCompletedTasks?: string[];
          claimedMilestoneIds?: string[];
        };
        if (typeof apiData.appBalance === 'number') {
          const localBalance = useAppStore.getState().currentUser.balanceMain;
          // Server is authoritative: adopt if server balance ≥ local (avoids rare 3s window loss)
          // OR if localStorage was empty (fresh device)
          if (!hadSavedBalance || apiData.appBalance >= localBalance) {
            useAppStore.getState().adoptServerBalance({
              balance:         apiData.appBalance,
              totalEarnings:   apiData.appTotalEarnings ?? 0,
              tasksCompleted:  apiData.appTasksCompleted ?? 0,
              referralBalance: apiData.referralBalance,
              completedTaskIds: Array.isArray(apiData.appCompletedTasks) ? apiData.appCompletedTasks : [],
            });
            adoptedServerBalance = true;
          } else {
            // Local balance is higher (earned in last few seconds before close) — keep it
            // but still merge completedTaskIds from server to prevent task re-farming
            const completedFromServer = Array.isArray(apiData.appCompletedTasks) ? apiData.appCompletedTasks : [];
            if (completedFromServer.length > 0) {
              useAppStore.setState(s => ({
                completedTaskIds: Array.from(new Set([...s.completedTaskIds, ...completedFromServer])),
              }));
            }
          }
        }
        syncUserFromApi(apiData);

        // Load server-side promo codes (if admin key is available)
        const adminKey = getAdminKey();
        if (adminKey) {
          fetch('/api/admin/promos', { headers: { 'X-Admin-Key': adminKey } })
            .then(r => r.ok ? r.json() : null)
            .then((d: { codes?: { id: string; code: string; reward: number; maxUses: number; currentUses: number; isActive: boolean; description: string; expiresAt?: string; createdAt: string }[] } | null) => {
              if (!d?.codes) return;
              useAppStore.setState(s => {
                const serverIds = new Set(d.codes!.map(c => c.id));
                const localOnly = s.promoCodes.filter(p => !serverIds.has(p.id));
                const merged = [...d.codes!.map(c => ({
                  id: c.id, code: c.code, reward: c.reward, maxUses: c.maxUses,
                  currentUses: c.currentUses, isActive: c.isActive,
                  currency: 'main' as const, description: c.description,
                  expiresAt: c.expiresAt, createdAt: c.createdAt,
                })), ...localOnly];
                return { promoCodes: merged };
              });
            })
            .catch(() => {});
        }
      }

      // Reconcile deposit/withdrawal history: approved → completed, rejected →
      // cancelled + balance restored, missing entries re-inserted. When the
      // server balance was just adopted it already reflects past outcomes,
      // so suppress side effects.
      if (serverTxRes.status === 'fulfilled' && serverTxRes.value.ok) {
        try {
          const list = await serverTxRes.value.json() as ServerTx[];
          processServerTransactions(list, adoptedServerBalance);
        } catch { /* malformed response — next poll will retry */ }
      }

      // Process incoming referral from link (?startapp=r_TELEGRAMID)
      const startParam = tg.initDataUnsafe?.start_param;
      if (startParam?.startsWith('r_')) {
        const referrerId = startParam.slice(2);
        if (referrerId && referrerId !== String(tgUser.id)) {
          try {
            await fetch(`${API}/api/user/referral`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                referrerId,
                refereeId:       tgUser.id,
                refereeUsername: tgUser.username ?? `user${tgUser.id}`,
                initData,
              }),
            });
          } catch {
            // Best-effort — referral will be retried next time if backend was down
          }
        }
      }
      // Init complete — hide the splash screen
      clearTimeout(splashTimeout);
      hideSplash();
    })();

    return () => {
      clearTimeout(splashTimeout);
      clearInterval(configPoll);
      clearInterval(withdrawalPoll);
      appEs.close();
      document.removeEventListener('visibilitychange', onVisibleWd);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [hideSplash]);

  return (
    <>
      <SplashScreen visible={splashVisible} />
      {currentView === 'admin' ? (
        <>
          <AdminPanel />
          <ModalManager />
        </>
      ) : (
        <MiniApp />
      )}
    </>
  );
}
