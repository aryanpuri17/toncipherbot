import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { Copy, Check, Users, Gift, Lock, ChevronRight } from 'lucide-react';

export const MiniAppReferral: React.FC = () => {
  const { setMiniAppPage, currentUser, referralMilestones, claimedReferralMilestoneIds, claimReferralMilestone, platformConfig } = useAppStore();
  const [copied, setCopied] = useState(false);

  const referralLink = `${platformConfig.referralLinkPrefix}${currentUser.referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeMilestones = referralMilestones.filter(m => m.isActive).sort((a, b) => a.referralCount - b.referralCount);

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center gap-3">
        <button onClick={() => setMiniAppPage('profile')} className="p-2 rounded-lg hover:bg-white/5 text-slate-400">←</button>
        <h1 className="text-xl font-bold text-white">Parrainage</h1>
      </div>

      {/* Referral count */}
      <div className="glass-card p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <Users className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{currentUser.referralCount}</p>
          <p className="text-sm text-slate-400">filleuls invités</p>
        </div>
      </div>

      {/* Referral link */}
      <div className="glass-card p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Votre lien de parrainage</p>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-white/[0.04] border border-white/10">
          <p className="flex-1 text-xs text-slate-300 truncate font-mono">{referralLink}</p>
          <button
            onClick={handleCopy}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${copied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'}`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copié!' : 'Copier'}
          </button>
        </div>
        <p className="text-xs text-slate-500">Partagez ce lien — chaque inscription via votre lien compte comme un filleul.</p>
      </div>

      {/* Milestones */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">Primes de parrainage</p>
        {activeMilestones.length === 0 && (
          <div className="glass-card p-8 text-center">
            <p className="text-sm text-slate-500">Aucun palier disponible pour l'instant</p>
          </div>
        )}
        {activeMilestones.map(milestone => {
          const claimed = claimedReferralMilestoneIds.includes(milestone.id);
          const unlocked = currentUser.referralCount >= milestone.referralCount;
          const progress = Math.min(currentUser.referralCount / milestone.referralCount, 1);

          return (
            <div key={milestone.id} className={`glass-card p-4 transition-all ${claimed ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${claimed ? 'bg-emerald-500/20' : unlocked ? 'bg-amber-500/20' : 'bg-white/5'}`}>
                  {claimed ? (
                    <Check className="w-5 h-5 text-emerald-400" />
                  ) : unlocked ? (
                    <Gift className="w-5 h-5 text-amber-400" />
                  ) : (
                    <Lock className="w-5 h-5 text-slate-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-white">{milestone.description}</p>
                    <span className="text-sm font-bold text-emerald-400 shrink-0 ml-2">+{milestone.reward.toFixed(2)} TON</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${claimed ? 'bg-emerald-500' : unlocked ? 'bg-amber-500' : 'bg-blue-500'}`}
                        style={{ width: `${progress * 100}%` }}
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
    </div>
  );
};
