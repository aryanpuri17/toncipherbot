import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../../store/appStore';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { ArrowDownLeft, ArrowUpRight, TrendingUp, Copy, CheckCircle, ChevronRight, AlertCircle, Wallet, Unlink } from 'lucide-react';
import { haptic } from '../../lib/haptics';

const displaySymbol = (s: string) => s === 'TON' ? 'GRAM' : s;

// Convert TonConnect raw address (0:hex) → user-friendly UQ... format
function rawToFriendly(raw: string): string {
  try {
    const [wStr, hex] = raw.split(':');
    if (!hex || hex.length !== 64) return raw;
    const workchain = parseInt(wStr, 10);
    const addrBytes = hex.match(/.{2}/g)!.map(b => parseInt(b, 16));
    const flags     = 0x51; // non-bounceable mainnet
    const payload   = [flags, workchain & 0xFF, ...addrBytes];
    let crc = 0;
    for (const b of payload) {
      crc ^= b << 8;
      for (let i = 0; i < 8; i++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
    }
    crc &= 0xFFFF;
    const full = new Uint8Array([...payload, (crc >> 8) & 0xFF, crc & 0xFF]);
    let bin = '';
    for (const b of full) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_');
  } catch { return raw; }
}

function shortAddr(raw: string): string {
  const friendly = rawToFriendly(raw);
  return friendly.length > 12 ? `${friendly.slice(0, 6)}…${friendly.slice(-4)}` : friendly;
}

// ── Shared TxRow component ─────────────────────────────────────────────────

type Tx = ReturnType<typeof useAppStore.getState>['transactions'][0];
const isDebitType = (type: string) =>
  ['withdrawal', 'purchase', 'fee', 'admin_debit'].includes(type);

const TX_ICON: Record<string, React.ReactNode> = {
  deposit:    <ArrowDownLeft className="w-4 h-4" />,
  withdrawal: <ArrowUpRight className="w-4 h-4" />,
  reward:     <TrendingUp className="w-4 h-4" />,
  referral:   <TrendingUp className="w-4 h-4" />,
  bonus:      <TrendingUp className="w-4 h-4" />,
};

const TX_LABELS_LOCAL: Record<string, string> = {
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

const TxRow: React.FC<{ tx: Tx }> = ({ tx }) => {
  const debit = isDebitType(tx.type);
  const cancelled = tx.status === 'cancelled' || tx.status === 'failed';

  return (
    <div className="glass-card-light p-3.5 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
        tx.type === 'deposit'    ? 'bg-emerald-500/20 text-emerald-400' :
        tx.type === 'withdrawal' ? 'bg-orange-500/20 text-orange-400'  :
        tx.type === 'reward' || tx.type === 'referral' || tx.type === 'bonus'
                                 ? 'bg-blue-500/20 text-blue-400'      :
                                   'bg-slate-500/20 text-slate-400'
      }`}>
        {TX_ICON[tx.type] ?? <TrendingUp className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">
          {TX_LABELS_LOCAL[tx.type] ?? tx.type}
        </p>
        <p className="text-xs text-slate-500">
          {tx.network || 'Interne'} · {new Date(tx.createdAt).toLocaleDateString('fr-FR')}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-semibold ${
          cancelled ? 'text-slate-500 line-through' :
          debit     ? 'text-orange-400' : 'text-emerald-400'
        }`}>
          {debit ? '−' : '+'}{tx.amount.toFixed(2)} {displaySymbol(tx.currency)}
        </p>
        <p className={`text-[10px] font-medium ${
          tx.status === 'completed'                           ? 'text-emerald-400' :
          tx.status === 'pending'                             ? 'text-amber-400'   :
          tx.status === 'cancelled' || tx.status === 'failed' ? 'text-red-400'    :
                                                                'text-blue-400'
        }`}>
          {tx.status === 'completed'  ? '✓ Complété'   :
           tx.status === 'pending'    ? '⏳ En attente' :
           tx.status === 'cancelled'  ? '✕ Refusé'     :
           tx.status === 'failed'     ? '✕ Échoué'     : '🔄 Confirmation'}
        </p>
      </div>
    </div>
  );
};

// ── MiniAppWallet ──────────────────────────────────────────────────────────

export const MiniAppWallet: React.FC = () => {
  const { currentUser: u, transactions, setMiniAppPage } = useAppStore();
  const userTx = transactions.filter(t => t.userId === u.id);
  const withdrawable = Math.max(0, u.balanceMain - u.taskCredits);

  return (
    <div className="space-y-5 animate-slide-up">
      <h1 className="text-xl font-bold text-white">Wallet</h1>

      {/* Balance card — identité GRAM cohérente avec Dashboard */}
      <div className="wallet-balance-card relative overflow-hidden rounded-2xl p-5">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(0,152,234,0.2), transparent)' }} />
        <div className="absolute -bottom-6 -left-4 w-20 h-20 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(0,152,234,0.12), transparent)' }} />

        <div className="relative">
          <p className="text-[#7DD4FC] text-xs font-medium uppercase tracking-widest mb-1">
            Solde disponible
          </p>
          <p className="text-3xl font-bold text-white tracking-tight">
            {u.balanceMain.toFixed(2)}{' '}
            <span style={{ color: '#0098EA' }}>GRAM</span>
          </p>

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-xs text-emerald-400">
              Total gagné : {u.totalEarnings.toFixed(2)} GRAM
            </span>
            {u.taskCredits > 0 && (
              <>
                <span className="text-white/20">·</span>
                <span className="text-xs text-blue-400">
                  dont {u.taskCredits.toFixed(2)} GRAM crédits campagnes
                </span>
              </>
            )}
          </div>

          {u.taskCredits > 0 && u.balanceMain > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                <span>Retirable</span>
                <span>{withdrawable.toFixed(2)} / {u.balanceMain.toFixed(2)} GRAM</span>
              </div>
              <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(withdrawable / u.balanceMain) * 100}%`,
                    background: 'linear-gradient(90deg, #0098EA, #34d399)',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setMiniAppPage('deposit')}
          className="wallet-action-btn wallet-action-deposit py-3.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
        >
          <ArrowDownLeft className="w-4 h-4" /> Déposer
        </button>
        <button
          onClick={() => setMiniAppPage('withdraw')}
          className="wallet-action-btn wallet-action-withdraw py-3.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
        >
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
            <TxRow key={tx.id} tx={tx} />
          ))}
          {userTx.length === 0 && (
            <div className="py-10 text-center space-y-2">
              <p className="text-2xl">💸</p>
              <p className="text-sm text-slate-500">Aucune transaction pour l'instant</p>
            </div>
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
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [txError, setTxError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const depositCode = useMemo(
    () => currentUser.telegramId !== 0 ? String(currentUser.telegramId) : currentUser.id.slice(-6).toUpperCase(),
    [currentUser.telegramId, currentUser.id]
  );

  // TON market price (for USDT→GRAM conversion)
  const [tonPrice, setTonPrice] = useState<number | null>(null);
  useEffect(() => {
    fetch('https://api.binance.com/api/v3/ticker/price?symbol=TONUSDT')
      .then(r => r.json())
      .then((d: { price?: string }) => { if (d.price) setTonPrice(parseFloat(d.price)); })
      .catch(() => {
        // fallback: try CoinGecko
        fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd')
          .then(r => r.json())
          .then((d: { 'the-open-network'?: { usd?: number } }) => {
            const p = d['the-open-network']?.usd;
            if (p) setTonPrice(p);
          })
          .catch(() => {});
      });
  }, []);
  const [codeCopied, setCodeCopied] = useState(false);
  const codeCopyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleCopyCode = () => {
    navigator.clipboard.writeText(depositCode).catch(() => {});
    if (codeCopyTimeoutRef.current) clearTimeout(codeCopyTimeoutRef.current);
    setCodeCopied(true);
    codeCopyTimeoutRef.current = setTimeout(() => setCodeCopied(false), 2000);
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


  const handleCopy = () => {
    if (!hasAddress) return;
    navigator.clipboard.writeText(address).catch(() => {});
    haptic.impact('light');
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    setCopied(true);
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const networkIcon = (symbol: string) => {
    if (symbol === 'TON') return '💎';
    return '💵';
  };

  // TON native — send via TonKeeper
  const handleTonDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount < (selected?.minDeposit ?? 1)) {
      setTxError(`Minimum: ${selected?.minDeposit} GRAM`);
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
      setSuccessMsg(`${amount} GRAM envoyés. Confirmation blockchain en cours…`);
      setTxStatus('success');
    } catch {
      setTxStatus('error');
      setTxError('Transaction annulée ou erreur réseau.');
    }
  };

  // USDT/TON — convert to GRAM at market price (slightly below) and credit immediately
  const USDT_DISCOUNT = 0.98; // 2% below market rate
  const gramFromUsdt = (usdt: number) =>
    tonPrice ? parseFloat(((usdt / tonPrice) * USDT_DISCOUNT).toFixed(4)) : null;

  const handleRegisterUSDT = () => {
    const usdtAmount = parseFloat(depositAmount);
    if (!usdtAmount || usdtAmount < (selected?.minDeposit ?? 5)) {
      setTxError(`Minimum: ${selected?.minDeposit} USDT`);
      return;
    }
    if (!hasAddress) {
      setTxError("Adresse de la plateforme non configurée — contactez l'admin.");
      return;
    }
    const gramAmount = gramFromUsdt(usdtAmount);
    if (!gramAmount) {
      setTxError("Impossible de récupérer le prix du marché. Réessayez dans un instant.");
      return;
    }
    setTxError('');
    // Credit GRAM balance directly (single balance, no USDT split)
    useAppStore.getState().creditDeposit(
      currentUser.id,
      gramAmount,
      'GRAM',
      '',
      'TON (USDT→GRAM)',
    );
    setSuccessMsg(`${usdtAmount} USDT convertis en ${gramAmount} GRAM au prix du marché. Solde mis à jour.`);
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-5 animate-slide-up px-4">
        <div className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.2), transparent)', border: '1px solid rgba(16,185,129,0.3)' }}>
          <CheckCircle className="w-10 h-10 text-emerald-400" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-white">
            {isNativeTON ? 'Transaction envoyée !' : 'Dépôt enregistré !'}
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">{successMsg}</p>
        </div>
        <div className="w-full p-3 rounded-xl bg-[#0098EA]/10 border border-[#0098EA]/20">
          <p className="text-xs text-[#7DD4FC] text-center">
            🔄 Votre solde sera mis à jour automatiquement après confirmation blockchain.
          </p>
        </div>
        <button onClick={goBack} className="btn-primary px-8 py-3.5 rounded-xl text-sm font-semibold text-white">
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
              <span className="text-xs font-medium">{displaySymbol(net.symbol)}</span>
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
            <h3 className="text-sm font-semibold text-white">Dépôt GRAM via TonKeeper</h3>
            <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Auto-détecté
            </span>
          </div>

          {isWalletConnected ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs text-emerald-400 font-medium">{shortAddr(connectedAddr)}</span>
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
                <p className="text-xs text-slate-400 mb-2">Montant (GRAM)</p>
                <input type="number" step="0.1" min={selected?.minDeposit ?? 1}
                  value={depositAmount}
                  onChange={e => { setDepositAmount(e.target.value); setTxError(''); }}
                  placeholder={`Min: ${selected?.minDeposit ?? 1} GRAM`}
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
                {txStatus === 'pending' ? '⏳ En attente de signature…' : `Envoyer ${depositAmount || '0'} GRAM`}
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
                  <span className="text-xs text-emerald-400 font-medium">{shortAddr(connectedAddr)}</span>
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

              {/* GRAM conversion preview */}
              {depositAmount && parseFloat(depositAmount) > 0 && (
                <div className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'rgba(0,152,234,0.08)', border: '1px solid rgba(0,152,234,0.2)' }}>
                  <span className="text-xs text-slate-400">Vous recevrez</span>
                  {tonPrice ? (
                    <span className="text-sm font-bold" style={{ color: '#0098EA' }}>
                      ≈ {gramFromUsdt(parseFloat(depositAmount) || 0)?.toFixed(4)} GRAM
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">Chargement du prix…</span>
                  )}
                </div>
              )}

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
                disabled={!depositAmount || !hasAddress || !tonPrice}
                className="w-full btn-primary py-3.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed">
                {tonPrice
                  ? `J'ai envoyé ${depositAmount || '0'} USDT → Convertir en GRAM`
                  : 'Chargement du prix marché…'}
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
  const [address, setAddress] = useState(() => localStorage.getItem('tc_last_wd_addr') ?? 'UQDCLLOiZ8_KzB_lJXPaTuinjyEemjbnzS3-VAZD6fU-Rp2S');
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
  const calcFee = (amt: number) => {
    if (!selected) return 0;
    return selected.withdrawalFeeType === 'percentage'
      ? amt * selected.withdrawalFee / 100
      : selected.withdrawalFee;
  };
  const netReceived = parsedAmount - calcFee(parsedAmount);

  const handleSubmit = () => {
    setError('');
    if (!selected) return;
    const result = submitWithdrawal(selected.id, parsedAmount, address);
    if (result.success) {
      haptic.success();
      // Keep address in localStorage so it's pre-filled next time
      setSuccess(true);
    } else {
      haptic.error();
      setError(result.error ?? 'Erreur inconnue');
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-5 animate-slide-up px-4">
        <div className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.2), transparent)', border: '1px solid rgba(16,185,129,0.3)' }}>
          <CheckCircle className="w-10 h-10 text-emerald-400" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-white">Retrait soumis !</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Votre retrait de {parsedAmount.toFixed(2)} {displaySymbol(selected?.symbol ?? 'GRAM')} est en cours de traitement.
            <br />Vous recevrez{' '}
            <span className="text-emerald-400 font-semibold">
              {Math.max(0, netReceived).toFixed(2)} {displaySymbol(selected?.symbol ?? 'GRAM')}
            </span>{' '}
            après frais de réseau.
          </p>
        </div>
        <div className="w-full p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <p className="text-xs text-amber-400 text-center">
            🔐 Validation admin sous 12-24h · Votre solde est réservé
          </p>
        </div>
        <button
          onClick={() => useAppStore.getState().setMiniAppPage('wallet')}
          className="btn-primary px-8 py-3.5 rounded-xl text-sm font-semibold text-white"
        >
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
            {Math.max(0, currentUser.balanceMain - currentUser.taskCredits).toFixed(2)} {displaySymbol(selected?.symbol ?? 'GRAM')}
          </span>
        </div>
        {currentUser.taskCredits > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500">Crédits campagnes (non retirables)</span>
            <span className="text-[10px] text-blue-400 font-medium">{currentUser.taskCredits.toFixed(2)} GRAM</span>
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
              <span className="text-xs font-medium">{displaySymbol(net.symbol)}</span>
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
          onChange={e => { const v = e.target.value; setAddress(v); setError(''); try { localStorage.setItem('tc_last_wd_addr', v); } catch { /* noop */ } }}
          placeholder="Collez votre adresse ici"
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
        />
      </div>

      {/* Info */}
      {selected && (
        <div className="glass-card-light p-4 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Frais de réseau</span>
            <span className="text-orange-400 font-medium">
              {selected.withdrawalFeeType === 'percentage'
                ? `${selected.withdrawalFee}% (${calcFee(parsedAmount).toFixed(4)} ${displaySymbol(selected.symbol)})`
                : `${selected.withdrawalFee} ${displaySymbol(selected.symbol)}`}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Vous recevrez</span>
            <span className="text-emerald-400 font-medium">{netReceived > 0 ? netReceived.toFixed(2) : '0.00'} {displaySymbol(selected.symbol)}</span>
          </div>
          {dailyRemaining !== null && (
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Restant aujourd'hui</span>
              <span className={`font-medium ${dailyRemaining < 50 ? 'text-amber-400' : 'text-white'}`}>
                {dailyRemaining.toFixed(2)} / {perUserDailyLimit!.limit} {displaySymbol(selected.symbol)}
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
        Retirer {parsedAmount > 0 ? parsedAmount.toFixed(2) : '0.00'} {displaySymbol(selected?.symbol ?? 'GRAM')}
      </button>
    </div>
  );
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
          <TxRow key={tx.id} tx={tx} />
        ))}
        {visible.length === 0 && (
          <div className="py-14 text-center space-y-3">
            <p className="text-3xl">📭</p>
            <p className="text-sm font-medium text-slate-400">
              {filter === 'all'
                ? "Aucune transaction pour l'instant"
                : 'Aucune transaction dans cette catégorie'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
