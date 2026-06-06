import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { ArrowDownLeft, ArrowUpRight, TrendingUp, Copy, CheckCircle, ChevronRight, AlertCircle, Wallet, Unlink } from 'lucide-react';

export const MiniAppWallet: React.FC = () => {
  const { currentUser: u, transactions, setMiniAppPage } = useAppStore();
  const userTx = transactions.filter(t => t.userId === u.id);

  return (
    <div className="space-y-5 animate-slide-up">
      <h1 className="text-xl font-bold text-white">Wallet</h1>

      {/* Balance */}
      <div className="glass-card p-5 bg-gradient-to-r from-blue-500/20 to-cyan-500/10 flex items-center gap-4">
        <span className="text-3xl">💰</span>
        <div className="flex-1">
          <p className="text-xs text-slate-400 mb-0.5">Solde disponible</p>
          <p className="text-2xl font-bold text-white">{u.balanceMain.toFixed(2)} TON</p>
          <p className="text-xs text-emerald-400 mt-0.5">Total gagné: {u.totalEarnings.toFixed(2)} TON</p>
          {u.taskCredits > 0 && (
            <p className="text-xs text-blue-400 mt-0.5">dont {u.taskCredits.toFixed(2)} TON crédits campagnes</p>
          )}
        </div>
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
                  {tx.type === 'deposit' ? 'Dépôt' : tx.type === 'withdrawal' ? 'Retrait' : tx.type === 'purchase' ? 'Achat' : 'Récompense'}
                </p>
                <p className="text-xs text-slate-500">{tx.network || 'Interne'} • {new Date(tx.createdAt).toLocaleDateString('fr-FR')}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${tx.type === 'withdrawal' || tx.type === 'purchase' ? 'text-orange-400' : 'text-emerald-400'}`}>
                  {tx.type === 'withdrawal' || tx.type === 'purchase' ? '-' : '+'}{tx.amount.toFixed(2)} {tx.currency}
                </p>
                <p className={`text-[10px] font-medium ${tx.status === 'completed' ? 'text-emerald-400' : tx.status === 'pending' ? 'text-amber-400' : 'text-blue-400'}`}>
                  {tx.status === 'completed' ? '✓ Complété' : tx.status === 'pending' ? '⏳ En attente' : '🔄 Confirmation'}
                </p>
              </div>
            </div>
          ))}
          {userTx.length === 0 && (
            <p className="text-center text-sm text-slate-500 py-6">Aucune transaction</p>
          )}
        </div>
      </div>
    </div>
  );
};

export const MiniAppDeposit: React.FC = () => {
  const { cryptoNetworks, addTransaction, currentUser } = useAppStore();
  const [tonConnectUI] = useTonConnectUI();
  const tonWallet = useTonWallet();
  const [selectedId, setSelectedId] = useState(() => {
    const nets = useAppStore.getState().cryptoNetworks.filter(n => n.isActive && n.isDepositEnabled);
    return nets[0]?.id ?? '1';
  });
  const [copied, setCopied] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [txError, setTxError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const depositCode = useMemo(
    () => currentUser.telegramId !== 0 ? String(currentUser.telegramId) : currentUser.id.slice(-6).toUpperCase(),
    [currentUser.telegramId, currentUser.id]
  );
  const [codeCopied, setCodeCopied] = useState(false);
  const handleCopyCode = () => {
    navigator.clipboard.writeText(depositCode).catch(() => {});
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const depositNetworks = cryptoNetworks.filter(n => n.isActive && n.isDepositEnabled);
  const selected = depositNetworks.find(n => n.id === selectedId) ?? depositNetworks[0];
  const isNativeTON = selected?.symbol === 'TON';
  const isUSDT_TON = selected?.symbol === 'USDT' && selected?.network === 'TON';
  const isOtherNetwork = !isNativeTON && !isUSDT_TON;

  // For TON-based networks, the TON network's hotWalletAddress is used for USDT/TON too
  const tonNet = cryptoNetworks.find(n => n.symbol === 'TON' && n.isActive);
  const address = isNativeTON
    ? (selected?.hotWalletAddress ?? '')
    : isUSDT_TON
    ? (selected?.hotWalletAddress || tonNet?.hotWalletAddress || '')
    : (selected?.hotWalletAddress ?? '');
  const hasAddress = address.length > 0;
  const isWalletConnected = !!tonWallet;
  const connectedAddr = tonWallet?.account.address ?? '';

  const shortAddress = (addr: string) =>
    addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

  const handleCopy = () => {
    if (!hasAddress) return;
    navigator.clipboard.writeText(address).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const networkIcon = (symbol: string) => {
    if (symbol === 'TON') return '💎';
    return '💵';
  };

  // TON native — send via TonKeeper
  const handleTonDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount < (selected?.minDeposit ?? 1)) {
      setTxError(`Minimum: ${selected?.minDeposit} TON`);
      return;
    }
    if (!hasAddress) {
      setTxError("Adresse de la plateforme non configurée — contactez l'admin.");
      return;
    }
    setTxError('');
    setTxStatus('pending');
    try {
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [{ address, amount: Math.floor(amount * 1e9).toString() }],
      });
      addTransaction({
        userId: currentUser.id,
        type: 'deposit',
        amount,
        currency: 'TON',
        network: 'TON',
        status: 'confirming',
        address: connectedAddr, // sender — used for matching in monitor
      });
      setSuccessMsg(`${amount} TON envoyés. Confirmation blockchain en cours…`);
      setTxStatus('success');
    } catch {
      setTxStatus('error');
      setTxError('Transaction annulée ou erreur réseau.');
    }
  };

  // USDT/TON — user sends manually from TonKeeper, we register pending tx for auto-detection
  const handleRegisterUSDT = () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount < (selected?.minDeposit ?? 5)) {
      setTxError(`Minimum: ${selected?.minDeposit} USDT`);
      return;
    }
    if (!hasAddress) {
      setTxError("Adresse de la plateforme non configurée — contactez l'admin.");
      return;
    }
    setTxError('');
    addTransaction({
      userId: currentUser.id,
      type: 'deposit',
      amount,
      currency: 'USDT',
      network: 'TON',
      status: 'pending',
      address: connectedAddr, // sender — used for auto-detection
    });
    setSuccessMsg(`Dépôt de ${amount} USDT enregistré. Il sera confirmé automatiquement après réception.`);
    setTxStatus('success');
  };

  const goBack = () => {
    setTxStatus('idle');
    setDepositAmount('');
    setTxError('');
    useAppStore.getState().setMiniAppPage('wallet');
  };

  if (txStatus === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-slide-up">
        <div className="text-5xl">✅</div>
        <h2 className="text-xl font-bold text-white">
          {isNativeTON ? 'Transaction envoyée!' : 'Dépôt enregistré!'}
        </h2>
        <p className="text-sm text-slate-400 text-center px-4">{successMsg}</p>
        <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 w-full max-w-xs">
          <p className="text-xs text-blue-400 text-center">
            🔄 Votre solde sera mis à jour automatiquement après confirmation.
          </p>
        </div>
        <button onClick={goBack} className="btn-primary px-6 py-3 rounded-xl text-sm font-semibold text-white">
          Retour au wallet
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center gap-3">
        <button onClick={() => useAppStore.getState().setMiniAppPage('wallet')}
          className="p-2 rounded-lg hover:bg-white/5 text-slate-400">←</button>
        <h1 className="text-xl font-bold text-white">Déposer</h1>
      </div>

      {/* Network Selector */}
      <div>
        <p className="text-xs text-slate-400 mb-2">Sélectionnez le réseau</p>
        <div className="grid grid-cols-3 gap-2">
          {depositNetworks.map(net => (
            <button key={net.id}
              onClick={() => { setSelectedId(net.id); setTxStatus('idle'); setTxError(''); setDepositAmount(''); }}
              className={`p-3 rounded-xl text-center transition-all ${selectedId === net.id ? 'bg-blue-500/15 border border-blue-500/40 text-white' : 'glass-card-light text-slate-400 hover:text-white'}`}>
              <span className="text-xl block mb-1">{networkIcon(net.symbol)}</span>
              <span className="text-xs font-medium">{net.symbol}</span>
              <span className="text-[9px] text-slate-500 block">{net.network}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Native TON via TonKeeper ──────────────────────────────── */}
      {isNativeTON && (
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span>💎</span>
            <h3 className="text-sm font-semibold text-white">Dépôt TON via TonKeeper</h3>
            <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Auto-détecté
            </span>
          </div>

          {isWalletConnected ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs text-emerald-400 font-medium">{shortAddress(connectedAddr)}</span>
              </div>
              <button onClick={() => tonConnectUI.disconnect()}
                className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-red-400 transition-colors">
                <Unlink className="w-3 h-3" /> Déconnecter
              </button>
            </div>
          ) : (
            <button onClick={() => tonConnectUI.openModal()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 text-sm font-semibold hover:bg-blue-500/25 transition-all">
              <Wallet className="w-4 h-4" /> Connecter TonKeeper
            </button>
          )}

          {isWalletConnected && (
            <>
              <div>
                <p className="text-xs text-slate-400 mb-2">Montant (TON)</p>
                <input type="number" step="0.1" min={selected?.minDeposit ?? 1}
                  value={depositAmount}
                  onChange={e => { setDepositAmount(e.target.value); setTxError(''); }}
                  placeholder={`Min: ${selected?.minDeposit ?? 1} TON`}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-lg font-semibold placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50" />
              </div>
              {txError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-xs text-red-400">{txError}</p>
                </div>
              )}
              {!hasAddress && (
                <p className="text-[10px] text-amber-400 text-center">
                  ⚠️ L'adresse de la plateforme n'est pas encore configurée par l'admin.
                </p>
              )}
              {/* Deposit code info */}
              <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 flex items-start gap-2">
                <span className="text-purple-400 text-xs">📋</span>
                <p className="text-[10px] text-slate-400">
                  Code de dépôt : <span className="font-mono font-bold text-purple-300">{depositCode}</span>
                  {' '}— ajoutez-le en commentaire pour sécuriser votre dépôt.
                </p>
              </div>
              <button onClick={handleTonDeposit}
                disabled={txStatus === 'pending' || !depositAmount || !hasAddress}
                className="w-full btn-primary py-3.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed">
                {txStatus === 'pending' ? '⏳ En attente de signature…' : `Envoyer ${depositAmount || '0'} TON`}
              </button>
            </>
          )}
        </div>
      )}

      {/* ── USDT/TON Jetton ──────────────────────────────────────── */}
      {isUSDT_TON && (
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span>💵</span>
            <h3 className="text-sm font-semibold text-white">Dépôt USDT (TON Jetton)</h3>
            <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Auto-détecté
            </span>
          </div>

          {/* Deposit code — always shown */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 space-y-2">
            <p className="text-xs font-semibold text-purple-300">📋 Votre code de dépôt</p>
            <div className="flex items-center gap-2">
              <span className="flex-1 text-lg font-mono font-bold text-white tracking-widest">{depositCode}</span>
              <button onClick={handleCopyCode} className="p-2 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors">
                {codeCopied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400">⚠️ Incluez ce code dans le commentaire/mémo de votre transaction pour être crédité automatiquement.</p>
          </div>

          {/* When wallet NOT connected: simplified flow */}
          {!isWalletConnected && hasAddress && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Envoyez vos USDT (Jetton TON) à l'adresse ci-dessous. Incluez votre code de dépôt dans le commentaire pour être crédité automatiquement.
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2.5 bg-white/5 rounded-lg text-xs text-white font-mono truncate">{address}</div>
                <button onClick={handleCopy} className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors">
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <p className="text-xs text-amber-400">⚠️ Réseau TON uniquement. Incluez votre code de dépôt en commentaire sinon votre dépôt ne pourra pas être attribué.</p>
              </div>
            </div>
          )}

          {!isWalletConnected && !hasAddress && (
            <div className="flex flex-col items-center gap-3 py-2">
              <AlertCircle className="w-8 h-8 text-amber-400" />
              <p className="text-xs text-slate-400 text-center">Adresse non configurée. Contactez l'admin.</p>
            </div>
          )}

          {/* When wallet IS connected: show connect indicator + address + register button */}
          {isWalletConnected && (
            <>
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs text-emerald-400 font-medium">{shortAddress(connectedAddr)}</span>
                </div>
                <button onClick={() => tonConnectUI.disconnect()}
                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-red-400 transition-colors">
                  <Unlink className="w-3 h-3" /> Déconnecter
                </button>
              </div>

              {hasAddress && (
                <div>
                  <p className="text-xs text-slate-400 mb-1.5">Adresse de dépôt USDT</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2.5 bg-white/5 rounded-lg text-xs text-white font-mono truncate">{address}</div>
                    <button onClick={handleCopy} className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors">
                      {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs text-slate-400 mb-2">Montant envoyé (USDT)</p>
                <input type="number" step="1" min={selected?.minDeposit ?? 5}
                  value={depositAmount}
                  onChange={e => { setDepositAmount(e.target.value); setTxError(''); }}
                  placeholder={`Min: ${selected?.minDeposit ?? 5} USDT`}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-lg font-semibold placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50" />
              </div>

              {txError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-xs text-red-400">{txError}</p>
                </div>
              )}

              {!hasAddress && (
                <p className="text-[10px] text-amber-400 text-center">
                  ⚠️ Adresse de la plateforme non configurée par l'admin.
                </p>
              )}

              <button onClick={handleRegisterUSDT}
                disabled={!depositAmount || !hasAddress}
                className="w-full btn-primary py-3.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed">
                J'ai envoyé {depositAmount || '0'} USDT — Enregistrer
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Other networks (manual, no auto-detection) ───────────── */}
      {isOtherNetwork && (
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Dépôt {selected?.symbol ?? ''}</h3>
          {hasAddress ? (
            <>
              <p className="text-xs text-slate-400">
                Envoyez vos {selected?.symbol} sur le réseau{' '}
                <span className="text-white font-medium">{selected?.network}</span> à l'adresse ci-dessous :
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2.5 bg-white/5 rounded-lg text-xs text-white font-mono truncate">{address}</div>
                <button onClick={handleCopy} className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors">
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Dépôt minimum</span>
                <span className="text-white font-medium">{selected?.minDeposit} {selected?.symbol}</span>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <p className="text-xs text-amber-400">⚠️ Envoyez uniquement du {selected?.symbol} sur le réseau {selected?.network}. Le dépôt sera validé manuellement par l'administrateur.</p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4">
              <AlertCircle className="w-10 h-10 text-amber-400" />
              <p className="text-sm text-amber-400 font-medium text-center">Adresse non configurée</p>
              <p className="text-xs text-slate-400 text-center">L'administrateur doit configurer l'adresse dans Admin → Crypto & Réseaux.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const MiniAppWithdraw: React.FC = () => {
  const { cryptoNetworks, currentUser, dailyLimits, submitWithdrawal } = useAppStore();
  const [tonConnectUI] = useTonConnectUI();
  const tonWallet = useTonWallet();
  const [selectedId, setSelectedId] = useState(() => {
    const nets = useAppStore.getState().cryptoNetworks.filter(n => n.isActive && n.isWithdrawalEnabled);
    return nets[0]?.id ?? '1';
  });
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const connectedAddress = tonWallet?.account.address ?? '';
  // Both TON and USDT/TON use a TON address for withdrawal
  const isOnTONNetwork = cryptoNetworks.find(n => n.id === selectedId)?.network === 'TON';

  const perUserDailyLimit = dailyLimits.find(l => l.type === 'withdrawal' && l.perUser && l.isActive);
  const dailyRemaining = perUserDailyLimit ? Math.max(0, perUserDailyLimit.limit - currentUser.dailyWithdrawn) : null;

  useEffect(() => {
    if (isOnTONNetwork && connectedAddress) {
      setAddress(connectedAddress);
    }
  }, [isOnTONNetwork, connectedAddress]);

  const withdrawNetworks = cryptoNetworks.filter(n => n.isActive && n.isWithdrawalEnabled);
  const selected = withdrawNetworks.find(n => n.id === selectedId) ?? withdrawNetworks[0];

  const networkIcon = (symbol: string) => {
    if (symbol === 'TON') return '💎';
    return '💵';
  };

  const parsedAmount = parseFloat(amount) || 0;
  const netReceived = parsedAmount - (selected?.withdrawalFee ?? 0);

  const handleSubmit = () => {
    setError('');
    if (!selected) return;
    const result = submitWithdrawal(selected.id, parsedAmount, address);
    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error ?? 'Erreur inconnue');
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-slide-up">
        <div className="text-5xl">✅</div>
        <h2 className="text-xl font-bold text-white">Retrait soumis!</h2>
        <p className="text-sm text-slate-400 text-center">Votre retrait de {parsedAmount} {selected?.symbol} est en cours de traitement.</p>
        <button onClick={() => useAppStore.getState().setMiniAppPage('wallet')} className="btn-primary px-6 py-3 rounded-xl text-sm font-semibold text-white">
          Retour au wallet
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center gap-3">
        <button onClick={() => useAppStore.getState().setMiniAppPage('wallet')} className="p-2 rounded-lg hover:bg-white/5 text-slate-400">
          ←
        </button>
        <h1 className="text-xl font-bold text-white">Retirer</h1>
      </div>

      {/* Balance available */}
      <div className="glass-card-light p-3 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Retirable</span>
          <span className="text-sm font-bold text-blue-400">
            {Math.max(0, currentUser.balanceMain - currentUser.taskCredits).toFixed(2)} {selected?.symbol ?? 'TON'}
          </span>
        </div>
        {currentUser.taskCredits > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500">Crédits campagnes (non retirables)</span>
            <span className="text-[10px] text-blue-400 font-medium">{currentUser.taskCredits.toFixed(2)} TON</span>
          </div>
        )}
      </div>

      {/* Network */}
      <div>
        <p className="text-xs text-slate-400 mb-2">Réseau</p>
        <div className="grid grid-cols-3 gap-2">
          {withdrawNetworks.map(net => (
            <button
              key={net.id}
              onClick={() => { setSelectedId(net.id); setError(''); setAddress(''); setAmount(''); }}
              className={`p-3 rounded-xl text-center transition-all ${selectedId === net.id ? 'bg-blue-500/15 border border-blue-500/40 text-white' : 'glass-card-light text-slate-400'}`}
            >
              <span className="text-xl block mb-1">{networkIcon(net.symbol)}</span>
              <span className="text-xs font-medium">{net.symbol}</span>
              <span className="text-[9px] text-slate-500 block">{net.network}</span>
            </button>
          ))}
        </div>
      </div>

      {/* TonKeeper wallet auto-fill — for all TON-network withdrawals (TON + USDT/TON) */}
      {isOnTONNetwork && (
        <div className="glass-card-light p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-400">Wallet TonKeeper</p>
          {tonWallet ? (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs text-emerald-400 font-mono">{connectedAddress.slice(0, 8)}...{connectedAddress.slice(-4)}</span>
              </div>
              <button onClick={() => tonConnectUI.disconnect()} className="text-[10px] text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors">
                <Unlink className="w-3 h-3" /> Déconnecter
              </button>
            </div>
          ) : (
            <button onClick={() => tonConnectUI.openModal()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-colors">
              <Wallet className="w-3.5 h-3.5" /> Connecter TonKeeper pour auto-remplir
            </button>
          )}
        </div>
      )}

      {/* Amount */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-slate-400">Montant</p>
          <button
            onClick={() => {
              const withdrawable = Math.max(0, currentUser.balanceMain - currentUser.taskCredits);
              const maxAllowed = dailyRemaining !== null
                ? Math.min(withdrawable, dailyRemaining)
                : withdrawable;
              setAmount(maxAllowed.toFixed(2));
            }}
            className="text-xs text-blue-400"
          >
            Max
          </button>
        </div>
        <input
          type="number"
          value={amount}
          onChange={e => { setAmount(e.target.value); setError(''); }}
          placeholder={selected ? `Min: ${selected.minWithdrawal}` : ''}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-lg font-semibold placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
        />
      </div>

      {/* Address */}
      <div>
        <p className="text-xs text-slate-400 mb-2">Adresse de retrait</p>
        <input
          type="text"
          value={address}
          onChange={e => { setAddress(e.target.value); setError(''); }}
          placeholder="Collez votre adresse ici"
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
        />
      </div>

      {/* Info */}
      {selected && (
        <div className="glass-card-light p-4 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Frais de réseau</span>
            <span className="text-orange-400 font-medium">{selected.withdrawalFee} {selected.symbol}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Vous recevrez</span>
            <span className="text-emerald-400 font-medium">{netReceived > 0 ? netReceived.toFixed(2) : '0.00'} {selected.symbol}</span>
          </div>
          {dailyRemaining !== null && (
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Restant aujourd'hui</span>
              <span className={`font-medium ${dailyRemaining < 50 ? 'text-amber-400' : 'text-white'}`}>
                {dailyRemaining.toFixed(2)} / {perUserDailyLimit!.limit} {selected.symbol}
              </span>
            </div>
          )}
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Traitement</span>
            <span className="text-amber-400 font-medium">Validation admin requise 🔐</span>
          </div>
        </div>
      )}

      {error && (
        <div className="glass-card-light p-3 border-red-500/20 bg-red-500/5 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
        <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-400/90 leading-relaxed">
          Votre solde sera réservé immédiatement. Le retrait sera traité sous 12-24h après validation par l'équipe.
        </p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!parsedAmount || !address.trim()}
        className="w-full btn-accent py-3.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Retirer {parsedAmount > 0 ? parsedAmount.toFixed(2) : '0.00'} {selected?.symbol ?? 'TON'}
      </button>
    </div>
  );
};

const TX_LABELS: Record<string, string> = {
  deposit:      'Dépôt',
  withdrawal:   'Retrait',
  reward:       'Récompense tâche',
  referral:     'Bonus parrainage',
  bonus:        'Bonus promo',
  purchase:     'Achat boutique',
  fee:          'Frais',
  admin_credit: 'Crédit admin',
  admin_debit:  'Débit admin',
};

const TX_FILTER_GROUPS: { id: string; label: string; types: string[] }[] = [
  { id: 'all',      label: 'Tout',       types: [] },
  { id: 'in',       label: '⬇ Entrants', types: ['deposit', 'reward', 'referral', 'bonus', 'admin_credit'] },
  { id: 'out',      label: '⬆ Sortants', types: ['withdrawal', 'purchase', 'fee', 'admin_debit'] },
  { id: 'rewards',  label: '🎯 Tâches',  types: ['reward'] },
  { id: 'deposits', label: '💎 Dépôts',  types: ['deposit'] },
];

export const MiniAppHistory: React.FC = () => {
  const { currentUser: u, transactions } = useAppStore();
  const [filter, setFilter] = useState<string>('all');

  const userTx = transactions.filter(t => t.userId === u.id);
  const group   = TX_FILTER_GROUPS.find(g => g.id === filter)!;
  const visible = group.types.length === 0 ? userTx : userTx.filter(t => group.types.includes(t.type));

  const isDebit = (type: string) => ['withdrawal', 'purchase', 'fee', 'admin_debit'].includes(type);

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center gap-3">
        <button onClick={() => useAppStore.getState().setMiniAppPage('wallet')} className="p-2 rounded-lg hover:bg-white/5 text-slate-400">←</button>
        <div>
          <h1 className="text-xl font-bold text-white">Historique</h1>
          <p className="text-xs text-slate-400">{userTx.length} transaction{userTx.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
        {TX_FILTER_GROUPS.map(g => (
          <button
            key={g.id}
            onClick={() => setFilter(g.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${filter === g.id ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-slate-400 border border-transparent'}`}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {visible.map(tx => (
          <div key={tx.id} className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tx.type === 'deposit' ? 'bg-emerald-500/20 text-emerald-400' : isDebit(tx.type) ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                {tx.type === 'deposit'
                  ? <ArrowDownLeft className="w-5 h-5" />
                  : isDebit(tx.type)
                  ? <ArrowUpRight className="w-5 h-5" />
                  : <TrendingUp className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{TX_LABELS[tx.type] ?? tx.type}</p>
                <p className="text-xs text-slate-500">{new Date(tx.createdAt).toLocaleString('fr-FR')}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-base font-bold ${isDebit(tx.type) ? 'text-orange-400' : 'text-emerald-400'}`}>
                  {isDebit(tx.type) ? '−' : '+'}{tx.amount.toFixed(2)}
                </p>
                <p className="text-[10px] text-slate-500">{tx.currency}</p>
              </div>
            </div>
            {tx.txHash && (
              <div className="mt-2 pt-2 border-t border-white/5">
                <p className="text-[10px] text-slate-500 font-mono truncate">TX: {tx.txHash}</p>
              </div>
            )}
          </div>
        ))}
        {visible.length === 0 && (
          <p className="text-center text-sm text-slate-500 py-10">Aucune transaction dans cette catégorie</p>
        )}
      </div>
    </div>
  );
};
