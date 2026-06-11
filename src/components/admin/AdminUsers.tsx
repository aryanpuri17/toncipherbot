import { adminFetch } from '../../utils/adminFetch';
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, UserCheck, UserX, Eye, Shield, ChevronDown, RefreshCw, AlertTriangle, ArrowDownLeft, ArrowUpRight, Lock, Unlock, Clock } from 'lucide-react';

type ApiUser = {
  telegram_id:         number;
  username:            string;
  first_name:          string;
  last_name:           string;
  referral_count:      number;
  referral_balance:    number;
  flagged:             boolean;
  banned:              boolean;
  withdrawal_blocked:  boolean;
  ip_address:          string | null;
  created_at:          string;
  deposit_count:       number;
  deposit_total:       number;
  withdrawal_count:    number;
  withdrawal_total:    number;
  pending_withdrawals: number;
};

function userStatus(u: ApiUser): 'banned' | 'blocked' | 'flagged' | 'active' {
  if (u.banned)              return 'banned';
  if (u.withdrawal_blocked)  return 'blocked';
  if (u.flagged)             return 'flagged';
  return 'active';
}

export const AdminUsers: React.FC = () => {
  const [users, setUsers]           = useState<ApiUser[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selected, setSelected]     = useState<ApiUser | null>(null);
  const [actioning, setActioning]   = useState<number | null>(null);
  const [fetchError, setFetchError] = useState('');
  const [confirm, setConfirm]       = useState<{ id: number; action: string } | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ id: number; msg: string; ok: boolean } | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await adminFetch(`/api/admin/users?${params.toString()}`);
      if (res.ok) {
        setUsers(await res.json() as ApiUser[]);
        setFetchError('');
      } else {
        setFetchError(res.status === 401 ? 'Clé API admin invalide — configurez-la dans l\'onglet Sécurité.' : `Erreur serveur (${res.status}).`);
      }
    } catch {
      setFetchError('Backend injoignable — vérifiez que le serveur tourne.');
    }
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { void fetchUsers(); }, [fetchUsers]);

  const doAction = async (telegramId: number, action: 'ban' | 'unban' | 'unflag' | 'block-withdrawals' | 'unblock-withdrawals') => {
    setConfirm(null);
    setActioning(telegramId);
    try {
      const res = await adminFetch(`/api/admin/users/${telegramId}/${action}`, { method: 'POST' });
      if (res.ok) {
        setActionFeedback({ id: telegramId, msg: 'Action effectuée avec succès', ok: true });
        await fetchUsers();
        setSelected(prev => {
          if (!prev || prev.telegram_id !== telegramId) return prev;
          return users.find(u => u.telegram_id === telegramId) ?? null;
        });
      } else {
        setActionFeedback({ id: telegramId, msg: `Erreur ${res.status}`, ok: false });
      }
    } catch {
      setActionFeedback({ id: telegramId, msg: 'Backend injoignable', ok: false });
    }
    setActioning(null);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const statusLabel = { banned: 'Banni', blocked: 'Retraits bloqués', flagged: 'Signalé', active: 'Actif' } as const;
  const statusColor = {
    banned:  'bg-red-500/20 text-red-400',
    blocked: 'bg-orange-500/20 text-orange-400',
    flagged: 'bg-amber-500/20 text-amber-400',
    active:  'bg-emerald-500/20 text-emerald-400',
  } as const;

  // Account age helper
  const accountAge = (createdAt: string) => {
    const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
    if (days === 0) return "aujourd'hui";
    if (days === 1) return 'hier';
    return `il y a ${days}j`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Utilisateurs</h2>
          <p className="text-slate-400 text-sm mt-1">{users.length} utilisateurs</p>
        </div>
        <button onClick={() => void fetchUsers()} className="p-2 rounded-lg hover:bg-white/5 text-slate-400" title="Actualiser">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {fetchError && (
        <div className="glass-card p-3 border-red-500/30 bg-red-500/10 text-sm text-red-400 flex items-center justify-between">
          <span>⚠ {fetchError}</span>
          <button onClick={() => void fetchUsers()} className="text-xs font-semibold underline hover:text-red-300">Réessayer</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Rechercher nom, username, ID Telegram…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50" />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white appearance-none focus:outline-none focus:border-blue-500/50">
            <option value="all">Tous</option>
            <option value="active">Actifs</option>
            <option value="flagged">Signalés</option>
            <option value="banned">Bannis</option>
            <option value="blocked">Retraits bloqués</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Users Table */}
        <div className="flex-1 glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Utilisateur</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Dépôts</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Retraits</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Statut</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={5} className="px-4 py-12 text-center">
                    <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Chargement…</p>
                  </td></tr>
                )}
                {!loading && users.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                    {search || statusFilter !== 'all' ? 'Aucun résultat' : 'Aucun utilisateur inscrit'}
                  </td></tr>
                )}
                {!loading && users.map(user => {
                  const s = userStatus(user);
                  const isActioning = actioning === user.telegram_id;
                  return (
                    <tr key={user.telegram_id}
                      className={`border-b border-white/[0.03] cursor-pointer hover:bg-white/[0.02] transition-colors relative ${selected?.telegram_id === user.telegram_id ? 'bg-blue-500/5' : ''}`}
                      onClick={() => setSelected(user)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${user.banned ? 'ring-2 ring-red-400' : user.flagged ? 'ring-2 ring-amber-400' : ''}`}>
                            {(user.first_name || user.username || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">
                              @{user.username || `id:${user.telegram_id}`}
                              {user.flagged && !user.banned && <AlertTriangle className="inline w-3 h-3 text-amber-400 ml-1" />}
                              {user.withdrawal_blocked && !user.banned && <Lock className="inline w-3 h-3 text-orange-400 ml-1" />}
                            </p>
                            <p className="text-xs text-slate-500">{user.first_name} · {accountAge(user.created_at)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-emerald-400">+{user.deposit_total.toFixed(2)} TON</p>
                        <p className="text-[10px] text-slate-500">{user.deposit_count} dépôt{user.deposit_count !== 1 ? 's' : ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-orange-400">−{user.withdrawal_total.toFixed(2)} TON</p>
                        <p className="text-[10px] text-slate-500">
                          {user.withdrawal_count} retrait{user.withdrawal_count !== 1 ? 's' : ''}
                          {user.pending_withdrawals > 0 && <span className="text-amber-400 ml-1">({user.pending_withdrawals} en attente)</span>}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusColor[s]}`}>
                          {statusLabel[s]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
                            onClick={e => { e.stopPropagation(); setSelected(user); }} title="Détails">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {!user.banned
                            ? <button className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 disabled:opacity-40"
                                onClick={e => { e.stopPropagation(); setConfirm({ id: user.telegram_id, action: 'ban' }); }}
                                disabled={isActioning} title="Bannir">
                                <UserX className="w-3.5 h-3.5" />
                              </button>
                            : <button className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400 disabled:opacity-40"
                                onClick={e => { e.stopPropagation(); void doAction(user.telegram_id, 'unban'); }}
                                disabled={isActioning} title="Débannir">
                                <UserCheck className="w-3.5 h-3.5" />
                              </button>}
                          {/* Inline ban confirmation */}
                          {confirm?.id === user.telegram_id && confirm.action === 'ban' && (
                            <div className="absolute right-2 top-8 z-20 bg-[#1a1f35] border border-red-500/30 rounded-lg p-2 shadow-xl flex items-center gap-2">
                              <span className="text-[10px] text-red-400">Bannir ?</span>
                              <button onClick={e => { e.stopPropagation(); void doAction(user.telegram_id, 'ban'); }} className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-bold hover:bg-red-500/30">Oui</button>
                              <button onClick={e => { e.stopPropagation(); setConfirm(null); }} className="px-2 py-0.5 rounded bg-white/5 text-slate-400 text-[10px]">Non</button>
                            </div>
                          )}
                          {actionFeedback?.id === user.telegram_id && (
                            <span className={`absolute right-2 top-8 z-20 text-[10px] px-2 py-1 rounded ${actionFeedback.ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                              {actionFeedback.msg}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Detail Panel */}
        {selected && (() => {
          const s = userStatus(selected);
          const balanceDiff = selected.deposit_total - selected.withdrawal_total;
          return (
            <div className="w-full lg:w-80 glass-card p-5 space-y-4 animate-slide-up">
              {/* Avatar + name */}
              <div className="text-center">
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl font-bold text-white mx-auto mb-3 ${selected.banned ? 'ring-2 ring-red-400' : selected.flagged ? 'ring-2 ring-amber-400' : ''}`}>
                  {(selected.first_name || selected.username || '?')[0].toUpperCase()}
                </div>
                <h3 className="text-lg font-bold text-white">{selected.first_name} {selected.last_name}</h3>
                <p className="text-sm text-slate-400">@{selected.username || `id:${selected.telegram_id}`}</p>
                <p className="text-xs text-slate-500 mt-0.5">ID Telegram: {selected.telegram_id}</p>
                {selected.ip_address && <p className="text-xs text-slate-500">IP: {selected.ip_address}</p>}
                <div className="mt-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusColor[s]}`}>
                    {statusLabel[s]}
                  </span>
                </div>
              </div>

              {/* Financial summary */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Finances</p>
                <div className="flex justify-between items-center p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                  <div className="flex items-center gap-2">
                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs text-slate-400">Dépôts ({selected.deposit_count})</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-400">+{selected.deposit_total.toFixed(2)} TON</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-lg bg-orange-500/5 border border-orange-500/10">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="w-3.5 h-3.5 text-orange-400" />
                    <span className="text-xs text-slate-400">Retraits ({selected.withdrawal_count})</span>
                  </div>
                  <span className="text-sm font-bold text-orange-400">−{selected.withdrawal_total.toFixed(2)} TON</span>
                </div>
                {selected.pending_withdrawals > 0 && (
                  <div className="flex justify-between items-center p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-xs text-slate-400">En attente</span>
                    </div>
                    <span className="text-sm font-bold text-amber-400">{selected.pending_withdrawals}</span>
                  </div>
                )}
                <div className={`flex justify-between items-center p-2.5 rounded-lg ${balanceDiff >= 0 ? 'bg-white/[0.03]' : 'bg-red-500/5 border border-red-500/10'}`}>
                  <span className="text-xs text-slate-400">Bilan net</span>
                  <span className={`text-sm font-bold ${balanceDiff >= 0 ? 'text-white' : 'text-red-400'}`}>
                    {balanceDiff >= 0 ? '+' : ''}{balanceDiff.toFixed(2)} TON
                  </span>
                </div>
              </div>

              {/* Other stats */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Activité</p>
                <div className="flex justify-between items-center p-2.5 rounded-lg bg-white/[0.03]">
                  <span className="text-xs text-slate-400">Filleuls</span>
                  <span className="text-sm font-semibold text-purple-400">{selected.referral_count}</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-lg bg-white/[0.03]">
                  <span className="text-xs text-slate-400">Bonus parrainage</span>
                  <span className="text-sm font-semibold text-emerald-400">{selected.referral_balance.toFixed(2)} TON</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-lg bg-white/[0.03]">
                  <span className="text-xs text-slate-400">Inscrit</span>
                  <span className="text-xs text-slate-300">{new Date(selected.created_at).toLocaleDateString('fr-FR')} ({accountAge(selected.created_at)})</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-lg bg-white/[0.03]">
                  <Shield className={`w-4 h-4 ${selected.banned ? 'text-red-400' : selected.flagged ? 'text-amber-400' : 'text-emerald-400'}`} />
                  <span className="text-xs text-slate-400">
                    {selected.banned ? 'Compte banni' : selected.flagged ? 'Compte signalé' : 'Compte sain'}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</p>
                <div className="flex gap-2 flex-wrap">
                  {selected.flagged && !selected.banned && (
                    <button onClick={() => void doAction(selected.telegram_id, 'unflag')}
                      disabled={actioning === selected.telegram_id}
                      className="flex-1 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/20 disabled:opacity-40">
                      Désignaler
                    </button>
                  )}
                  {!selected.banned
                    ? <button onClick={() => void doAction(selected.telegram_id, 'ban')}
                        disabled={actioning === selected.telegram_id}
                        className="flex-1 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 disabled:opacity-40">
                        <UserX className="inline w-3 h-3 mr-1" />Bannir
                      </button>
                    : <button onClick={() => void doAction(selected.telegram_id, 'unban')}
                        disabled={actioning === selected.telegram_id}
                        className="flex-1 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 disabled:opacity-40">
                        <UserCheck className="inline w-3 h-3 mr-1" />Débannir
                      </button>}
                </div>
                {!selected.withdrawal_blocked
                  ? <button onClick={() => void doAction(selected.telegram_id, 'block-withdrawals')}
                      disabled={actioning === selected.telegram_id}
                      className="w-full py-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium hover:bg-orange-500/20 disabled:opacity-40">
                      <Lock className="inline w-3 h-3 mr-1" />Bloquer les retraits
                    </button>
                  : <button onClick={() => void doAction(selected.telegram_id, 'unblock-withdrawals')}
                      disabled={actioning === selected.telegram_id}
                      className="w-full py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium hover:bg-blue-500/20 disabled:opacity-40">
                      <Unlock className="inline w-3 h-3 mr-1" />Débloquer les retraits
                    </button>}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
