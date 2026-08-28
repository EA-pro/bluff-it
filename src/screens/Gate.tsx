import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Vibration,
  Animated,
  Easing,
} from 'react-native';
import { Palette, Radius, Shadow, Gradients } from '@/constants/theme';
import BigButton from '@/components/BigButton';
import { LinearGradient } from 'expo-linear-gradient';
import { unlockGate, GATE_KEY } from '@/game/premium';
import { play } from '@/game/sound';
import { t } from '@/i18n';

/**
 * The front-page lock: a password screen that sits in front of the game.
 * Know the code (or the admin key) → the game opens. Wrong → shake + "locked".
 *
 * Demo gate (client-side) — keeps casual visitors and most scrapers off the
 * link; not real security.
 */
export default function Gate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [wrong, setWrong] = useState(false);
  const [locked, setLocked] = useState(false);
  const shake = React.useRef(new Animated.Value(0)).current;

  const submit = () => {
    if (locked) return;
    const ok = unlockGate(pin);
    if (ok) {
      play('pop');
      onUnlock();
      return;
    }
    play('buzz');
    setWrong(true);
    setLocked(true);
    if (Platform.OS !== 'web') Vibration.vibrate(300);
    Animated.timing(shake, {
      toValue: 1,
      duration: 450,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start();
    setTimeout(() => {
      setPin('');
      setWrong(false);
      setLocked(false);
    }, 1200);
  };

  const translateX = shake.interpolate({
    inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
    outputRange: [0, -14, 12, -8, 6, 0],
  });

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={Gradients.mole}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.wrap}>
          {/* Logo */}
          <View style={styles.logoCard}>
            <Text style={styles.logo}>BLUFF IT</Text>
            <Text style={styles.logoSub}>{t('gate_sub')}</Text>
          </View>

          <Animated.View style={{ transform: [{ translateX }] }}>
            <View style={styles.box}>
              <Text style={styles.lockIcon}>🔐</Text>
              <Text style={styles.title}>{t('gate_locked')}</Text>
              <Text style={styles.subtitle}>
                {t('gate_hint')}
              </Text>

              <TextInput
                style={[styles.pin, wrong && styles.pinWrong]}
                value={pin}
                onChangeText={(t) => setPin(t)}
                placeholder="CODE"
                placeholderTextColor={Palette.muted}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={12}
                selectionColor={Palette.bubblegum}
                onSubmitEditing={submit}
              />

              {wrong ? (
                <Text style={styles.wrongTxt}>{t('gate_wrong')}</Text>
              ) : null}

              <BigButton
                label={t('gate_unlock')}
                onPress={submit}
                disabled={pin.trim().length < 3 || locked}
              />
            </View>
          </Animated.View>

          <Text style={styles.foot}>
            {t('gate_foot', { n: GATE_KEY.length })}
          </Text>
          <Text style={styles.byLine}>{t('gate_by')} <Text style={styles.byHandle}>@evajonas.mp4</Text></Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  logoCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.xl,
    borderWidth: 4,
    borderColor: Palette.ink,
    ...Shadow.pop,
    paddingVertical: 14,
    paddingHorizontal: 34,
    marginBottom: 28,
  },
  logo: {
    fontSize: 44,
    fontWeight: '900',
    color: Palette.ink,
    letterSpacing: 1,
  },
  logoSub: {
    fontSize: 10,
    fontWeight: '900',
    color: Palette.muted,
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 2,
  },
  box: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: Radius.xl,
    borderWidth: 4,
    borderColor: Palette.ink,
    ...Shadow.pop,
    padding: 22,
    alignItems: 'center',
    gap: 12,
  },
  lockIcon: { fontSize: 44 },
  title: { fontSize: 22, fontWeight: '900', color: Palette.ink, textAlign: 'center' },
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.muted,
    textAlign: 'center',
    marginBottom: 6,
  },
  pin: {
    width: '100%',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 6,
    textAlign: 'center',
    color: Palette.ink,
    backgroundColor: '#F3F5FF',
    borderRadius: Radius.md,
    borderWidth: 3,
    borderColor: Palette.ink,
    paddingVertical: 12,
    marginBottom: 4,
  },
  pinWrong: { borderColor: Palette.coral, backgroundColor: '#FFF0F0' },
  wrongTxt: {
    fontSize: 13,
    fontWeight: '900',
    color: Palette.coral,
    marginBottom: 4,
  },
  foot: {
    marginTop: 22,
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1,
  },
  byLine: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
  byHandle: { color: '#fff', fontWeight: '900' },
});
