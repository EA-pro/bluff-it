import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, ViewStyle, StyleProp } from 'react-native';

type Props = {
  /** change this to re-trigger the entrance animation (e.g. the game phase) */
  animationKey: string | number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Lightweight phase transition: every screen fades + slides up as it enters.
 * Pure Animated (no reanimated) so it works identically on web + native.
 */
export default function PhaseFade({ animationKey, children, style }: Props) {
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationKey]);

  const slide = fade.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });

  return (
    <Animated.View style={[{ flex: 1, opacity: fade, transform: [{ translateY: slide }] }, style]}>
      {children}
    </Animated.View>
  );
}
