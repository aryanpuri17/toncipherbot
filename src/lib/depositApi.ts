// TonAPI v2 — free public endpoint, no API key required (1 req/s rate limit)
const BASE = 'https://tonapi.io/v2';

export interface TonApiAccount {
  address: string; // raw format: "0:abcdef..."
  name?: string | null;
}

export interface TonApiTonTransfer {
  sender: TonApiAccount;
  recipient: TonApiAccount;
  amount: number; // nanotons (integer)
  comment?: string | null;
}

export interface TonApiJettonTransfer {
  sender: TonApiAccount;
  recipient: TonApiAccount;
  senders_wallet: string;
  recipients_wallet: string;
  amount: string; // string in minimal jetton units
  comment?: string | null;
  jetton: {
    address: string; // raw "0:..."
    name: string;
    symbol: string;
    decimals: number;
  };
}

export interface TonApiAction {
  type: string;
  status: 'ok' | 'failed';
  TonTransfer?: TonApiTonTransfer;
  JettonTransfer?: TonApiJettonTransfer;
}

export interface TonApiEvent {
  event_id: string;
  timestamp: number; // unix seconds
  actions: TonApiAction[];
  in_progress: boolean;
  lt: number;
}

export async function fetchAccountEvents(address: string): Promise<TonApiEvent[]> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(
      `${BASE}/accounts/${encodeURIComponent(address)}/events?limit=50&subject_only=true`,
      { signal: controller.signal }
    );
    if (!res.ok) throw new Error(`TonAPI ${res.status}`);
    const data = await res.json() as { events?: TonApiEvent[] };
    return data.events ?? [];
  } finally {
    clearTimeout(t);
  }
}
