import { adminFetch } from '../../utils/adminFetch';
import React, { useState, useEffect, useCallback } from 'react';

// Open external links properly inside Telegram WebApp (window.open / target="_blank"
// don't work in the Telegram WebView — must use the WebApp API).
function openExternal(url: string) {
  try {
    const tg = (window as unknown as { Telegram?: { WebApp?: { openLink?: (u: string) => void } } }).Telegram;
    if (tg?.WebApp?.openLink) { tg.WebApp.openLink(url); return; }
  } catch { /* not in Telegram */ }
  window.open(url, '_blank', 'noopener,noreferrer');
}
import { useAppStore } from '../../store/appStore';
import { StatusBadge } from '../ui/StatusBadge';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import {
  Wallet, CheckCircle, XCircle, Shield, AlertTriangle, Plus, Edit2, Trash2,
  RefreshCw, Copy, ExternalLink,
} from 'lucide-react';

type ApiDeposit = { id: string; userId?: string; telegramId?: number; amount: number; currency: string; network?: string; status: string; createdAt: string; txHash?: string; confirmations?: number; requiredConfirmations?: number };

export const AdminDeposits: React.FC = () => {
  const { transactions, users } = useAppStore();
  const storeDeposits = transactions.filter(t => t.type === 'deposit');
  const [apiDeposits, setApiDeposits]     = useState<ApiDeposit[]>([]);
  const [loading, setLoading]             = useState(false);
  const [filter, setFilter]               = useState('all');
  const [lastRefresh, setLastRefresh]     = useState<Date | null>(null);

  const fetchApiDeposits = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await adminFetch('/api/transactions?type=deposit&limit=50');
      if (res.ok) {
        const data = await res.json() as ApiDeposit[];
        setApiDeposits(Array.isArray(data) ? data : []);
        setLastRefresh(new Date());
      }
    } catch { /* backend unavailable */ }
    setLoading(false);
  }, []);

  useEffect(() => { void fetchApiDeposits(); }, [fetchApiDeposits]);

  // Merge: API deposits take priority; fall back to store
  const deposits = apiDeposits.length > 0 ? apiDeposits : storeDeposits;
  const filtered = deposits.filter((d: ApiDeposit | typeof storeDeposits[0]) => filter === 'all' || d.status === filter);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Dépôts</h2>
          <p className="text-slate-400 text-sm mt-1">Gestion des dépôts crypto{lastRefresh ? ` · actualisé ${lastRefresh.toLocaleTimeString('fr-FR')}` : ''}</p>
        </div>
        <button onClick={() => void fetchApiDeposits()} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white text-xs font-medium transition-colors disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {['all', 'completed', 'confirming', 'pending'].map(s => {
          const count = s === 'all' ? deposits.length : deposits.filter(d => d.status === s).length;
          const label = s === 'all' ? 'Total' : s === 'completed' ? 'Complétés' : s === 'confirming' ? 'En confirmation' : 'En attente';
          return (
            <button key={s} onClick={() => setFilter(s)} className={`glass-card-light p-3 text-center transition-all ${filter === s ? 'border-blue-500/50 bg-blue-500/5' : ''}`}>
              <p className="text-xs text-slate-400">{label}</p>
              <p className="text-xl font-bold text-white">{count}</p>
            </button>
          );
        })}
      </div>

      {/* Deposits List */}
      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Utilisateur</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Montant</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Réseau</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Confirmations</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Statut</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">Aucun dépôt pour l'instant</td>
              </tr>
            )}
            {filtered.map(tx => {
              const user = users.find(u => u.id === tx.userId);
              return (
                <tr key={tx.id} className="table-row border-b border-white/[0.03]">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-white">@{user?.username || 'unknown'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-emerald-400">+{tx.amount.toFixed(2)} {tx.currency}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-md bg-white/5 text-xs text-slate-300">{tx.network}</span>
                  </td>
                  <td className="px-4 py-3">
                    {tx.confirmations !== undefined ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div className={`h-full rounded-full ${tx.confirmations >= (tx.requiredConfirmations || 0) ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${(tx.confirmations / (tx.requiredConfirmations || 1)) * 100}%` }} />
                        </div>
                        <span className="text-xs text-slate-400">{tx.confirmations}/{tx.requiredConfirmations}</span>
                      </div>
                    ) : <span className="text-xs text-slate-500">-</span>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={tx.status} /></td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-slate-400">{new Date(tx.createdAt).toLocaleDateString('fr-FR')}</p>
                    <p className="text-[10px] text-slate-500">{new Date(tx.createdAt).toLocaleTimeString('fr-FR')}</p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

type ApiWithdrawal = {
  id: string; telegram_id: number; amount: number; currency: string; network: string;
  address: string; status: string; tx_hash: string; fee: number; created_at: string;
  processed_at: string | null; admin_note: string; username: string; first_name: string;
  last_name: string; flagged: boolean; banned: boolean; withdrawal_blocked: boolean;
  total_deposited: number;
};

export const AdminWithdrawals: React.FC = () => {
  const [allWithdrawals, setAllWithdrawals] = useState<ApiWithdrawal[]>([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState<'pending' | 'completed' | 'rejected' | 'all'>('pending');
  const [actioning, setActioning]     = useState<string | null>(null);
  const [txHashInput, setTxHashInput] = useState<Record<string, string>>({});
  const [txDateInput, setTxDateInput] = useState<Record<string, string>>({});
  const [noteInput, setNoteInput]     = useState<Record<string, string>>({});
  const [expanded, setExpanded]       = useState<string | null>(null);
  const [copied, setCopied]           = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Always load ALL statuses so counts are always correct and approved/rejected
  // withdrawals stay visible instead of "disappearing" after an action.
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/withdrawals?status=all');
      if (res.ok) {
        setAllWithdrawals(await res.json() as ApiWithdrawal[]);
        setLastRefresh(new Date());
        setActionError('');
      } else {
        setActionError(res.status === 401 ? 'Clé API admin invalide — configurez-la dans l\'onglet Sécurité.' : `Erreur serveur (${res.status}).`);
      }
    } catch {
      setActionError('Backend injoignable — vérifiez que le serveur tourne.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  // Apply filter client-side so counts are always accurate
  const withdrawals = filter === 'all' ? allWithdrawals : allWithdrawals.filter(w => w.status === filter);

  const doApprove = async (id: string) => {
    setActioning(id);
    setActionError('');
    try {
      const res = await adminFetch(`/api/admin/withdrawals/${id}/approve`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash: txHashInput[id] ?? '', txDate: txDateInput[id] ?? '' }),
      });
      if (!res.ok && res.status !== 409) {
        setActionError(`Échec de l'approbation (${res.status}). Réessayez.`);
      } else {
        // Update status locally so the withdrawal stays visible with new status
        setAllWithdrawals(prev => prev.map(w =>
          w.id === id ? { ...w, status: 'completed', tx_hash: txHashInput[id] ?? '', processed_at: new Date().toISOString() } : w
        ));
        setExpanded(null);
        void fetchAll(); // sync with server in background
      }
    } catch {
      setActionError('Approbation non envoyée — backend injoignable.');
    }
    setActioning(null);
  };

  const doReject = async (id: string) => {
    setActioning(id);
    setActionError('');
    try {
      const res = await adminFetch(`/api/admin/withdrawals/${id}/reject`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: noteInput[id] ?? '' }),
      });
      if (!res.ok && res.status !== 409) {
        setActionError(`Échec du refus (${res.status}). Réessayez.`);
      } else {
        // Update status locally so the withdrawal stays visible with new status
        setAllWithdrawals(prev => prev.map(w =>
          w.id === id ? { ...w, status: 'rejected', admin_note: noteInput[id] ?? '', processed_at: new Date().toISOString() } : w
        ));
        setExpanded(null);
        void fetchAll(); // sync with server in background
      }
    } catch {
      setActionError('Refus non envoyé — backend injoignable.');
    }
    setActioning(null);
  };

  const copyAddr = (addr: string, key: string) => {
    navigator.clipboard.writeText(addr).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const pending   = allWithdrawals.filter(w => w.status === 'pending').length;
  const completed = allWithdrawals.filter(w => w.status === 'completed').length;
  const rejected  = allWithdrawals.filter(w => w.status === 'rejected').length;

  const statusColor: Record<string, string> = {
    pending:   'bg-amber-500/20 text-amber-400',
    completed: 'bg-emerald-500/20 text-emerald-400',
    rejected:  'bg-red-500/20 text-red-400',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Retraits</h2>
          <p className="text-slate-400 text-sm mt-1">Approbation manuelle — vérifiez les dépôts avant d'envoyer</p>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && <span className="text-xs text-slate-500">Actualisé {lastRefresh.toLocaleTimeString('fr-FR')}</span>}
          <button onClick={() => void fetchAll()} className="p-2 rounded-lg hover:bg-white/5 text-slate-400" title="Actualiser">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {actionError && (
        <div className="glass-card p-3 border-red-500/30 bg-red-500/10 text-sm text-red-400 flex items-center justify-between">
          <span>⚠ {actionError}</span>
          <button onClick={() => void fetchAll()} className="text-xs font-semibold underline hover:text-red-300">Réessayer</button>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {([
          { v: 'pending',   label: `⏳ En attente (${pending})`   },
          { v: 'completed', label: `✓ Approuvés (${completed})`   },
          { v: 'rejected',  label: `✗ Refusés (${rejected})`      },
          { v: 'all',       label: `Tous (${allWithdrawals.length})` },
        ] as const).map(({ v, label }) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${filter === v ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-slate-400'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading && (
          <div className="glass-card p-8 text-center">
            <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-500">Chargement…</p>
          </div>
        )}
        {!loading && withdrawals.length === 0 && (
          <div className="glass-card p-10 text-center">
            <p className="text-sm text-slate-500">
              {filter === 'pending' ? 'Aucun retrait en attente 🎉' : `Aucun retrait "${filter}"`}
            </p>
          </div>
        )}
        {!loading && withdrawals.map(w => {
          const isExpanded  = expanded === w.id;
          const isActioning = actioning === w.id;
          const netReceived = w.amount - w.fee;
          const depositRatio = w.total_deposited > 0 ? w.amount / w.total_deposited : null;
          const suspicious = w.flagged || w.banned || (depositRatio !== null && depositRatio > 1.5);

          return (
            <div key={w.id} className={`glass-card overflow-hidden ${suspicious ? 'border border-amber-500/30' : ''}`}>
              <div className="p-4 flex items-center gap-4 cursor-pointer hover:bg-white/[0.02]"
                   onClick={() => setExpanded(isExpanded ? null : w.id)}>
                <div className={`w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${w.banned ? 'ring-2 ring-red-400' : w.flagged ? 'ring-2 ring-amber-400' : ''}`}>
                  {(w.first_name || w.username || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white">{w.first_name} {w.last_name}
                      {w.username ? <span className="text-slate-400 font-normal"> @{w.username}</span> : null}
                    </p>
                    {w.flagged && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400">SIGNALÉ</span>}
                    {w.banned  && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400">BANNI</span>}
                  </div>
                  <p className="text-xs text-slate-500">ID: {w.telegram_id} · {new Date(w.created_at).toLocaleString('fr-FR')}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-orange-400">−{w.amount.toFixed(2)} {w.currency}</p>
                  <p className="text-xs text-slate-500">Reçoit: {netReceived.toFixed(2)} (frais {w.fee})</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase flex-shrink-0 ${statusColor[w.status] ?? 'bg-white/10 text-slate-400'}`}>
                  {w.status}
                </span>
              </div>

              {isExpanded && (
                <div className="border-t border-white/5 p-4 space-y-4 bg-white/[0.01]">
                  {/* Audit grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-white/[0.03]">
                      <p className="text-[10px] text-slate-500 mb-0.5">Dépôts reçus</p>
                      <p className="text-sm font-bold text-emerald-400">{w.total_deposited.toFixed(2)} TON</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/[0.03]">
                      <p className="text-[10px] text-slate-500 mb-0.5">Retrait demandé</p>
                      <p className="text-sm font-bold text-orange-400">{w.amount.toFixed(2)} {w.currency}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${suspicious ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-white/[0.03]'}`}>
                      <p className="text-[10px] text-slate-500 mb-0.5">Ratio retrait/dépôt</p>
                      <p className={`text-sm font-bold ${depositRatio === null ? 'text-slate-400' : depositRatio > 1 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {depositRatio !== null ? `${(depositRatio * 100).toFixed(0)}%` : '∞ (0 dépôt)'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/[0.03]">
                      <p className="text-[10px] text-slate-500 mb-0.5">Réseau</p>
                      <p className="text-sm font-bold text-white">{w.currency}/{w.network}</p>
                    </div>
                  </div>

                  {suspicious && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-300">
                        {w.banned ? '⛔ Compte banni. ' : w.flagged ? '⚠️ Compte signalé par l\'anti-fraude. ' : ''}
                        {depositRatio !== null && depositRatio > 1.5 ? `Le retrait (${w.amount.toFixed(2)}) dépasse les dépôts enregistrés (${w.total_deposited.toFixed(2)}).` : ''}
                      </p>
                    </div>
                  )}

                  {/* Full address */}
                  <div>
                    <p className="text-xs text-slate-400 mb-1.5">Adresse de destination</p>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-white/[0.03]">
                      <p className="text-xs text-white font-mono flex-1 break-all">{w.address}</p>
                      <button onClick={() => copyAddr(w.address, w.id)} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 flex-shrink-0">
                        {copied === w.id ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {w.status === 'pending' && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input type="text" value={txHashInput[w.id] ?? ''}
                          onChange={e => setTxHashInput(p => ({ ...p, [w.id]: e.target.value }))}
                          placeholder="Hash TX (depuis tonscan.org après envoi — optionnel)"
                          className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/40" />
                        <button onClick={() => void doApprove(w.id)} disabled={isActioning}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/25 disabled:opacity-40">
                          <CheckCircle className="w-3.5 h-3.5" />
                          {isActioning ? 'En cours…' : 'Approuver'}
                        </button>
                      </div>
                      <input type="datetime-local" value={txDateInput[w.id] ?? ''}
                        onChange={e => setTxDateInput(p => ({ ...p, [w.id]: e.target.value }))}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/40"
                        title="Date/heure exacte de la transaction (laisser vide = heure actuelle)" />
                      <div className="flex gap-2">
                        <input type="text" value={noteInput[w.id] ?? ''}
                          onChange={e => setNoteInput(p => ({ ...p, [w.id]: e.target.value }))}
                          placeholder="Motif du refus (optionnel)"
                          className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500/40" />
                        <button onClick={() => void doReject(w.id)} disabled={isActioning}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/20 disabled:opacity-40">
                          <XCircle className="w-3.5 h-3.5" /> Refuser
                        </button>
                      </div>
                    </div>
                  )}

                  {w.status !== 'pending' && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-white/[0.03]">
                      {w.status === 'completed'
                        ? <><CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-emerald-400 font-medium">Approuvé {w.processed_at ? new Date(w.processed_at).toLocaleString('fr-FR') : ''}</p>
                              {w.tx_hash ? (
                                <button
                                  onClick={() => openExternal(`https://tonscan.org/tx/${w.tx_hash}`)}
                                  className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 mt-1 font-mono underline underline-offset-2">
                                  <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                                  {w.tx_hash.length > 24 ? w.tx_hash.slice(0, 24) + '…' : w.tx_hash}
                                </button>
                              ) : (
                                <p className="text-[10px] text-slate-500 mt-0.5">Pas de TX Hash renseigné</p>
                              )}
                            </div></>
                        : <><XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                            <div><p className="text-xs text-red-400 font-medium">Refusé {w.processed_at ? new Date(w.processed_at).toLocaleString('fr-FR') : ''}</p>
                              {w.admin_note && <p className="text-[10px] text-slate-500 mt-0.5">Motif : {w.admin_note}</p>}</div></>}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const AdminWallets: React.FC = () => {
  const { cryptoNetworks } = useAppStore();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white">Wallets</h2>
        <p className="text-slate-400 text-sm mt-1">Gestion des portefeuilles crypto</p>
      </div>

      {/* Wallet Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {cryptoNetworks.map(net => (
          <div key={net.id} className="glass-card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${net.symbol === 'TON' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{net.name}</p>
                <p className="text-xs text-slate-400">{net.network}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-white/[0.03]">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-orange-400" />
                  <p className="text-xs text-slate-400">Hot Wallet</p>
                </div>
                <p className="text-lg font-bold text-white">{net.hotWalletBalance.toLocaleString()} {net.symbol}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.03]">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  <p className="text-xs text-slate-400">Cold Wallet</p>
                  <Shield className="w-3 h-3 text-blue-400" />
                </div>
                <p className="text-lg font-bold text-white">{net.coldWalletBalance.toLocaleString()} {net.symbol}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.03]">
                <p className="text-xs text-slate-400 mb-1">Total</p>
                <p className="text-lg font-bold text-emerald-400">{(net.hotWalletBalance + net.coldWalletBalance).toLocaleString()} {net.symbol}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-slate-500">Retrait auto</span>
              <span className={`font-medium ${net.autoWithdrawal ? 'text-emerald-400' : 'text-red-400'}`}>
                {net.autoWithdrawal ? '✓ Activé' : '✗ Désactivé'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Security Notice */}
      <div className="glass-card p-4 border-amber-500/20 bg-amber-500/5 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-400">Sécurité Wallet</p>
          <p className="text-xs text-slate-400 mt-1">
            Séparation hot/cold wallet active. Anti-drain activé avec limite de retrait journalière. 
            Toutes les transactions sont signées de manière sécurisée avec journalisation immuable.
          </p>
        </div>
      </div>
    </div>
  );
};

export const AdminCrypto: React.FC = () => {
  const { cryptoNetworks, updateCryptoNetwork, deleteCryptoNetwork, openModal } = useAppStore();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Crypto & Réseaux</h2>
          <p className="text-slate-400 text-sm mt-1">Configuration des réseaux et paramètres de paiement</p>
        </div>
        <button onClick={() => openModal('crypto')} className="btn-primary px-4 py-2.5 rounded-xl text-sm font-medium text-white flex items-center gap-2">
          <Plus className="w-4 h-4" /> Ajouter un réseau
        </button>
      </div>

      <div className="space-y-4">
        {cryptoNetworks.map(net => (
          <div key={net.id} className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${net.symbol === 'TON' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  <span className="text-lg font-bold">{net.symbol === 'TON' ? '💎' : '💵'}</span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">{net.name}</h3>
                  <p className="text-xs text-slate-400">Réseau {net.network}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openModal('crypto', { network: net })} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => deleteCryptoNetwork(net.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
                <ToggleSwitch
                  enabled={net.isActive}
                  onChange={(v) => updateCryptoNetwork(net.id, { isActive: v })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-white/[0.03]">
                <p className="text-xs text-slate-500 mb-1">Dépôt min</p>
                <p className="text-sm font-semibold text-white">{net.minDeposit} {net.symbol}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.03]">
                <p className="text-xs text-slate-500 mb-1">Dépôt max</p>
                <p className="text-sm font-semibold text-white">{net.maxDeposit.toLocaleString()} {net.symbol}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.03]">
                <p className="text-xs text-slate-500 mb-1">Retrait min</p>
                <p className="text-sm font-semibold text-white">{net.minWithdrawal} {net.symbol}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.03]">
                <p className="text-xs text-slate-500 mb-1">Retrait max</p>
                <p className="text-sm font-semibold text-white">{net.maxWithdrawal.toLocaleString()} {net.symbol}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.03]">
                <p className="text-xs text-slate-500 mb-1">Frais retrait</p>
                <p className="text-sm font-semibold text-orange-400">{net.withdrawalFee} {net.symbol}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.03]">
                <p className="text-xs text-slate-500 mb-1">Confirmations</p>
                <p className="text-sm font-semibold text-blue-400">{net.requiredConfirmations}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.03]">
                <p className="text-xs text-slate-500 mb-1">Limite journalière</p>
                <p className="text-sm font-semibold text-white">{net.dailyWithdrawalLimit.toLocaleString()} {net.symbol}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.03]">
                <p className="text-xs text-slate-500 mb-1">Retrait auto</p>
                <ToggleSwitch
                  enabled={net.autoWithdrawal}
                  onChange={(v) => updateCryptoNetwork(net.id, { autoWithdrawal: v })}
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
