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
import { AdminReferrals, AdminShop, AdminGamification, AdminChannels } from './components/admin/AdminEngagement';
import { AdminStatistics } from './components/admin/AdminStatistics';
import { AdminConfig, AdminNotifications } from './components/admin/AdminConfig';
import { ModalManager } from './components/admin/modals';

// Mini App Components
import { MiniAppNav } from './components/miniapp/MiniAppNav';
import { MiniAppDashboard } from './components/miniapp/MiniAppDashboard';
import { MiniAppWallet, MiniAppDeposit, MiniAppWithdraw, MiniAppHistory } from './components/miniapp/MiniAppWallet';
import { MiniAppTasks } from './components/miniapp/MiniAppTasks';
import { MiniAppLeaderboard } from './components/miniapp/MiniAppLeaderboard';
import { MiniAppProfile } from './components/miniapp/MiniAppProfile';
import { MiniAppCreateTask } from './components/miniapp/MiniAppCreateTask';
import { MiniAppReferral } from './components/miniapp/MiniAppReferral';

import { Bell, Menu, Settings, ChevronRight, Globe, Info } from 'lucide-react';

const MiniAppSettings: React.FC = () => {
  const { setMiniAppPage } = useAppStore();
  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center gap-3">
        <button onClick={() => setMiniAppPage('profile')} className="p-2 rounded-lg hover:bg-white/5 text-slate-400">←</button>
        <h1 className="text-xl font-bold text-white">Paramètres</h1>
      </div>
      <div className="space-y-2">
        <div className="glass-card-light p-4 flex items-center gap-3">
          <Globe className="w-5 h-5 text-blue-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Langue</p>
            <p className="text-xs text-slate-400">Français</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </div>
        <div className="glass-card-light p-4 flex items-center gap-3">
          <Settings className="w-5 h-5 text-slate-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Notifications</p>
            <p className="text-xs text-slate-400">Activées</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <Info className="w-5 h-5 text-purple-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-white">À propos</p>
            <p className="text-xs text-slate-400">TonCipher v1.0</p>
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
    case 'dashboard':   return <MiniAppDashboard />;
    case 'wallet':      return <MiniAppWallet />;
    case 'deposit':     return <MiniAppDeposit />;
    case 'withdraw':    return <MiniAppWithdraw />;
    case 'history':     return <MiniAppHistory />;
    case 'tasks':       return <MiniAppTasks />;
    case 'leaderboard': return <MiniAppLeaderboard />;
    case 'profile':     return <MiniAppProfile />;
    case 'createTask':  return <MiniAppCreateTask />;
    case 'referral':    return <MiniAppReferral />;
    case 'settings':    return <MiniAppSettings />;
    default:            return <MiniAppDashboard />;
  }
};

const AdminPanel: React.FC = () => {
  const { adminSidebarOpen, notifications, toggleAdminSidebar } = useAppStore();
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
              <span className="text-xs font-medium text-emerald-400">Système en ligne</span>
            </div>

            <div className="flex items-center gap-3 ml-auto">
              <button className="p-2 rounded-lg hover:bg-white/5 text-slate-400 relative">
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

        <main className="p-4 lg:p-6">
          <AdminPageContent />
        </main>
      </div>
    </div>
  );
};

const MiniApp: React.FC = () => (
  <div className="mini-app-bg min-h-screen max-w-lg mx-auto relative">
    {/* Header */}
    <div className="sticky top-0 z-40 bg-[#0f0c29]/90 backdrop-blur-xl border-b border-white/5 px-4 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <img src="/images/logo.png" alt="TonCipher" className="w-7 h-7 rounded-lg object-cover" />
        <span className="text-sm font-bold text-white">TonCipher</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Connecté
      </div>
    </div>
    <div className="px-4 pt-4 pb-24">
      <MiniAppPageContent />
    </div>
    <MiniAppNav />
  </div>
);

export default function App() {
  const { currentView, setCurrentView, initFromTelegram } = useAppStore();

  useEffect(() => {
    const isAdminRoute = window.location.hash === '#admin';
    if (!isAdminRoute) {
      setCurrentView('miniapp');
    }

    type TgUser = { id: number; first_name: string; last_name?: string; username?: string; photo_url?: string };
    type TgWebApp = { ready: () => void; expand: () => void; setHeaderColor: (c: string) => void; initDataUnsafe?: { user?: TgUser } };
    const tg = (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      tg.setHeaderColor('#0f0c29');
      setCurrentView('miniapp');
      const tgUser = tg.initDataUnsafe?.user;
      if (tgUser) {
        initFromTelegram(tgUser);
      }
    }
  }, []);

  return currentView === 'admin' ? (
    <>
      <AdminPanel />
      <ModalManager />
    </>
  ) : (
    <MiniApp />
  );
}
