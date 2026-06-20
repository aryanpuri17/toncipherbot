import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import { Hash, Users, TrendingUp, Plus, Edit2, Trash2, Save, X, Tag, AlertCircle } from 'lucide-react';
import type { ReferralMilestone, PromoCode } from '../../store/appStore';

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
        <h2 className="text-2xl font-bold text-white">Referrals</h2>
        <p className="text-slate-400 text-sm mt-1">Bonus tiers and top referrers</p>
      </div>

      {/* Milestones */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Paliers de parrainage</h3>
          <button onClick={startAdd} className="btn-primary px-3 py-1.5 rounded-lg text-xs font-medium text-white flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        {/* Add form */}
        {adding && (
          <div className="mb-4 p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-3">
            <p className="text-xs font-semibold text-blue-400">New tier</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Required referrals</label>
                <input type="number" value={form.referralCount} onChange={e => setForm(f => ({ ...f, referralCount: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500/50" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Bonus (TON)</label>
                <input type="number" step="0.01" value={form.reward} onChange={e => setForm(f => ({ ...f, reward: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500/50" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Description</label>
              <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500/50" placeholder="Ex: Invite 5 friends" />
            </div>
            <div className="flex gap-2">
              <button onClick={save} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/30 transition-colors">
                <Save className="w-3.5 h-3.5" /> Save
              </button>
              <button onClick={cancel} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 text-slate-400 text-xs font-medium hover:bg-white/10 transition-colors">
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {referralMilestones.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No tiers configured</p>}
          {referralMilestones.map(m => (
            <div key={m.id}>
              {editing === m.id ? (
                <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Required referrals</label>
                      <input type="number" value={form.referralCount} onChange={e => setForm(f => ({ ...f, referralCount: parseInt(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500/50" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Bonus (TON)</label>
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
                      <Save className="w-3.5 h-3.5" /> Save
                    </button>
                    <button onClick={cancel} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 text-slate-400 text-xs font-medium hover:bg-white/10 transition-colors">
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02]">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-purple-400">{m.referralCount}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{m.description || `${m.referralCount} referrals`}</p>
                    <p className="text-xs text-slate-500">Bonus: {m.reward.toFixed(2)} TON</p>
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
        <h3 className="text-sm font-semibold text-white mb-4">Top Referrers</h3>
        <div className="space-y-3">
          {topReferrers.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No users yet</p>}
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
                <p className="text-sm font-semibold text-purple-400">{user.referralCount} referrals</p>
                <p className="text-xs text-slate-500">{user.totalEarnings.toFixed(2)} TON earned</p>
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
          <h2 className="text-2xl font-bold text-white">Shop</h2>
          <p className="text-slate-400 text-sm mt-1">Shop item management</p>
        </div>
        <button onClick={() => openModal('shopItem')} className="btn-primary px-4 py-2.5 rounded-xl text-sm font-medium text-white flex items-center gap-2">
          <Plus className="w-4 h-4" /> New item
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {shopItems.length === 0 && (
          <div className="col-span-full glass-card p-10 text-center">
            <p className="text-sm text-slate-500">No items in the shop yet</p>
          </div>
        )}
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
              <span className="text-xs text-slate-500">{item.purchases} purchases</span>
            </div>
            {item.maxPurchases && (
              <div className="mt-2">
                <div className="progress-bar">
                  <div className="progress-bar-fill bg-gradient-to-r from-purple-500 to-pink-500" style={{ width: `${(item.purchases / item.maxPurchases) * 100}%` }} />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">{item.purchases}/{item.maxPurchases} available</p>
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
        <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
        <p className="text-slate-400 text-sm mt-1">Top users by completed tasks</p>
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" /> Top Users
        </h3>
        <div className="space-y-3">
          {topUsers.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No users yet</p>}
          {topUsers.map((user, i) => (
            <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02]">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? 'bg-amber-500/20 text-amber-400' : i === 1 ? 'bg-slate-300/20 text-slate-300' : i === 2 ? 'bg-orange-700/20 text-orange-400' : 'bg-white/5 text-slate-400'}`}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">@{user.username}</p>
                <p className="text-xs text-slate-500">{user.totalEarnings.toFixed(2)} TON earned</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-emerald-400">{user.tasksCompleted} tasks</p>
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
          <h2 className="text-2xl font-bold text-white">Channels & Groups</h2>
          <p className="text-slate-400 text-sm mt-1">Telegram channel and group management</p>
        </div>
        <button onClick={() => openModal('channel')} className="btn-primary px-4 py-2.5 rounded-xl text-sm font-medium text-white flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      <div className="space-y-3">
        {channels.length === 0 && (
          <div className="glass-card p-10 text-center">
            <p className="text-sm text-slate-500">No channels or groups configured yet</p>
          </div>
        )}
        {channels.map(ch => (
          <div key={ch.id} className="glass-card p-5">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${ch.type === 'channel' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                {ch.type === 'channel' ? <Hash className="w-5 h-5" /> : <Users className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-white">{ch.name}</h3>
                  {ch.isMandatory && <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">Required</span>}
                  {ch.botIsAdmin && <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Bot Admin ✓</span>}
                  {ch.joinReward && ch.joinReward > 0 && <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">+{ch.joinReward} TON</span>}
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>ID: {ch.telegramId}</span>
                  <span>{ch.memberCount.toLocaleString()} members</span>
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

// ─────────────────────────────────────────────────────────────
// Admin Promo Codes
// ─────────────────────────────────────────────────────────────

const emptyCode: Omit<PromoCode, 'id' | 'createdAt' | 'currentUses'> = {
  code: '', reward: 0.50, currency: 'main', maxUses: 100, isActive: true, description: '', expiresAt: undefined,
};

export const AdminPromoCodes: React.FC = () => {
  const { promoCodes, addPromoCode, updatePromoCode, deletePromoCode } = useAppStore();
  const [adding,  setAdding]  = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form,    setForm]    = useState<typeof emptyCode>(emptyCode);
  const [confirm, setConfirm] = useState<string | null>(null);

  const startAdd  = () => { setAdding(true); setEditing(null); setForm(emptyCode); };
  const startEdit = (p: PromoCode) => {
    setEditing(p.id); setAdding(false);
    setForm({ code: p.code, reward: p.reward, currency: 'main', maxUses: p.maxUses, isActive: p.isActive, description: p.description, expiresAt: p.expiresAt ? p.expiresAt.split('T')[0] : undefined });
  };
  const cancel = () => { setAdding(false); setEditing(null); };

  const save = () => {
    if (!form.code.trim()) return;
    const payload = { ...form, code: form.code.toUpperCase().trim(), expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined };
    if (adding)       addPromoCode(payload);
    else if (editing) updatePromoCode(editing, payload);
    cancel();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Promo Codes</h2>
          <p className="text-slate-400 text-sm mt-1">{promoCodes.length} code{promoCodes.length !== 1 ? 's' : ''} configured</p>
        </div>
        <button onClick={startAdd} className="btn-primary px-4 py-2.5 rounded-xl text-sm font-medium text-white flex items-center gap-2">
          <Plus className="w-4 h-4" /> New code
        </button>
      </div>

      {/* Add / Edit form */}
      {(adding || editing) && (
        <div className="glass-card p-5 space-y-4 border border-blue-500/20">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">{adding ? 'New promo code' : 'Edit code'}</h3>
            <button onClick={cancel} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Code *</label>
              <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="EX: SUMMER50"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono tracking-widest focus:outline-none focus:border-blue-500/50" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Reward (TON) *</label>
              <input type="number" step="0.01" min="0.01" value={form.reward}
                onChange={e => setForm({ ...form, reward: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500/50" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Max uses *</label>
              <input type="number" min="1" value={form.maxUses}
                onChange={e => setForm({ ...form, maxUses: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500/50" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Expiry (optional)</label>
              <input type="date" value={form.expiresAt ?? ''}
                onChange={e => setForm({ ...form, expiresAt: e.target.value || undefined })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500/50" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">Internal description</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Ex: Official launch code"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500/50" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <ToggleSwitch enabled={form.isActive} onChange={v => setForm({ ...form, isActive: v })} label="Code active" />
            <div className="flex gap-2">
              <button onClick={cancel} className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 text-sm hover:bg-white/10 transition-all">Cancel</button>
              <button onClick={save} disabled={!form.code.trim()} className="px-4 py-2 rounded-xl btn-primary text-sm font-semibold text-white disabled:opacity-40 flex items-center gap-1.5">
                <Save className="w-3.5 h-3.5" /> {adding ? 'Create' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {promoCodes.length === 0 && !adding ? (
        <div className="glass-card p-10 text-center">
          <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No promo codes configured</p>
        </div>
      ) : (
        <div className="space-y-3">
          {promoCodes.map(p => {
            const isExpired   = p.expiresAt ? new Date(p.expiresAt) < new Date() : false;
            const isExhausted = p.currentUses >= p.maxUses;
            const pct         = Math.min((p.currentUses / p.maxUses) * 100, 100);
            return (
              <div key={p.id} className={`glass-card p-5 ${(!p.isActive || isExpired || isExhausted) ? 'opacity-60' : ''}`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <Tag className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-bold text-white font-mono tracking-wider">{p.code}</span>
                      <span className="text-sm font-semibold text-emerald-400">+{p.reward.toFixed(2)} TON</span>
                      {isExpired   && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400">Expired</span>}
                      {isExhausted && !isExpired && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-500/20 text-orange-400">Exhausted</span>}
                      {!p.isActive && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/10 text-slate-400">Inactive</span>}
                    </div>
                    {p.description && <p className="text-xs text-slate-400 mb-1">{p.description}</p>}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>{p.currentUses}/{p.maxUses} uses</span>
                      {p.expiresAt && <span>Expires: {new Date(p.expiresAt).toLocaleDateString('en-US')}</span>}
                    </div>
                    <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden max-w-xs">
                      <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => startEdit(p)} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {confirm === p.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => { deletePromoCode(p.id); setConfirm(null); }} className="px-2 py-1 rounded-lg bg-red-500/15 text-red-400 text-xs font-semibold hover:bg-red-500/25">Del.</button>
                        <button onClick={() => setConfirm(null)} className="px-2 py-1 rounded-lg bg-white/5 text-slate-400 text-xs hover:bg-white/10">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirm(p.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <ToggleSwitch enabled={p.isActive} onChange={v => updatePromoCode(p.id, { isActive: v })} size="sm" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
