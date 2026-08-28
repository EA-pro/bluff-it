import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AVATARS, EXCLUSIVE_AVATARS } from '@/game/avatars';
import { getBitmoji } from '@/game/bitmoji';
import { getFaceEmoji } from '@/game/facepick';
import BitmojiFace from '@/components/BitmojiFace';

type Props = {
  avatarId: string;
  size?: number;
};

// A soft pastel backdrop per emoji so the face pops as a sticker.
const EMOJI_BG: Record<string, string> = {
  '😄': '#FFE28A', '😀': '#FFD97A', '😛': '#FFC9A3', '😜': '#FFB5C2', '😁': '#FFD36B',
  '🙂': '#BDE9C3', '😊': '#FFC9C9', '🥰': '#FFB5D8', '😇': '#FFF1B8',
  '😐': '#D9DDEA', '🤔': '#C7D7F0', '😑': '#E3E1DA', '🤨': '#CBD9C9',
  '😮': '#B7D9FF', '🤯': '#FFB58A', '😳': '#FFB5B5', '🤪': '#C9F5D6',
  '😉': '#FFD1A3', '🙃': '#DDE3F0', '😏': '#F5C9A3',
  '😒': '#D6C9E8', '😤': '#FFB5A3',
  '🙄': '#E3D9F5', '😴': '#C9D6F5', '🥱': '#E8E1C9',
  '🐸': '#C9F5C9', '🐵': '#F5D9C9', '🦊': '#FFC9A3', '🐼': '#E8E8F0',
  '🦁': '#FFD36B', '🐨': '#DDE3F0', '🐷': '#FFC9D6', '🐙': '#D6C9F5',
  '🦖': '#C9F5D6', '🐱': '#F5D6C9', '🐶': '#F5E3B5', '🐹': '#FFD9A3',
};

function bgFor(emoji: string, id: string): string {
  if (EMOJI_BG[emoji]) return EMOJI_BG[emoji];
  const palette = ['#FFE28A', '#BDE9C3', '#C7D7F0', '#FFC9D6', '#C9F5D6', '#D6C9F5', '#FFD9A3'];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

/**
 * Face of a player.
 *  - `bm-*` ids are scanned bitmoji (custom-drawn SVG face)
 *  - `em-*` ids are AI-picked emoji faces (from the real face scan)
 *  - everything else is an emoji sticker badge.
 */
export const AvatarFace = memo(function AvatarFace({ avatarId, size = 48 }: Props) {
  const bm = getBitmoji(avatarId);
  if (bm) {
    return <BitmojiFace spec={bm} size={size} />;
  }
  const face = getFaceEmoji(avatarId);
  const exclusive = EXCLUSIVE_AVATARS.find((e) => e.id === avatarId);
  const emoji = face ? face.emoji : exclusive ? exclusive.emoji : AVATARS.find((a) => a.id === avatarId)?.emoji ?? '🎭';
  const bg = face ? bgFor(emoji, avatarId) : exclusive ? exclusive.bg : '#fff';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        borderWidth: Math.max(2.5, size * 0.06),
        borderColor: '#1B1F3B',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: 'rgba(27,31,59,0.28)',
        shadowOpacity: 1,
        shadowRadius: size * 0.12,
        shadowOffset: { width: 0, height: Math.max(2, size * 0.06) },
        elevation: 5,
      }}
    >
      <Text style={{ fontSize: size * 0.52, lineHeight: size * 0.6 }}>{emoji}</Text>
    </View>
  );
});

export default AvatarFace;
