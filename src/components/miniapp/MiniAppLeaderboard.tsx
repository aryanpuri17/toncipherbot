import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  const mountedRef = useRef(true);

  const fetchLeaderboard = useCallback(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then((data: ApiUser[]) => { if (mountedRef.current) { setLeaderboard(data); setLoading(false); } })
      .catch(() => { if (mountedRef.current) setLoading(false); });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 60_000);
    return () => { mountedRef.current = false; clearInterval(interval); };
  }, [fetchLeaderboard]);

  const medals = ['🥇', '🥈', '🥉'];
  const podiumOrder = [leaderboard[1], leaderboard[0], leaderboard[2]];
  const heights = ['h-20', 'h-28', 'h-16'];

  const currentRank = leaderboard.findIndex(u => u.telegramId === currentUser.telegramId) + 1;

  // Determine if the current user is in the leaderboard (with real stats synced from API)
  const currentInList = leaderboard.some(u => u.telegramId === currentUser.telegramId);

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Classement</h1>
            <p className="text-xs text-slate-400">👥 Filleuls invités</p>
          </div>
        </div>

        {currentRank > 0 ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(0,152,234,0.12)', border: '1px solid rgba(0,152,234,0.25)' }}>
            <span className="text-xs font-bold" style={{ color: '#0098EA' }}># {currentRank}</span>
            <span className="text-[10px] text-slate-400">votre rang</span>
          </div>
        ) : (
          <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] text-slate-500">Non classé</span>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="glass-card p-10 flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'rgba(0,152,234,0.3)', borderTopColor: '#0098EA' }} />
          <p className="text-sm text-slate-400">Chargement du classement…</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && leaderboard.length === 0 && (
        <div className="glass-card p-10 text-center space-y-3">
          <Trophy className="w-10 h-10 text-amber-400/40 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">Soyez le premier !</p>
          <p className="text-xs text-slate-500 max-w-[220px] mx-auto leading-relaxed">
            Invitez des amis via votre lien de parrainage pour apparaître dans le classement.
          </p>
        </div>
      )}

      {/* Podium */}
      {!loading && leaderboard.length >= 1 && (
        <div className="podium-container flex items-end justify-center gap-2 py-4 px-2">
          {podiumOrder.map((user, i) => {
            if (!user) return <div key={i} className="w-24" />;
            const rank   = i === 0 ? 2 : i === 1 ? 1 : 3;
            const isMe   = user.telegramId === currentUser.telegramId;

            const podiumColors: Record<number, { from: string; to: string; glow: string; text: string }> = {
              1: { from: '#78350f', to: '#92400e', glow: 'rgba(245,158,11,0.3)', text: '#fbbf24' },
              2: { from: '#1e293b', to: '#334155', glow: 'rgba(148,163,184,0.2)', text: '#94a3b8' },
              3: { from: '#431407', to: '#7c2d12', glow: 'rgba(194,120,80,0.2)',  text: '#fb923c' },
            };
            const col = podiumColors[rank];

            return (
              <div key={user.telegramId} className="flex flex-col items-center">
                <div className="relative mb-2">
                  <div
                    className="rounded-2xl flex items-center justify-center text-sm font-bold text-white"
                    style={{
                      width: 52, height: 52,
                      background: 'linear-gradient(135deg, #0098EA, #0B5EA8)',
                      boxShadow: isMe
                        ? `0 0 0 2px #0098EA, 0 4px 16px ${col.glow}`
                        : `0 4px 12px ${col.glow}`,
                    }}
                  >
                    {user.firstName?.charAt(0) ?? '?'}
                  </div>
                  <span className="absolute -bottom-1 -right-1 text-base leading-none">
                    {medals[rank - 1]}
                  </span>
                </div>
                <p className="text-xs font-semibold text-white mb-0.5 max-w-[76px] truncate text-center">
                  @{user.username || user.firstName}
                </p>
                <p className="text-[10px] mb-2" style={{ color: col.text }}>
                  {user.referralCount} filleul{user.referralCount !== 1 ? 's' : ''}
                </p>
                <div
                  className={`w-20 ${heights[i]} rounded-t-xl`}
                  style={{
                    background: `linear-gradient(to top, ${col.from}, ${col.to})`,
                    boxShadow: `0 -4px 16px ${col.glow}`,
                  }}
                />
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
            const isTop3 = i < 3;

            const rankBg: Record<number, string> = {
              0: 'bg-amber-500/20 text-amber-400',
              1: 'bg-slate-400/20 text-slate-300',
              2: 'bg-orange-700/20 text-orange-400',
            };

            return (
              <div
                key={user.telegramId}
                className="glass-card-light p-3.5 flex items-center gap-3 transition-all"
                style={isMe ? {
                  border: '1px solid rgba(0,152,234,0.3)',
                  background: 'rgba(0,152,234,0.05)',
                } : {}}
              >
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${isTop3 ? rankBg[i] : 'bg-white/5 text-slate-500'}`}>
                  {i < 3 ? medals[i] : i + 1}
                </span>
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #0098EA, #0B5EA8)' }}
                >
                  {user.firstName?.charAt(0) ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    @{user.username || user.firstName}
                    {isMe && <span className="text-[10px] ml-1.5 font-bold" style={{ color: '#0098EA' }}>(vous)</span>}
                  </p>
                  <p className="text-xs text-slate-500">
                    {user.referralCount} filleul{user.referralCount !== 1 ? 's' : ''} invité{user.referralCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <Users className="w-3 h-3 text-purple-400" />
                  <span className="text-sm font-bold text-purple-400">{user.referralCount}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Current user pin (if not in top list) */}
      {!loading && !currentInList && currentUser.telegramId !== 0 && (
        <div className="p-3.5 flex items-center gap-3 rounded-2xl"
          style={{ border: '1px dashed rgba(0,152,234,0.3)', background: 'rgba(0,152,234,0.04)' }}>
          <span className="w-8 h-8 rounded-xl bg-white/5 text-slate-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
            —
          </span>
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #0098EA, #0B5EA8)' }}
          >
            {currentUser.firstName?.charAt(0) ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">
              @{currentUser.username}
              <span className="text-[10px] ml-1.5 font-bold" style={{ color: '#0098EA' }}>(vous)</span>
            </p>
            <p className="text-xs text-slate-500">
              Invitez des amis pour apparaître dans le classement
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <Users className="w-3 h-3 text-purple-400" />
            <span className="text-sm font-bold text-purple-400">{currentUser.referralCount}</span>
          </div>
        </div>
      )}
    </div>
  );
};
