import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import {
  Copy, Check, Users, Gift, Lock, Share2,
  Trophy, ChevronRight,
} from 'lucide-react';

// ── Leaderboard sub-component ──────────────────────────────────────────────────

type LbUser = { telegramId: number; username: string; firstName: string; referralCount: number };

const Leaderboard: React.FC = () => {
  const { currentUser } = useAppStore();
  const [data, setData]       = useState<LbUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then((d: LbUser[]) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const medals      = ['🥇', '🥈', '🥉'];
  const podiumOrder = [data[1], data[0], data[2]];
  const heights     = ['h-20', 'h-28', 'h-16'];
  const currentRank = data.findIndex(u => u.telegramId === currentUser.telegramId) + 1;
  const currentInList = data.some(u => u.telegramId === currentUser.telegramId);

  if (loading) return (
    <div className="glass-card p-10 text-center">
      <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-3" />
      <p className="text-sm text-slate-400">Chargement…</p>
    </div>
  );

  if (data.length === 0) return (
    <div className="glass-card p-10 text-center space-y-3">
      <Trophy className="w-10 h-10 text-slate-600 mx-auto" />
      <p className="text-sm font-medium text-slate-300">Soyez le premier !</p>
      <p className="text-xs text-slate-500">Invitez des amis pour apparaître dans le classement.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-slate-400">
          {currentRank > 0 ? `Votre rang : #${currentRank}` : 'Invitez des amis pour apparaître ici'}
        </p>
      </div>

      {/* Podium */}
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

      {/* Full list */}
      <div className="space-y-2">
        {data.map((user, i) => {
          const isMe = user.telegramId === currentUser.telegramId;
          return (
            <div key={user.telegramId} className="glass-card-light p-3.5 flex items-center gap-3" style={isMe ? { border: '1px solid rgba(124,58,237,0.35)', background: 'rgba(124,58,237,0.09)' } : {}}>
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
                <p className="text-xs text-slate-500">{user.referralCount} filleul{user.referralCount !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Users className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-sm font-semibold text-purple-400">{user.referralCount}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Current user pin if not in list */}
      {!currentInList && currentUser.telegramId !== 0 && (
        <div className="glass-card border border-blue-500/30 bg-blue-500/5 p-3.5 flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0">—</span>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {currentUser.firstName?.charAt(0) ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">@{currentUser.username} <span className="text-blue-400 text-[10px]">(vous)</span></p>
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


// ── Main component ──────────────────────────────────────────────────────────────

export const MiniAppReferral: React.FC = () => {
  const {
    miniAppPage,
    currentUser,
    platformConfig,
    referralMilestones,
    claimedReferralMilestoneIds,
    claimReferralMilestone,
    lastSyncedReferralBalance,
  } = useAppStore();

  // Default to 'classement' if navigated here as the old leaderboard route
  const [tab, setTab] = useState<'invite' | 'classement'>(
    miniAppPage === 'leaderboard' ? 'classement' : 'invite'
  );
  const [copied, setCopied] = useState(false);
  const [toast,  setToast]  = useState(false);

  // Keep tab in sync if miniAppPage changes while component is already mounted
  useEffect(() => {
    if (miniAppPage === 'leaderboard') setTab('classement');
    else if (miniAppPage === 'referral') setTab('invite');
  }, [miniAppPage]);

  const referralLink = `https://t.me/${platformConfig.botUsername}/${platformConfig.appShortName}?startapp=r_${currentUser.telegramId !== 0 ? currentUser.telegramId : currentUser.referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink).catch(() => {});
    setCopied(true);
    setToast(true);
    setTimeout(() => { setCopied(false); setToast(false); }, 3000);
  };

  const handleShare = () => {
    const msg = `🎯 Rejoins TonCipher et gagne du GRAM en complétant des tâches simples!\n${referralLink}`;
    const tg = (window as unknown as { Telegram?: { WebApp?: { openTelegramLink?: (u: string) => void } } }).Telegram?.WebApp;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(msg)}`;
    if (tg?.openTelegramLink) tg.openTelegramLink(shareUrl);
    else window.open(shareUrl, '_blank');
  };

  const DEPOSIT_PCT  = platformConfig.referralBonusDepositPercent ?? 5;
  const SIGNUP_BONUS = platformConfig.referralBonusSignup ?? 0;

  // Use the real backend balance if available, fallback to 0
  const totalEarned = lastSyncedReferralBalance > 0 ? lastSyncedReferralBalance : 0;

  const activeMilestones = referralMilestones
    .filter(m => m.isActive)
    .sort((a, b) => a.referralCount - b.referralCount);

  return (
    <div className="space-y-4 animate-slide-up">
      {/* ── Tab bar ── */}
      <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <button
          onClick={() => setTab('invite')}
          className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
          style={tab === 'invite' ? { background: 'rgba(124,58,237,0.22)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.35)' } : { color: '#64748b' }}
        >
          👥 Inviter
        </button>
        <button
          onClick={() => setTab('classement')}
          className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
          style={tab === 'classement' ? { background: 'rgba(124,58,237,0.22)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.35)' } : { color: '#64748b' }}
        >
          🏆 Classement
        </button>
      </div>

      {/* ── INVITE TAB ── */}
      {tab === 'invite' && (
        <div className="space-y-4">
          {/* Hero card — uses real API balance */}
          <div className="relative overflow-hidden rounded-2xl p-5 referral-hero-card">
            {/* Réseau de nœuds SVG animé */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.12] pointer-events-none" viewBox="0 0 340 160" preserveAspectRatio="xMidYMid slice">
              <line x1="170" y1="80" x2="60"  y2="30"  stroke="#0098EA" strokeWidth="1" className="referral-line" style={{ animationDelay: '0s' }} />
              <line x1="170" y1="80" x2="280" y2="30"  stroke="#0098EA" strokeWidth="1" className="referral-line" style={{ animationDelay: '0.2s' }} />
              <line x1="170" y1="80" x2="40"  y2="110" stroke="#0098EA" strokeWidth="1" className="referral-line" style={{ animationDelay: '0.4s' }} />
              <line x1="170" y1="80" x2="300" y2="115" stroke="#0098EA" strokeWidth="1" className="referral-line" style={{ animationDelay: '0.1s' }} />
              <line x1="170" y1="80" x2="170" y2="145" stroke="#0098EA" strokeWidth="1" className="referral-line" style={{ animationDelay: '0.3s' }} />
              {([[60,30],[280,30],[40,110],[300,115],[170,145]] as [number,number][]).map(([x,y],i) => (
                <circle key={i} cx={x} cy={y} r="5" fill="#0098EA" className="referral-node" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
              <circle cx="170" cy="80" r="9" fill="#0098EA" opacity="0.9" />
              <circle cx="170" cy="80" r="14" fill="none" stroke="#0098EA" strokeWidth="1.5" opacity="0.4" className="referral-pulse" />
            </svg>

            <div className="relative">
              <p className="text-[#7DD4FC] text-xs font-medium uppercase tracking-widest mb-1">Programme de parrainage</p>
              <h2 className="text-2xl font-bold text-white mb-4">
                Invitez vos amis<br />
                <span style={{ color: '#0098EA' }}>gagnez du GRAM</span> 💎
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-white/10 px-3 py-2.5">
                  <p className="text-2xl font-bold text-white leading-none">{currentUser.referralCount}</p>
                  <p className="text-[11px] text-blue-200 mt-0.5">Ami{currentUser.referralCount !== 1 ? 's' : ''} invité{currentUser.referralCount !== 1 ? 's' : ''}</p>
                </div>
                <div className="rounded-xl bg-white/10 px-3 py-2.5">
                  <p className="text-2xl font-bold text-emerald-300 leading-none">{totalEarned.toFixed(2)}</p>
                  <p className="text-[11px] text-blue-200 mt-0.5">GRAM gagnés</p>
                </div>
                <div className="rounded-xl bg-white/10 px-3 py-2.5">
                  <p className="text-xl font-bold text-amber-300 leading-none">+{SIGNUP_BONUS.toFixed(2)}</p>
                  <p className="text-[11px] text-blue-200 mt-0.5">GRAM / ami inscrit</p>
                </div>
                <div className="rounded-xl bg-white/10 px-3 py-2.5">
                  <p className="text-xl font-bold text-sky-300 leading-none">{DEPOSIT_PCT}%</p>
                  <p className="text-[11px] text-blue-200 mt-0.5">sur chaque tâche</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 py-3.5 rounded-xl text-white text-sm font-bold transition-all"
              style={{ background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', boxShadow: '0 6px 20px rgba(124,58,237,0.40)' }}
            >
              <Share2 className="w-4 h-4" />
              Partager
            </button>
            <button
              onClick={handleCopy}
              className={`flex items-center justify-center gap-2 py-3.5 rounded-xl border text-sm font-bold transition-all ${copied ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'bg-white/5 border-white/15 text-white hover:bg-white/10'}`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copié !' : 'Copier'}
            </button>
          </div>

          {/* Referral link display */}
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10">
            <p className="flex-1 text-[11px] text-slate-400 truncate font-mono">{referralLink}</p>
            <button
              onClick={handleCopy}
              className="shrink-0 p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* How it works */}
          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div style={{ width: 3, height: 14, borderRadius: 99, background: 'linear-gradient(180deg,#7C3AED,#7C3AED55)' }} />
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Comment ça marche</p>
            </div>
            <div className="flex items-start gap-0">
              {[
                { icon: <Share2 className="w-4 h-4" />, sig: true,  label: 'Partagez',     sub: 'Envoyez votre lien à un ami' },
                { icon: <Users  className="w-4 h-4" />, sig: false, color: 'bg-purple-500/20 text-purple-400', label: "Il s'inscrit", sub: 'Via votre lien Telegram' },
                { icon: <Gift   className="w-4 h-4" />, sig: false, color: 'bg-emerald-500/20 text-emerald-400', label: 'Vous gagnez', sub: `+${SIGNUP_BONUS.toFixed(2)} GRAM + ${DEPOSIT_PCT}% tâches` },
              ].map((step, i) => (
                <React.Fragment key={i}>
                  <div className="flex flex-col items-center text-center flex-1 gap-2">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${step.sig ? '' : (step.color ?? '')}`}
                      style={step.sig ? { background: 'rgba(124,58,237,0.22)', boxShadow: '0 4px 12px rgba(124,58,237,0.35)', color: '#A78BFA' } : {}}
                    >
                      {step.icon}
                    </div>
                    <p className="text-xs font-semibold text-white leading-tight">{step.label}</p>
                    <p className="text-[10px] text-slate-400 leading-tight">{step.sub}</p>
                  </div>
                  {i < 2 && (
                    <div className="flex-shrink-0 mt-5 px-1 flex items-center">
                      <div className="w-4 h-px bg-white/20" />
                      <div className="w-0 h-0 border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent border-l-[4px] border-l-white/20" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Milestones */}
          {activeMilestones.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Primes de palier</p>
              {activeMilestones.map(milestone => {
                const claimed  = claimedReferralMilestoneIds.includes(milestone.id);
                const unlocked = currentUser.referralCount >= milestone.referralCount;
                const progress = Math.min(currentUser.referralCount / milestone.referralCount, 1);
                return (
                  <div key={milestone.id} className={`glass-card p-4 transition-all ${claimed ? 'opacity-60' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${claimed ? 'bg-emerald-500/20' : unlocked ? 'bg-amber-500/20' : 'bg-white/5'}`}>
                        {claimed ? <Check className="w-5 h-5 text-emerald-400" /> : unlocked ? <Gift className="w-5 h-5 text-amber-400" /> : <Lock className="w-5 h-5 text-slate-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm font-semibold text-white">{milestone.description}</p>
                          <span className="text-sm font-bold text-emerald-400 shrink-0 ml-2">+{milestone.reward.toFixed(2)} GRAM</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${claimed ? 'bg-emerald-500' : unlocked ? 'bg-amber-500' : ''}`}
                              style={{ width: `${progress * 100}%`, ...(!claimed && !unlocked ? { background: '#7C3AED' } : {}) }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 shrink-0">
                            {Math.min(currentUser.referralCount, milestone.referralCount)}/{milestone.referralCount}
                          </span>
                        </div>
                      </div>
                      {unlocked && !claimed && (
                        <button
                          onClick={() => claimReferralMilestone(milestone.id)}
                          className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold hover:bg-amber-500/30 transition-all"
                        >
                          Réclamer <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                      {claimed && (
                        <span className="shrink-0 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">Réclamé</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── CLASSEMENT TAB ── */}
      {tab === 'classement' && <Leaderboard />}

      {/* Copy toast */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-500/30 flex items-center gap-2 pointer-events-none">
          <Check className="w-3.5 h-3.5" />
          Lien copié !
        </div>
      )}
    </div>
  );
};
