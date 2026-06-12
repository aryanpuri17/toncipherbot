import { useAppStore } from '../store/appStore';
import type { Transaction } from '../store/appStore';

export interface ServerWithdrawal {
  id: string;
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

function readProcessed(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(PROCESSED_KEY) ?? '[]') as string[]); }
  catch { return new Set(); }
}

function writeProcessed(ids: Set<string>): void {
  try { localStorage.setItem(PROCESSED_KEY, JSON.stringify(Array.from(ids).slice(-200))); }
  catch { /* noop */ }
}

const SERVER_TO_LOCAL: Record<string, Transaction['status']> = {
  pending:   'pending',
  completed: 'completed',
  rejected:  'cancelled',
};

/**
 * Reconcile the local transaction list (and balance) with the server's
 * withdrawal records.
 *
 * - Approved withdrawals flip from "pending" to "completed" in the wallet.
 * - Rejected withdrawals flip to "cancelled" and the amount is re-credited.
 * - Withdrawals missing locally (lost on reload — the store is in-memory)
 *   are re-inserted so the history stays complete.
 *
 * `suppressEffects` marks every terminal withdrawal as processed WITHOUT
 * crediting balances or notifying. Used right after adopting the server-side
 * balance backup, which already reflects those outcomes.
 */
export function processWithdrawals(list: ServerWithdrawal[], suppressEffects = false): void {
  if (!Array.isArray(list) || list.length === 0) return;

  const processed = readProcessed();
  let restored = 0;
  const newlyCompleted: ServerWithdrawal[] = [];
  const newlyRejected:  ServerWithdrawal[] = [];

  for (const wd of list) {
    if (wd.status !== 'completed' && wd.status !== 'rejected') continue;
    if (processed.has(wd.id)) continue;
    processed.add(wd.id);
    if (suppressEffects) continue;
    if (wd.status === 'rejected') {
      restored += wd.amount;
      newlyRejected.push(wd);
    } else {
      newlyCompleted.push(wd);
    }
  }

  useAppStore.setState(s => {
    const byId = new Map(s.transactions.map(t => [t.id, t] as const));
    let changed = false;

    for (const wd of list) {
      const target = SERVER_TO_LOCAL[wd.status] ?? 'pending';
      const existing = byId.get(wd.id);
      if (existing) {
        if (existing.status !== target) {
          byId.set(wd.id, {
            ...existing,
            status:      target,
            txHash:      wd.txHash ?? existing.txHash,
            adminNote:   wd.adminNote ?? existing.adminNote,
            completedAt: wd.processedAt ?? existing.completedAt,
          });
          changed = true;
        }
      } else {
        byId.set(wd.id, {
          id:          wd.id,
          userId:      s.currentUser.id,
          type:        'withdrawal',
          amount:      wd.amount,
          currency:    wd.currency,
          network:     wd.network ?? 'TON',
          address:     wd.address ?? '',
          status:      target,
          txHash:      wd.txHash ?? undefined,
          adminNote:   wd.adminNote ?? undefined,
          createdAt:   wd.createdAt ?? new Date().toISOString(),
          completedAt: wd.processedAt ?? undefined,
        });
        changed = true;
      }
    }

    if (!changed && restored === 0) return s;

    const transactions = Array.from(byId.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (restored === 0) return { ...s, transactions };

    const newBalance = +(s.currentUser.balanceMain + restored).toFixed(6);
    return {
      ...s,
      transactions,
      currentUser: { ...s.currentUser, balanceMain: newBalance },
      users: s.users.map(u => u.id === s.currentUser.id ? { ...u, balanceMain: newBalance } : u),
    };
  });

  const { addNotification } = useAppStore.getState();
  for (const wd of newlyCompleted) {
    addNotification({
      type: 'withdrawal', title: 'Retrait approuvé ! ✅',
      message: `Votre retrait de ${wd.amount.toFixed(2)} ${wd.currency} a été envoyé.`,
      isRead: false,
    });
  }
  for (const wd of newlyRejected) {
    addNotification({
      type: 'withdrawal', title: 'Retrait refusé',
      message: `${wd.amount.toFixed(2)} ${wd.currency} recrédité sur votre solde.${wd.adminNote ? ` Motif : ${wd.adminNote}` : ''}`,
      isRead: false,
    });
  }

  writeProcessed(processed);
}

/** Fetch the caller's withdrawals from the backend and reconcile them. */
export async function syncWithdrawals(telegramId: number): Promise<void> {
  if (!telegramId) return;
  let list: ServerWithdrawal[];
  try {
    const res = await fetch(`/api/user/withdrawals?telegram_id=${telegramId}`);
    if (!res.ok) return;
    list = await res.json() as ServerWithdrawal[];
  } catch { return; }
  processWithdrawals(list);
}
