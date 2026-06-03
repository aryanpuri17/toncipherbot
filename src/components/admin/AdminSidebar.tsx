import React from 'react';
import { useAppStore } from '../../store/appStore';
import {
  LayoutDashboard, Users, ListTodo, Megaphone, Wallet, ArrowDownToLine,
  ArrowUpFromLine, Shield, Bell, Settings, BarChart3, Store, Gift,
  Hash, Globe, FileText, AlertTriangle, Zap, ChevronLeft, ChevronRight, Smartphone
} from 'lucide-react';

const menuSections = [
  {
    title: 'PRINCIPAL',
    items: [
      { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard },
      { id: 'statistics', label: 'Statistiques', icon: BarChart3 },
    ]
  },
  {
    title: 'GESTION',
    items: [
      { id: 'users', label: 'Utilisateurs', icon: Users },
      { id: 'tasks', label: 'Tâches', icon: ListTodo },
      { id: 'campaigns', label: 'Campagnes', icon: Megaphone },
      { id: 'channels', label: 'Canaux & Groupes', icon: Hash },
    ]
  },
  {
    title: 'FINANCE',
    items: [
      { id: 'wallets', label: 'Wallets', icon: Wallet },
      { id: 'deposits', label: 'Dépôts', icon: ArrowDownToLine },
      { id: 'withdrawals', label: 'Retraits', icon: ArrowUpFromLine },
      { id: 'crypto', label: 'Crypto & Réseaux', icon: Globe },
    ]
  },
  {
    title: 'ENGAGEMENT',
    items: [
      { id: 'referrals', label: 'Parrainage', icon: Gift },
      { id: 'shop', label: 'Boutique', icon: Store },
      { id: 'gamification', label: 'Gamification', icon: Zap },
    ]
  },
  {
    title: 'SÉCURITÉ',
    items: [
      { id: 'antifraud', label: 'Anti-Fraude', icon: Shield },
      { id: 'logs', label: 'Logs', icon: FileText },
      { id: 'alerts', label: 'Alertes', icon: AlertTriangle },
    ]
  },
  {
    title: 'SYSTÈME',
    items: [
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'config', label: 'Configuration', icon: Settings },
    ]
  },
];

export const AdminSidebar: React.FC = () => {
  const { adminPage, setAdminPage, adminSidebarOpen, toggleAdminSidebar, setCurrentView, notifications } = useAppStore();
  const unreadAlerts = notifications.filter(n => !n.isRead && n.type === 'alert').length;

  return (
    <aside className={`fixed left-0 top-0 h-full bg-[#0d1117] border-r border-white/5 z-50 transition-all duration-300 flex flex-col ${adminSidebarOpen ? 'w-64' : 'w-16'}`}>
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        {adminSidebarOpen && (
          <div className="flex items-center gap-2.5">
            <img src="/images/logo.png" alt="TonCipher" className="w-8 h-8 rounded-lg object-cover" />
            <div>
              <h1 className="text-sm font-bold text-white">TonCipher</h1>
              <p className="text-[10px] text-slate-500">Admin Panel</p>
            </div>
          </div>
        )}
        <button onClick={toggleAdminSidebar} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400">
          {adminSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-4">
        {menuSections.map(section => (
          <div key={section.title}>
            {adminSidebarOpen && (
              <p className="text-[10px] font-semibold text-slate-600 px-3 mb-1 tracking-wider">{section.title}</p>
            )}
            <div className="space-y-0.5">
              {section.items.map(item => {
                const Icon = item.icon;
                const isActive = adminPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setAdminPage(item.id)}
                    className={`sidebar-item w-full flex items-center gap-3 text-left ${isActive ? 'active text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}
                    title={!adminSidebarOpen ? item.label : undefined}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {adminSidebarOpen && (
                      <span className="text-sm truncate">{item.label}</span>
                    )}
                    {item.id === 'alerts' && unreadAlerts > 0 && adminSidebarOpen && (
                      <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadAlerts}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={() => setCurrentView('miniapp')}
          className={`w-full flex items-center gap-3 p-2.5 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 text-blue-400 hover:border-blue-500/40 transition-all ${!adminSidebarOpen ? 'justify-center' : ''}`}
        >
          <Smartphone className="w-4 h-4 flex-shrink-0" />
          {adminSidebarOpen && <span className="text-sm font-medium">Mini App</span>}
        </button>
      </div>
    </aside>
  );
};
