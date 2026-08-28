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

const FLOATERS = ['🎲', '🤫', '🃏', '🤯', '👑', '💯', '🕵️', '🎯'];

/** HOME tab: daily bonus + coins, game-mode picker, PLAY NOW. */
export default function HomeTab({ onTab }: { onTab: (t: TabId) => void }) {
  const { config } = useGame();
  const premium = usePremium();
  const ads = useAds();
  const [showPremium, setShowPremium] = useState(false);
  const [adForMole, setAdForMole] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const pop = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(pop, { toValue: 1, tension: 40, friction: 7, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
    play('slide');
  }, []);

  const y1 = float.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  const y2 = float.interpolate({ inputRange: [0, 1], outputRange: [0, 12] });

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

  const onClaimDaily = () => {
    onTab('shop');
  };

  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  return (
    <LinearGradient colors={Gradients.home} style={styles.bg}>
      <View style={styles.floaters} pointerEvents="none">
        {FLOATERS.map((e, i) => (
          <Animated.Text
            key={i}
            style={[styles.floater, { transform: [{ translateY: i % 2 === 0 ? y1 : y2 }], opacity: 0.16 }]}
          >
            {e}
          </Animated.Text>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* logo */}
        <Animated.View style={{ transform: [{ scale }] }}>
          <Text style={styles.logoShadow}>BLUFF IT</Text>
          <Text style={styles.logo}>BLUFF IT</Text>
          <Text style={styles.tagline}>{t('home_tagline')}</Text>
        </Animated.View>

        {/* shop hint — daily bonus + coins live in the shop now */}
        <Pressable style={styles.shopHint} onPress={onClaimDaily} hitSlop={6}>
          <Text style={styles.shopHintTxt}>🛒 {t('home_shop_hint')}</Text>
        </Pressable>

        {/* mode picker */}
        <View style={styles.modeRow}>
          <Pressable
            style={[styles.modeCard, config.mode === 'classic' && styles.modeCardOn]}
            onPress={() => pickMode('classic')}
          >
            <Text style={styles.modeEmoji}>🎲</Text>
            <Text style={[styles.modeName, config.mode === 'classic' && styles.modeNameOn]}>{t('mode_classic')}</Text>
            <Text style={styles.modeDesc}>{t('mode_classic_desc')}</Text>
          </Pressable>
          <Pressable
            style={[styles.modeCard, config.mode === 'mole' && styles.modeCardOn, moleLocked && styles.modeCardLocked]}
            onPress={() => pickMode('mole')}
          >
            {moleLocked && <Text style={styles.modeLock}>🔒</Text>}
            {hasMolePass && <Text style={styles.modeAdTag}>📺</Text>}
            <Text style={styles.modeEmoji}>🕵️</Text>
            <Text style={[styles.modeName, config.mode === 'mole' && styles.modeNameOn]}>{t('mode_mole')}</Text>
            <Text style={styles.modeDesc}>{t('mode_mole_desc')}</Text>
          </Pressable>
        </View>

        <BigButton label={t('home_play_now')} onPress={playNow} variant="end" style={styles.playBtn} />

        <View style={styles.hintCard}>
          <Text style={styles.hintTitle}>📖 {t('home_how')}</Text>
          <Text style={styles.hintRow}>1 · {t('home_rule1')}</Text>
          <Text style={styles.hintRow}>2 · {t('home_rule2')}</Text>
          <Text style={styles.hintRow}>3 · {t('home_rule3')}</Text>
        </View>

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
  floaters: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  floater: { position: 'absolute', fontSize: 34 },
  logoShadow: { fontSize: 56, fontWeight: '900', color: 'rgba(0,0,0,0.25)', marginTop: 18, marginBottom: -8, transform: [{ skewX: '-6deg' }] },
  logo: { fontSize: 56, fontWeight: '900', color: '#fff', textShadowColor: 'rgba(0,0,0,0.3)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 4 }, transform: [{ skewX: '-6deg' }], letterSpacing: 2 },
  tagline: { color: 'rgba(255,255,255,0.85)', fontWeight: '800', fontSize: 13, marginTop: 4 },
  shopHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderWidth: 3,
    borderColor: 'rgba(27,31,59,0.35)',
  },
  shopHintTxt: { fontSize: 12.5, fontWeight: '900', color: Palette.ink },
  modeRow: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 18 },
  modeCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: Radius.lg,
    borderWidth: 4,
    borderColor: 'rgba(27,31,59,0.35)',
    padding: 14,
    alignItems: 'center',
    position: 'relative',
  },
  modeCardOn: { backgroundColor: '#fff', borderColor: '#1B1F3B', ...Shadow.pop },
  modeCardLocked: { opacity: 0.75 },
  modeLock: { position: 'absolute', top: -8, right: -8, fontSize: 18, backgroundColor: '#fff', borderRadius: 10, borderWidth: 2, borderColor: '#1B1F3B', padding: 3 },
  modeAdTag: { position: 'absolute', top: -8, right: -8, fontSize: 16, backgroundColor: '#fff', borderRadius: 10, borderWidth: 2, borderColor: '#1B1F3B', padding: 3 },
  modeEmoji: { fontSize: 34 },
  modeName: { fontSize: 16, fontWeight: '900', color: Palette.ink, marginTop: 4, textTransform: 'uppercase' },
  modeNameOn: { color: '#1B1F3B' },
  modeDesc: { fontSize: 10.5, fontWeight: '700', color: Palette.muted, textAlign: 'center', marginTop: 3, lineHeight: 14 },
  playBtn: { width: '100%', marginTop: 22, height: 64, borderRadius: 20 },
  hintCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: Radius.lg,
    borderWidth: 3,
    borderColor: 'rgba(27,31,59,0.25)',
    padding: 14,
    marginTop: 18,
  },
  hintTitle: { fontSize: 13, fontWeight: '900', color: Palette.ink, marginBottom: 8 },
  hintRow: { fontSize: 11.5, fontWeight: '700', color: 'rgba(27,31,59,0.75)', marginBottom: 5, lineHeight: 16 },
  settingsBtn: {
    marginTop: 14,
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
