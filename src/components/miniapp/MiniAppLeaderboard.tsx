import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { Trophy, Users } from 'lucide-react';

type ApiUser = {
  telegramId:    number;
  username:      string;
  firstName:     string;
  referralCount: number;
};

export const MiniAppLeaderboard: React.FC = () => {
  const { currentUser } = useAppStore();
  const [leaderboard, setLeaderboard] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then((data: ApiUser[]) => { setLeaderboard(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const medals = ['🥇', '🥈', '🥉'];
  const podiumOrder = [leaderboard[1], leaderboard[0], leaderboard[2]];
  const heights = ['h-20', 'h-28', 'h-16'];

  const currentRank = leaderboard.findIndex(u => u.telegramId === currentUser.telegramId) + 1;

  // Determine if the current user is in the leaderboard (with real stats synced from API)
  const currentInList = leaderboard.some(u => u.telegramId === currentUser.telegramId);

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Trophy className="w-6 h-6 text-amber-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Classement</h1>
          <p className="text-sm text-slate-400">
            {currentRank > 0 ? `Votre rang : #${currentRank}` : 'Invitez des amis pour apparaître ici'}
          </p>
        </div>
      </div>

      {/* Tab label */}
      <div className="flex gap-2">
        <div className="flex-1 py-2 rounded-xl text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30 text-center">
          👥 Filleuls invités
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="glass-card p-8 text-center">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Chargement…</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && leaderboard.length === 0 && (
        <div className="glass-card p-8 text-center space-y-3">
          <Users className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-medium text-slate-300">Soyez le premier !</p>
          <p className="text-xs text-slate-500">Invitez des amis via votre lien de parrainage pour apparaître dans le classement.</p>
        </div>
      )}

      {/* Podium */}
      {!loading && leaderboard.length >= 1 && (
        <div className="flex items-end justify-center gap-3 py-4">
          {podiumOrder.map((user, i) => {
            if (!user) return <div key={i} className="w-20" />;
            const rank = i === 0 ? 2 : i === 1 ? 1 : 3;
            const isMe = user.telegramId === currentUser.telegramId;
            return (
              <div key={user.telegramId} className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white mb-2 relative ${isMe ? 'ring-2 ring-blue-400' : ''}`}>
                  {user.firstName?.charAt(0) ?? '?'}
                  <span className="absolute -bottom-1 -right-1 text-sm">{medals[rank - 1]}</span>
                </div>
                <p className="text-xs font-semibold text-white mb-0.5 max-w-[72px] truncate text-center">
                  @{user.username || user.firstName}
                </p>
                <p className="text-[10px] text-slate-400 mb-2">{user.referralCount} filleul{user.referralCount !== 1 ? 's' : ''}</p>
                <div className={`w-20 ${heights[i]} rounded-t-xl bg-gradient-to-t ${rank === 1 ? 'from-amber-500/20 to-amber-500/40' : rank === 2 ? 'from-slate-400/20 to-slate-400/30' : 'from-orange-800/20 to-orange-800/30'}`} />
              </div>
            );
          })}
        </div>
      )}

      {/* Full list */}
      {!loading && leaderboard.length > 0 && (
        <div className="space-y-2">
          {leaderboard.map((user, i) => {
            const isMe = user.telegramId === currentUser.telegramId;
            return (
              <div key={user.telegramId} className={`glass-card-light p-3.5 flex items-center gap-3 ${isMe ? 'border border-blue-500/30 bg-blue-500/5' : ''}`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-amber-500/20 text-amber-400' : i === 1 ? 'bg-slate-300/20 text-slate-300' : i === 2 ? 'bg-orange-700/20 text-orange-400' : 'bg-white/5 text-slate-400'}`}>
                  {i < 3 ? medals[i] : i + 1}
                </span>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {user.firstName?.charAt(0) ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    @{user.username || user.firstName}
                    {isMe && <span className="text-blue-400 text-[10px] ml-1">(vous)</span>}
                  </p>
                  <p className="text-xs text-slate-500">{user.referralCount} filleul{user.referralCount !== 1 ? 's' : ''} invité{user.referralCount !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-sm font-semibold text-purple-400">{user.referralCount}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Current user pin (if not in top list) */}
      {!loading && !currentInList && currentUser.telegramId !== 0 && (
        <div className="glass-card border border-blue-500/30 bg-blue-500/5 p-3.5 flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
            —
          </span>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {currentUser.firstName?.charAt(0) ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">
              @{currentUser.username} <span className="text-blue-400 text-[10px]">(vous)</span>
            </p>
            <p className="text-xs text-slate-500">{currentUser.referralCount} filleul{currentUser.referralCount !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-sm font-semibold text-purple-400">{currentUser.referralCount}</span>
          </div>
        </div>
      )}
    </div>
  );
};
