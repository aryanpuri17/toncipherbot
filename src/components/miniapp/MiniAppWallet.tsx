import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { ArrowDownLeft, ArrowUpRight, TrendingUp, Copy, CheckCircle, ChevronRight } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export const MiniAppWallet: React.FC = () => {
  const { currentUser: u, transactions, setMiniAppPage } = useAppStore();
  const userTx = transactions.filter(t => t.userId === u.id);

  return (
    <div className="space-y-5 animate-slide-up">
      <h1 className="text-xl font-bold text-white">Wallet</h1>

      {/* Balances */}
      <div className="space-y-3">
        {[
          { label: 'Solde principal', value: u.balanceMain, color: 'from-blue-500/20 to-cyan-500/10', textColor: 'text-blue-400', icon: '💰' },
          { label: 'Solde bonus', value: u.balanceBonus, color: 'from-purple-500/20 to-pink-500/10', textColor: 'text-purple-400', icon: '🎁' },
          { label: 'Solde parrainage', value: u.balanceReferral, color: 'from-emerald-500/20 to-teal-500/10', textColor: 'text-emerald-400', icon: '👥' },
          { label: 'Solde récompenses', value: u.balanceRewards, color: 'from-amber-500/20 to-orange-500/10', textColor: 'text-amber-400', icon: '⭐' },
        ].map(b => (
          <div key={b.label} className={`glass-card p-4 bg-gradient-to-r ${b.color} flex items-center gap-3`}>
            <span className="text-2xl">{b.icon}</span>
            <div className="flex-1">
              <p className="text-xs text-slate-400">{b.label}</p>
              <p className={`text-xl font-bold ${b.textColor}`}>${b.value.toFixed(2)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setMiniAppPage('deposit')} className="btn-primary py-3.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2">
          <ArrowDownLeft className="w-4 h-4" /> Déposer
        </button>
        <button onClick={() => setMiniAppPage('withdraw')} className="btn-accent py-3.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2">
          <ArrowUpRight className="w-4 h-4" /> Retirer
        </button>
      </div>

      {/* Transaction History */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Historique</h2>
          <button onClick={() => setMiniAppPage('history')} className="text-xs text-blue-400 flex items-center gap-1">
            Tout voir <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="space-y-2">
          {userTx.slice(0, 5).map(tx => (
            <div key={tx.id} className="glass-card-light p-3.5 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tx.type === 'deposit' ? 'bg-emerald-500/20 text-emerald-400' : tx.type === 'withdrawal' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                {tx.type === 'deposit' ? <ArrowDownLeft className="w-4 h-4" /> : tx.type === 'withdrawal' ? <ArrowUpRight className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">
                  {tx.type === 'deposit' ? 'Dépôt' : tx.type === 'withdrawal' ? 'Retrait' : 'Récompense'}
                </p>
                <p className="text-xs text-slate-500">{tx.network || 'Interne'} • {new Date(tx.createdAt).toLocaleDateString('fr-FR')}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${tx.type === 'withdrawal' ? 'text-orange-400' : 'text-emerald-400'}`}>
                  {tx.type === 'withdrawal' ? '-' : '+'}{tx.amount.toFixed(2)} {tx.currency}
                </p>
                <p className={`text-[10px] font-medium ${tx.status === 'completed' ? 'text-emerald-400' : tx.status === 'pending' ? 'text-amber-400' : 'text-blue-400'}`}>
                  {tx.status === 'completed' ? '✓ Complété' : tx.status === 'pending' ? '⏳ En attente' : '🔄 Confirmation'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const MiniAppDeposit: React.FC = () => {
  const [selectedNetwork, setSelectedNetwork] = useState('TON');
  const [copied, setCopied] = useState(false);

  const networks = [
    { id: 'TON', name: 'TON', icon: '💎', address: 'EQD...xK9mP2qZ', min: 1, max: 10000 },
    { id: 'TRC20', name: 'USDT TRC20', icon: '💵', address: 'TKx...9PzR4mN', min: 5, max: 50000 },
    { id: 'BEP20', name: 'USDT BEP20', icon: '💵', address: '0x7...f89D3eK', min: 5, max: 50000 },
  ];

  const selected = networks.find(n => n.id === selectedNetwork)!;

  const handleCopy = () => {
    navigator.clipboard.writeText(selected.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center gap-3">
        <button onClick={() => useAppStore.getState().setMiniAppPage('wallet')} className="p-2 rounded-lg hover:bg-white/5 text-slate-400">
          ←
        </button>
        <h1 className="text-xl font-bold text-white">Déposer</h1>
      </div>

      {/* Network Selector */}
      <div>
        <p className="text-xs text-slate-400 mb-2">Sélectionnez le réseau</p>
        <div className="grid grid-cols-3 gap-2">
          {networks.map(net => (
            <button
              key={net.id}
              onClick={() => setSelectedNetwork(net.id)}
              className={`p-3 rounded-xl text-center transition-all ${selectedNetwork === net.id ? 'bg-blue-500/15 border border-blue-500/40 text-white' : 'glass-card-light text-slate-400 hover:text-white'}`}
            >
              <span className="text-xl block mb-1">{net.icon}</span>
              <span className="text-xs font-medium">{net.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* QR Code */}
      <div className="glass-card p-5 flex flex-col items-center">
        <div className="bg-white p-3 rounded-xl mb-4">
          <QRCodeSVG value={selected.address} size={160} />
        </div>
        <p className="text-xs text-slate-400 mb-2">Adresse de dépôt {selected.name}</p>
        <div className="flex items-center gap-2 w-full">
          <div className="flex-1 px-3 py-2.5 bg-white/5 rounded-lg text-xs text-white font-mono truncate">
            {selected.address}
          </div>
          <button onClick={handleCopy} className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors">
            {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="glass-card-light p-4 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Dépôt minimum</span>
          <span className="text-white font-medium">{selected.min} {selected.id === 'TON' ? 'TON' : 'USDT'}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Dépôt maximum</span>
          <span className="text-white font-medium">{selected.max.toLocaleString()} {selected.id === 'TON' ? 'TON' : 'USDT'}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Confirmations requises</span>
          <span className="text-white font-medium">{selected.id === 'TON' ? '12' : selected.id === 'TRC20' ? '20' : '15'}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Détection</span>
          <span className="text-emerald-400 font-medium">Automatique ✓</span>
        </div>
      </div>

      <div className="glass-card-light p-3 border-amber-500/20 bg-amber-500/5">
        <p className="text-xs text-amber-400">⚠️ Envoyez uniquement du {selected.id === 'TON' ? 'TON' : 'USDT'} sur le réseau {selected.id}. Tout autre actif sera perdu.</p>
      </div>
    </div>
  );
};

export const MiniAppWithdraw: React.FC = () => {
  const [selectedNetwork, setSelectedNetwork] = useState('TON');
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');

  const networks = [
    { id: 'TON', name: 'TON', icon: '💎', fee: 0.5, min: 5, max: 5000, dailyLimit: 10000 },
    { id: 'TRC20', name: 'USDT TRC20', icon: '💵', fee: 1.0, min: 10, max: 25000, dailyLimit: 50000 },
    { id: 'BEP20', name: 'USDT BEP20', icon: '💵', fee: 0.5, min: 10, max: 25000, dailyLimit: 50000 },
  ];

  const selected = networks.find(n => n.id === selectedNetwork)!;

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center gap-3">
        <button onClick={() => useAppStore.getState().setMiniAppPage('wallet')} className="p-2 rounded-lg hover:bg-white/5 text-slate-400">
          ←
        </button>
        <h1 className="text-xl font-bold text-white">Retirer</h1>
      </div>

      {/* Network */}
      <div>
        <p className="text-xs text-slate-400 mb-2">Réseau</p>
        <div className="grid grid-cols-3 gap-2">
          {networks.map(net => (
            <button
              key={net.id}
              onClick={() => setSelectedNetwork(net.id)}
              className={`p-3 rounded-xl text-center transition-all ${selectedNetwork === net.id ? 'bg-blue-500/15 border border-blue-500/40 text-white' : 'glass-card-light text-slate-400'}`}
            >
              <span className="text-xl block mb-1">{net.icon}</span>
              <span className="text-xs font-medium">{net.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Amount */}
      <div>
        <p className="text-xs text-slate-400 mb-2">Montant</p>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder={`Min: ${selected.min}`}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-lg font-semibold placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
        />
      </div>

      {/* Address */}
      <div>
        <p className="text-xs text-slate-400 mb-2">Adresse de retrait</p>
        <input
          type="text"
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="Collez votre adresse ici"
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
        />
      </div>

      {/* Info */}
      <div className="glass-card-light p-4 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Frais de réseau</span>
          <span className="text-orange-400 font-medium">{selected.fee} {selected.id === 'TON' ? 'TON' : 'USDT'}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Vous recevrez</span>
          <span className="text-emerald-400 font-medium">{amount ? (parseFloat(amount) - selected.fee).toFixed(2) : '0.00'} {selected.id === 'TON' ? 'TON' : 'USDT'}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Limite journalière</span>
          <span className="text-white font-medium">{selected.dailyLimit.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Traitement</span>
          <span className="text-blue-400 font-medium">Automatique ⚡</span>
        </div>
      </div>

      <button className="w-full btn-accent py-3.5 rounded-xl text-sm font-semibold text-white">
        Retirer {amount || '0.00'} {selected.id === 'TON' ? 'TON' : 'USDT'}
      </button>
    </div>
  );
};

export const MiniAppHistory: React.FC = () => {
  const { currentUser: u, transactions } = useAppStore();
  const userTx = transactions.filter(t => t.userId === u.id);

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center gap-3">
        <button onClick={() => useAppStore.getState().setMiniAppPage('wallet')} className="p-2 rounded-lg hover:bg-white/5 text-slate-400">
          ←
        </button>
        <h1 className="text-xl font-bold text-white">Historique</h1>
      </div>

      <div className="space-y-2">
        {userTx.map(tx => (
          <div key={tx.id} className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'deposit' ? 'bg-emerald-500/20 text-emerald-400' : tx.type === 'withdrawal' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                {tx.type === 'deposit' ? <ArrowDownLeft className="w-5 h-5" /> : tx.type === 'withdrawal' ? <ArrowUpRight className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">
                  {tx.type === 'deposit' ? 'Dépôt' : tx.type === 'withdrawal' ? 'Retrait' : 'Récompense'}
                </p>
                <p className="text-xs text-slate-500">{new Date(tx.createdAt).toLocaleString('fr-FR')}</p>
              </div>
              <div className="text-right">
                <p className={`text-base font-bold ${tx.type === 'withdrawal' ? 'text-orange-400' : 'text-emerald-400'}`}>
                  {tx.type === 'withdrawal' ? '-' : '+'}{tx.amount.toFixed(2)}
                </p>
                <p className="text-[10px] text-slate-500">{tx.currency}</p>
              </div>
            </div>
            {tx.txHash && (
              <div className="mt-2 pt-2 border-t border-white/5">
                <p className="text-[10px] text-slate-500 font-mono">TX: {tx.txHash}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
