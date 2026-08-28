import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing, Modal } from 'react-native';
import { Palette, Radius, Shadow } from '@/constants/theme';
import { play } from '@/game/sound';
import { randomCreative, type AdCreative } from '@/game/ads';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** what the player earns for finishing the ad */
  rewardLabel: string;
  /** called once, on the final "Claim" tap (after the countdown) */
  onClaim: () => void;
}

const AD_SECONDS = 4;

/**
 * A FAKE rewarded ad: a full-screen "brand" creative with a short countdown.
 * Skip unlocks only on the final "Claim your reward" tap — no early skip,
 * just like real rewarded-video UX (that's the whole point of a rewarded ad).
 */
export default function AdModal({ visible, onClose, rewardLabel, onClaim }: Props) {
  const creative: AdCreative = useMemo(() => (visible ? randomCreative() : CREATIVES_FALLBACK), [visible]);
  const [left, setLeft] = useState(AD_SECONDS);
  const bar = useRef(new Animated.Value(1)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const claimed = useRef(false);

  useEffect(() => {
    if (!visible) return;
    claimed.current = false;
    setLeft(AD_SECONDS);
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, tension: 120, friction: 12, useNativeDriver: true }).start();
    bar.setValue(1);
    Animated.timing(bar, { toValue: 0, duration: AD_SECONDS * 1000, easing: Easing.linear, useNativeDriver: true }).start();
    const iv = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    const done = setTimeout(() => play('pop'), 400);
    return () => {
      clearInterval(iv);
      clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const ready = left <= 0;
  const claim = () => {
    if (!ready || claimed.current) return;
    claimed.current = true;
    play('win');
    onClaim();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.adCard, { transform: [{ scale: pop }] }]}>
          {/* fake ad chrome */}
          <View style={styles.adBar}>
            <Text style={styles.adBadgeTxt}>📺 AD · REWARDED</Text>
            <View style={styles.adCloseWrap}>
              {!ready ? (
                <View style={styles.skipDisabled}>
                  <Text style={styles.skipTxt}>{left}s</Text>
                </View>
              ) : (
                <Pressable onPress={onClose} hitSlop={10}>
                  <Text style={styles.skipTxt}>SKIP ✕</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* the "creative" */}
          <View style={styles.creative}>
            <Text style={styles.creativeEmoji}>{creative.emoji}</Text>
            <Text style={styles.brand}>{creative.brand}</Text>
            <Text style={styles.headline}>{creative.headline}</Text>
            <Text style={styles.sub}>{creative.sub}</Text>
          </View>

          {/* countdown bar */}
          <View style={styles.barTrack}>
            <Animated.View style={[styles.barFill, { width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
          </View>

          <Pressable
            style={[styles.claimBtn, ready && styles.claimBtnReady]}
            onPress={claim}
            disabled={!ready}
            hitSlop={8}
          >
            <Text style={[styles.claimTxt, ready && styles.claimTxtReady]}>
              {ready ? `🎁 CLAIM: ${rewardLabel}` : `Watch… ${left}s`}
            </Text>
          </Pressable>
          <Text style={styles.fine}>
            {ready ? 'You watched the whole thing. Take your reward.' : 'Don\'t skip… the reward is coming.'}
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const CREATIVES_FALLBACK: AdCreative = { emoji: '📺', brand: '…', headline: '', sub: '' };

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(10,12,24,0.9)', justifyContent: 'center', padding: 24 },
  adCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.xl,
    borderWidth: 4,
    borderColor: '#1B1F3B',
    overflow: 'hidden',
    gap: 0,
    ...Shadow.pop,
  },
  adBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1B1F3B',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  adBadgeTxt: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  adCloseWrap: {},
  skipDisabled: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  skipTxt: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '900' },
  creative: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 26,
    gap: 6,
    backgroundColor: '#FFF9EE',
  },
  creativeEmoji: { fontSize: 74 },
  brand: { color: Palette.ink, fontSize: 14, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },
  headline: { color: Palette.ink, fontSize: 28, fontWeight: '900', textAlign: 'center', lineHeight: 34 },
  sub: { color: Palette.muted, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  barTrack: { height: 10, backgroundColor: 'rgba(27,31,59,0.12)' },
  barFill: { height: 10, backgroundColor: Palette.coral },
  claimBtn: {
    margin: 16,
    marginBottom: 6,
    backgroundColor: 'rgba(27,31,59,0.12)',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    opacity: 0.7,
  },
  claimBtnReady: { backgroundColor: Palette.lime, opacity: 1, borderWidth: 3, borderColor: '#1B1F3B' },
  claimTxt: { color: Palette.ink, fontSize: 15, fontWeight: '900', textAlign: 'center' },
  claimTxtReady: { color: '#1B1F3B' },
  fine: { color: Palette.muted, fontSize: 10.5, fontWeight: '700', textAlign: 'center', paddingBottom: 16 },
});
