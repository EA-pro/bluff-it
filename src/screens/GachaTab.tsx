import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AdModal from '@/components/AdModal';
import Confetti from '@/components/Confetti';
import { Palette, Gradients, Radius, Shadow } from '@/constants/theme';
import { play, haptic } from '@/game/sound';
import {
  useWallet, spin, SPIN_COST, canFreeSpin, canAdSpin, GachaResult,
} from '@/game/wallet';
import { EXCLUSIVE_AVATARS } from '@/game/avatars';
import { completeAd } from '@/game/ads';
import { t } from '@/i18n';

/**
 * LOOT BOX tab: crack a box to win avatars, coins & free category tries.
 *
 * A gift box, not a wheel — you shake it, the lid flies off, the loot pops
 * out with confetti. 50 coins a box, 1 free box/day, +1 ad box/day.
 */
export default function GachaTab() {
  const wallet = useWallet();
  const [phase, setPhase] = useState<'idle' | 'shaking' | 'open' | 'result'>('idle');
  const [result, setResult] = useState<GachaResult | null>(null);
  const [adForSpin, setAdForSpin] = useState(false);
  const [burst, setBurst] = useState(0);

  const shakeX = useRef(new Animated.Value(0)).current;
  const lid = useRef(new Animated.Value(0)).current; // 0 closed → 1 open
  const lidY = lid.interpolate({ inputRange: [0, 1], outputRange: [0, -54] });
  const lidRot = lid.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-18deg'] });
  const glow = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.7] });
  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  const busy = phase === 'shaking' || phase === 'open';

  const doCrack = (source: 'coins' | 'free' | 'ad') => {
    if (busy || phase === 'result') return;
    setResult(null);
    // reserve first: run the roll now, reveal after the animation
    const res = spin(source);
    if (!res) {
      play('buzz');
      haptic('error');
      return;
    }
    play('whoosh');
    haptic('medium');
    setPhase('shaking');
    const shake = Animated.sequence([
      Animated.timing(shakeX, { toValue: -9, duration: 70, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 8, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -6, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 5, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 70, useNativeDriver: true }),
    ]);
    shake.start(() => {
      setPhase('open');
      Animated.timing(lid, { toValue: 1, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => {
        setPhase('result');
        setResult(res);
        setBurst((b) => b + 1);
        play(res.kind === 'exclusive' ? 'win' : 'pop');
        haptic('success');
      });
    });
  };

  const spinByAd = () => {
    if (!canAdSpin() || busy || phase === 'result') return;
    setAdForSpin(true);
  };

  const closeResult = () => {
    setResult(null);
    setPhase('idle');
    lid.setValue(0);
    shakeX.setValue(0);
  };

  const exclusiveResult = result && result.kind === 'exclusive';

  return (
    <LinearGradient colors={Gradients.home} style={styles.bg}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>🎁 {t('gacha_title')}</Text>
        <Text style={styles.sub}>{t('gacha_sub')}</Text>

        {/* the gift box */}
        <View style={styles.boxWrap}>
          <Animated.View style={[styles.boxGlow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
          <Animated.View style={{ transform: [{ translateX: shakeX }] }}>
            {/* box body */}
            <View style={styles.boxBody}>
              <View style={styles.bodyRibbon} />
              <Text style={styles.boxFace}>{phase === 'result' ? '✨' : '🎁'}</Text>
            </View>
            {/* lid */}
            <Animated.View style={[styles.boxLid, { transform: [{ translateY: lidY }, { rotate: lidRot }] }]}>
              <View style={styles.lidRibbon} />
            </Animated.View>
          </Animated.View>
        </View>

        {/* crack button */}
        <Pressable
          style={[styles.crackBtn, busy && styles.crackBtnOff, !busy && phase !== 'result' && wallet.coins < SPIN_COST && styles.crackBtnPoor]}
          onPress={() => doCrack('coins')}
          disabled={busy || phase === 'result'}
          hitSlop={8}
        >
          <Text style={styles.crackBtnTxt}>{phase === 'idle' ? t('gacha_spin') : '…'} · {t('gacha_spin_cost')}</Text>
        </Pressable>
        <View style={styles.crackRow}>
          <Pressable style={[styles.miniCrack, (!canFreeSpin() || busy || phase === 'result') && styles.miniCrackOff]} onPress={() => doCrack('free')} disabled={busy || phase === 'result' || !canFreeSpin()}>
            <Text style={styles.miniCrackTxt}>🎁 {t('gacha_free_spin')}</Text>
          </Pressable>
          <Pressable style={[styles.miniCrack, styles.miniCrackAd, (!canAdSpin() || busy || phase === 'result') && styles.miniCrackOff]} onPress={spinByAd} disabled={busy || phase === 'result' || !canAdSpin()}>
            <Text style={styles.miniCrackTxt}>📺 {t('gacha_ad_spin')}</Text>
          </Pressable>
        </View>
        <Text style={styles.dailyNote}>{t('gacha_daily_note')}</Text>
        {!busy && phase !== 'result' && wallet.coins < SPIN_COST && (
          <Text style={styles.noCoins}>{t('gacha_no_coins')}</Text>
        )}

        {/* exclusive drops (secret) */}
        <Text style={styles.exclTitle}>👑 {t('gacha_excl_title')}</Text>
        <View style={styles.exclRow}>
          {EXCLUSIVE_AVATARS.map((e) => {
            const owned = wallet.ownedAvatars.includes(e.id);
            return (
              <View key={e.id} style={[styles.exclCard, owned ? styles.exclCardOwned : styles.exclCardLocked]}>
                <View style={[styles.exclBg, { backgroundColor: owned ? e.bg : 'rgba(0,0,0,0.4)' }]}>
                  <Text style={styles.exclEmoji}>{owned ? e.emoji : '❓'}</Text>
                </View>
                <Text style={[styles.exclName, !owned && styles.exclNameLocked]}>{owned ? e.name : '???'}</Text>
                <Text style={styles.exclBadge}>{t('gacha_excl_fomo')}</Text>
                {owned && <Text style={styles.exclOwn}>{t('gacha_excl_owned')}</Text>}
              </View>
            );
          })}
        </View>
        <View style={{ height: 130 }} />
      </ScrollView>

      <Confetti trigger={burst} height={260} />

      {/* result card */}
      {phase === 'result' && result && (
        <View style={styles.overlay}>
          <View style={[styles.resultCard, exclusiveResult && styles.resultCardExcl]}>
            {exclusiveResult ? (
              <Text style={styles.resultExclBadge}>⭐ {t('gacha_exclusive')} ⭐</Text>
            ) : (
              <Text style={styles.resultLbl}>{t('gacha_won')}</Text>
            )}
            <Text style={styles.resultEmoji}>{result.label}</Text>
            {result.detail && (
              <Text style={[styles.resultDetail, exclusiveResult && styles.resultDetailExcl]}>{result.detail}</Text>
            )}
            {result.kind === 'category' && (
              <Text style={styles.resultPassNote}>{t('gacha_cat_pass')} ✓</Text>
            )}
            <Pressable style={styles.resultClose} onPress={closeResult} hitSlop={10}>
              <Text style={styles.resultCloseTxt}>OK</Text>
            </Pressable>
          </View>
        </View>
      )}

      <AdModal
        visible={adForSpin}
        onClose={() => setAdForSpin(false)}
        rewardLabel={t('gacha_ad_spin')}
        onClaim={() => {
          completeAd();
          setAdForSpin(false);
          doCrack('ad');
        }}
      />
    </LinearGradient>
  );
}

const BOX = 190;

const styles = StyleSheet.create({
  bg: { flex: 1 },
  content: { padding: 20, alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '900', color: '#fff', textShadowColor: 'rgba(0,0,0,0.25)', textShadowRadius: 5, textShadowOffset: { width: 0, height: 2 } },
  sub: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.85)', marginTop: 4, textAlign: 'center' },
  boxWrap: { position: 'relative', width: BOX + 40, height: BOX + 60, marginTop: 30, alignItems: 'center', justifyContent: 'flex-end' },
  boxGlow: { position: 'absolute', bottom: -6, width: BOX + 60, height: BOX + 30, borderRadius: 999, backgroundColor: '#FFD84D' },
  boxBody: {
    position: 'relative',
    width: BOX,
    height: 132,
    borderRadius: 18,
    backgroundColor: '#E8556D',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 4,
    borderColor: '#1B1F3B',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: 'rgba(0,0,0,0.5)',
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  bodyRibbon: { position: 'absolute', top: 0, bottom: 0, left: BOX / 2 - 17, width: 34, backgroundColor: '#FFD84D', borderLeftWidth: 3, borderRightWidth: 3, borderColor: '#1B1F3B' },
  boxFace: { fontSize: 56, zIndex: 2, textShadowColor: 'rgba(0,0,0,0.25)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 3 } },
  boxLid: {
    position: 'absolute',
    top: 44,
    width: BOX + 26,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#F26D81',
    borderWidth: 4,
    borderColor: '#1B1F3B',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  lidRibbon: { position: 'absolute', top: 0, bottom: 0, left: '50%', width: 34, marginLeft: -17, backgroundColor: '#FFD84D', borderLeftWidth: 3, borderRightWidth: 3, borderColor: '#1B1F3B' },
  crackBtn: {
    marginTop: 26,
    backgroundColor: Palette.sunshine,
    borderRadius: 22,
    borderWidth: 4,
    borderColor: '#1B1F3B',
    paddingHorizontal: 40,
    paddingVertical: 16,
    ...Shadow.pop,
  },
  crackBtnTxt: { fontSize: 20, fontWeight: '900', color: '#1B1F3B', letterSpacing: 1 },
  crackBtnOff: { opacity: 0.5 },
  crackBtnPoor: { opacity: 0.7 },
  crackRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  miniCrack: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 999,
    borderWidth: 3,
    borderColor: '#1B1F3B',
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  miniCrackTxt: { fontSize: 12.5, fontWeight: '900', color: '#1B1F3B' },
  miniCrackAd: { backgroundColor: '#E5E1FF', borderColor: Palette.grape },
  miniCrackOff: { opacity: 0.45 },
  dailyNote: { fontSize: 10.5, fontWeight: '700', color: 'rgba(255,255,255,0.7)', marginTop: 10 },
  noCoins: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '900',
    color: '#1B1F3B',
    backgroundColor: '#FFD84D',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 2.5,
    borderColor: '#1B1F3B',
  },
  exclTitle: { fontSize: 14, fontWeight: '900', color: '#FFD84D', textTransform: 'uppercase', letterSpacing: 1, marginTop: 26, textShadowColor: 'rgba(0,0,0,0.3)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 2 } },
  exclRow: { flexDirection: 'row', gap: 14, marginTop: 12 },
  exclCard: { width: 150, borderRadius: Radius.lg, padding: 14, alignItems: 'center', borderWidth: 4 },
  exclCardLocked: { backgroundColor: 'rgba(27,31,59,0.8)', borderColor: 'rgba(255,216,77,0.5)', borderStyle: 'dashed' },
  exclCardOwned: { backgroundColor: 'rgba(255,216,77,0.18)', borderColor: '#FFD84D' },
  exclBg: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFD84D' },
  exclEmoji: { fontSize: 32 },
  exclName: { fontSize: 15, fontWeight: '900', color: '#fff', marginTop: 6 },
  exclNameLocked: { color: 'rgba(255,255,255,0.6)' },
  exclBadge: { fontSize: 9, fontWeight: '900', color: '#FFD84D', letterSpacing: 1.5, marginTop: 2 },
  exclOwn: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(20,16,45,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 70,
  },
  resultCard: {
    width: 300,
    backgroundColor: '#fff',
    borderRadius: 28,
    borderWidth: 5,
    borderColor: '#1B1F3B',
    alignItems: 'center',
    padding: 28,
    ...Shadow.pop,
  },
  resultCardExcl: { borderColor: '#C77DFF', backgroundColor: '#FBF4FF' },
  resultLbl: { fontSize: 15, fontWeight: '900', color: Palette.muted, textTransform: 'uppercase', letterSpacing: 1 },
  resultExclBadge: { fontSize: 16, fontWeight: '900', color: '#8B2FC9' },
  resultEmoji: { fontSize: 52, marginTop: 10 },
  resultDetail: { fontSize: 14, fontWeight: '800', color: Palette.ink, marginTop: 8, textAlign: 'center' },
  resultDetailExcl: { color: '#8B2FC9' },
  resultPassNote: { fontSize: 11, fontWeight: '700', color: Palette.muted, marginTop: 4 },
  resultClose: {
    marginTop: 18,
    backgroundColor: Palette.sunshine,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#1B1F3B',
    paddingHorizontal: 34,
    paddingVertical: 10,
  },
  resultCloseTxt: { fontSize: 16, fontWeight: '900', color: '#1B1F3B' },
});
