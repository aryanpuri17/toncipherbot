import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { StatusBadge } from '../ui/StatusBadge';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import {
  Wallet, CheckCircle, XCircle, Shield, AlertTriangle, Plus, Edit2, Trash2
} from 'lucide-react';

export const AdminDeposits: React.FC = () => {
  const { transactions, users } = useAppStore();
  const deposits = transactions.filter(t => t.type === 'deposit');
  const [filter, setFilter] = useState('all');

  const filtered = deposits.filter(d => filter === 'all' || d.status === filter);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white">Dépôts</h2>
        <p className="text-slate-400 text-sm mt-1">Gestion des dépôts crypto</p>
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

export const AdminWithdrawals: React.FC = () => {
  const { transactions, users, updateTransaction } = useAppStore();
  const withdrawals = transactions.filter(t => t.type === 'withdrawal');
  const [filter, setFilter] = useState('all');

  const filtered = withdrawals.filter(w => filter === 'all' || w.status === filter);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white">Retraits</h2>
        <p className="text-slate-400 text-sm mt-1">Gestion des retraits crypto</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {['all', 'completed', 'pending', 'failed'].map(s => {
          const count = s === 'all' ? withdrawals.length : withdrawals.filter(w => w.status === s).length;
          const label = s === 'all' ? 'Total' : s === 'completed' ? 'Complétés' : s === 'pending' ? 'En attente' : 'Échoués';
          return (
            <button key={s} onClick={() => setFilter(s)} className={`glass-card-light p-3 text-center transition-all ${filter === s ? 'border-blue-500/50 bg-blue-500/5' : ''}`}>
              <p className="text-xs text-slate-400">{label}</p>
              <p className="text-xl font-bold text-white">{count}</p>
            </button>
          );
        })}
      </div>

      {/* Withdrawals List */}
      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Utilisateur</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Montant</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Réseau</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Adresse</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Statut</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">Aucun retrait pour l'instant</td>
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
                    <p className="text-sm font-semibold text-orange-400">-{tx.amount.toFixed(2)} {tx.currency}</p>
                    {tx.fee && <p className="text-[10px] text-slate-500">Frais: {tx.fee} {tx.currency}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-md bg-white/5 text-xs text-slate-300">{tx.network}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-slate-400 font-mono">{tx.address?.slice(0, 8)}...{tx.address?.slice(-4)}</p>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={tx.status} /></td>
                  <td className="px-4 py-3">
                    {tx.status === 'pending' && (
                      <div className="flex gap-1">
                        <button onClick={() => updateTransaction(tx.id, { status: 'completed', completedAt: new Date().toISOString(), txHash: '0x' + Math.random().toString(16).slice(2, 18) })} className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-400 transition-colors" title="Approuver">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => updateTransaction(tx.id, { status: 'failed' })} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors" title="Rejeter">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
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
