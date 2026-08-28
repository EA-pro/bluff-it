import { useSyncExternalStore } from 'react';

/**
 * FAKE rewarded-ads layer (client-side simulation of an ad network).
 *
 * Free-tier players can watch a short "ad" to earn a one-time pass:
 *  - MOLE pass   : one extra MOLE game for today (beyond the 1/day free play)
 *  - AVATAR pass : use one crown-tier avatar for this setup (one player each)
 *
 * Caps that keep the paywall meaningful (and "drive revenue"):
 *  - 5 rewarded ads per day (then the paywall is the only option)
 *  - 30s cooldown between ads
 *
 * All state lives in localStorage, same pattern as premium.ts.
 */

const LS = {
  adDate: 'bluff_ad_date',
  adCount: 'bluff_ad_count',
  adLast: 'bluff_ad_last_at',
  molePassDate: 'bluff_molepass_date',
  molePassUsed: 'bluff_molepass_used',
  avatarPass: 'bluff_avatarpass_id',
};

export const AD_FREE_PER_DAY = 5;
export const AD_COOLDOWN_MS = 30_000;

export type AdsState = {
  adsUsedToday: number;
  adsLeftToday: number;
  coolingDown: boolean;
  molePassAvailable: boolean;
  avatarPassId: string | null;
};

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function readNum(key: string, dateKey: string | null): number {
  if (typeof localStorage === 'undefined') return 0;
  if (dateKey && localStorage.getItem(dateKey) !== todayStr()) return 0;
  const v = parseInt(localStorage.getItem(key) ?? '0', 10);
  return Number.isFinite(v) ? v : 0;
}

function computeState(): AdsState {
  const ls = typeof localStorage !== 'undefined' ? localStorage : null;
  if (!ls) {
    return { adsUsedToday: 0, adsLeftToday: AD_FREE_PER_DAY, coolingDown: false, molePassAvailable: false, avatarPassId: null };
  }
  const used = readNum(LS.adCount, LS.adDate);
  const lastAt = parseInt(ls.getItem(LS.adLast) ?? '0', 10) || 0;
  const molePassDate = ls.getItem(LS.molePassDate);
  const molePassUsed = ls.getItem(LS.molePassUsed) === '1';
  const avatarPassId = ls.getItem(LS.avatarPass);
  return {
    adsUsedToday: used,
    adsLeftToday: Math.max(0, AD_FREE_PER_DAY - used),
    coolingDown: Date.now() - lastAt < AD_COOLDOWN_MS,
    molePassAvailable: molePassDate === todayStr() && !molePassUsed,
    avatarPassId: avatarPassId || null,
  };
}

let state: AdsState = computeState();
let listeners = new Set<() => void>();
function emit() {
  state = computeState();
  listeners.forEach((l) => l());
}

export const adsStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  getState: () => state,
};

// ---------- actions ----------

/** Can the player watch another rewarded ad right now? */
export function adAvailable(): boolean {
  return state.adsLeftToday > 0 && !state.coolingDown;
}

/** Register a completed ad (call when the player claims the reward). */
export function completeAd() {
  try {
    if (localStorage.getItem(LS.adDate) !== todayStr()) {
      localStorage.setItem(LS.adDate, todayStr());
      localStorage.setItem(LS.adCount, '1');
    } else {
      const n = readNum(LS.adCount, LS.adDate) + 1;
      localStorage.setItem(LS.adCount, String(n));
    }
    localStorage.setItem(LS.adLast, String(Date.now()));
  } catch {
    /* private mode — the pass still works for this session */
  }
  emit();
}

// ---------- MOLE pass (one extra MOLE game today) ----------

export function molePassAvailable(): boolean {
  return state.molePassAvailable;
}

export function grantMolePass() {
  try {
    localStorage.setItem(LS.molePassDate, todayStr());
    localStorage.setItem(LS.molePassUsed, '0');
  } catch {
    /* ignore */
  }
  emit();
}

export function useMolePass() {
  try {
    if (localStorage.getItem(LS.molePassDate) === todayStr()) {
      localStorage.setItem(LS.molePassUsed, '1');
    }
  } catch {
    /* ignore */
  }
  emit();
}

// ---------- AVATAR pass (one crown-tier avatar, consumed per use) ----------

export function avatarPassId(): string | null {
  return state.avatarPassId;
}

export function grantAvatarPass(avatarId: string) {
  try {
    localStorage.setItem(LS.avatarPass, avatarId);
  } catch {
    /* ignore */
  }
  emit();
}

export function consumeAvatarPass() {
  try {
    localStorage.removeItem(LS.avatarPass);
  } catch {
    /* ignore */
  }
  emit();
}

export function useAds(): AdsState {
  return useSyncExternalStore(
    adsStore.subscribe,
    adsStore.getState,
    adsStore.getState,
  );
}

// ---------- the "ad creative" (purely cosmetic) ----------

export type AdCreative = { emoji: string; brand: string; headline: string; sub: string };

const CREATIVES: AdCreative[] = [
  { emoji: '🧻', brand: 'TurboPuff™ Ultra-Soft', headline: '40% OFF today!', sub: 'So soft it feels like a cloud hug' },
  { emoji: '🥤', brand: 'SlurpWave™ Lemonade', headline: 'NEW FLAVOR: BOLT', sub: 'Tastes like 3am energy' },
  { emoji: '👟', brand: 'CloudStep™ Sneakers', headline: 'Walk on clouds, not floors', sub: 'Free shipping this week only' },
  { emoji: '📱', brand: 'PhoneGrip™ Case', headline: 'One case to rule them all', sub: 'Drop-proof. Bluff-proof.' },
  { emoji: '🧲', brand: 'StickSnap™ MagClips', headline: 'Snap on. Never off.', sub: 'Now with 2x more grip' },
];

export function randomCreative(): AdCreative {
  return CREATIVES[Math.floor(Math.random() * CREATIVES.length)];
}
