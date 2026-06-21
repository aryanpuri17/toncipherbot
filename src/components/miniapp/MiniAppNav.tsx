import React, { useRef } from 'react';
import { useAppStore } from '../../store/appStore';
import { LayoutDashboard, Wallet, ListTodo, Users, User } from 'lucide-react';
import { haptic } from '../../lib/haptics';

const navItems = [
  { id: 'dashboard', label: 'Home',     icon: LayoutDashboard },
  { id: 'tasks',     label: 'Tasks',    icon: ListTodo },
  { id: 'referral',  label: 'Friends',  icon: Users },
  { id: 'wallet',    label: 'Wallet',   icon: Wallet },
  { id: 'profile',   label: 'Profile',  icon: User },
];

const subPageToNav: Record<string, string> = {
  deposit:       'wallet',
  withdraw:      'wallet',
  history:       'wallet',
  createTask:    'tasks',
  myTasks:       'tasks',
  leaderboard:   'referral',
  shop:          'profile',
  notifications: 'profile',
  settings:      'profile',
};

export const MiniAppNav: React.FC = () => {
  const { miniAppPage, setMiniAppPage } = useAppStore();
  const activeNav = subPageToNav[miniAppPage] ?? miniAppPage;
  const activeIdx = navItems.findIndex(n => n.id === activeNav);
  const prevNav = useRef(activeNav);

  function handleNav(id: string) {
    const nav = subPageToNav[id] ?? id;
    if (nav !== prevNav.current) {
      haptic.selection();
      prevNav.current = nav;
    }
    setMiniAppPage(id);
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 nav-bar">
      <div className="relative grid grid-cols-5 max-w-lg mx-auto px-2 py-1">

        {/* Sliding pill — TON color */}
        <span
          className="absolute top-1 bottom-1 rounded-xl pointer-events-none nav-pill"
          style={{
            width: 'calc((100% - 1rem) / 5)',
            transform: `translateX(calc(${activeIdx} * 100%))`,
            transition: 'transform 0.35s cubic-bezier(0.34, 1.45, 0.64, 1)',
          }}
        />

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`relative z-10 flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl tap-scale transition-all duration-200 ${
                isActive ? 'nav-item-active' : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              <div className={`p-1.5 rounded-lg transition-transform duration-200 ${
                isActive ? 'scale-110 -translate-y-px' : ''
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-medium transition-all duration-200 ${
                isActive ? 'opacity-100' : 'opacity-60'
              }`}>
                {item.label}
              </span>

              {isActive && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full nav-dot" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
