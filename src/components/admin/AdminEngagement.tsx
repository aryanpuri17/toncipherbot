import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import { Zap, Hash, Users, Award, TrendingUp, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import type { ReferralMilestone } from '../../store/appStore';

const emptyMilestone = { referralCount: 0, reward: 0, description: '', isActive: true };

export const AdminReferrals: React.FC = () => {
  const { users, referralMilestones, addReferralMilestone, updateReferralMilestone, deleteReferralMilestone } = useAppStore();
  const topReferrers = [...users].sort((a, b) => b.referralCount - a.referralCount).slice(0, 5);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<ReferralMilestone, 'id'>>(emptyMilestone);
  const [adding, setAdding] = useState(false);

  const startAdd = () => { setAdding(true); setEditing(null); setForm(emptyMilestone); };
  const startEdit = (m: ReferralMilestone) => { setEditing(m.id); setAdding(false); setForm({ referralCount: m.referralCount, reward: m.reward, description: m.description, isActive: m.isActive }); };
  const cancel = () => { setAdding(false); setEditing(null); };

  const save = () => {
    if (adding) {
      addReferralMilestone(form);
    } else if (editing) {
      updateReferralMilestone(editing, form);
    }
    cancel();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white">Parrainage</h2>
        <p className="text-slate-400 text-sm mt-1">Paliers de primes et top parrains</p>
      </div>

      {/* Milestones */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Paliers de parrainage</h3>
          <button onClick={startAdd} className="btn-primary px-3 py-1.5 rounded-lg text-xs font-medium text-white flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </button>
        </div>

        {/* Add form */}
        {adding && (
          <div className="mb-4 p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-3">
            <p className="text-xs font-semibold text-blue-400">Nouveau palier</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Filleuls requis</label>
                <input type="number" value={form.referralCount} onChange={e => setForm(f => ({ ...f, referralCount: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500/50" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Prime (TON)</label>
                <input type="number" step="0.01" value={form.reward} onChange={e => setForm(f => ({ ...f, reward: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500/50" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Description</label>
              <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500/50" placeholder="Ex: Invitez 5 amis" />
            </div>
            <div className="flex gap-2">
              <button onClick={save} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/30 transition-colors">
                <Save className="w-3.5 h-3.5" /> Sauvegarder
              </button>
              <button onClick={cancel} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 text-slate-400 text-xs font-medium hover:bg-white/10 transition-colors">
                <X className="w-3.5 h-3.5" /> Annuler
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {referralMilestones.length === 0 && <p className="text-sm text-slate-500 text-center py-4">Aucun palier configuré</p>}
          {referralMilestones.map(m => (
            <div key={m.id}>
              {editing === m.id ? (
                <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Filleuls requis</label>
                      <input type="number" value={form.referralCount} onChange={e => setForm(f => ({ ...f, referralCount: parseInt(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500/50" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Prime (TON)</label>
                      <input type="number" step="0.01" value={form.reward} onChange={e => setForm(f => ({ ...f, reward: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500/50" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Description</label>
                    <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500/50" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={save} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/30 transition-colors">
                      <Save className="w-3.5 h-3.5" /> Sauvegarder
                    </button>
                    <button onClick={cancel} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 text-slate-400 text-xs font-medium hover:bg-white/10 transition-colors">
                      <X className="w-3.5 h-3.5" /> Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02]">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-purple-400">{m.referralCount}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{m.description || `${m.referralCount} filleuls`}</p>
                    <p className="text-xs text-slate-500">Prime: {m.reward.toFixed(2)} TON</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(m)} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteReferralMilestone(m.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ToggleSwitch enabled={m.isActive} onChange={(v) => updateReferralMilestone(m.id, { isActive: v })} size="sm" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Top Referrers */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Top Parrains</h3>
        <div className="space-y-3">
          {topReferrers.length === 0 && <p className="text-sm text-slate-500 text-center py-4">Aucun utilisateur pour l'instant</p>}
          {topReferrers.map((user, i) => (
            <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02]">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? 'bg-amber-500/20 text-amber-400' : i === 1 ? 'bg-slate-300/20 text-slate-300' : i === 2 ? 'bg-orange-700/20 text-orange-400' : 'bg-white/5 text-slate-400'}`}>
                {i + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">@{user.username}</p>
                <p className="text-xs text-slate-500">Code: {user.referralCode}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-purple-400">{user.referralCount} filleuls</p>
                <p className="text-xs text-slate-500">{user.totalEarnings.toFixed(2)} TON gagnés</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const AdminShop: React.FC = () => {
  const { shopItems, updateShopItem, deleteShopItem, openModal } = useAppStore();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Boutique</h2>
          <p className="text-slate-400 text-sm mt-1">Gestion des articles de la boutique</p>
        </div>
        <button onClick={() => openModal('shopItem')} className="btn-primary px-4 py-2.5 rounded-xl text-sm font-medium text-white flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouvel article
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {shopItems.map(item => (
          <div key={item.id} className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl">{item.icon}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => openModal('shopItem', { item })} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => deleteShopItem(item.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <ToggleSwitch
                  enabled={item.isActive}
                  onChange={(v) => updateShopItem(item.id, { isActive: v })}
                  size="sm"
                />
              </div>
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">{item.name}</h3>
            <p className="text-xs text-slate-400 mb-3">{item.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-emerald-400">{item.price.toFixed(2)} {item.currency === 'xp' ? 'XP' : item.currency === 'bonus' ? 'Bonus' : 'TON'}</span>
              <span className="text-xs text-slate-500">{item.purchases} achats</span>
            </div>
            {item.maxPurchases && (
              <div className="mt-2">
                <div className="progress-bar">
                  <div className="progress-bar-fill bg-gradient-to-r from-purple-500 to-pink-500" style={{ width: `${(item.purchases / item.maxPurchases) * 100}%` }} />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">{item.purchases}/{item.maxPurchases} disponibles</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const AdminGamification: React.FC = () => {
  const { users } = useAppStore();
  const topUsers = [...users].sort((a, b) => b.tasksCompleted - a.tasksCompleted).slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white">Classement</h2>
        <p className="text-slate-400 text-sm mt-1">Top utilisateurs par tâches complétées</p>
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" /> Top Utilisateurs
        </h3>
        <div className="space-y-3">
          {topUsers.length === 0 && <p className="text-sm text-slate-500 text-center py-4">Aucun utilisateur pour l'instant</p>}
          {topUsers.map((user, i) => (
            <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02]">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? 'bg-amber-500/20 text-amber-400' : i === 1 ? 'bg-slate-300/20 text-slate-300' : i === 2 ? 'bg-orange-700/20 text-orange-400' : 'bg-white/5 text-slate-400'}`}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">@{user.username}</p>
                <p className="text-xs text-slate-500">{user.totalEarnings.toFixed(2)} TON gagnés</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-emerald-400">{user.tasksCompleted} tâches</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const AdminChannels: React.FC = () => {
  const { channels, updateChannel, deleteChannel, openModal } = useAppStore();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Canaux & Groupes</h2>
          <p className="text-slate-400 text-sm mt-1">Gestion des canaux et groupes Telegram</p>
        </div>
        <button onClick={() => openModal('channel')} className="btn-primary px-4 py-2.5 rounded-xl text-sm font-medium text-white flex items-center gap-2">
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>

      <div className="space-y-3">
        {channels.map(ch => (
          <div key={ch.id} className="glass-card p-5">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${ch.type === 'channel' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                {ch.type === 'channel' ? <Hash className="w-5 h-5" /> : <Users className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-white">{ch.name}</h3>
                  {ch.isMandatory && <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">Obligatoire</span>}
                  {ch.botIsAdmin && <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Bot Admin ✓</span>}
                  {ch.joinReward && ch.joinReward > 0 && <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">+{ch.joinReward} TON</span>}
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>ID: {ch.telegramId}</span>
                  <span>{ch.memberCount.toLocaleString()} membres</span>
                  {ch.username && <span>@{ch.username}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openModal('channel', { channel: ch })} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => deleteChannel(ch.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
                <ToggleSwitch
                  enabled={ch.isActive}
                  onChange={(v) => updateChannel(ch.id, { isActive: v })}
                  size="sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
