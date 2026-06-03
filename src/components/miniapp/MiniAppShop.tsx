import React from 'react';
import { useAppStore } from '../../store/appStore';

export const MiniAppShop: React.FC = () => {
  const { shopItems, setMiniAppPage } = useAppStore();

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center gap-3">
        <button onClick={() => setMiniAppPage('profile')} className="p-2 rounded-lg hover:bg-white/5 text-slate-400">
          ←
        </button>
        <h1 className="text-xl font-bold text-white">Boutique</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {shopItems.filter(i => i.isActive).map(item => (
          <div key={item.id} className="glass-card p-4 flex flex-col">
            <span className="text-3xl mb-2">{item.icon}</span>
            <h3 className="text-sm font-semibold text-white mb-1">{item.name}</h3>
            <p className="text-xs text-slate-400 mb-3 flex-1">{item.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-emerald-400">${item.price.toFixed(2)}</span>
              <button className="px-3 py-1.5 rounded-lg btn-primary text-xs font-semibold text-white">
                Acheter
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
        ))}
      </div>
    </div>
  );
};

export const MiniAppRewards: React.FC = () => {
  const { setMiniAppPage, currentUser: u } = useAppStore();

  const rewards = [
    { id: '1', title: 'Bonus de bienvenue', amount: 1.00, status: 'claimed', date: '15 Jan 2024', emoji: '🎉' },
    { id: '2', title: 'Streak 7 jours', amount: 2.00, status: 'claimed', date: '22 Jan 2024', emoji: '🔥' },
    { id: '3', title: 'Niveau 10 atteint', amount: 5.00, status: 'claimed', date: '15 Mar 2024', emoji: '⬆️' },
    { id: '4', title: '100 tâches complétées', amount: 10.00, status: 'claimed', date: '01 Jun 2024', emoji: '🎯' },
    { id: '5', title: 'Streak 15 jours', amount: 5.00, status: 'available', emoji: '🔥' },
    { id: '6', title: '200 tâches complétées', amount: 20.00, status: 'locked', emoji: '🎯' },
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
        <p className="text-2xl font-bold text-white">${u.balanceRewards.toFixed(2)}</p>
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
              <p className="text-sm font-bold text-emerald-400">+${r.amount.toFixed(2)}</p>
              {r.status === 'claimed' && <p className="text-[10px] text-emerald-400">✓ Réclamé</p>}
              {r.status === 'available' && (
                <button className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
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
