type ImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
type NotifType   = 'error' | 'success' | 'warning';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const twa = (): any => (window as any)?.Telegram?.WebApp;

function impact(style: ImpactStyle = 'medium'): void {
  try { twa()?.HapticFeedback?.impactOccurred(style); } catch { /* noop */ }
}
function success(): void {
  try { twa()?.HapticFeedback?.notificationOccurred('success' as NotifType); } catch { /* noop */ }
}
function error(): void {
  try { twa()?.HapticFeedback?.notificationOccurred('error' as NotifType); } catch { /* noop */ }
}
function selection(): void {
  try { twa()?.HapticFeedback?.selectionChanged(); } catch { /* noop */ }
}

let _lastTick = 0;
function tick(minGapMs = 90): void {
  const now = Date.now();
  if (now - _lastTick < minGapMs) return;
  _lastTick = now;
  impact('light');
}

export const haptic = { impact, success, error, selection, tick };
