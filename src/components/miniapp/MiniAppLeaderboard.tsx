import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { Trophy, Flame, Target, Crown } from 'lucide-react';

export const MiniAppLeaderboard: React.FC = () => {
  const { users, currentUser } = useAppStore();
  const [tab, setTab] = useState<'xp' | 'referrals' | 'tasks'>('xp');

  const sorted = [...users].sort((a, b) => {
    if (tab === 'xp') return b.xp - a.xp;
    if (tab === 'referrals') return b.referralCount - a.referralCount;
    return b.tasksCompleted - a.tasksCompleted;
  });

  const currentRank = sorted.findIndex(u => u.id === currentUser.id) + 1;

  const tabs = [
    { id: 'xp' as const, label: 'XP', icon: <Flame className="w-3.5 h-3.5" /> },
    { id: 'referrals' as const, label: 'Filleuls', icon: <Crown className="w-3.5 h-3.5" /> },
    { id: 'tasks' as const, label: 'Tâches', icon: <Target className="w-3.5 h-3.5" /> },
  ];

  const getValue = (user: typeof users[0]) => {
    if (tab === 'xp') return `${user.xp.toLocaleString()} XP`;
    if (tab === 'referrals') return `${user.referralCount} filleuls`;
    return `${user.tasksCompleted} tâches`;
  };

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center gap-3">
        <Trophy className="w-6 h-6 text-amber-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Classement</h1>
          <p className="text-sm text-slate-400">Votre rang: #{currentRank}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white/5 p-1 rounded-xl">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all ${tab === t.id ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-slate-400'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Top 3 */}
      <div className="flex items-end justify-center gap-3 py-4">
        {[sorted[1], sorted[0], sorted[2]].map((user, i) => {
          if (!user) return null;
          const rank = i === 0 ? 2 : i === 1 ? 1 : 3;
          const heights = ['h-20', 'h-28', 'h-16'];
          const medals = ['🥈', '🥇', '🥉'];
          return (
            <div key={user.id} className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white mb-2 relative">
                {user.firstName[0]}
                <span className="absolute -bottom-1 -right-1 text-sm">{medals[i]}</span>
              </div>
              <p className="text-xs font-semibold text-white mb-1">@{user.username}</p>
              <p className="text-[10px] text-slate-400 mb-2">{getValue(user)}</p>
              <div className={`w-20 ${heights[i]} rounded-t-xl bg-gradient-to-t ${rank === 1 ? 'from-amber-500/20 to-amber-500/40' : rank === 2 ? 'from-slate-400/20 to-slate-400/30' : 'from-orange-800/20 to-orange-800/30'}`} />
            </div>
          );
        })}
      </div>

      {/* Full List */}
      <div className="space-y-2">
        {sorted.map((user, i) => {
          const isCurrentUser = user.id === currentUser.id;
          return (
            <div key={user.id} className={`glass-card-light p-3.5 flex items-center gap-3 ${isCurrentUser ? 'border border-blue-500/30 bg-blue-500/5' : ''}`}>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-500/20 text-amber-400' : i === 1 ? 'bg-slate-300/20 text-slate-300' : i === 2 ? 'bg-orange-700/20 text-orange-400' : 'bg-white/5 text-slate-400'}`}>
                {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
              </span>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                {user.firstName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  @{user.username} {isCurrentUser && <span className="text-blue-400 text-[10px]">(vous)</span>}
                </p>
                <p className="text-xs text-slate-500">Nv.{user.level}</p>
              </div>
              <p className="text-sm font-semibold text-amber-400">{getValue(user)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
