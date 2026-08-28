import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import BigButton from '@/components/BigButton';
import { useGame } from '@/game/useStore';
import { goSetup, setConfig } from '@/game/store';
import { Palette, Gradients, Radius, Shadow } from '@/constants/theme';
import { play } from '@/game/sound';
import { usePremium, molePlayUsedToday } from '@/game/premium';
import { useAds, grantMolePass, useMolePass, completeAd } from '@/game/ads';
import PremiumSheet from '@/components/PremiumSheet';
import AdModal from '@/components/AdModal';
import SettingsSheet from '@/components/SettingsSheet';
import type { TabId } from '@/components/TabBar';
import { t } from '@/i18n';

// Scattered, low-opacity confetti backdrop. Deterministic positions so it
// looks designed, not random-glitch. (The old version had no left/top, so
// every emoji stacked at the top-left corner.)
const CONFETTI: { top: `${number}%`; left: `${number}%`; size: number; rot: number; emoji: string }[] = [
  { top: '9%', left: '6%', size: 30, rot: -14, emoji: '🎲' },
  { top: '7%', left: '78%', size: 34, rot: 12, emoji: '🃏' },
  { top: '24%', left: '86%', size: 26, rot: -8, emoji: '🤯' },
  { top: '33%', left: '4%', size: 24, rot: 10, emoji: '💯' },
  { top: '52%', left: '90%', size: 30, rot: -16, emoji: '🎯' },
  { top: '60%', left: '5%', size: 28, rot: 8, emoji: '🤫' },
  { top: '76%', left: '84%', size: 32, rot: -10, emoji: '👑' },
  { top: '86%', left: '10%', size: 26, rot: 14, emoji: '🕵️' },
  { top: '93%', left: '60%', size: 24, rot: -6, emoji: '✨' },
];

/** HOME tab: game-mode picker + PLAY NOW. */
export default function HomeTab({ onTab }: { onTab: (t: TabId) => void }) {
  const { config } = useGame();
  const premium = usePremium();
  const ads = useAds();
  const [showPremium, setShowPremium] = useState(false);
  const [adForMole, setAdForMole] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const pop = useRef(new Animated.Value(0)).current;
  const wave = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(pop, { toValue: 1, tension: 40, friction: 7, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(wave, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(wave, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
    play('slide');
  }, []);

  const drift = wave.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });

  const hasMolePass = ads.molePassAvailable;
  const moleUsedToday = !premium.premium && !premium.admin && molePlayUsedToday();
  const moleLocked = config.mode === 'mole' && moleUsedToday && !hasMolePass;

  const pickMode = (mode: 'classic' | 'mole') => {
    setConfig({ mode });
    play(mode === config.mode ? 'tick' : 'pop');
  };

  const playNow = () => {
    if (moleLocked) {
      setShowPremium(true);
      play('buzz');
      return;
    }
    if (config.mode === 'mole' && moleUsedToday && hasMolePass) useMolePass();
    play('pop');
    goSetup();
  };

  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  return (
    <LinearGradient colors={Gradients.home} style={styles.bg}>
      {/* scattered confetti backdrop */}
      <Animated.View pointerEvents="none" style={[styles.confetti, { transform: [{ translateY: drift }] }]}>
        {CONFETTI.map((c, i) => (
          <Text
            key={i}
            style={[
              styles.confetto,
              { top: c.top, left: c.left, fontSize: c.size, transform: [{ rotate: `${c.rot}deg` }] },
            ]}
          >
            {c.emoji}
          </Text>
        ))}
      </Animated.View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* logo */}
        <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
          <View style={styles.logoWrap}>
            <Text style={styles.logoShadow} pointerEvents="none">BLUFF IT</Text>
            <Text style={styles.logo}>BLUFF IT</Text>
          </View>
          <Text style={styles.tagline}>{t('home_tagline')}</Text>
        </Animated.View>

        {/* mode picker — big cards, each with its own vibe */}
        <View style={styles.modeCol}>
          <Pressable
            style={[styles.modeCard, config.mode === 'classic' && styles.modeCardOn]}
            onPress={() => pickMode('classic')}
          >
            <LinearGradient
              colors={config.mode === 'classic' ? ['#FFE28A', '#FFB58A'] : ['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.15)']}
              style={styles.modeCardBg}
            >
              <View style={styles.modeLeft}>
                <Text style={styles.modeEmoji}>🎲</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modeName, config.mode === 'classic' && styles.modeNameOn]}>{t('mode_classic')}</Text>
                  <Text style={[styles.modeDesc, config.mode === 'classic' && styles.modeDescOn]}>{t('mode_classic_desc')}</Text>
                  <Text style={styles.modeChip}>2–6 📱 · 1 phone</Text>
                </View>
              </View>
              {config.mode === 'classic' ? (
                <View style={[styles.modeBadge, styles.modeBadgeClassic]}>
                  <Text style={styles.modeBadgeTxt}>✓</Text>
                </View>
              ) : null}
            </LinearGradient>
          </Pressable>

          <Pressable
            style={[styles.modeCard, config.mode === 'mole' && styles.modeCardOn, moleLocked && styles.modeCardLocked]}
            onPress={() => pickMode('mole')}
          >
            <LinearGradient
              colors={config.mode === 'mole' ? ['#C7D2FE', '#A78BFA'] : ['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.15)']}
              style={styles.modeCardBg}
            >
              <View style={styles.modeLeft}>
                <Text style={styles.modeEmoji}>🕵️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modeName, config.mode === 'mole' && styles.modeNameOn]}>{t('mode_mole')}</Text>
                  <Text style={[styles.modeDesc, config.mode === 'mole' && styles.modeDescOn]}>{t('mode_mole_desc')}</Text>
                  <Text style={styles.modeChip}>🕵️ 1 of you is the Mole</Text>
                </View>
              </View>
              <View style={styles.modeBadgeCol}>
                {moleLocked && <Text style={styles.modeLock}>🔒</Text>}
                {hasMolePass && <Text style={styles.modeAdTag}>📺</Text>}
                {config.mode === 'mole' ? (
                  <View style={[styles.modeBadge, styles.modeBadgeMole]}>
                    <Text style={styles.modeBadgeTxt}>✓</Text>
                  </View>
                ) : null}
              </View>
            </LinearGradient>
          </Pressable>
        </View>

        <BigButton label={t('home_play_now')} onPress={playNow} variant="end" style={styles.playBtn} />
        <Text style={styles.foot}>{t('home_foot')}</Text>

        <Pressable style={styles.settingsBtn} onPress={() => setShowSettings(true)} hitSlop={6}>
          <Text style={styles.settingsTxt}>⚙️ {t('home_settings')}</Text>
        </Pressable>
        <Text style={styles.by}>{t('home_by')} @evajonas.mp4</Text>
        <View style={{ height: 110 }} />
      </ScrollView>

      <PremiumSheet
        visible={showPremium}
        onClose={() => setShowPremium(false)}
        lockLabel={t('mode_mole')}
        reward={{
          label: t('mole_ad_reward'),
          onWatch: () => setAdForMole(true),
          onReward: () => {},
        }}
      />
      <AdModal
        visible={adForMole}
        onClose={() => { setAdForMole(false); setShowPremium(false); }}
        rewardLabel={t('mole_ad_reward')}
        onClaim={() => {
          completeAd();
          grantMolePass();
          play('win');
          setAdForMole(false);
          setShowPremium(false);
        }}
      />
      <SettingsSheet visible={showSettings} onClose={() => setShowSettings(false)} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, paddingBottom: 92 },
  content: { padding: 20, alignItems: 'center' },
  confetti: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.16 },
  confetto: { position: 'absolute' },
  logoWrap: { position: 'relative' },
  logoShadow: { position: 'absolute', top: 5, right: -5, fontSize: 56, fontWeight: '900', color: 'rgba(120,15,30,0.9)', transform: [{ skewX: '-6deg' }], letterSpacing: 2 },
  logo: { fontSize: 56, fontWeight: '900', color: '#fff', textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 3 }, transform: [{ skewX: '-6deg' }], letterSpacing: 2 },
  tagline: { color: 'rgba(255,255,255,0.85)', fontWeight: '800', fontSize: 13, marginTop: 4 },
  modeCol: { width: '100%', marginTop: 20, gap: 14 },
  modeCard: {
    width: '100%',
    borderRadius: Radius.lg,
    borderWidth: 4,
    borderColor: 'rgba(27,31,59,0.35)',
    overflow: 'hidden',
  },
  modeCardOn: {
    borderColor: '#1B1F3B',
    ...Shadow.pop,
    transform: [{ scale: 1.01 }],
  },
  modeCardLocked: { opacity: 0.8 },
  modeCardBg: { width: '100%' },
  modeLeft: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, gap: 14 },
  modeEmoji: { fontSize: 42, width: 52, textAlign: 'center', marginTop: 2 },
  modeName: { fontSize: 20, fontWeight: '900', color: Palette.ink, textTransform: 'uppercase', letterSpacing: 1 },
  modeNameOn: { color: '#1B1F3B' },
  modeDesc: { fontSize: 12, fontWeight: '700', color: 'rgba(27,31,59,0.7)', marginTop: 4, lineHeight: 17 },
  modeDescOn: { color: 'rgba(27,31,59,0.85)' },
  modeChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: '900',
    color: Palette.ink,
    borderWidth: 2,
    borderColor: 'rgba(27,31,59,0.25)',
  },
  modeBadgeCol: { position: 'absolute', top: 10, right: 12, alignItems: 'center', gap: 6 },
  modeBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#1B1F3B',
  },
  modeBadgeClassic: { backgroundColor: '#FFC53D' },
  modeBadgeMole: { backgroundColor: '#A78BFA' },
  modeBadgeTxt: { fontSize: 15, fontWeight: '900', color: '#1B1F3B', marginTop: -1 },
  modeLock: { fontSize: 20, backgroundColor: '#fff', borderRadius: 10, borderWidth: 2, borderColor: '#1B1F3B', padding: 3 },
  modeAdTag: { fontSize: 16, backgroundColor: '#fff', borderRadius: 10, borderWidth: 2, borderColor: '#1B1F3B', padding: 3 },
  playBtn: { width: '100%', marginTop: 22, height: 66, borderRadius: 22 },
  foot: { marginTop: 12, fontSize: 11.5, fontWeight: '800', color: 'rgba(255,255,255,0.85)' },
  settingsBtn: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderWidth: 3,
    borderColor: 'rgba(27,31,59,0.3)',
  },
  settingsTxt: { fontSize: 13, fontWeight: '800', color: Palette.ink },
  by: { marginTop: 14, fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.75)' },
});
