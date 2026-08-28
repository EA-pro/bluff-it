/**
 * AI face → emoji. Reads the real 68 face landmarks (on-device, face-api.js)
 * and picks the emoji that best matches the person's face + expression.
 * Deterministic for a given landmark set + seed, so the same face gives the
 * same result.
 */

type Pt = { x: number; y: number };
type Box = { x: number; y: number; width: number; height: number };

export type FaceVibe = {
  emoji: string;
  label: string; // "The Big Grin" — shown in the result screen
};

type Tier =
  | 'grin'
  | 'soft'
  | 'neutral'
  | 'surprised'
  | 'wink'
  | 'sassy'
  | 'weird'
  | 'cute';

const POOL: { tier: Tier; emoji: string; label: string }[] = [
  { tier: 'grin', emoji: '😄', label: 'The Hype' },
  { tier: 'grin', emoji: '😀', label: 'The Big Grin' },
  { tier: 'grin', emoji: '😛', label: 'The Goofball' },
  { tier: 'grin', emoji: '😜', label: 'The Gremlin' },
  { tier: 'grin', emoji: '😁', label: 'The Show-Off' },
  { tier: 'soft', emoji: '🙂', label: 'The Nice One' },
  { tier: 'soft', emoji: '😊', label: 'The Angel' },
  { tier: 'soft', emoji: '🥰', label: 'The Softest' },
  { tier: 'soft', emoji: '😇', label: 'The Halo' },
  { tier: 'neutral', emoji: '😐', label: 'The Stone' },
  { tier: 'neutral', emoji: '🤔', label: 'The Thinker' },
  { tier: 'neutral', emoji: '😑', label: 'The Mute' },
  { tier: 'neutral', emoji: '🤨', label: 'The Skeptic' },
  { tier: 'surprised', emoji: '😮', label: 'The Shocked' },
  { tier: 'surprised', emoji: '🤯', label: 'The Meltdown' },
  { tier: 'surprised', emoji: '😳', label: 'The Blush' },
  { tier: 'surprised', emoji: '🤪', label: 'The Chaos' },
  { tier: 'wink', emoji: '😉', label: 'The Flirt' },
  { tier: 'wink', emoji: '🙃', label: 'The Deadpan' },
  { tier: 'wink', emoji: '😏', label: 'The Smirk' },
  { tier: 'sassy', emoji: '😒', label: 'The Grumpy' },
  { tier: 'sassy', emoji: '😤', label: 'The Fuming' },
  { tier: 'weird', emoji: '🙄', label: 'The Side-Eye' },
  { tier: 'weird', emoji: '😴', label: 'The Sleepy' },
  { tier: 'weird', emoji: '🥱', label: 'The Bored' },
  { tier: 'cute', emoji: '🐸', label: 'The Frog' },
  { tier: 'cute', emoji: '🐵', label: 'The Chimp' },
  { tier: 'cute', emoji: '🦊', label: 'The Slick' },
  { tier: 'cute', emoji: '🐼', label: 'The Bear' },
  { tier: 'cute', emoji: '🦁', label: 'The King' },
  { tier: 'cute', emoji: '🐨', label: 'The Koala' },
  { tier: 'cute', emoji: '🐷', label: 'The Piggly' },
  { tier: 'cute', emoji: '🐙', label: 'The Squid' },
  { tier: 'cute', emoji: '🦖', label: 'The Dinosaur' },
  { tier: 'cute', emoji: '🐱', label: 'The Cat' },
  { tier: 'cute', emoji: '🐶', label: 'The Doggo' },
  { tier: 'cute', emoji: '🐹', label: 'The Hamster' },
];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export type FaceFeatures = {
  eyeSpace: number;
  eyeSize: number;    // how open the eyes are
  eyeAsym: number;    // 0..1, how uneven the two eyes are
  browLift: number;   // how high the brows sit
  mouthCurve: number; // -1 frown .. +1 big smile
  mouthOpen: boolean;
  mouthWide: number;
  faceWide: number;
};

/** Extract normalized features from 68 landmarks (same math as the old spec). */
export function featuresFromLandmarks(lm: Pt[], box: Box): FaceFeatures {
  const bw = box.width || 1;
  const rEye = { x: (lm[36].x + lm[39].x) / 2, y: (lm[37].y + lm[40].y) / 2 };
  const lEye = { x: (lm[42].x + lm[45].x) / 2, y: (lm[43].y + lm[46].y) / 2 };
  const D = Math.max(1, Math.abs(lEye.x - rEye.x));
  const eyeSpace = clamp(D / (bw * 0.62), 0.7, 1.3);
  const openR = Math.abs(lm[37].y - lm[40].y);
  const openL = Math.abs(lm[43].y - lm[46].y);
  const eyeSize = clamp(((openR + openL) / 2) / (D * 0.32), 0.3, 1.3);
  const eyeAsym = clamp(Math.abs(openL - openR) / Math.max(1, (openL + openR) / 2), 0, 1);

  const browMidY = (lm[19].y + lm[24].y) / 2;
  const eyeMidY = (rEye.y + lEye.y) / 2;
  const browLift = clamp((eyeMidY - browMidY) / (D * 0.55), 0.3, 1.5);

  const cornerY = (lm[48].y + lm[54].y) / 2;
  const mouthWide = clamp(Math.abs(lm[54].x - lm[48].x) / (D * 0.75), 0.5, 1.4);
  const mouthCurve = clamp(((lm[57].y + lm[63].y) / 2 - cornerY) / (D * 0.55), -0.8, 1);
  const mouthOpen = (lm[57].y - lm[51].y) / D > 0.2;

  const faceWide = clamp((lm[16].x - lm[0].x) / (bw * 0.92), 0.6, 1.2);

  return { eyeSpace, eyeSize, eyeAsym, browLift, mouthCurve, mouthOpen, mouthWide, faceWide };
}

/** Which tier of emojis fits these features (the "AI decision"). */
export function tierFor(f: FaceFeatures, seed: number): Tier {
  const r = (seed >>> 3) % 10;
  // strong signals first
  if (f.eyeAsym > 0.3) return 'wink';
  if (f.browLift > 1.15 && f.mouthOpen) return 'surprised';
  if (f.eyeSize > 1.12 && f.mouthOpen) return 'surprised';
  if (f.mouthCurve > 0.4 && f.mouthOpen) return 'grin';
  if (f.mouthCurve > 0.3) return 'grin';
  if (f.mouthCurve > 0.12) return r < 6 ? 'soft' : 'grin';
  if (f.mouthCurve > -0.08) return r < 4 ? 'neutral' : 'soft';
  if (f.mouthCurve < -0.35) return 'sassy';
  if (f.faceWide > 1.05) return r < 5 ? 'cute' : 'neutral';
  return 'neutral';
}

function pickFromTier(tier: Tier, seed: number, exclude: Set<string>): FaceVibe {
  const opts = POOL.filter((p) => p.tier === tier && !exclude.has(p.emoji));
  const pool = opts.length ? opts : POOL.filter((p) => !exclude.has(p.emoji));
  const final = pool.length ? pool : POOL;
  return final[seed % final.length];
}

/**
 * 3 distinct candidates (best match + two close alternatives) so the player
 * can pick the vibe that fits. `exclude` removes emojis already taken by
 * other players (nobody plays as the same face twice).
 */
export function pickFaceCandidates(
  lm: Pt[],
  box: Box,
  seed: number,
  exclude: string[] = [],
): FaceVibe[] {
  const f = featuresFromLandmarks(lm, box);
  const taken = new Set(exclude);
  const out: FaceVibe[] = [];
  const seen = new Set<string>();
  const tiers: Tier[] = [tierFor(f, seed)];
  // fallback tiers to round out 3 distinct picks
  for (const t of ['grin', 'cute', 'neutral', 'wink', 'surprised', 'soft', 'weird', 'sassy'] as Tier[]) {
    if (!tiers.includes(t)) tiers.push(t);
    if (tiers.length >= 8) break;
  }
  for (const t of tiers) {
    for (let s = 0; s < POOL.length && out.length < 3; s++) {
      const v = pickFromTier(t, seed + s * 7, new Set([...taken, ...seen]));
      if (!seen.has(v.emoji)) {
        seen.add(v.emoji);
        out.push(v);
        break;
      }
    }
  }
  return out.slice(0, 3);
}

/** Registry of AI-picked emoji faces, keyed by avatar id. */
const registry: Record<string, FaceVibe> = {};
let nextId = 0;

export function registerFaceEmoji(vibe: FaceVibe): string {
  const id = `em-${nextId++}`;
  registry[id] = vibe;
  return id;
}

export function getFaceEmoji(id: string): FaceVibe | null {
  return registry[id] ?? null;
}
