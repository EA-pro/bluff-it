import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, ScrollView, TextInput, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import TimerRing from '@/components/TimerRing';
import BigButton from '@/components/BigButton';
import AvatarFace from '@/components/AvatarFace';
import { useGame } from '@/game/useStore';
import { useCountdown } from '@/hooks/useCountdown';
import { submitGuess, submitWordsGuess } from '@/game/store';
import { questionFor, checkGuess, checkWordsGuess, wordsTruthKey, WORDS_MAX_CHARS } from '@/game/engine';
import { play, haptic } from '@/game/sound';
import { Palette, Radius, Shadow, Gradients } from '@/constants/theme';
import { t } from '@/i18n';

/**
 * One player's secret turn: they enter their best guess on the numpad while
 * everyone else looks away (the phone just came over from the handoff).
 */
export default function Guess() {
  const game = useGame();
  const { round, players, config, cursor, timerEndsAt } = game;
  const { expired } = useCountdown(timerEndsAt, config.guessSeconds);
  const me = players[cursor];
  const { width } = useWindowDimensions();
  const sm = width < 380;

  const [val, setVal] = useState('');
  const enteredFor = useRef<string | null>(null);
  // duplicate-answer rejection: message toast + shake on the value box
  const [reject, setReject] = useState<{ title: string; sub: string } | null>(null);
  const rejectTx = useRef(new Animated.Value(0)).current;
  const rejectPop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setVal('');
    setReject(null);
    rejectPop.setValue(0);
    enteredFor.current = me?.id ?? null;
  }, [me?.id]);

  function showReject(title: string, sub: string) {
    setReject({ title, sub });
    rejectPop.setValue(0);
    Animated.spring(rejectPop, { toValue: 1, tension: 380, friction: 18, useNativeDriver: true }).start();
    const shake = Animated.sequence([
      Animated.timing(rejectTx, { toValue: -14, duration: 60, useNativeDriver: true }),
      Animated.timing(rejectTx, { toValue: 12, duration: 70, useNativeDriver: true }),
      Animated.timing(rejectTx, { toValue: -8, duration: 70, useNativeDriver: true }),
      Animated.timing(rejectTx, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]);
    shake.start();
    play('buzz');
    haptic('error');
    // auto-dismiss so a retry doesn't need a tap
    setTimeout(() => setReject(null), 2100);
  }

  const isWords = config.mode === 'words';

  // timeout -> auto-pass (no guess)
  useEffect(() => {
    if (expired && me && enteredFor.current === me.id) {
      enteredFor.current = null;
      if (isWords) submitWordsGuess(null);
      else submitGuess(null);
    }
  }, [expired, me?.id]);

  if (!round || !me) return null;
  // In mole mode the Mole quietly answers a different question — no badge
  // giving the role away before the discussion.
  const q = questionFor(round, me.id);

  if (isWords) {
    // WORDS MODE — objective trivia, short written answer (no numpad).
    const qText = q.text;
    const submitWords = () => {
      const v = val.trim();
      if (!v) return;
      const chk = checkWordsGuess(round, me.id, v);
      if (!chk.ok) {
        if (chk.reason === 'exact') showReject(t('too_smooth'), t('too_smooth_sub'));
        else showReject(t('dup'), t('dup_sub'));
        return;
      }
      enteredFor.current = null;
      setReject(null);
      play('pop');
      haptic('success');
      submitWordsGuess(v);
    };
    return (
      <LinearGradient colors={Gradients.guess} style={styles.bg}>
        <View style={styles.top}>
          <View style={styles.turnPill}>
            <AvatarFace avatarId={me.avatarId} size={40} />
            <Text style={styles.turnName}>{me.name}</Text>
          </View>
          <TimerRing endsAt={timerEndsAt} totalSeconds={config.guessSeconds} />
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyInner} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.qBox}>
            <Text style={styles.qText}>{qText}</Text>
          </View>

          <Text style={styles.padLabel}>{t('your_answer')}</Text>
          <Animated.View
            style={[
              styles.wordsInputBox,
              reject && styles.valueBoxReject,
              { transform: [{ translateX: rejectTx }] },
            ]}
          >
            <TextInput
              style={styles.wordsInput}
              value={val}
              onChangeText={(v: string) => setVal(v.slice(0, WORDS_MAX_CHARS))}
              placeholder={t('answer_ph')}
              placeholderTextColor={Palette.muted}
              multiline
              maxLength={WORDS_MAX_CHARS}
              autoFocus
              blurOnSubmit
              returnKeyType="done"
              onSubmitEditing={submitWords}
            />
          </Animated.View>
          <Text style={styles.charCount}>{val.length}/{WORDS_MAX_CHARS}</Text>

          {reject ? (
            <Animated.View
              style={[
                styles.rejectToast,
                { opacity: rejectPop, transform: [{ scale: rejectPop.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] },
              ]}
              pointerEvents="none"
            >
              <Text style={styles.rejectTitle}>{reject.title}</Text>
              <Text style={styles.rejectSub}>{reject.sub}</Text>
            </Animated.View>
          ) : null}

          <BigButton label={t('lock_in')} onPress={submitWords} disabled={val.trim() === ''} style={styles.submitBtn} />
        </ScrollView>
      </LinearGradient>
    );
  }

  const press = (k: string) => {
    if (k === 'del') setVal((v) => v.slice(0, -1));
    else if (k === 'x10') setVal((v) => (v === '' ? '0' : v + '0'));
    else setVal((v) => (v.length >= 7 ? v : v + k));
    haptic('light');
  };
  const submit = () => {
    if (!val) return;
    const n = parseInt(val, 10);
    if (!Number.isFinite(n)) return;
    const chk = checkGuess(round, me.id, n);
    if (!chk.ok) {
      if (chk.reason === 'exact') {
        showReject(t('too_smooth'), t('too_smooth_sub'));
      } else {
        showReject(t('dup'), t('dup_sub'));
      }
      return;
    }
    enteredFor.current = null;
    setReject(null);
    play('pop');
    haptic('success');
    submitGuess(n);
  };

  return (
    <LinearGradient colors={Gradients.guess} style={styles.bg}>
      <View style={styles.top}>
        <View style={styles.turnPill}>
          <AvatarFace avatarId={me.avatarId} size={40} />
          <Text style={styles.turnName}>{me.name}</Text>
        </View>
        <TimerRing endsAt={timerEndsAt} totalSeconds={config.guessSeconds} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyInner} showsVerticalScrollIndicator={false}>
        <View style={styles.qBox}>
          <Text style={styles.qText} numberOfLines={4} adjustsFontSizeToFit>{q.text}</Text>
        </View>

        <Text style={styles.padLabel}>
          {t('best_guess')}{q.unit ? ` (${q.unit})` : ''}
        </Text>
        <Animated.View
          style={[
            styles.valueBox,
            reject && styles.valueBoxReject,
            { transform: [{ translateX: rejectTx }] },
            { minWidth: sm ? 180 : 210 },
          ]}
        >
          <Text
            style={[styles.valueTxt, val === '' && styles.valuePh, { fontSize: sm ? 28 : 34 }]}
            numberOfLines={1}
            adjustsFontSizeToFit
           
          >
            {val === '' ? '0' : Number(val).toLocaleString('en-US')}
          </Text>
        </Animated.View>

        {reject ? (
          <Animated.View
            style={[
              styles.rejectToast,
              { opacity: rejectPop, transform: [{ scale: rejectPop.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] },
            ]}
            pointerEvents="none"
          >
            <Text style={styles.rejectTitle}>{reject.title}</Text>
            <Text style={styles.rejectSub}>{reject.sub}</Text>
          </Animated.View>
        ) : null}

        <View style={styles.pad}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'x10', '0', 'del'].map((k) => (
            <Pressable
              key={k}
              onPress={() => press(k)}
              style={({ pressed }) => [
                styles.key,
                { width: sm ? 76 : 88, height: sm ? 54 : 64 },
                pressed && styles.keyOn,
                (k === 'x10' || k === 'del') && styles.keyFn,
              ]}
            >
              <Text style={[styles.keyTxt, (k === 'x10' || k === 'del') && styles.keyFnTxt]}>
                {k === 'del' ? '⌫' : k === 'x10' ? '×10' : k}
              </Text>
            </Pressable>
          ))}
        </View>

        <BigButton label={t('lock_in')} onPress={submit} disabled={val === ''} style={styles.submitBtn} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
  turnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 999,
    padding: 7,
    paddingRight: 16,
    gap: 10,
    borderWidth: 3,
    borderColor: '#1B1F3B',
    ...Shadow.pop,
  },
  turnName: { color: Palette.ink, fontWeight: '900', fontSize: 16 },
  turnSub: { color: Palette.muted, fontSize: 11, fontWeight: '700' },
  body: { flex: 1 },
  bodyInner: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 12 },
  qBox: { marginHorizontal: 20, marginTop: 10, gap: 8 },
  qText: { color: '#fff', fontSize: 18, fontWeight: '900', textAlign: 'center', lineHeight: 25, textShadowColor: 'rgba(0,0,0,0.2)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 2 } },
  padLabel: { color: '#fff', textAlign: 'center', marginTop: 16, fontSize: 16, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.2)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 2 } },
  valueBox: {
    alignSelf: 'center',
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: 4,
    borderColor: '#1B1F3B',
    paddingHorizontal: 28,
    paddingVertical: 10,
    minWidth: 210,
    ...Shadow.pop,
  },
  valueTxt: { fontSize: 34, fontWeight: '900', color: Palette.ink, textAlign: 'center', fontVariant: ['tabular-nums'] },
  valuePh: { color: Palette.muted },
  valueBoxReject: { borderColor: '#DC2626' },
  rejectToast: {
    alignSelf: 'center',
    marginTop: 12,
    backgroundColor: '#1B1F3B',
    borderRadius: Radius.md,
    borderWidth: 3,
    borderColor: '#DC2626',
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    gap: 2,
    ...Shadow.pop,
  },
  rejectTitle: { color: '#FFD6D6', fontSize: 15, fontWeight: '900' },
  rejectSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11.5, fontWeight: '700', textAlign: 'center' },
  pad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginHorizontal: 14, marginTop: 16 },
  wordsInputBox: {
    alignSelf: 'stretch',
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: 4,
    borderColor: '#1B1F3B',
    ...Shadow.pop,
  },
  wordsInput: { fontSize: 17, fontWeight: '700', color: Palette.ink, padding: 14, minHeight: 72, textAlignVertical: 'top' },
  charCount: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '800', textAlign: 'right', marginHorizontal: 24, marginTop: 6 },
  key: {
    width: 88,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#1B1F3B',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 4,
    ...Shadow.pop,
  },
  keyOn: { transform: [{ scale: 0.94 }], backgroundColor: Palette.sunshine },
  keyTxt: { fontSize: 26, fontWeight: '900', color: Palette.ink },
  keyFn: { backgroundColor: '#EDEAF7' },
  keyFnTxt: { fontSize: 20 },
  submitBtn: { marginTop: 18, marginHorizontal: 18, marginBottom: 28 },
});
