import React from 'react';
import { useAppStore } from '../../store/appStore';
import { LayoutDashboard, Wallet, ListTodo, Trophy, User } from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'tasks', label: 'Tâches', icon: ListTodo },
  { id: 'leaderboard', label: 'Rang', icon: Trophy },
  { id: 'profile', label: 'Profil', icon: User },
];

const subPageToNav: Record<string, string> = {
  deposit: 'wallet',
  withdraw: 'wallet',
  history: 'wallet',
  createTask: 'tasks',
  referral: 'profile',
  settings: 'profile',
};

export const MiniAppNav: React.FC = () => {
  const { miniAppPage, setMiniAppPage } = useAppStore();
  const activeNav = subPageToNav[miniAppPage] ?? miniAppPage;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0d0d1a]/95 backdrop-blur-xl border-t border-white/5">
      <div className="flex items-center justify-around max-w-lg mx-auto px-2 py-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setMiniAppPage(item.id)}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all ${isActive ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <div className={`p-1.5 rounded-lg transition-all ${isActive ? 'bg-blue-500/15' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
