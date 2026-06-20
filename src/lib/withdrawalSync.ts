import { useAppStore } from '../store/appStore';
import type { Transaction } from '../store/appStore';

export interface ServerTx {
  id: string;
  type?: string;           // 'deposit' | 'withdrawal' (absent on the legacy withdrawals endpoint)
  amount: number;
  currency: string;
  status: string;          // pending | completed | rejected
  processedAt?: string | null;
  adminNote?: string | null;
  createdAt?: string;
  txHash?: string | null;
  address?: string | null;
  network?: string | null;
}

// Withdrawal ids whose terminal status (approved/rejected) has already been
// handled locally — prevents re-crediting a rejection or re-notifying an
// approval on every poll / app open.
const PROCESSED_KEY = 'tc_wd_processed';

// Deposit ids that have already been credited to balance — prevents re-crediting
// on every app open (transactions are in-memory and reset on reload).
const DEP_CREDITED_KEY = 'tc_dep_credited';

function readDepCredited(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(DEP_CREDITED_KEY) ?? '[]') as string[]); }
  catch { return new Set(); }
}

function writeDepCredited(ids: Set<string>): void {
  try { localStorage.setItem(DEP_CREDITED_KEY, JSON.stringify(Array.from(ids).slice(-1000))); }
  catch { /* noop */ }
}

function readProcessed(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(PROCESSED_KEY) ?? '[]') as string[]); }
  catch { return new Set(); }
}

function writeProcessed(ids: Set<string>): void {
  try { localStorage.setItem(PROCESSED_KEY, JSON.stringify(Array.from(ids).slice(-500))); }
  catch { /* noop */ }
}

const SERVER_TO_LOCAL: Record<string, Transaction['status']> = {
  pending:   'pending',
  completed: 'completed',
  rejected:  'cancelled',
};

/**
 * Reconcile the local transaction list (and balance) with the server's
 * records.
 *
 * - Approved withdrawals flip from "pending" to "completed" in the wallet.
 * - Rejected withdrawals flip to "cancelled" and the amount is re-credited.
 * - Deposits and withdrawals missing locally (lost on reload — the store is
 *   in-memory) are re-inserted so the history stays complete. Merging a
 *   deposit never credits balance: that happened at deposit time and lives
 *   in the server-side balance backup.
 *
 * `suppressEffects` marks every terminal withdrawal as processed WITHOUT
 * crediting balances or notifying. Used right after adopting the server-side
 * balance backup, which already reflects those outcomes.
 */
export function processServerTransactions(list: ServerTx[], suppressEffects = false): void {
  if (!Array.isArray(list) || list.length === 0) return;

  const processed    = readProcessed();
  const depCredited  = readDepCredited();
  let restored = 0;
  let depositCredit = 0;
  const newlyCompleted: ServerTx[] = [];
  const newlyRejected:  ServerTx[] = [];
  const newDeposits:    ServerTx[] = [];

  for (const tx of list) {
    const txType = tx.type ?? 'withdrawal';

    if (txType === 'deposit' && tx.status === 'completed') {
      if (!depCredited.has(tx.id) && !suppressEffects) {
        depositCredit += tx.amount;
        newDeposits.push(tx);
        depCredited.add(tx.id);
      }
      continue; // handled separately from withdrawals
    }

    if (txType !== 'withdrawal') continue;
    if (tx.status !== 'completed' && tx.status !== 'rejected') continue;
    if (processed.has(tx.id)) continue;
    processed.add(tx.id);
    if (suppressEffects) continue;
    if (tx.status === 'rejected') {
      restored += tx.amount;
      newlyRejected.push(tx);
    } else {
      newlyCompleted.push(tx);
    }
  }

  useAppStore.setState(s => {
    const byId = new Map(s.transactions.map(t => [t.id, t] as const));
    let changed = false;

    for (const tx of list) {
      const txType = (tx.type ?? 'withdrawal') as Transaction['type'];
      if (txType !== 'withdrawal' && txType !== 'deposit') continue;
      const target = SERVER_TO_LOCAL[tx.status] ?? 'pending';
      const existing = byId.get(tx.id);
      if (existing) {
        if (existing.status !== target) {
          byId.set(tx.id, {
            ...existing,
            status:      target,
            txHash:      tx.txHash ?? existing.txHash,
            adminNote:   tx.adminNote ?? existing.adminNote,
            completedAt: tx.processedAt ?? existing.completedAt,
          });
          changed = true;
        }
      } else {
        byId.set(tx.id, {
          id:          tx.id,
          userId:      s.currentUser.id,
          type:        txType,
          amount:      tx.amount,
          currency:    tx.currency,
          network:     tx.network ?? 'TON',
          address:     tx.address ?? '',
          status:      target,
          txHash:      tx.txHash ?? undefined,
          adminNote:   tx.adminNote ?? undefined,
          createdAt:   tx.createdAt ?? new Date().toISOString(),
          completedAt: tx.processedAt ?? undefined,
        });
        changed = true;
      }
    }

    if (!changed && restored === 0 && depositCredit === 0) return s;

    const transactions = Array.from(byId.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (restored === 0 && depositCredit === 0) return { ...s, transactions };

    const newBalance = +(s.currentUser.balanceMain + restored + depositCredit).toFixed(6);
    return {
      ...s,
      transactions,
      currentUser: { ...s.currentUser, balanceMain: newBalance, totalEarnings: +(s.currentUser.totalEarnings + depositCredit).toFixed(6) },
      users: s.users.map(u => u.id === s.currentUser.id ? { ...u, balanceMain: newBalance, totalEarnings: +(u.totalEarnings + depositCredit).toFixed(6) } : u),
    };
  });

  const { addNotification } = useAppStore.getState();
  for (const tx of newlyCompleted) {
    addNotification({
      type: 'withdrawal', title: 'Retrait approuvé ! ✅',
      message: `Votre retrait de ${tx.amount.toFixed(2)} ${tx.currency} a été envoyé.`,
      isRead: false,
    });
  }
  for (const tx of newlyRejected) {
    addNotification({
      type: 'withdrawal', title: 'Retrait refusé',
      message: `${tx.amount.toFixed(2)} ${tx.currency} recrédité sur votre solde.${tx.adminNote ? ` Motif : ${tx.adminNote}` : ''}`,
      isRead: false,
    });
  }

  // Write both sets to localStorage BEFORE setState so a crash between here
  // and the state update cannot cause double-crediting on the next open.
  writeProcessed(processed);
  if (newDeposits.length > 0) writeDepCredited(depCredited);

  for (const tx of newDeposits) {
    const { addNotification } = useAppStore.getState();
    addNotification({
      type: 'deposit',
      title: 'Dépôt confirmé ! 🎉',
      message: `+${tx.amount.toFixed(4)} GRAM crédité depuis ${tx.amount.toFixed(2)} USDT détecté on-chain.`,
      isRead: false,
    });
  }
}

/** Fetch the caller's deposits + withdrawals and reconcile them locally. */
export async function syncServerTransactions(telegramId: number, suppressEffects = false): Promise<void> {
  if (!telegramId) return;
  let list: ServerTx[];
  try {
    const res = await fetch(`/api/user/transactions?telegram_id=${telegramId}`);
    if (!res.ok) return;
    list = await res.json() as ServerTx[];
  } catch { return; }
  processServerTransactions(list, suppressEffects);
}
