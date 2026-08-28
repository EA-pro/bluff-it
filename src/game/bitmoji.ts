/**
 * Bitmoji generation — turn real face landmarks into a custom-drawn
 * cartoon face (NOT a stock emoji). 100% on-device.
 */

export type BitmojiSpec = {
  skin: string;     // hex
  hair: string;     // hex
  hairStyle: 0 | 1 | 2; // 0 buzz, 1 medium, 2 long
  faceWide: number;   // 0.75..1.1
  faceTall: number;   // 0.85..1.15
  eyeSpace: number;   // 0.7..1.3
  eyeSize: number;    // 0.55..1.15
  browLift: number;   // 0.5..1.4
  browTilt: number;   // -0.5..0.5
  noseLen: number;    // 0.6..1.4
  noseWide: number;   // 0.5..1.2
  mouthWide: number;  // 0.65..1.4
  mouthCurve: number; // -0.5..0.8 (smile)
  mouthOpen: boolean;
  shirt: string;
  bg: string;
  accessory: 'none' | 'glasses' | 'partyhat' | 'sunglasses';
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const hex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((c) => Math.round(clamp(c, 0, 255)).toString(16).padStart(2, '0')).join('')}`;

function dist(a: [number, number, number], b: [number, number, number]) {
  const r = 2 * (a[0] - b[0]), g = 2 * (a[1] - b[1]), bl = 2 * (a[2] - b[2]);
  return Math.sqrt(0.3 * r * r + 0.6 * g * g + 0.1 * bl * bl);
}

const SHIRTS = ['#FF5A5F', '#38BDF8', '#F59E0B', '#22C55E', '#A78BFA', '#F472B6', '#2DD4BF', '#FB923C'];
const BGS = ['#FFE9C7', '#D9F2FF', '#FFF3BF', '#DCFCE7', '#FCE7F3', '#EDE9FE', '#CFFAFE', '#FFE4E6'];

/** A neutral default when detection gives us too little. */
export function defaultSpec(seed = 0): BitmojiSpec {
  return {
    skin: ['#F2C79B', '#E0AC69', '#C68642', '#8D5524', '#F8D9B8'][seed % 5],
    hair: ['#2E1B12', '#4A2C17', '#B98A3C', '#1F2430', '#D9A05B'][seed % 5],
    hairStyle: (seed % 3) as 0 | 1 | 2,
    faceWide: 0.9, faceTall: 1, eyeSpace: 1, eyeSize: 0.9,
    browLift: 1, browTilt: 0, noseLen: 1, noseWide: 0.9,
    mouthWide: 1.05, mouthCurve: 0.6, mouthOpen: false,
    shirt: SHIRTS[seed % SHIRTS.length],
    bg: BGS[seed % BGS.length],
    accessory: 'none',
  };
}

type Pt = { x: number; y: number };
type Box = { x: number; y: number; width: number; height: number };

/** Sample a region of the image, return average RGB (or null). */
function sampleRegion(
  src: CanvasImageSource,
  sx: number, sy: number, sw: number, sh: number,
): [number, number, number] | null {
  try {
    const s = 32;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(src, sx, sy, sw, sh, 0, 0, s, s);
    const px = ctx.getImageData(0, 0, s, s).data;
    let rs = 0, gs = 0, bs = 0, n = 0;
    for (let i = 0; i < px.length; i += 4) {
      const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      if (lum < 25 || lum > 250) continue;
      rs += px[i]; gs += px[i + 1]; bs += px[i + 2]; n++;
    }
    if (n < 12) return null;
    return [rs / n, gs / n, bs / n];
  } catch {
    return null;
  }
}

/**
 * Build a BitmojiSpec from face-api.js 68 landmarks + the detection box.
 * `src` is the video/canvas element the landmarks were measured against.
 */
export function specFromLandmarks(
  src: CanvasImageSource,
  lm: Pt[],
  box: Box,
  seed = 0,
): BitmojiSpec {
  const spec = defaultSpec(seed);
  const N = lm.length;
  if (N < 68) return spec;
  const bw = box.width || 1, bh = box.height || 1;

  // --- skin: cheek region
  const skinPx = sampleRegion(src, box.x + bw * 0.32, box.y + bh * 0.42, bw * 0.36, bh * 0.30);
  if (skinPx) spec.skin = hex(skinPx[0], skinPx[1], skinPx[2]);

  // --- hair: forehead strip above the brows
  const browY = (lm[19].y + lm[24].y) / 2;
  const hairTopY = box.y + bh * 0.03;
  if (browY - hairTopY > 6) {
    const hairPx = sampleRegion(src, box.x + bw * 0.22, hairTopY, bw * 0.56, (browY - hairTopY) * 0.8);
    if (hairPx) {
      const d = dist(hairPx, skinPx ?? [200, 170, 140]);
      if (d > 42) {
        spec.hair = hex(hairPx[0], hairPx[1], hairPx[2]);
        spec.hairStyle = d > 95 ? 2 : 1;
      } else {
        // hair blends with skin (or is very light) -> short, slightly darker
        spec.hair = hex(skinPx![0] * 0.7, skinPx![1] * 0.68, skinPx![2] * 0.68);
        spec.hairStyle = 0;
      }
    }
  }

  // --- eyes
  const rEye = { x: (lm[36].x + lm[39].x) / 2, y: (lm[37].y + lm[40].y) / 2 };
  const lEye = { x: (lm[42].x + lm[45].x) / 2, y: (lm[43].y + lm[46].y) / 2 };
  const D = Math.max(1, Math.abs(lEye.x - rEye.x));
  spec.eyeSpace = clamp(D / (bw * 0.62), 0.7, 1.3);
  const openR = Math.abs(lm[37].y - lm[40].y), openL = Math.abs(lm[43].y - lm[46].y);
  spec.eyeSize = clamp(((openR + openL) / 2) / (D * 0.32), 0.55, 1.15);

  // --- brows
  const browMidY = (lm[19].y + lm[24].y) / 2;
  const eyeMidY = (rEye.y + lEye.y) / 2;
  spec.browLift = clamp((eyeMidY - browMidY) / (D * 0.55), 0.5, 1.4);
  const tiltR = (lm[17].y - lm[21].y) / D;
  const tiltL = (lm[26].y - lm[22].y) / D;
  spec.browTilt = clamp((tiltR + tiltL) / 2, -0.5, 0.5);

  // --- nose
  spec.noseLen = clamp((lm[30].y - browMidY) / (D * 0.75), 0.6, 1.4);
  spec.noseWide = clamp((lm[35].x - lm[31].x) / (D * 0.42), 0.5, 1.2);

  // --- mouth
  const cornerY = (lm[48].y + lm[54].y) / 2;
  spec.mouthWide = clamp(Math.abs(lm[54].x - lm[48].x) / (D * 0.75), 0.65, 1.4);
  spec.mouthCurve = clamp(((lm[57].y + lm[63].y) / 2 - cornerY) / (D * 0.55), -0.5, 0.8);
  spec.mouthOpen = (lm[57].y - lm[51].y) / D > 0.2;

  // --- face shape
  spec.faceWide = clamp((lm[16].x - lm[0].x) / (bw * 0.92), 0.75, 1.1);
  spec.faceTall = clamp(bh / bw / 1.3, 0.85, 1.15);

  return spec;
}

/** 3 variants for the "pick your best match" step: same face, new look. */
export function makeVariants(spec: BitmojiSpec, seed = 0): BitmojiSpec[] {
  const accs: BitmojiSpec['accessory'][] = ['none', 'glasses', 'partyhat', 'sunglasses'];
  return [0, 1, 2].map((i) => ({
    ...spec,
    shirt: SHIRTS[(seed + i * 3) % SHIRTS.length],
    bg: BGS[(seed + i * 5) % BGS.length],
    accessory: accs[(seed + i) % accs.length],
  }));
}

/** Registry of scanned faces, keyed by avatar id. */
const registry: Record<string, BitmojiSpec> = {};
let nextId = 0;

export function registerBitmoji(spec: BitmojiSpec): string {
  const id = `bm-${nextId++}`;
  registry[id] = spec;
  return id;
}

export function getBitmoji(id: string): BitmojiSpec | null {
  return registry[id] ?? null;
}
