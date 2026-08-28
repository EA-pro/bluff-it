import { useSyncExternalStore } from 'react';
import type { CategoryId, GameMode } from './types';
import { EXCLUSIVE_AVATARS, AVATARS } from './avatars';

/**
 * WALLET — the coin economy + loot box + game history (client-side, localStorage).
 *
 *  - coins     : earned from the daily bonus, finishing a game, fake-IAP packs
 *  - avatars   : premium (crown) avatars can be unlocked with coins (permanent)
 *  - categories: paid question packs unlockable with coins (permanent)
 *  - catPasses : one-time category play-passes from the LOOT BOX
 *  - loot box  : 50 coins per box, 1 free box/day, +1 ad box/day
 *  - history   : the last 20 finished games with full score detail
 *
 * Premium (subscription) bypasses ALL coin gates — the subscription stays the
 * "unlock everything" path, coins are the grind/whale path.
 */

// ---------- pricing ----------
export const SPIN_COST = 50;
export const AVATAR_PRICE = 150;
export const CAT_PRICE = 150;
export const DAILY_BASE = 50;
export const DAILY_WEEKLY = 150; // 7th-day streak bonus
export const GAME_BONUS = 25; // finishing a full game

export const COIN_PACKS = [
  { id: 'small', coins: 150, price: 1.99, badge: '' },
  { id: 'mid', coins: 450, price: 4.99, badge: '' },
  { id: 'big', coins: 1200, price: 9.99, badge: 'BEST DEAL 🤑' },
] as const;

const LS_KEY = 'bluff_wallet_v1';

// ---------- types ----------

export interface PlayedGame {
  id: string;
  ts: number;
  mode: GameMode;
  rounds: number;
  categories: CategoryId[];
  scores: { name: string; avatarId: string; score: number }[]; // sorted desc
  badges: { emoji: string; label: string; name: string }[];
}

export interface WalletState {
  coins: number;
  ownedAvatars: string[]; // premium/exclusive ids (free base avatars are implicit)
  ownedCategories: CategoryId[];
  catPasses: Record<string, number>;
  daily: { lastClaim: string; streak: number };
  spins: { lastFree: string; lastAd: string };
  history: PlayedGame[];
  totalSpent: number;
  spinsUsed: number;
  lastGameBonus: number; // for the End-screen toast
}

export type LootKind = 'coins50' | 'coins250' | 'coins150' | 'category' | 'exclusive';
export interface GachaResult {
  kind: LootKind;
  slot: number; // which box slot landed
  label: string;
  detail?: string;
}

// loot box layout — 12 slots (4×3 grid), one tile per slot, type per slot.
// 7× +50 · 3× category pass · 1× +250 · 1× secret drop
export const LOOT_SLOTS: LootKind[] = [
  'coins50', 'category', 'coins50', 'coins50',
  'coins50', 'exclusive', 'coins50', 'category',
  'coins250', 'category', 'coins50', 'coins50',
];
const SLOTS_BY_KIND: Record<LootKind, number[]> = LOOT_SLOTS.reduce(
  (acc, k, i) => {
    (acc[k] = acc[k] || []).push(i);
    return acc;
  },
  {} as Record<LootKind, number[]>,
);
// drop odds — one tile per slot, so the odds on the box are the real odds.
// 7× +50 (breaks even) · 3× category pass · 1× +250 · 1× secret drop.
// The box used to pay out far too generously; now most cracks break even and
// the big wins (+250, exclusives) are true jacks at ~1 in 12.
const WEIGHTS: [LootKind, number][] = [
  ['coins50', 7],
  ['category', 3],
  ['coins250', 1],
  ['exclusive', 1],
];

// ---------- state ----------

const DEFAULT_STATE: WalletState = {
  coins: 0,
  ownedAvatars: [],
  ownedCategories: [],
  catPasses: {},
  daily: { lastClaim: '', streak: 0 },
  spins: { lastFree: '', lastAd: '' },
  history: [],
  totalSpent: 0,
  spinsUsed: 0,
  lastGameBonus: 0,
};

function load(): WalletState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const p = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...p, daily: { ...DEFAULT_STATE.daily, ...(p.daily || {}) }, spins: { ...DEFAULT_STATE.spins, ...(p.spins || {}) } };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

let state: WalletState = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    /* private mode */
  }
}

function emit() {
  persist();
  listeners.forEach((l) => l());
}

export const walletStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  getState: () => state,
};

export function useWallet(): WalletState {
  return useSyncExternalStore(walletStore.subscribe, walletStore.getState, walletStore.getState);
}

// ---------- helpers ----------

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function isAvatarOwned(id: string): boolean {
  const base = AVATARS.find((a) => a.id === id);
  return !!base && !base.premium; // free base avatars: always owned (exclusives live in EXCLUSIVE_AVATARS)
}

export function canUseAvatar(id: string, isPro: boolean): boolean {
  return isPro || isAvatarOwned(id) || state.ownedAvatars.includes(id);
}

export function canUseCategory(id: CategoryId, isPro: boolean, free: boolean): boolean {
  return isPro || free || state.ownedCategories.includes(id);
}

// ---------- coins ----------

export function addCoins(n: number) {
  state = { ...state, coins: state.coins + n };
  emit();
}

export function spendCoins(n: number): boolean {
  if (state.coins < n) return false;
  state = { ...state, coins: state.coins - n, totalSpent: state.totalSpent + n };
  emit();
  return true;
}

/** Fake-IAP: buy a coin pack (in the real app this is a store billing handoff). */
export function buyCoinPack(packId: string) {
  const pack = COIN_PACKS.find((p) => p.id === packId);
  if (!pack) return;
  addCoins(pack.coins);
}

// ---------- avatar / category unlocks ----------

export function buyAvatar(id: string): boolean {
  if (state.ownedAvatars.includes(id)) return true;
  if (!spendCoins(AVATAR_PRICE)) return false;
  state = { ...state, ownedAvatars: [...state.ownedAvatars, id] };
  emit();
  return true;
}

export function buyCategory(id: CategoryId): boolean {
  if (state.ownedCategories.includes(id)) return true;
  if (!spendCoins(CAT_PRICE)) return false;
  state = { ...state, ownedCategories: [...state.ownedCategories, id] };
  emit();
  return true;
}

/**
 * Called by the store at game start: every paid category in this game's config
 * that is NOT permanently owned consumes one gacha pass (if available).
 * Returns the categories that were covered by a pass.
 */
export function consumeCategoryPasses(categories: CategoryId[], freeCats: CategoryId[], isPro: boolean): CategoryId[] {
  if (isPro) return categories.filter((c) => !freeCats.includes(c) && !state.ownedCategories.includes(c));
  const passes: CategoryId[] = [];
  const remaining = { ...state.catPasses };
  for (const c of categories) {
    if (freeCats.includes(c) || state.ownedCategories.includes(c)) continue;
    if ((remaining[c] ?? 0) > 0) {
      remaining[c] = remaining[c] - 1;
      passes.push(c);
    }
  }
  if (passes.length > 0) {
    state = { ...state, catPasses: remaining };
    emit();
  }
  return passes;
}

export function addCategoryPass(id: CategoryId) {
  state = { ...state, catPasses: { ...state.catPasses, [id]: (state.catPasses[id] ?? 0) + 1 } };
  emit();
}

// ---------- daily bonus ----------

export function dailyAvailable(): boolean {
  return state.daily.lastClaim !== todayStr();
}

export function dailyStreakToday(): number {
  // what the streak WILL be if claimed now
  if (state.daily.lastClaim === yesterdayStr()) return state.daily.streak + 1;
  return 1;
}

export function dailyAmountToday(): number {
  const s = dailyStreakToday();
  return s > 0 && s % 7 === 0 ? DAILY_WEEKLY : DAILY_BASE;
}

export function claimDaily(): { ok: boolean; amount: number; streak: number } {
  if (!dailyAvailable()) return { ok: false, amount: 0, streak: state.daily.streak };
  const streak = dailyStreakToday();
  const amount = streak % 7 === 0 ? DAILY_WEEKLY : DAILY_BASE;
  state = {
    ...state,
    coins: state.coins + amount,
    daily: { lastClaim: todayStr(), streak },
  };
  emit();
  return { ok: true, amount, streak };
}

// ---------- loot box ----------

export function canFreeSpin(): boolean {
  return state.spins.lastFree !== todayStr();
}

export function canAdSpin(): boolean {
  return state.spins.lastAd !== todayStr();
}

function rollKind(): LootKind {
  const ownedExclusives = EXCLUSIVE_AVATARS.every((e) => state.ownedAvatars.includes(e.id));
  // once both secret drops are collected, that tile becomes +250 instead
  const table: [LootKind, number][] = ownedExclusives
    ? WEIGHTS.map(([k, w]) => (k === 'exclusive' ? (['coins250', w] as [LootKind, number]) : [k, w]))
    : WEIGHTS;
  const total = table.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [k, w] of table) {
    r -= w;
    if (r <= 0) return k;
  }
  return table[table.length - 1][0];
}

/**
 * Crack one loot box. `source`: 'coins' spends SPIN_COST, 'free' uses the daily
 * free box, 'ad' uses the ad-earned box. Returns the landed reward + slot.
 */
export function spin(source: 'coins' | 'free' | 'ad'): GachaResult | null {
  if (source === 'coins') {
    if (!spendCoins(SPIN_COST)) return null;
    state = { ...state, spinsUsed: state.spinsUsed + 1 };
  } else if (source === 'free') {
    if (!canFreeSpin()) return null;
    state = { ...state, spins: { ...state.spins, lastFree: todayStr() } };
  } else {
    if (!canAdSpin()) return null;
    state = { ...state, spins: { ...state.spins, lastAd: todayStr() } };
  }

  let kind = rollKind();
  let slot = SLOTS_BY_KIND[kind][Math.floor(Math.random() * SLOTS_BY_KIND[kind].length)];
  let label: string;
  let detail: string | undefined;

  if (kind === 'coins50') {
    addCoinsNow(50);
    label = '+50';
    detail = 'coins';
  } else if (kind === 'coins250') {
    addCoinsNow(250);
    label = '+250';
    detail = 'coins';
  } else if (kind === 'coins150') {
    addCoinsNow(150);
    label = '+150';
    detail = 'coins';
  } else if (kind === 'category') {
    const paid = (['sexy', 'geo', 'animals'] as CategoryId[]).filter(
      (c) => !state.ownedCategories.includes(c) && !state.ownedAvatars.includes(c),
    );
    const pick = paid.length > 0 ? paid[Math.floor(Math.random() * paid.length)] : null;
    if (pick) {
      addCategoryPass(pick);
      label = '🎟️';
      detail = 'category pass';
    } else {
      // everything already unlocked — consolation coins instead
      kind = 'coins150';
      slot = SLOTS_BY_KIND.coins250[Math.floor(Math.random() * SLOTS_BY_KIND.coins250.length)];
      addCoinsNow(150);
      label = '+150';
      detail = 'coins (all categories unlocked!)';
    }
  } else {
    // exclusive avatar
    const unowned = EXCLUSIVE_AVATARS.filter((e) => !state.ownedAvatars.includes(e.id));
    if (unowned.length > 0) {
      const pick = unowned[Math.floor(Math.random() * unowned.length)];
      state = { ...state, ownedAvatars: [...state.ownedAvatars, pick.id] };
      label = pick.emoji;
      detail = pick.name;
    } else {
      kind = 'coins150';
      slot = SLOTS_BY_KIND.coins250[Math.floor(Math.random() * SLOTS_BY_KIND.coins250.length)];
      addCoinsNow(150);
      label = '+150';
      detail = 'coins (collected them all!)';
    }
  }

  emit();
  return { kind, slot, label, detail };
}

function addCoinsNow(n: number) {
  state = { ...state, coins: state.coins + n };
}

// ---------- game history ----------

/** Record a finished game + grant the play bonus. */
export function recordGame(
  mode: GameMode,
  rounds: number,
  categories: CategoryId[],
  scores: { name: string; avatarId: string; score: number }[],
  badges: { emoji: string; label: string; name: string }[],
) {
  const entry: PlayedGame = {
    id: 'g' + Date.now().toString(36),
    ts: Date.now(),
    mode,
    rounds,
    categories,
    scores: [...scores].sort((a, b) => b.score - a.score),
    badges,
  };
  state = {
    ...state,
    history: [entry, ...state.history].slice(0, 20),
    coins: state.coins + GAME_BONUS,
    lastGameBonus: GAME_BONUS,
  };
  emit();
}

export function resetWallet() {
  state = { ...DEFAULT_STATE, history: [] };
  emit();
}
