import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useGame } from '@/game/useStore';
import { useCountdown } from '@/hooks/useCountdown';
import { anticipationDone } from '@/game/store';
import { play } from '@/game/sound';
import { Palette, Gradients } from '@/constants/theme';
import { t } from '@/i18n';

/**
 * "The answer shows up soon…" — a short suspense beat with a huge
 * 3-2-1 count-down that auto-advances to the verdict.
 */
const TOTAL_MS = 4500;

export default function Anticipation() {
  const game = useGame();
  const { timerEndsAt } = game;
  const { remainingMs: msLeft } = useCountdown(timerEndsAt, TOTAL_MS / 1000);

  const num = msLeft > 3000 ? '3' : msLeft > 2000 ? '2' : msLeft > 1000 ? '1' : 'GO';
  const scale = useRef(new Animated.Value(0.4)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const lastNum = useRef(num);

  useEffect(() => {
    if (num !== lastNum.current) {
      lastNum.current = num;
      Animated.spring(scale, { toValue: 1, tension: 220, friction: 12, useNativeDriver: true }).start();
      play(num === 'GO' ? 'reveal' : 'pop');
    }
  }, [num]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.out(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.in(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // auto-advance when the countdown is up (safety: also when expired)
  useEffect(() => {
    if (msLeft <= 0) anticipationDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msLeft <= 0]);

  const ring = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 30] });

  return (
    <LinearGradient colors={Gradients.anticipation} style={styles.bg}>
      <View style={styles.top}>
        <Text style={styles.eyebrow}>{t('round_n', { a: game.roundIndex + 1 })}</Text>
      </View>

      <View style={styles.mid}>
        <Text style={styles.suspense}>{t('ant_title')}</Text>
      </View>

      <View style={styles.center}>
        <Animated.View
          style={[
            styles.countRing,
            {
              transform: [{ scale: ring }],
              shadowRadius: glow,
            },
          ]}
        >
          <Animated.View style={[styles.countInner, { transform: [{ scale }] }]}>
            <Text key={num} style={[styles.countTxt, num === 'GO' && styles.goTxt]}>
              {num}
            </Text>
          </Animated.View>
        </Animated.View>
      </View>

      <View style={styles.bottom}>
        <Text style={styles.foot}>{t('ant_sub')}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  top: { alignItems: 'center', paddingTop: 24 },
  eyebrow: {
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: Palette.ink,
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 2,
    borderWidth: 3,
    borderColor: '#1B1F3B',
  },
  mid: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 4 },
  suspense: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 4 },
  },
  subsuspense: { color: 'rgba(255,255,255,0.85)', fontSize: 16, fontWeight: '700', fontStyle: 'italic' },
  center: { alignItems: 'center', paddingBottom: 40 },
  countRing: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#fff',
    borderWidth: 8,
    borderColor: '#1B1F3B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0,0,0,0.45)',
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  countInner: {
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: '#FFC53D',
    borderWidth: 5,
    borderColor: '#1B1F3B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countTxt: { color: '#1B1F3B', fontSize: 110, fontWeight: '900', fontVariant: ['tabular-nums'] },
  goTxt: { fontSize: 74 },
  bottom: { alignItems: 'center', paddingBottom: 24 },
  foot: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '800' },
});
