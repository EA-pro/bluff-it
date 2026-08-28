import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import BigButton from '@/components/BigButton';
import { useGame } from '@/game/useStore';
import { goSetup, setConfig } from '@/game/store';
import { Palette, Gradients, Radius } from '@/constants/theme';
import { play } from '@/game/sound';
import { usePremium, molePlayUsedToday } from '@/game/premium';
import { useAds, grantMolePass, useMolePass, completeAd } from '@/game/ads';
import PremiumSheet from '@/components/PremiumSheet';
import AdModal from '@/components/AdModal';
import SettingsSheet from '@/components/SettingsSheet';
import { t } from '@/i18n';

const FLOATERS = ['🎲', '🤫', '🃏', '🤯', '👑', '💯', '🕵️', '🎯'];

/** Home: logo, mode picker (Classic / Mole), one obvious button. */
export default function Home() {
  const { players, config } = useGame();
  const premium = usePremium();
  const ads = useAds();
  const [showPremium, setShowPremium] = useState(false);
  const [adForMole, setAdForMole] = useState(false);
  const [justRewarded, setJustRewarded] = useState(false);
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
    if (mode === 'mole' && moleUsedToday && !hasMolePass) {
      // let them see the mode, but the play button will demand premium
      play('tick');
    } else {
      play('pop');
    }
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

  return (
    <LinearGradient colors={Gradients.home} style={styles.bg}>
      {/* floating emoji party */}
      <View style={styles.floaters} pointerEvents="none">
        {FLOATERS.map((e, i) => (
          <Animated.Text
            key={i}
            style={[
              styles.floater,
              {
                left: `${8 + i * 11.5}%`,
                top: i % 2 === 0 ? `${10 + (i % 3) * 26}%` : `${20 + ((i * 7) % 55)}%`,
                fontSize: 22 + (i % 3) * 8,
                opacity: 0.9,
                transform: [{ translateY: i % 2 === 0 ? y1 : y2 }, { rotate: `${(i % 2 ? 1 : -1) * (6 + i * 3)}deg` }],
              },
            ]}
          >
            {e}
          </Animated.Text>
        ))}
      </View>

      <View style={styles.content}>
        <Animated.View style={{ opacity: pop, transform: [{ scale: pop }] }}>
          <View style={styles.logoCard}>
            <Text style={styles.logoSub}>{t('home_sub')}</Text>
            <Text style={styles.logo}>BLUFF IT</Text>
            <Text style={styles.logoTagline}>
              {t('home_tag1')} <Text style={styles.hl}>{t('home_tag2')}</Text>
            </Text>
          </View>
        </Animated.View>

        <View style={styles.rules}>
          <View style={styles.ruleRow}>
            <Text style={styles.ruleEmoji}>🎯</Text>
            <Text style={styles.ruleTxt}>
              {t('home_rule1')} <Text style={styles.ruleBold}>{t('home_rule2')}</Text> {t('home_rule3')}
            </Text>
          </View>
        </View>

        {/* MODE PICKER */}
        <View style={styles.modeRow}>
          <Pressable
            onPress={() => pickMode('classic')}
            style={[styles.modeCard, config.mode === 'classic' && styles.modeCardActive]}
          >
            <Text style={styles.modeEmoji}>🎲</Text>
            <Text style={styles.modeName}>{t('mode_classic')}</Text>
            <Text style={styles.modeDesc}>{t('mode_classic_desc')}</Text>
            {config.mode === 'classic' && <Text style={styles.modeTag}>{t('selected')}</Text>}
          </Pressable>
          <Pressable
            onPress={() => pickMode('mole')}
            style={[styles.modeCard, config.mode === 'mole' && styles.modeCardActiveMole]}
          >
            <Text style={styles.modeEmoji}>🕵️</Text>
            <Text style={styles.modeName}>{t('mode_mole')}</Text>
            <Text style={styles.modeDesc}>
              {t('mode_mole_desc')}
            </Text>
            {config.mode === 'mole' ? (
              <Text style={[styles.modeTag, styles.modeTagMole]}>
                {moleLocked ? t('mole_used') : hasMolePass ? t('ad_pass_ready') : t('selected')}
              </Text>
            ) : (
              <Text style={styles.modeTag}>{t('new_badge')}</Text>
            )}
          </Pressable>
        </View>

        <BigButton
          label={
            moleLocked
              ? t('play_unlock')
              : hasMolePass && config.mode === 'mole'
                ? t('play_mole_pass')
                : players.length >= 2
                ? `${t('play_players', { n: players.length })}${config.mode === 'mole' ? ' 🕵️' : ' 🎲'}`
                : config.mode === 'mole'
                  ? t('play_mole_go')
                  : t('play_go')
          }
          onPress={playNow}
          style={styles.btn}
        />
        <Text style={styles.footer}>
          {t('home_foot')}{config.mode === 'mole' && !moleLocked ? ` · ${t('mole_loaded')}` : ''}
        </Text>
        <Text style={styles.byLine}>{t('home_by')} <Text style={styles.byHandle}>@evajonas.mp4</Text></Text>
      </View>

      <Pressable style={styles.gear} onPress={() => setShowSettings(true)} hitSlop={12}>
        <Text style={styles.gearTxt}>⚙️</Text>
      </Pressable>

      <SettingsSheet visible={showSettings} onClose={() => setShowSettings(false)} />

      <PremiumSheet
        visible={showPremium}
        onClose={() => { setShowPremium(false); setJustRewarded(false); }}
        lockLabel={t('mole_mode')}
        reward={{
          label: t('mole_ad_cta'),
          onWatch: () => setAdForMole(true),
          onReward: () => setJustRewarded(true),
        }}
      />
      <AdModal
        visible={adForMole}
        onClose={() => {
          setAdForMole(false);
          setShowPremium(false);
          setJustRewarded(true);
        }}
        rewardLabel={t('mole_ad_cta') + ' 🕵️'}
        onClaim={() => {
          completeAd();
          grantMolePass();
        }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  floaters: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  floater: { position: 'absolute' },
  content: { flex: 1, justifyContent: 'center', padding: 24, gap: 14 },
  logoCard: {
    backgroundColor: '#fff',
    borderRadius: 40,
    borderWidth: 5,
    borderColor: '#1B1F3B',
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#1B1F3B',
    shadowOpacity: 0.4,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  logoSub: { color: Palette.muted, fontSize: 11, fontWeight: '900', letterSpacing: 3, marginBottom: 2 },
  logo: {
    fontSize: 64,
    fontWeight: '900',
    color: Palette.ink,
    letterSpacing: -2,
    textShadowColor: Palette.coral,
    textShadowRadius: 0,
    textShadowOffset: { width: 4, height: 4 },
  },
  logoTagline: { fontSize: 14, fontWeight: '800', color: Palette.ink, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  hl: { color: Palette.coral },
  rules: { gap: 8 },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignSelf: 'center',
    maxWidth: '100%',
    borderWidth: 2.5,
    borderColor: 'rgba(27,31,59,0.15)',
  },
  ruleEmoji: { fontSize: 18 },
  ruleTxt: { color: Palette.ink, fontSize: 12.5, fontWeight: '700' },
  ruleBold: { fontWeight: '900', color: Palette.coral },
  // mode picker
  modeRow: { flexDirection: 'row', gap: 12 },
  modeCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: Radius.lg,
    borderWidth: 3.5,
    borderColor: 'rgba(27,31,59,0.3)',
    padding: 14,
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 148,
  },
  modeCardActive: {
    backgroundColor: '#fff',
    borderColor: '#1B1F3B',
    shadowColor: '#1B1F3B',
    shadowOpacity: 0.35,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  modeCardActiveMole: {
    backgroundColor: '#1B1F3B',
    borderColor: Palette.grape,
    shadowColor: '#1B1F3B',
    shadowOpacity: 0.45,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  modeEmoji: { fontSize: 26 },
  modeName: { fontSize: 17, fontWeight: '900', color: Palette.ink, letterSpacing: 0.5 },
  modeDesc: { fontSize: 10.5, fontWeight: '700', color: Palette.ink, opacity: 0.75, textAlign: 'center', lineHeight: 14 },
  modeTag: {
    marginTop: 4,
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 1,
    color: Palette.lime,
    backgroundColor: 'rgba(27,31,59,0.08)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  modeTagMole: { color: Palette.grape, backgroundColor: 'rgba(167,139,250,0.15)' },
  btn: { width: '100%' },
  gear: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: 'rgba(27,31,59,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearTxt: { fontSize: 24 },

  footer: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  byLine: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  byHandle: { color: '#fff', fontWeight: '900' },
});
