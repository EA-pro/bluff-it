/**
 * AdSense — Bluff It web build (GitHub Pages).
 *
 * HOW TO GO LIVE (one paste, then redeploy):
 *   1. Log in to https://adsense.google.com  (your approved account).
 *   2. Find your Publisher ID:  Tools -> Payments -> "Client ID",
 *      or it is the ca-pub-… number shown on any of your ad-unit snippets.
 *      Paste it into ADSENSE_PUBLISHER_ID below (keep the quotes).
 *   3. For each screen you want ads on, create an ad unit:
 *      AdSense -> Assets -> Ad units -> "New unit" -> pick "Responsive" ->
 *      copy the 7-8 digit "slot" number -> paste into AD_UNITS below.
 *
 * SAFE BY DEFAULT: while ADSENSE_PUBLISHER_ID is '' (or a slot is ''),
 *   NO ad script is injected and NO slot renders — the app looks exactly
 *   the same as before. Fill in the values, run ./scripts/deploy-gh-pages.sh,
 *   and real ads appear on those screens.
 *
 * NOTE: web AdSense = DISPLAY ads only (auto-sized responsive units).
 *   There is no "rewarded video" on the web (that's native/AdMob). The
 *   rewarded flow in AdModal therefore shows a real display impression
 *   during its countdown instead of the fake TurboPuff creative.
 *
 * The fake reward layer (game/ads.ts + the fake creative) is untouched —
 * it is the no-account fallback and still drives the MOLE-pass / crown
 * avatar rewards. This file only controls whether a REAL ad is shown.
 */

/** Your AdSense publisher / client ID, e.g. 'ca-pub-1234567890'. Empty = disabled. */
export const ADSENSE_PUBLISHER_ID = 'ca-pub-9890103364432866';

/** Per-screen ad-unit "slot" numbers (the 7-8 digit ID from each AdSense unit). Empty = that screen has no ad. */
export const AD_UNITS = {
  /** HOME hub — the main menu screen (highest visibility). */
  home: '',
  /** GAME OVER — the end-of-game screen. */
  end: '',
  /** SHOP tab — idle browsing, good for passive impressions. */
  shop: '',
  /** The rewarded "watch an ad" modal (replaces the fake creative when set). */
  rewarded: '',
} as const;

export type AdSlotName = keyof typeof AD_UNITS;

/** True when a real ad can render on this slot (publisher + slot both set, web only handled by callers). */
export function isAdReady(name: AdSlotName): boolean {
  return ADSENSE_PUBLISHER_ID.length > 0 && AD_UNITS[name].length > 0;
}

/**
 * Inject the AdSense loader script exactly once, idempotent.
 * No-op when the publisher ID is empty, so an unconfigured build never
 * touches the DOM or the network.
 */
let scriptInjected = false;
export function pushAdSenseScript(client: string) {
  if (scriptInjected || typeof document === 'undefined') return;
  if (!client) return;
  scriptInjected = true;
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
  s.crossOrigin = 'anonymous';
  document.head.appendChild(s);
}
