/**
 * BLUFF IT — design tokens.
 * Style goal: like Splash / modern party apps — saturated full-bleed
 * gradients, white "sticker" cards with chunky dark borders + hard
 * offset shadows (neo-brutalist party look), big bold type, huge emoji,
 * one obvious action per screen.
 */

export const Palette = {
  // brand
  navy: '#151A2E',
  ink: '#1B1F3B',
  cream: '#FFF8F0',
  // vivid game colors (players, accents)
  coral: '#FF5A5F',
  tangerine: '#FF8A3D',
  sunshine: '#FFC53D',
  lime: '#7ED957',
  sky: '#38BDF8',
  grape: '#A78BFA',
  bubblegum: '#F472B6',
  mint: '#2DD4BF',
  // surfaces
  white: '#FFFFFF',
  card: '#FFFFFF',
  border: '#1B1F3B',
  muted: '#8B8FA8',
  soft: '#F4F2FB',
} as const;

export const TeamColors = [
  Palette.coral,
  Palette.sky,
  Palette.sunshine,
  Palette.grape,
  Palette.mint,
  Palette.bubblegum,
  Palette.tangerine,
  Palette.lime,
] as const;

/** Full-bleed screen gradients — saturated, 3-stop, angled. */
export const Gradients = {
  home: ['#FF5A5F', '#FF8A3D', '#FFC53D'],
  reading: ['#FF8A3D', '#FF5A5F'],
  guess: ['#38BDF8', '#6366F1'],
  handoff: ['#6366F1', '#A78BFA'],
  reveal: ['#F472B6', '#A78BFA'],
  vote: ['#A78BFA', '#6366F1'],
  anticipation: ['#1B1F3B', '#6366F1'],
  result: ['#7ED957', '#2DD4BF'],
  end: ['#FFC53D', '#FF8A3D'],
  // mole: purple/dark — used by the gate + mole-mode accents
  mole: ['#6366F1', '#A78BFA', '#1B1F3B'],
  onboarding: ['#38BDF8', '#2DD4BF'],
} as const;

export const Radius = {
  sm: 16,
  md: 24,
  lg: 32,
  xl: 44,
  full: 999,
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 48,
} as const;

/** Soft ambient shadow for floating cards. */
export const Shadow = {
  soft: { shadowColor: 'rgba(27,31,59,0.25)', shadowOpacity: 1, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 10 },
  pop: { shadowColor: 'rgba(27,31,59,0.3)', shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
} as const;

/**
 * "Sticker" card: white, thick ink border, hard offset shadow.
 * This is the signature look — cards that feel stuck on, not flat.
 */
export const Sticker = {
  bg: '#FFFFFF',
  borderWidth: 4,
  borderColor: '#1B1F3B',
  // hard offset "stuck on" shadow (web-friendly: box-shadow; native: shadow)
  shadow: {
    shadowColor: '#1B1F3B',
    shadowOpacity: 0.35,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  } as const,
} as const;

/** Chunky pressable button base (white, ink border, hard shadow). */
export const ChunkyButton = {
  borderWidth: 4,
  borderColor: '#1B1F3B',
  borderRadius: Radius.full,
  shadowColor: '#1B1F3B',
  shadowOpacity: 0.4,
  shadowRadius: 0,
  shadowOffset: { width: 0, height: 7 },
  elevation: 8,
} as const;

export type ConfettiColor = (typeof TeamColors)[number];
export const ConfettiColors = [...TeamColors] as string[];
