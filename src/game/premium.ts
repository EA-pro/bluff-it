import { useSyncExternalStore } from 'react';

/**
 * Premium / subscription layer (client-side demo paywall).
 *
 *  - GATE_KEY  : the password on the front page. Web scrapers (and strangers)
 *                can't reach the game without it.
 *  - ADMIN_KEY : the master key. Entering it unlocks EVERYTHING (no paywall,
 *                no daily limits) — for the owner of the game.
 *  - premium   : a (simulated) monthly/yearly subscription that unlocks the
 *                premium avatars, unlimited face-scan and unlimited Mole mode.
 *
 * All state lives in localStorage (survives refresh, per-device).
 */

export const GATE_KEY = 'efrim';
export const ADMIN_KEY = 'efrim';

// daily free limits
export const FACE_SCAN_FREE_PER_DAY = 3;
export const MOLE_FREE_PER_DAY = 1;

// pricing (shown in the premium sheet) — yearly is the discounted one
export const PLANS = {
  monthly: {
    label: 'Monthly',
    price: 4.99,
    oldPrice: 4.99,
    per: 'per month',
    badge: '',
  },
  yearly: {
    label: 'Yearly',
    price: 24.99,
    oldPrice: 59.88, // 12 x monthly
    per: 'per year',
    badge: 'SAVE 58% 🤑',
  },
} as const;

const LS = {
  gate: 'bluff_gate_unlocked',
  admin: 'bluff_admin',
  premium: 'bluff_premium',
  premiumPlan: 'bluff_premium_plan',
  moleDate: 'bluff_mole_last_date',
  scanDate: 'bluff_scan_date',
  scanCount: 'bluff_scan_count',
};

// ---------- tiny store (same pattern as the game store) ----------

export type PremiumState = {
  unlocked: boolean;   // gate passed
  admin: boolean;      // master key active
  premium: boolean;    // subscription active
  plan: 'monthly' | 'yearly' | null;
  scansToday: number;  // face scans used today (free tier)
  molePlaysToday: number;
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

function computeState(): PremiumState {
  const ls = typeof localStorage !== 'undefined' ? localStorage : null;
  return {
    unlocked: !!ls?.getItem(LS.gate),
    admin: !!ls?.getItem(LS.admin),
    premium: !!ls?.getItem(LS.premium),
    plan: (ls?.getItem(LS.premiumPlan) as 'monthly' | 'yearly' | null) ?? null,
    scansToday: readNum(LS.scanCount, LS.scanDate),
    molePlaysToday: readNum(LS.moleDate ? '1' : '0', null) === 1 && ls?.getItem(LS.moleDate) === todayStr() ? 1 : readNum(LS.moleDate, LS.moleDate),
  };
}

let state: PremiumState = computeState();
let listeners = new Set<() => void>();
function emit() {
  state = computeState();
  listeners.forEach((l) => l());
}

export const premiumStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  getState: () => state,
};

// ---------- accessors ----------

export function isUnlocked(): boolean {
  return !!state.unlocked;
}

/** The gate: enter the front-page password. */
export function unlockGate(input: string): boolean {
  if (input.trim().toLowerCase() === GATE_KEY) {
    try {
      localStorage.setItem(LS.gate, '1');
    } catch {
      /* private mode — stay unlocked for this tab */
    }
    emit();
    return true;
  }
  return false;
}

/** Admin master key — unlocks every feature, forever on this device. */
export function activateAdmin(input: string): boolean {
  if (input.trim().toLowerCase() === ADMIN_KEY) {
    try {
      localStorage.setItem(LS.admin, '1');
    } catch {
      /* ignore */
    }
    emit();
    return true;
  }
  return false;
}

export function isAdmin(): boolean {
  return state.admin;
}

export function isPremium(): boolean {
  return state.admin || state.premium;
}

/**
 * Simulated checkout. In the real app this would hand off to the store's
 * billing; here it just marks the subscription active for the device.
 */
export function purchasePremium(plan: 'monthly' | 'yearly') {
  try {
    localStorage.setItem(LS.premium, '1');
    localStorage.setItem(LS.premiumPlan, plan);
  } catch {
    /* ignore */
  }
  emit();
}

export function cancelPremium() {
  try {
    localStorage.removeItem(LS.premium);
    localStorage.removeItem(LS.premiumPlan);
  } catch {
    /* ignore */
  }
  emit();
}

// ---------- daily limits (free tier) ----------

/** Free face-scans left today (premium/admin: unlimited). */
export function scansLeftToday(): number {
  if (isPremium()) return Infinity;
  return Math.max(0, FACE_SCAN_FREE_PER_DAY - state.scansToday);
}

/** Register a face scan (called when a scan completes). */
export function consumeFaceScan() {
  try {
    if (localStorage.getItem(LS.scanDate) !== todayStr()) {
      localStorage.setItem(LS.scanDate, todayStr());
      localStorage.setItem(LS.scanCount, '1');
    } else {
      const n = readNum(LS.scanCount, LS.scanDate) + 1;
      localStorage.setItem(LS.scanCount, String(n));
    }
  } catch {
    /* ignore */
  }
  emit();
}

/** Has the free Mole-mode play for today been used? (premium/admin: never) */
export function molePlayUsedToday(): boolean {
  if (isPremium()) return false;
  try {
    return localStorage.getItem(LS.moleDate) === todayStr();
  } catch {
    return false;
  }
}

/** Register a Mole-mode game (free tier: 1 per day). */
export function registerMolePlay() {
  try {
    if (localStorage.getItem(LS.moleDate) !== todayStr()) {
      localStorage.setItem(LS.moleDate, todayStr());
    }
  } catch {
    /* ignore */
  }
  emit();
}

// ---------- react hook ----------

export function usePremium(): PremiumState {
  return useSyncExternalStore(
    premiumStore.subscribe,
    premiumStore.getState,
    premiumStore.getState,
  );
}
