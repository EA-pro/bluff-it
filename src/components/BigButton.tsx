import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Palette, Radius, Shadow } from '@/constants/theme';

type Variant = 'primary' | 'guess' | 'reveal' | 'vote' | 'win' | 'end' | 'soft';

const COLORS: Record<Variant, [string, string]> = {
  primary: ['#38BDF8', '#6366F1'],
  guess: ['#FF8A3D', '#FF5A5F'],
  reveal: ['#A78BFA', '#F472B6'],
  vote: ['#A78BFA', '#6366F1'],
  win: ['#7ED957', '#2DD4BF'],
  end: ['#FFC53D', '#FF8A3D'],
  soft: ['#FFFFFF', '#F4F2FB'],
};

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: ViewStyle;
  small?: boolean;
};

export default function BigButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  small = false,
}: Props) {
  const isSoft = variant === 'soft';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          borderRadius: Radius.full,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
          ...Shadow.pop,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={COLORS[variant]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: Radius.full,
          paddingVertical: small ? 12 : 18,
          paddingHorizontal: small ? 20 : 32,
        }}
      >
        <Text
          style={{
            color: isSoft ? Palette.ink : '#fff',
            fontWeight: '800',
            fontSize: small ? 15 : 19,
            textAlign: 'center',
            letterSpacing: 0.3,
            textShadowColor: isSoft ? 'transparent' : 'rgba(0,0,0,0.25)',
            textShadowRadius: 4,
            textShadowOffset: { width: 0, height: 2 },
          }}
        >
          {label}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}
