import { Palette } from '@/constants/theme';

interface C { bg: string; shirt: string; accent: string }

// 32 hand-tuned combos: vivid, high contrast, "sticker" look
const COLORS: C[] = [
  { bg: '#FFE9C7', shirt: '#FF8A3D', accent: '#151A2E' },
  { bg: '#D9F2FF', shirt: '#38BDF8', accent: '#151A2E' },
  { bg: '#FFF3BF', shirt: '#F59E0B', accent: '#151A2E' },
  { bg: '#DCFCE7', shirt: '#22C55E', accent: '#151A2E' },
  { bg: '#FCE7F3', shirt: '#F472B6', accent: '#151A2E' },
  { bg: '#EDE9FE', shirt: '#A78BFA', accent: '#151A2E' },
  { bg: '#CFFAFE', shirt: '#2DD4BF', accent: '#151A2E' },
  { bg: '#FFE4E6', shirt: '#FB7185', accent: '#151A2E' },
  { bg: '#FEF3C7', shirt: '#EAB308', accent: '#431407' },
  { bg: '#E0F2FE', shirt: '#0EA5E9', accent: '#082F49' },
  { bg: '#F0FDF4', shirt: '#16A34A', accent: '#052E16' },
  { bg: '#FDF4FF', shirt: '#D946EF', accent: '#4A044E' },
  { bg: '#FFF7ED', shirt: '#EA580C', accent: '#431407' },
  { bg: '#ECFCCB', shirt: '#84CC16', accent: '#1A2E05' },
  { bg: '#FEE2E2', shirt: '#EF4444', accent: '#450A0A' },
  { bg: '#E0E7FF', shirt: '#6366F1', accent: '#1E1B4B' },
  { bg: '#CCFBF1', shirt: '#14B8A6', accent: '#134E4A' },
  { bg: '#FAE8FF', shirt: '#C026D3', accent: '#581C87' },
  { bg: '#FEF9C3', shirt: '#CA8A04', accent: '#422006' },
  { bg: '#DBEAFE', shirt: '#3B82F6', accent: '#172554' },
  { bg: '#D1FAE5', shirt: '#059669', accent: '#064E3B' },
  { bg: '#FCE7F3', shirt: '#DB2777', accent: '#831843' },
  { bg: '#E9D5FF', shirt: '#9333EA', accent: '#3B0764' },
  { bg: '#FFEDD5', shirt: '#F97316', accent: '#431407' },
  { bg: '#A7F3D0', shirt: '#10B981', accent: '#064E3B' },
  { bg: '#FECACA', shirt: '#DC2626', accent: '#7F1D1D' },
  { bg: '#C7D2FE', shirt: '#4F46E5', accent: '#312E81' },
  { bg: '#99F6E4', shirt: '#0D9488', accent: '#134E4A' },
  { bg: '#FBCFE8', shirt: '#EC4899', accent: '#831843' },
  { bg: '#FDE68A', shirt: '#D97706', accent: '#78350F' },
  { bg: '#BFDBFE', shirt: '#2563EB', accent: '#1E3A8A' },
  { bg: '#A5F3FC', shirt: '#0891B2', accent: '#164E63' },
];

export const AVATARS = [
  '🦁', '🐼', '🦊', '🐸', '🐙', '🦄', '🐯', '🐨',
  '🐷', '🐵', '🦖', '🐳', '🦉', '🐥', '🦩', '🐧',
  '🐞', '🦋', '🐢', '🐡', '🦀', '🐜', '🦜', '🐲',
  '🍕', '🌮', '🍩', '⚽', '🎮', '🎧', '🚀', '💎',
].map((emoji, i) => ({
  id: `av-${i}`,
  emoji,
  face: COLORS[i % COLORS.length].bg,
  shirt: COLORS[i % COLORS.length].shirt,
  accent: COLORS[i % COLORS.length].accent,
  premium: [5, 23, 28, 29, 30, 31].includes(i), // 🦄 🐲 🎮 🎧 🚀 💎
}));

// Eva & Jonas (the founders) lead the picker as free chibi Memoji faces —
// AvatarFace renders their ex-* ids with the custom ChibiFace SVG.
AVATARS.unshift(
  { id: 'ex-eva', emoji: '💃', face: '#FFD1E0', shirt: '#FF5A5F', accent: '#151A2E', premium: false },
  { id: 'ex-jonas', emoji: '🎤', face: '#C9D8FF', shirt: '#38BDF8', accent: '#151A2E', premium: false },
);

export const PREMIUM_AVATAR_IDS = new Set(
  AVATARS.filter((a) => a.premium).map((a) => a.id),
);

/**
 * LOOT BOX-only exclusives — never in the normal picker, only from cracking
 * loot box (Secret Drops: "looks like Eva / Jonas"). These are the collectibles.
 */
export const EXCLUSIVE_AVATARS: { id: string; emoji: string; name: string; bg: string; badge: string }[] = [
  { id: 'ex-eva', emoji: '💃', name: 'Eva', bg: '#FBCFE8', badge: 'SECRET DROP' },
  { id: 'ex-jonas', emoji: '🎤', name: 'Jonas', bg: '#C7D2FE', badge: 'SECRET DROP' },
];

export function isExclusiveAvatar(id: string): boolean {
  return EXCLUSIVE_AVATARS.some((e) => e.id === id);
}

export function isPremiumAvatar(id: string): boolean {
  return PREMIUM_AVATAR_IDS.has(id);
}

export const TEAMS = [
  { name: 'Team Coral', color: Palette.coral, emoji: '❤️' },
  { name: 'Team Sky', color: Palette.sky, emoji: '💙' },
  { name: 'Team Sunshine', color: Palette.sunshine, emoji: '💛' },
  { name: 'Team Grape', color: Palette.grape, emoji: '💜' },
  { name: 'Team Mint', color: Palette.mint, emoji: '💚' },
  { name: 'Team Bubble', color: Palette.bubblegum, emoji: '🩷' },
  { name: 'Team Tangerine', color: Palette.tangerine, emoji: '🧡' },
  { name: 'Team Lime', color: Palette.lime, emoji: '💚' },
];
