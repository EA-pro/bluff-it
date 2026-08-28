import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import { ConfettiColors } from '@/constants/theme';

type Piece = {
  left: number;   // % of width
  delay: number;  // ms
  size: number;
  color: string;
  spin: number;   // deg
  emoji: string | null;
};

const EMOJIS = ['🎉', '✨', '💥', '⭐', '🎊', null, null, null];

type Props = {
  trigger: number;      // change this to fire a burst
  count?: number;
  height?: number;
};

/**
 * Lightweight CSS-driven confetti burst. Pure RN Animated (no native deps),
 * fires whenever `trigger` changes. Emits colored squares + a few emoji.
 */
export default function Confetti({ trigger, count = 36, height = 220 }: Props) {
  const pieces = useMemo<Piece[]>(() => {
    if (trigger === 0) return [];
    return Array.from({ length: count }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 260,
      size: 8 + Math.random() * 14,
      color: ConfettiColors[i % ConfettiColors.length],
      spin: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 720),
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
    }));
  }, [trigger, count]);

  // IMPORTANT: refs must be sized to `count` from the FIRST render.
  // (Sizing them to `pieces` would leave them empty while trigger===0,
  //  and the first burst would crash on `undefined.interpolate` — the
  //  "black screen after round 1" bug.)
  const mk = () => new Animated.Value(0);
  const ys = useRef(Array.from({ length: count }, mk)).current;
  const spins = useRef(Array.from({ length: count }, mk)).current;
  const ops = useRef(Array.from({ length: count }, () => new Animated.Value(1))).current;

  useEffect(() => {
    if (trigger === 0) return;
    pieces.forEach((p, i) => {
      ys[i].setValue(0);
      spins[i].setValue(0);
      ops[i].setValue(1);
      Animated.parallel([
        Animated.delay(p.delay),
        Animated.timing(ys[i], {
          toValue: height + 40,
          duration: 1200 + Math.random() * 900,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(spins[i], { toValue: 1, duration: 1600 + Math.random() * 800, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(p.delay + 700),
          Animated.timing(ops[i], { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
      ]).start();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  if (pieces.length === 0) return null;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { top: 0, height }]}>
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: -20,
            width: p.size,
            height: p.size,
            backgroundColor: p.emoji ? 'transparent' : p.color,
            borderRadius: p.emoji ? 0 : 3,
            opacity: ops[i],
            // NOTE: animate 0→1 progress, map to the (possibly negative) final
            // angle. Interpolating [0, p.spin] directly crashes RN when
            // p.spin < 0 ("inputRange must be monotonically non-decreasing")
            // and blank-screens the result screen.
            transform: [{ translateY: ys[i] }, { rotate: spins[i].interpolate({ inputRange: [0, 1], outputRange: [`0deg`, `${p.spin}deg`] }) }],
          }}
        >
          {p.emoji ? <Text style={{ fontSize: p.size + 6 }}>{p.emoji}</Text> : null}
        </Animated.View>
      ))}
    </View>
  );
}
