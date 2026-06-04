import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { fetchAccountEvents } from '../lib/depositApi';

const SEEN_KEY = 'tc_deposit_seen';
const POLL_MS = 30_000;

function readSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

function markSeen(hash: string) {
  const s = readSeen();
  s.add(hash);
  // Cap at 500 entries to avoid growing unbounded
  localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(s).slice(-500)));
}

function addrEq(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

export function useDepositMonitor(): void {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = async () => {
    // Only run when tab is visible
    if (document.visibilityState === 'hidden') return;

    const state = useAppStore.getState();

    // Only the current user's pending deposits matter in this frontend session
    const pending = state.transactions.filter(
      tx =>
        tx.type === 'deposit' &&
        (tx.status === 'confirming' || tx.status === 'pending') &&
        tx.userId === state.currentUser.id
    );
    if (pending.length === 0) return;

    // Use the TON network hot wallet — it receives both native TON and Jetton (USDT)
    const tonNet = state.cryptoNetworks.find(n => n.symbol === 'TON' && n.isActive);
    const hotWallet = tonNet?.hotWalletAddress ?? '';
    if (hotWallet.length < 10) return;

    // Also find USDT/TON network for its Jetton contract address
    const usdtTonNet = state.cryptoNetworks.find(
      n => n.symbol === 'USDT' && n.network === 'TON' && n.isActive
    );
    const usdtJettonMaster = usdtTonNet?.contractAddress ?? '';

    const seen = readSeen();

    let events;
    try {
      events = await fetchAccountEvents(hotWallet);
    } catch {
      return; // silently retry next tick
    }

    for (const ev of events) {
      if (ev.in_progress) continue;
      const txHash = ev.event_id;
      if (seen.has(txHash)) continue;

      for (const action of ev.actions) {
        if (action.status !== 'ok') continue;

        // ── Native TON transfer ──────────────────────────────────────
        if (action.type === 'TonTransfer' && action.TonTransfer) {
          const { sender, amount } = action.TonTransfer;
          const tonAmt = amount / 1_000_000_000;

          const match = pending.find(tx => {
            if (tx.currency !== 'TON' || tx.network !== 'TON') return false;
            if (Math.abs(tx.amount - tonAmt) > 0.05) return false; // ±0.05 TON gas tolerance

            if (tx.address) {
              // TonKeeper deposit: strict sender match
              return addrEq(tx.address, sender.address);
            }
            // Manual deposit: match by time window (< 2 h after tx creation)
            const ageSec = ev.timestamp - Math.floor(new Date(tx.createdAt).getTime() / 1000);
            return ageSec >= 0 && ageSec < 7200;
          });

          if (match) {
            markSeen(txHash);
            useAppStore.getState().confirmDeposit(match.id, txHash);
          }
        }

        // ── Jetton transfer (USDT/TON) ───────────────────────────────
        if (
          action.type === 'JettonTransfer' &&
          action.JettonTransfer &&
          usdtJettonMaster
        ) {
          const { sender, amount, jetton } = action.JettonTransfer;
          if (!addrEq(jetton.address, usdtJettonMaster)) continue;

          const usdtAmt = parseFloat(amount) / Math.pow(10, jetton.decimals);

          const match = pending.find(tx => {
            if (tx.currency !== 'USDT' || tx.network !== 'TON') return false;
            if (Math.abs(tx.amount - usdtAmt) > 0.1) return false; // ±0.1 USDT tolerance

            if (tx.address) {
              return addrEq(tx.address, sender.address);
            }
            const ageSec = ev.timestamp - Math.floor(new Date(tx.createdAt).getTime() / 1000);
            return ageSec >= 0 && ageSec < 7200;
          });

          if (match) {
            markSeen(txHash);
            useAppStore.getState().confirmDeposit(match.id, txHash);
          }
        }
      }
    }
  };

  useEffect(() => {
    poll();
    timerRef.current = setInterval(poll, POLL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
