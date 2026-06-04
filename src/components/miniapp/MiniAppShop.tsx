import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { Store, ShoppingCart } from 'lucide-react';

const categoryLabels: Record<string, string> = {
  boosters:    '⚡ Boosters',
  packs:       '🎁 Packs',
  premium:     '👑 Premium',
  collectibles:'💎 Collectibles',
};

export const MiniAppShop: React.FC = () => {
  const { shopItems, currentUser, setMiniAppPage, buyShopItem } = useAppStore();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [buying,    setBuying]    = useState<string | null>(null);
  const [buyResult, setBuyResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  const activeItems = shopItems.filter(i => i.isActive);
  const categories  = ['all', ...Array.from(new Set(activeItems.map(i => i.category)))];
  const filtered    = activeCategory === 'all' ? activeItems : activeItems.filter(i => i.category === activeCategory);

  const handleBuy = (itemId: string) => {
    if (buying) return;
    setBuying(itemId);
    const result = buyShopItem(itemId);
    setTimeout(() => {
      setBuying(null);
      setBuyResult({
        id: itemId,
        success: result.success,
        message: result.success ? 'Article activé avec succès!' : (result.error ?? 'Erreur.'),
      });
      setTimeout(() => setBuyResult(null), 3500);
    }, 600);
  };

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => setMiniAppPage('profile')} className="p-2 rounded-lg hover:bg-white/5 text-slate-400">←</button>
        <div>
          <h1 className="text-xl font-bold text-white">Boutique</h1>
          <p className="text-sm text-slate-400">
            Solde: <span className="text-emerald-400 font-semibold">{currentUser.balanceMain.toFixed(2)} TON</span>
          </p>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-slate-400 border border-transparent'}`}
          >
            {cat === 'all' ? '🛒 Tout' : (categoryLabels[cat] ?? cat)}
          </button>
        ))}
      </div>

      {/* Items */}
      <div className="space-y-3">
        {filtered.map(item => {
          const canAfford = currentUser.balanceMain >= item.price;
          const isSoldOut = item.maxPurchases != null && item.purchases >= item.maxPurchases;
          const isBuying  = buying === item.id;
          const result    = buyResult?.id === item.id ? buyResult : null;

          return (
            <div key={item.id} className={`glass-card p-4 space-y-3 transition-all ${isSoldOut ? 'opacity-50' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/15 to-purple-500/15 border border-white/10 flex items-center justify-center text-2xl flex-shrink-0">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <h3 className="text-sm font-semibold text-white">{item.name}</h3>
                    {isSoldOut && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400">Épuisé</span>
                    )}
                    {item.maxPurchases != null && !isSoldOut && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] text-slate-400 bg-white/5">
                        {item.maxPurchases - item.purchases} restants
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
                  {item.duration && (
                    <p className="text-[10px] text-blue-400 mt-1">
                      ⏱ Durée: {item.duration >= 24 ? `${item.duration / 24}j` : `${item.duration}h`}
                    </p>
                  )}
                </div>
              </div>

              {result && (
                <p className={`text-xs font-medium ${result.success ? 'text-emerald-400' : 'text-red-400'}`}>
                  {result.success ? '✓' : '✗'} {result.message}
                </p>
              )}

              <div className="flex items-center justify-between border-t border-white/5 pt-3">
                <div>
                  <span className="text-lg font-bold text-amber-400">{item.price.toFixed(2)} TON</span>
                  {!canAfford && !isSoldOut && (
                    <p className="text-[10px] text-red-400 mt-0.5">Solde insuffisant</p>
                  )}
                </div>
                <button
                  onClick={() => handleBuy(item.id)}
                  disabled={!canAfford || isSoldOut || !!buying}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl btn-primary text-xs font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {isBuying ? (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <ShoppingCart className="w-3.5 h-3.5" />
                  )}
                  {isSoldOut ? 'Épuisé' : isBuying ? 'Achat…' : 'Acheter'}
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-14">
            <Store className="w-10 h-10 text-slate-600" />
            <p className="text-sm text-slate-400">Aucun article disponible</p>
          </div>
        )}
      </div>
    </div>
  );
};
