import React from 'react';
import { useAppStore } from '../../store/appStore';

export const MiniAppShop: React.FC = () => {
  const { setMiniAppPage } = useAppStore();
  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center gap-3">
        <button onClick={() => setMiniAppPage('profile')} className="p-2 rounded-lg hover:bg-white/5 text-slate-400">←</button>
        <h1 className="text-xl font-bold text-white">Boutique</h1>
      </div>
      <div className="glass-card p-8 text-center">
        <p className="text-3xl mb-3">🛍️</p>
        <p className="text-sm text-slate-400">Boutique à venir</p>
      </div>
    </div>
  );
};
