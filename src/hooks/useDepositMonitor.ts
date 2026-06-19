import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { fetchAccountEvents } from '../lib/depositApi';

const SEEN_KEY = 'tc_deposit_seen';
const POLL_MS = 30_000;

function readSeen(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') as string[]); }
  catch { return new Set(); }
}

function markSeen(hash: string) {
  const s = readSeen();
  s.add(hash);
  localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(s).slice(-500)));
}

function addrEq(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

function depositCodeFor(user: { telegramId: number; id: string }): string {
  return user.telegramId !== 0 ? String(user.telegramId) : user.id.slice(-6).toUpperCase();
}

function getInitData(): string {
  try { return (window as unknown as { Telegram?: { WebApp?: { initData?: string } } })?.Telegram?.WebApp?.initData ?? ''; }
  catch { return ''; }
}

export function useDepositMonitor(): void {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = async () => {
    const state = useAppStore.getState();

    // Scan ALL users' pending deposits across the whole store
    const allPending = state.transactions.filter(
      tx => tx.type === 'deposit' && (tx.status === 'confirming' || tx.status === 'pending')
    );

    const tonNet = state.cryptoNetworks.find(n => n.symbol === 'TON' && n.isActive);
    const hotWallet = tonNet?.hotWalletAddress ?? '';
    if (hotWallet.length < 10) return;

    const usdtTonNet = state.cryptoNetworks.find(
      n => n.symbol === 'USDT' && n.network === 'TON' && n.isActive
    );
    const usdtJettonMaster = usdtTonNet?.contractAddress ?? '';

    // Always poll if hot wallet is configured — code-based deposits have no pending tx
    const seen = readSeen();

    let events;
    try { events = await fetchAccountEvents(hotWallet); }
    catch { return; }

    for (const ev of events) {
      if (ev.in_progress) continue;
      const txHash = ev.event_id;
      if (seen.has(txHash)) continue;

      for (const action of ev.actions) {
        if (action.status !== 'ok') continue;

        // ── Native TON transfer ──────────────────────────────────
        if (action.type === 'TonTransfer' && action.TonTransfer) {
          const { sender, amount, comment } = action.TonTransfer;
          const tonAmt = amount / 1_000_000_000;

          // 1) Try to match a pre-registered pending tx by sender address
          const match = allPending.find(tx => {
            if (tx.currency !== 'TON' || tx.network !== 'TON') return false;
            if (Math.abs(tx.amount - tonAmt) > 0.05) return false;
            if (tx.address) return addrEq(tx.address, sender.address);
            const ageSec = ev.timestamp - Math.floor(new Date(tx.createdAt).getTime() / 1000);
            return ageSec >= 0 && ageSec < 7200;
          });

          if (match) {
            markSeen(txHash);
            useAppStore.getState().confirmDeposit(match.id, txHash);
            // Record confirmed deposit in backend
            const matchUser = state.users.find(u => u.id === (state.transactions.find(t => t.id === match.id)?.userId ?? ''));
            if (matchUser?.telegramId) {
              void fetch('/api/deposit/record', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: match.id, telegramId: matchUser.telegramId, amount: tonAmt, currency: 'TON', network: 'TON', txHash, initData: getInitData() }),
              }).catch(() => {});
            }
            break;
          }

          // 2) Fallback: match by deposit code in transaction comment
          if (comment) {
            const codeStr = comment.trim();
            const user = state.users.find(u => depositCodeFor(u) === codeStr);
            if (user) {
              markSeen(txHash);
              useAppStore.getState().creditDeposit(user.id, tonAmt, 'TON', txHash, 'TON');
              if (user.telegramId) {
                void fetch('/api/deposit/record', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ telegramId: user.telegramId, amount: tonAmt, currency: 'TON', network: 'TON', txHash, initData: getInitData() }),
                }).catch(() => {});
              }
              break;
            }
          }
        }

        // ── Jetton transfer (USDT/TON) ───────────────────────────
        if (action.type === 'JettonTransfer' && action.JettonTransfer && usdtJettonMaster) {
          const { sender, amount, jetton, comment } = action.JettonTransfer;
          if (!addrEq(jetton.address, usdtJettonMaster)) continue;

          const usdtAmt = parseFloat(amount) / Math.pow(10, jetton.decimals);

          // 1) Try pre-registered pending tx by sender address
          const match = allPending.find(tx => {
            if (tx.currency !== 'USDT' || tx.network !== 'TON') return false;
            if (Math.abs(tx.amount - usdtAmt) > 0.1) return false;
            if (tx.address) return addrEq(tx.address, sender.address);
            const ageSec = ev.timestamp - Math.floor(new Date(tx.createdAt).getTime() / 1000);
            return ageSec >= 0 && ageSec < 7200;
          });

          // Helper: fetch TON price and return GRAM equivalent (2% below market)
          const toGram = async (usdt: number): Promise<number> => {
            try {
              const r = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=TONUSDT');
              const d = await r.json() as { price?: string };
              if (d.price) return parseFloat(((usdt / parseFloat(d.price)) * 0.98).toFixed(4));
            } catch { /* fallback below */ }
            try {
              const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd');
              const d = await r.json() as { 'the-open-network'?: { usd?: number } };
              const p = d['the-open-network']?.usd;
              if (p) return parseFloat(((usdt / p) * 0.98).toFixed(4));
            } catch { /* noop */ }
            return usdt; // last resort: 1:1 (should never happen in practice)
          };

          if (match) {
            markSeen(txHash);
            const gramAmt = await toGram(usdtAmt);
            // Credit GRAM (not USDT) — single balance
            useAppStore.setState(s => {
              const tx  = s.transactions.find(t => t.id === match.id);
              if (!tx) return s;
              const usr = s.users.find(u => u.id === tx.userId);
              if (!usr) return s;
              const nb = parseFloat((usr.balanceMain + gramAmt).toFixed(6));
              return {
                transactions: s.transactions.map(t => t.id === match.id
                  ? { ...t, status: 'completed' as const, txHash, amount: gramAmt, currency: 'GRAM', completedAt: new Date().toISOString() }
                  : t),
                users:       s.users.map(u => u.id === usr.id ? { ...u, balanceMain: nb, totalEarnings: parseFloat((usr.totalEarnings + gramAmt).toFixed(6)) } : u),
                currentUser: s.currentUser.id === usr.id ? { ...s.currentUser, balanceMain: nb, totalEarnings: parseFloat((s.currentUser.totalEarnings + gramAmt).toFixed(6)) } : s.currentUser,
              };
            });
            const matchTx = useAppStore.getState().transactions.find(t => t.id === match.id);
            if (matchTx) {
              useAppStore.getState().addNotification({ userId: matchTx.userId, type: 'deposit', title: 'Dépôt confirmé! 🎉', message: `+${gramAmt.toFixed(4)} GRAM crédité (${usdtAmt} USDT converti).`, isRead: false });
            }
            const matchUser = state.users.find(u => u.id === (state.transactions.find(t => t.id === match.id)?.userId ?? ''));
            if (matchUser?.telegramId) {
              void fetch('/api/deposit/record', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: match.id, telegramId: matchUser.telegramId, amount: gramAmt, currency: 'GRAM', network: 'TON', txHash, initData: getInitData() }),
              }).catch(() => {});
            }
            break;
          }

          // 2) Fallback: match by deposit code in Jetton comment/memo
          if (comment) {
            const codeStr = comment.trim();
            const user = state.users.find(u => depositCodeFor(u) === codeStr);
            if (user) {
              markSeen(txHash);
              const gramAmt = await toGram(usdtAmt);
              useAppStore.getState().creditDeposit(user.id, gramAmt, 'GRAM', txHash, 'TON (USDT→GRAM)');
              if (user.telegramId) {
                void fetch('/api/deposit/record', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ telegramId: user.telegramId, amount: gramAmt, currency: 'GRAM', network: 'TON', txHash, initData: getInitData() }),
                }).catch(() => {});
              }
              break;
            }
          }
        }
      }
    }
  };

  useEffect(() => {
    poll();
    timerRef.current = setInterval(poll, POLL_MS);

    // Poll immediately when user returns to the app
    const onVisible = () => { if (document.visibilityState === 'visible') poll(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
