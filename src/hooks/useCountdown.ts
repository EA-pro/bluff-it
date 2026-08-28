import { useEffect, useLayoutEffect, useState } from 'react';

/**
 * Ticking countdown.
 * @param endsAt epoch ms when the timer ends (null = inactive)
 * @param totalSeconds full duration, for progress normalization
 *
 * SSR-safe: initial `now` is 0 (a stable hydration value); the real clock is
 * synced in useLayoutEffect before first paint.
 */
export function useCountdown(endsAt: number | null, totalSeconds: number) {
  const [now, setNow] = useState(0);
  useLayoutEffect(() => {
    setNow(Date.now());
    if (!endsAt) return;
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, [endsAt]);
  if (!endsAt) return { remainingMs: 0, remainingSec: 0, progress: 1, expired: false };
  // not synced yet (first client paint) — show full time
  if (now === 0) return { remainingMs: totalSeconds * 1000, remainingSec: totalSeconds, progress: 1, expired: false };
  const remainingMs = Math.max(0, endsAt - now);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const progress = totalSeconds > 0 ? Math.min(1, remainingMs / (totalSeconds * 1000)) : 0;
  return { remainingMs, remainingSec, progress, expired: remainingMs <= 0 };
}
