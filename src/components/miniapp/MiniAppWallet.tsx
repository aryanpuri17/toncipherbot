import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../../store/appStore';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';

import { ArrowDownLeft, ArrowUpRight, TrendingUp, Copy, CheckCircle, ChevronRight, AlertCircle, Wallet, Unlink } from 'lucide-react';
import { haptic } from '../../lib/haptics';

const USDT_JETTON_MASTER = 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs';
const USDT_DECIMALS      = 1_000_000; // USDT has 6 decimals on TON
const USDT_GAS           = '150000000'; // 0.15 TON — covers gas + forward reliably
const USDT_FORWARD       = 20_000_000n; // 0.02 TON forwarded to notify recipient
const USDT_DISCOUNT      = 0.98;        // 2% below market rate

/** Fetch with abort timeout (ms) */
function fetchT(url: string, ms = 7000): Promise<Response> {
  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(tid));
}

/**
 * Fetch the user's USDT Jetton wallet contract address.
 * Primary: TonAPI (reliable, no rate-limit key needed).
 * Fallback: TonCenter v3.
 * Returns address in bounceable (EQ…) format for wallet compatibility.
 */
async function fetchJettonWallet(ownerRawAddr: string): Promise<string> {
  const ownerFriendly = ownerRawAddr.includes(':') ? rawToFriendly(ownerRawAddr) : ownerRawAddr;

  // 1 — TonAPI v2
  try {
    const r = await fetchT(
      `https://tonapi.io/v2/accounts/${encodeURIComponent(ownerFriendly)}/jettons/${encodeURIComponent(USDT_JETTON_MASTER)}`,
      6000,
    );
    if (r.ok) {
      const d = await r.json() as { wallet_address?: { address: string } };
      if (d.wallet_address?.address) return d.wallet_address.address;
    }
  } catch { /* fall through */ }

  // 2 — TonCenter v3 fallback
  try {
    const r2 = await fetchT(
      `https://toncenter.com/api/v3/jetton/wallets?owner_address=${encodeURIComponent(ownerRawAddr)}&jetton_address=${encodeURIComponent(USDT_JETTON_MASTER)}&limit=1`,
      8000,
    );
    if (r2.ok) {
      const d2 = await r2.json() as { jetton_wallets?: { address: string }[] };
      const w = d2.jetton_wallets?.[0]?.address;
      if (w) return w;
    }
  } catch { /* fall through */ }

  throw new Error('no_usdt_wallet');
}

/** Convert raw 0:hex address to bounceable EQ… format (for smart contract interactions) */
function rawToBounceable(raw: string): string {
  try {
    const [wStr, hex] = raw.split(':');
    if (!hex || hex.length !== 64) return raw;
    const workchain = parseInt(wStr, 10);
    const addrBytes = hex.match(/.{2}/g)!.map(b => parseInt(b, 16));
    const flags     = 0x11; // bounceable mainnet (EQ…)
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

/** Build the Jetton transfer payload cell — loads @ton/ton lazily to avoid Buffer crash at startup */
async function buildJettonTransfer(opts: {
  amount: bigint;          // in nano USDT
  destination: string;    // platform wallet (friendly or raw)
  responseAddress: string; // user wallet (raw 0:hex)
  comment: string;
  forwardNano: bigint;    // TON to forward so comment notification reaches recipient
}): Promise<string> {
  // Polyfill Buffer before @ton/core initialises (it uses Buffer.alloc at module scope)
  if (typeof globalThis.Buffer === 'undefined') {
    const { Buffer: Buf } = await import('buffer');
    (globalThis as Record<string, unknown>).Buffer = Buf;
  }
  const { beginCell, Address } = await import('@ton/ton');

  const forwardPayload = beginCell()
    .storeUint(0, 32)
    .storeStringTail(opts.comment)
    .endCell();

  const respAddr = opts.responseAddress.includes(':')
    ? rawToFriendly(opts.responseAddress)
    : opts.responseAddress;

  const body = beginCell()
    .storeUint(0xf8a7ea5, 32)
    .storeUint(0n, 64)
    .storeCoins(opts.amount)
    .storeAddress(Address.parse(opts.destination))
    .storeAddress(Address.parse(respAddr))
    .storeBit(false)              // no custom_payload
    .storeCoins(opts.forwardNano) // forward_ton_amount — enough for notification
    .storeBit(true)               // forward_payload as ^Cell reference
    .storeRef(forwardPayload)
    .endCell();

  return body.toBoc().toString('base64');
}

/** Build a plain TON comment cell (opcode 0 + UTF-8 text) as base64 BOC */
async function buildTonComment(comment: string): Promise<string> {
  if (typeof globalThis.Buffer === 'undefined') {
    const { Buffer: Buf } = await import('buffer');
    (globalThis as Record<string, unknown>).Buffer = Buf;
  }
  const { beginCell } = await import('@ton/ton');
  return beginCell().storeUint(0, 32).storeStringTail(comment).endCell().toBoc().toString('base64');
}

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
  deposit:      'Deposit',
  withdrawal:   'Withdrawal',
  reward:       'Task reward',
  referral:     'Referral bonus',
  bonus:        'Promo bonus',
  purchase:     'Shop purchase',
  fee:          'Fee',
  admin_credit: 'Admin credit',
  admin_debit:  'Admin debit',
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
                                 ? ''                                   :
                                   'bg-slate-500/20 text-slate-400'
      }`}
      style={tx.type === 'reward' || tx.type === 'referral' || tx.type === 'bonus' ? { background: 'rgba(139,92,246,0.14)', color: '#C4B5FD', boxShadow: '0 3px 10px rgba(139,92,246,0.17)' } : {}}
      >
        {TX_ICON[tx.type] ?? <TrendingUp className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">
          {TX_LABELS_LOCAL[tx.type] ?? tx.type}
        </p>
        <p className="text-xs text-slate-500">
          {tx.network || 'Internal'} · {new Date(tx.createdAt).toLocaleDateString('en-US')}
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
          {tx.status === 'completed'  ? '✓ Completed'   :
           tx.status === 'pending'    ? '⏳ Pending' :
           tx.status === 'cancelled'  ? '✕ Rejected'     :
           tx.status === 'failed'     ? '✕ Failed'     : '🔄 Confirming'}
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

      {/* Balance card — consistent GRAM identity with Dashboard */}
      <div className="wallet-balance-card relative overflow-hidden rounded-2xl p-5">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(0,152,234,0.2), transparent)' }} />
        <div className="absolute -bottom-6 -left-4 w-20 h-20 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(0,152,234,0.12), transparent)' }} />

        <div className="relative">
          <p className="text-[#7DD4FC] text-xs font-medium uppercase tracking-widest mb-1">
            Available balance
          </p>
          <p className="text-3xl font-bold text-white tracking-tight">
            {u.balanceMain.toFixed(2)}{' '}
            <span style={{ color: '#0098EA' }}>GRAM</span>
          </p>

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-xs text-emerald-400">
              Total earned: {u.totalEarnings.toFixed(2)} GRAM
            </span>
            {u.taskCredits > 0 && (
              <>
                <span className="text-white/20">·</span>
                <span className="text-xs text-blue-400">
                  {u.taskCredits.toFixed(2)} GRAM campaign credits
                </span>
              </>
            )}
          </div>

          {u.taskCredits > 0 && u.balanceMain > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                <span>Withdrawable</span>
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
          <ArrowDownLeft className="w-4 h-4" /> Deposit
        </button>
        <button
          onClick={() => setMiniAppPage('withdraw')}
          className="wallet-action-btn wallet-action-withdraw py-3.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
        >
          <ArrowUpRight className="w-4 h-4" /> Withdraw
        </button>
      </div>

      {/* Transaction History */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div style={{ width: 3, height: 16, borderRadius: 99, background: 'linear-gradient(180deg,#8B5CF6,#8B5CF655)', flexShrink: 0 }} />
            <h2 className="text-sm font-semibold text-white">History</h2>
          </div>
          <button onClick={() => setMiniAppPage('history')} className="text-xs flex items-center gap-1" style={{ color: '#C4B5FD' }}>
            See all <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="space-y-2">
          {userTx.slice(0, 5).map(tx => (
            <TxRow key={tx.id} tx={tx} />
          ))}
          {userTx.length === 0 && (
            <div className="py-10 text-center space-y-2">
              <p className="text-2xl">💸</p>
              <p className="text-sm text-slate-500">No transactions yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const MiniAppDeposit: React.FC = () => {
  const { cryptoNetworks, creditDeposit, currentUser } = useAppStore();
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
  const [tonPriceError, setTonPriceError] = useState(false);
  useEffect(() => {
    // Try backend price endpoint first (cached, no CORS issues)
    fetch('/api/ton-price')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: { price?: number }) => { if (d.price) { setTonPrice(d.price); return; } return Promise.reject(); })
      .catch(() =>
        // Fallback: Binance directly
        fetch('https://api.binance.com/api/v3/ticker/price?symbol=TONUSDT')
          .then(r => r.json())
          .then((d: { price?: string }) => { if (d.price) setTonPrice(parseFloat(d.price)); else return Promise.reject(); })
          .catch(() =>
            // Last resort: CoinGecko
            fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd')
              .then(r => r.json())
              .then((d: { 'the-open-network'?: { usd?: number } }) => {
                const p = d['the-open-network']?.usd;
                if (p) setTonPrice(p); else setTonPriceError(true);
              })
              .catch(() => { setTonPriceError(true); })
          )
      );
  }, []);

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

  // TON native — send via wallet
  const handleTonDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount < 0.1) {
      setTxError('Minimum: 0.1 GRAM');
      return;
    }
    if (!hasAddress) {
      setTxError("Platform address not configured — contact admin.");
      return;
    }
    setTxError('');
    setTxStatus('pending');
    try {
      const commentPayload = await buildTonComment(depositCode);
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [{ address, amount: Math.floor(amount * 1e9).toString(), payload: commentPayload }],
      });
      creditDeposit(currentUser.id, amount, 'TON', '', 'TON');
      const tg = (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp;
      void fetch('/api/deposit/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: currentUser.telegramId,
          amount,
          currency: 'TON',
          network:  'TON',
          initData: tg?.initData ?? '',
        }),
      }).catch(() => {});
      setSuccessMsg(`✅ ${amount} GRAM credited to your account!`);
      setTxStatus('success');
    } catch (e: unknown) {
      const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
      const isCancel = msg.includes('user reject') || msg.includes('cancel') || msg.includes('deny') || msg.includes('declined');
      if (isCancel) {
        setTxStatus('idle'); // user cancelled — silent reset
      } else {
        setTxStatus('error');
        setTxError('Transaction failed. Please try again.');
      }
    }
  };

  const gramFromUsdt = (usdt: number) =>
    tonPrice ? parseFloat(((usdt / tonPrice) * USDT_DISCOUNT).toFixed(4)) : null;

  const handleSendUSDT = async () => {
    const usdtAmount = parseFloat(depositAmount);
    if (!usdtAmount || usdtAmount < 0.1) { setTxError('Minimum: 0.1 USDT'); return; }
    if (!hasAddress) { setTxError("Address not configured — contact admin."); return; }
    if (!connectedAddr) { setTxError('Connect your wallet first.'); return; }
    if (!tonPrice) { setTxError('TON/USDT price unavailable, please try again.'); return; }

    setTxError('');
    setTxStatus('pending');
    try {
      // 1. Resolve user's USDT Jetton wallet address (TonAPI → TonCenter fallback)
      const jettonWalletRaw = await fetchJettonWallet(connectedAddr);
      // Use bounceable (EQ…) format so all wallet apps accept it
      const jettonWallet = jettonWalletRaw.includes(':')
        ? rawToBounceable(jettonWalletRaw)
        : jettonWalletRaw;

      // 2. Build Jetton transfer payload
      const payload = await buildJettonTransfer({
        amount:          BigInt(Math.round(usdtAmount * USDT_DECIMALS)),
        destination:     address,
        responseAddress: connectedAddr,
        comment:         depositCode,
        forwardNano:     USDT_FORWARD,
      });

      // 3. Send via TonConnect (same UX as native GRAM)
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [{ address: jettonWallet, amount: USDT_GAS, payload }],
      });

      // 4. Credit GRAM balance immediately (rate is known, we control the balance)
      const gram = gramFromUsdt(usdtAmount)!;
      // Store GRAM amount with GRAM currency so history shows "+0.06 GRAM" not "+0.06 USDT"
      creditDeposit(currentUser.id, gram, 'GRAM', '', 'TON');
      // Note: no /api/deposit/record call for USDT — the backend monitor auto-detects
      // the on-chain Jetton transfer and creates the server-side transaction record.

      setSuccessMsg(`✅ ${usdtAmount} USDT sent → +${gram} GRAM credited to your account!`);
      setTxStatus('success');
    } catch (e: unknown) {
      const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
      const isCancel = msg.includes('user reject') || msg.includes('cancel') || msg.includes('deny') || msg.includes('declined');
      if (isCancel) {
        setTxStatus('idle');
      } else if (msg.includes('no_usdt_wallet') || msg.includes('no usdt') || msg.includes('no jetton')) {
        setTxStatus('error');
        setTxError('No USDT Jetton wallet found for this address. Make sure your wallet holds USDT on TON.');
      } else if (msg.includes('abort') || msg.includes('api_error') || msg.includes('toncenter') || msg.includes('tonapi')) {
        setTxStatus('error');
        setTxError('Could not reach the blockchain API. Check your connection and try again.');
      } else {
        setTxStatus('error');
        setTxError('Transaction failed. Make sure you have enough USDT and at least 0.15 TON for gas fees.');
      }
    }
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
            {isNativeTON ? 'Transaction sent!' : 'Deposit recorded!'}
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">{successMsg}</p>
        </div>
        <div className="w-full p-3 rounded-xl bg-[#0098EA]/10 border border-[#0098EA]/20">
          <p className="text-xs text-[#7DD4FC] text-center">
            🔄 Your balance will be updated automatically after blockchain confirmation.
          </p>
        </div>
        <button onClick={goBack} className="btn-primary px-8 py-3.5 rounded-xl text-sm font-semibold text-white">
          Back to wallet
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center gap-3">
        <button onClick={() => useAppStore.getState().setMiniAppPage('wallet')}
          className="p-2 rounded-lg hover:bg-white/5 text-slate-400">←</button>
        <h1 className="text-xl font-bold text-white">Deposit</h1>
      </div>

      {/* Network Selector */}
      <div>
        <p className="text-xs text-slate-400 mb-2">Select network</p>
        <div className="grid grid-cols-3 gap-2">
          {depositNetworks.map(net => (
            <button key={net.id}
              onClick={() => { setSelectedId(net.id); setTxStatus('idle'); setTxError(''); setDepositAmount(''); }}
              className={`p-3 rounded-xl text-center transition-all ${selectedId === net.id ? 'text-white' : 'glass-card-light text-slate-400 hover:text-white'}`}
              style={selectedId === net.id ? { background: 'rgba(139,92,246,0.11)', border: '1px solid rgba(139,92,246,0.26)', boxShadow: '0 4px 14px rgba(139,92,246,0.16)' } : {}}>
              <span className="text-xl block mb-1">{networkIcon(net.symbol)}</span>
              <span className="text-xs font-medium">{displaySymbol(net.symbol)}</span>
              <span className="text-[9px] text-slate-500 block">{net.network}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Native TON via wallet ──────────────────────────────── */}
      {isNativeTON && (
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span>💎</span>
            <h3 className="text-sm font-semibold text-white">GRAM deposit via wallet</h3>
            <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Auto-detected
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
                <Unlink className="w-3 h-3" /> Disconnect
              </button>
            </div>
          ) : (
            <button onClick={() => tonConnectUI.openModal()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all" style={{ background: 'rgba(139,92,246,0.11)', border: '1px solid rgba(139,92,246,0.20)', color: '#C4B5FD' }}>
              <Wallet className="w-4 h-4" /> Connect wallet
            </button>
          )}

          {isWalletConnected && (
            <>
              <div>
                <p className="text-xs text-slate-400 mb-2">Amount (GRAM)</p>
                <input type="number" step="0.1" min={0.1}
                  value={depositAmount}
                  onChange={e => { setDepositAmount(e.target.value); setTxError(''); }}
                  placeholder="Min: 0.1 GRAM"
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
                  ⚠️ The platform address has not been configured by the admin yet.
                </p>
              )}
              {/* Deposit code info */}
              <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 flex items-start gap-2">
                <span className="text-purple-400 text-xs">🔒</span>
                <p className="text-[10px] text-slate-400">
                  Deposit code <span className="font-mono font-bold text-purple-300">{depositCode}</span> automatically included in the transaction.
                </p>
              </div>
              <button onClick={handleTonDeposit}
                disabled={txStatus === 'pending' || !depositAmount || !hasAddress}
                className="w-full btn-primary py-3.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed">
                {txStatus === 'pending' ? '⏳ Waiting for signature…' : `Send ${depositAmount || '0'} GRAM`}
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
            <h3 className="text-sm font-semibold text-white">USDT deposit (TON Jetton)</h3>
            <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Auto-detected
            </span>
          </div>

          {/* When wallet NOT connected: require wallet */}
          {!isWalletConnected && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 text-center">
                Connect your wallet to send USDT directly from the app — instant, just like a TON deposit.
              </p>
              <button onClick={() => tonConnectUI.openModal()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold hover:bg-blue-500/20 transition-colors">
                <Wallet className="w-4 h-4" /> Connect wallet
              </button>
            </div>
          )}

          {!isWalletConnected && !hasAddress && (
            <div className="flex flex-col items-center gap-3 py-2">
              <AlertCircle className="w-8 h-8 text-amber-400" />
              <p className="text-xs text-slate-400 text-center">Address not configured. Contact the admin.</p>
            </div>
          )}

          {/* When wallet IS connected: show connect indicator + amount + send */}
          {isWalletConnected && (
            <>
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs text-emerald-400 font-medium">{shortAddr(connectedAddr)}</span>
                </div>
                <button onClick={() => tonConnectUI.disconnect()}
                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-red-400 transition-colors">
                  <Unlink className="w-3 h-3" /> Disconnect
                </button>
              </div>

              <div>
                <p className="text-xs text-slate-400 mb-2">Amount sent (USDT)</p>
                <input type="number" step="0.1" min={0.1}
                  value={depositAmount}
                  onChange={e => { setDepositAmount(e.target.value); setTxError(''); }}
                  placeholder="Min: 0.1 USDT"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-lg font-semibold placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50" />
              </div>

              {/* GRAM conversion preview */}
              {depositAmount && parseFloat(depositAmount) > 0 && (
                <div className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'rgba(0,152,234,0.08)', border: '1px solid rgba(0,152,234,0.2)' }}>
                  <span className="text-xs text-slate-400">You will receive</span>
                  {tonPrice ? (
                    <span className="text-sm font-bold" style={{ color: '#0098EA' }}>
                      ≈ {gramFromUsdt(parseFloat(depositAmount) || 0)?.toFixed(4)} GRAM
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">Loading price…</span>
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
                  ⚠️ Platform address not configured by admin.
                </p>
              )}

              {tonPriceError && (
                <p className="text-[11px] text-red-400 text-center">
                  Unable to retrieve market price. Please try again later.
                </p>
              )}
              {/* Deposit code — same as GRAM, auto-included as Jetton comment */}
              <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 flex items-start gap-2">
                <span className="text-purple-400 text-xs">🔒</span>
                <p className="text-[10px] text-slate-400">
                  Deposit code <span className="font-mono font-bold text-purple-300">{depositCode}</span> automatically included in the transaction.
                </p>
              </div>
              {/* Gas requirement notice */}
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <span className="text-amber-400 text-xs">⛽</span>
                <p className="text-[10px] text-slate-400">
                  Sending USDT requires <span className="text-amber-300 font-semibold">≈ 0.15 TON</span> in your wallet for gas fees (returned if unused).
                </p>
              </div>
              <button onClick={() => void handleSendUSDT()}
                disabled={txStatus === 'pending' || !depositAmount || !hasAddress || !tonPrice}
                className="w-full btn-primary py-3.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed">
                {txStatus === 'pending'
                  ? '⏳ Waiting for signature…'
                  : tonPrice
                  ? `Send ${depositAmount || '0'} USDT via wallet`
                  : tonPriceError ? 'Price unavailable' : 'Loading market price…'}
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Other networks (manual, no auto-detection) ───────────── */}
      {isOtherNetwork && (
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">{selected?.symbol ?? ''} Deposit</h3>
          {hasAddress ? (
            <>
              <p className="text-xs text-slate-400">
                Send your {selected?.symbol} on the{' '}
                <span className="text-white font-medium">{selected?.network}</span> network to the address below:
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2.5 bg-white/5 rounded-lg text-xs text-white font-mono truncate">{address}</div>
                <button onClick={handleCopy} className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors">
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Minimum deposit</span>
                <span className="text-white font-medium">{selected?.minDeposit} {selected?.symbol}</span>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <p className="text-xs text-amber-400">⚠️ Send only {selected?.symbol} on the {selected?.network} network. The deposit will be validated manually by the administrator.</p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4">
              <AlertCircle className="w-10 h-10 text-amber-400" />
              <p className="text-sm text-amber-400 font-medium text-center">Address not configured</p>
              <p className="text-xs text-slate-400 text-center">The administrator must configure the address in Admin → Crypto & Networks.</p>
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
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Only native TON (GRAM) is withdrawable — USDT withdrawals not supported
  const withdrawNetworks = cryptoNetworks.filter(n => n.isActive && n.isWithdrawalEnabled && n.symbol === 'TON');
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

  const handleSubmit = async () => {
    if (isSubmitting || !selected) return;
    setError('');
    setIsSubmitting(true);
    try {
      const result = await submitWithdrawal(selected.id, parsedAmount, address);
      if (result.success) {
        haptic.success();
        localStorage.setItem('tc_last_wd_addr', address);
        setSuccess(true);
      } else {
        haptic.error();
        setError(result.error ?? 'Unknown error');
      }
    } finally {
      setIsSubmitting(false);
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
          <h2 className="text-xl font-bold text-white">Withdrawal submitted!</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Your withdrawal of {parsedAmount.toFixed(2)} {displaySymbol(selected?.symbol ?? 'GRAM')} is being processed.
            <br />You will receive{' '}
            <span className="text-emerald-400 font-semibold">
              {Math.max(0, netReceived).toFixed(2)} {displaySymbol(selected?.symbol ?? 'GRAM')}
            </span>{' '}
            after network fees.
          </p>
        </div>
        <div className="w-full p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <p className="text-xs text-amber-400 text-center">
            🔐 Admin validation within 12-24h · Your balance is reserved
          </p>
        </div>
        <button
          onClick={() => useAppStore.getState().setMiniAppPage('wallet')}
          className="btn-primary px-8 py-3.5 rounded-xl text-sm font-semibold text-white"
        >
          Back to wallet
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
        <h1 className="text-xl font-bold text-white">Withdraw</h1>
      </div>

      {/* Balance available */}
      <div className="glass-card-light p-3 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Withdrawable</span>
          <span className="text-sm font-bold text-blue-400">
            {Math.max(0, currentUser.balanceMain - currentUser.taskCredits).toFixed(2)} {displaySymbol(selected?.symbol ?? 'GRAM')}
          </span>
        </div>
        {currentUser.taskCredits > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500">Campaign credits (non-withdrawable)</span>
            <span className="text-[10px] text-blue-400 font-medium">{currentUser.taskCredits.toFixed(2)} GRAM</span>
          </div>
        )}
      </div>

      {/* Network */}
      <div>
        <p className="text-xs text-slate-400 mb-2">Network</p>
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

      {/* TON wallet auto-fill — for all TON-network withdrawals */}
      {isOnTONNetwork && (
        <div className="glass-card-light p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-400">Connected wallet</p>
          {tonWallet ? (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs text-emerald-400 font-mono">{rawToFriendly(connectedAddress).slice(0, 8)}...{rawToFriendly(connectedAddress).slice(-4)}</span>
              </div>
              <button onClick={() => tonConnectUI.disconnect()} className="text-[10px] text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors">
                <Unlink className="w-3 h-3" /> Disconnect
              </button>
            </div>
          ) : (
            <button onClick={() => tonConnectUI.openModal()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-colors">
              <Wallet className="w-3.5 h-3.5" /> Connect wallet to auto-fill
            </button>
          )}
        </div>
      )}

      {/* Amount */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-slate-400">Amount</p>
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
        <p className="text-xs text-slate-400 mb-2">Withdrawal address</p>
        <input
          type="text"
          value={address}
          onChange={e => { const v = e.target.value; setAddress(v); setError(''); try { localStorage.setItem('tc_last_wd_addr', v); } catch { /* noop */ } }}
          placeholder="Paste your address here"
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
        />
      </div>

      {/* Info */}
      {selected && (
        <div className="glass-card-light p-4 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Network fee</span>
            <span className="text-orange-400 font-medium">
              {selected.withdrawalFeeType === 'percentage'
                ? `${selected.withdrawalFee}% (${calcFee(parsedAmount).toFixed(4)} ${displaySymbol(selected.symbol)})`
                : `${selected.withdrawalFee} ${displaySymbol(selected.symbol)}`}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">You will receive</span>
            <span className="text-emerald-400 font-medium">{netReceived > 0 ? netReceived.toFixed(2) : '0.00'} {displaySymbol(selected.symbol)}</span>
          </div>
          {dailyRemaining !== null && (
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Remaining today</span>
              <span className={`font-medium ${dailyRemaining < 50 ? 'text-amber-400' : 'text-white'}`}>
                {dailyRemaining.toFixed(2)} / {perUserDailyLimit!.limit} {displaySymbol(selected.symbol)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Processing</span>
            <span className="text-amber-400 font-medium">Admin validation required 🔐</span>
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
          Your balance will be reserved immediately. The withdrawal will be processed within 12-24h after team validation.
        </p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!parsedAmount || !address.trim() || isSubmitting}
        className="w-full btn-accent py-3.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Submitting…' : `Withdraw ${parsedAmount > 0 ? parsedAmount.toFixed(2) : '0.00'} ${displaySymbol(selected?.symbol ?? 'GRAM')}`}
      </button>
    </div>
  );
};

const TX_FILTER_GROUPS: { id: string; label: string; types: string[] }[] = [
  { id: 'all',      label: 'All',       types: [] },
  { id: 'in',       label: '⬇ Incoming', types: ['deposit', 'reward', 'referral', 'bonus', 'admin_credit'] },
  { id: 'out',      label: '⬆ Outgoing', types: ['withdrawal', 'purchase', 'fee', 'admin_debit'] },
  { id: 'rewards',  label: '🎯 Tasks',  types: ['reward'] },
  { id: 'deposits', label: '💎 Deposits',  types: ['deposit'] },
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
          <h1 className="text-xl font-bold text-white">History</h1>
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
                ? "No transactions yet"
                : 'No transactions in this category'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
