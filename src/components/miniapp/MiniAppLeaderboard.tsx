import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { Trophy } from 'lucide-react';

type Tab = 'global' | 'monthly' | 'daily';

const tabs: { id: Tab; label: string }[] = [
  { id: 'global',  label: '🏆 Global' },
  { id: 'monthly', label: '📅 Ce mois' },
  { id: 'daily',   label: '🔥 Aujourd\'hui' },
];

export const MiniAppLeaderboard: React.FC = () => {
  const { users, currentUser } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('global');

  const sorted = [...users].sort((a, b) => {
    if (activeTab === 'daily')   return b.todayEarnings - a.todayEarnings;
    if (activeTab === 'monthly') return b.totalEarnings - a.totalEarnings;
    return b.tasksCompleted - a.tasksCompleted;
  });

  const currentRank = sorted.findIndex(u => u.id === currentUser.id) + 1;
  const medals      = ['🥇', '🥈', '🥉'];
  const podium      = [sorted[1], sorted[0], sorted[2]];
  const heights     = ['h-20', 'h-28', 'h-16'];

  const statLabel = activeTab === 'daily'
    ? (v: number) => `${v.toFixed(3)} TON`
    : activeTab === 'monthly'
    ? (v: number) => `${v.toFixed(2)} TON`
    : (v: number) => `${v} tâches`;

  const statValue = (u: typeof users[0]) =>
    activeTab === 'daily' ? u.todayEarnings
    : activeTab === 'monthly' ? u.totalEarnings
    : u.tasksCompleted;

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Trophy className="w-6 h-6 text-amber-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Classement</h1>
          <p className="text-sm text-slate-400">
            {currentRank > 0 ? `Votre rang: #${currentRank}` : 'Complétez des tâches pour apparaître'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === tab.id ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-slate-400 border border-transparent'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Podium */}
      {sorted.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Trophy className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Soyez le premier à compléter des tâches!</p>
        </div>
      ) : (
        <div className="flex items-end justify-center gap-3 py-4">
          {podium.map((user, i) => {
            if (!user) return <div key={i} className="w-20" />;
            const rank = i === 0 ? 2 : i === 1 ? 1 : 3;
            return (
              <div key={user.id} className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white mb-2 relative ${user.id === currentUser.id ? 'ring-2 ring-blue-400' : ''}`}>
                  {user.firstName?.charAt(0) ?? '?'}
                  <span className="absolute -bottom-1 -right-1 text-sm">{medals[rank - 1]}</span>
                </div>
                <p className="text-xs font-semibold text-white mb-0.5 max-w-[72px] truncate text-center">@{user.username}</p>
                <p className="text-[10px] text-slate-400 mb-2">{statLabel(statValue(user))}</p>
                <div className={`w-20 ${heights[i]} rounded-t-xl bg-gradient-to-t ${rank === 1 ? 'from-amber-500/20 to-amber-500/40' : rank === 2 ? 'from-slate-400/20 to-slate-400/30' : 'from-orange-800/20 to-orange-800/30'}`} />
              </div>
            );
          })}
        </div>
      )}

      {/* Full list */}
      <div className="space-y-2">
        {sorted.map((user, i) => {
          const isMe = user.id === currentUser.id;
          return (
            <div key={user.id} className={`glass-card-light p-3.5 flex items-center gap-3 ${isMe ? 'border border-blue-500/30 bg-blue-500/5' : ''}`}>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-amber-500/20 text-amber-400' : i === 1 ? 'bg-slate-300/20 text-slate-300' : i === 2 ? 'bg-orange-700/20 text-orange-400' : 'bg-white/5 text-slate-400'}`}>
                {i < 3 ? medals[i] : i + 1}
              </span>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {user.firstName?.charAt(0) ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  @{user.username} {isMe && <span className="text-blue-400 text-[10px]">(vous)</span>}
                </p>
                <p className="text-xs text-slate-500">{user.totalEarnings.toFixed(2)} TON gagnés au total</p>
              </div>
              <p className="text-sm font-semibold text-emerald-400 flex-shrink-0">{statLabel(statValue(user))}</p>
            </div>
          );
        })}
      </div>

      {/* User's rank pin (if off-screen) */}
      {currentRank > 5 && (
        <div className="glass-card border border-blue-500/30 bg-blue-500/5 p-3.5 flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
            #{currentRank}
          </span>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {currentUser.firstName?.charAt(0) ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">@{currentUser.username} <span className="text-blue-400 text-[10px]">(vous)</span></p>
            <p className="text-xs text-slate-500">Votre position actuelle</p>
          </div>
          <p className="text-sm font-semibold text-blue-400 flex-shrink-0">{statLabel(statValue(currentUser))}</p>
        </div>
      )}
    </div>
  );
};
