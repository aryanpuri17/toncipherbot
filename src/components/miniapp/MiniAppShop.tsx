import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { CheckCircle } from 'lucide-react';

export const MiniAppShop: React.FC = () => {
  const { shopItems, setMiniAppPage, purchaseShopItem, currentUser } = useAppStore();
  const [feedback, setFeedback] = useState<Record<string, 'success' | 'error'>>({});

  const handleBuy = (itemId: string) => {
    const success = purchaseShopItem(itemId);
    setFeedback(prev => ({ ...prev, [itemId]: success ? 'success' : 'error' }));
    setTimeout(() => setFeedback(prev => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    }), 2000);
  };

  const getCurrencyLabel = (currency: string) => {
    if (currency === 'xp') return 'XP';
    if (currency === 'bonus') return 'Bonus';
    return 'TON';
  };

  const getUserBalance = (currency: string) => {
    if (currency === 'xp') return currentUser.xp;
    if (currency === 'bonus') return currentUser.balanceBonus;
    return currentUser.balanceMain;
  };

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center gap-3">
        <button onClick={() => setMiniAppPage('profile')} className="p-2 rounded-lg hover:bg-white/5 text-slate-400">
          ←
        </button>
        <h1 className="text-xl font-bold text-white">Boutique</h1>
      </div>

      {/* Balances */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'TON', value: currentUser.balanceMain },
          { label: 'Bonus', value: currentUser.balanceBonus },
          { label: 'XP', value: currentUser.xp },
        ].map(b => (
          <div key={b.label} className="glass-card-light p-2.5 text-center">
            <p className="text-sm font-bold text-white">{typeof b.value === 'number' && b.value % 1 === 0 ? b.value : b.value.toFixed(2)}</p>
            <p className="text-[10px] text-slate-400">{b.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {shopItems.filter(i => i.isActive).map(item => {
          const canAfford = getUserBalance(item.currency) >= item.price;
          const itemFeedback = feedback[item.id];

          return (
            <div key={item.id} className="glass-card p-4 flex flex-col">
              <span className="text-3xl mb-2">{item.icon}</span>
              <h3 className="text-sm font-semibold text-white mb-1">{item.name}</h3>
              <p className="text-xs text-slate-400 mb-3 flex-1">{item.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-emerald-400">
                  {item.price.toFixed(2)} {getCurrencyLabel(item.currency)}
                </span>
                <button
                  onClick={() => handleBuy(item.id)}
                  disabled={!canAfford || itemFeedback === 'success'}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    itemFeedback === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : itemFeedback === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : !canAfford ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                    : 'btn-primary text-white'
                  }`}
                >
                  {itemFeedback === 'success' ? '✓' : itemFeedback === 'error' ? 'Solde insuf.' : 'Acheter'}
                </button>
              </div>
              {item.maxPurchases && (
                <div className="mt-2">
                  <div className="progress-bar">
                    <div className="progress-bar-fill bg-gradient-to-r from-purple-500 to-pink-500" style={{ width: `${(item.purchases / item.maxPurchases) * 100}%` }} />
                  </div>
                  <p className="text-[9px] text-slate-500 mt-0.5">{item.maxPurchases - item.purchases} restants</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const MiniAppRewards: React.FC = () => {
  const { setMiniAppPage, currentUser: u, claimDailyReward, dailyRewardClaimed } = useAppStore();

  const rewards = [
    { id: '1', title: 'Récompense quotidienne', amount: 0.10, status: dailyRewardClaimed ? 'claimed' : 'available', emoji: '📅', date: undefined },
    { id: '2', title: 'Streak 7 jours', amount: 2.00, status: u.streak >= 7 ? 'available' : 'locked', emoji: '🔥', date: undefined },
    { id: '3', title: 'Streak 14 jours', amount: 5.00, status: u.streak >= 14 ? 'available' : 'locked', emoji: '🔥', date: undefined },
    { id: '4', title: '10 tâches complétées', amount: 1.00, status: u.tasksCompleted >= 10 ? 'available' : 'locked', emoji: '🎯', date: undefined },
    { id: '5', title: '50 tâches complétées', amount: 5.00, status: u.tasksCompleted >= 50 ? 'available' : 'locked', emoji: '🎯', date: undefined },
    { id: '6', title: '100 tâches complétées', amount: 10.00, status: u.tasksCompleted >= 100 ? 'available' : 'locked', emoji: '🏆', date: undefined },
  ];

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center gap-3">
        <button onClick={() => setMiniAppPage('profile')} className="p-2 rounded-lg hover:bg-white/5 text-slate-400">
          ←
        </button>
        <h1 className="text-xl font-bold text-white">Récompenses</h1>
      </div>

      <div className="glass-card p-4 text-center bg-gradient-to-r from-purple-500/10 to-pink-500/10">
        <p className="text-xs text-slate-400 mb-1">Total récompenses gagnées</p>
        <p className="text-2xl font-bold text-white">{u.balanceRewards.toFixed(2)} TON</p>
      </div>

      <div className="space-y-3">
        {rewards.map(r => (
          <div key={r.id} className={`glass-card-light p-4 flex items-center gap-3 ${r.status === 'locked' ? 'opacity-50' : ''}`}>
            <span className="text-2xl">{r.emoji}</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{r.title}</p>
              {r.date && <p className="text-xs text-slate-500">{r.date}</p>}
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-emerald-400">+{r.amount.toFixed(2)} TON</p>
              {r.status === 'claimed' && (
                <div className="flex items-center gap-1 justify-end">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  <p className="text-[10px] text-emerald-400">Réclamé</p>
                </div>
              )}
              {r.status === 'available' && (
                <button
                  onClick={() => r.id === '5' && claimDailyReward()}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold"
                >
                  Réclamer
                </button>
              )}
              {r.status === 'locked' && <p className="text-[10px] text-slate-500">🔒 Verrouillé</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
