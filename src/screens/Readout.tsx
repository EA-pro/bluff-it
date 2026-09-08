import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Animated, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AvatarFace from '@/components/AvatarFace';
import BigButton from '@/components/BigButton';
import { useGame } from '@/game/useStore';
import { readoutNext, readoutDone } from '@/game/store';
import { play, haptic } from '@/game/sound';
import { Palette, Radius, Shadow, Gradients } from '@/constants/theme';
import { t } from '@/i18n';

/**
 * The host's READOUT relay — the discussion, out loud.
 *
 * One phone is never big enough for six people to read six cards at once,
 * so the crowned Game Host calls everything: the question first (non-mole),
 * then every single answer on ONE giant card at a time. The group hears
 * each number as big as the screen allows, argues, and only then votes.
 *
 * No per-card timer — the host sets the pace. Progress dots show how many
 * answers are still left in the bag.
 */
export default function Readout() {
  const game = useGame();
  const { round, players, config, hostId, readoutIdx, roundIndex } = game;
  const isMole = config.mode === 'mole' && !!round?.moleId;
  const isWords = config.mode === 'words' && !!round;
  const host = players.find((p) => p.id === hostId) ?? null;
  const { width } = useWindowDimensions();
  const sm = width < 380;

  const fade = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(fade, { toValue: 1, friction: 6, useNativeDriver: true }).start();
    play('slide');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // the big card flips in every time the position changes
  useEffect(() => {
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, tension: 70, friction: 11, useNativeDriver: true }).start();
  }, [readoutIdx, pop]);

  const options = useMemo(() => {
    if (!round) return [];
    return round.optionOrder
      .map((key, i) => {
        const isTruth = key === 'truth';
        const value = isTruth ? (round.question.truth ?? 0) : (round.guesses[key] ?? null);
        const textValue = isTruth ? round.question.truthText ?? null : (round.guessesText?.[key] ?? null);
        const owner = isTruth ? null : (players.find((p) => p.id === key) ?? null);
        return {
          key,
          value,
          textValue,
          owner,
          isTruth,
          unit: round.question.unit,
        };
      })
      // same filters as the reveal board: classic/words drop the truth + nulls;
      // mole keeps every card (named, incl. the Mole) so the hunt works.
      .filter((c) => (isMole ? true : isWords ? !c.isTruth && c.textValue != null : !c.isTruth && c.value != null));
  }, [round, players, isMole, isWords]);

  if (!round || readoutIdx < 0) return null;

  const showingQuestion = !isMole && readoutIdx === 0;
  // dots-row position (classic: 0 = question, answers 1..N; mole: no question
  // slot, so the first answer sits on dot 0)
  const slotIdx = isMole ? readoutIdx - 1 : readoutIdx;
  const optionIndex = showingQuestion ? -1 : readoutIdx - 1;
  const opt = optionIndex >= 0 ? options[optionIndex] : null;
  const totalSlots = (isMole ? 0 : 1) + options.length;
  const isLast = slotIdx === totalSlots - 1;
  // 1-based "which answer am I on" — readoutIdx is 1..N in both modes
  const answeredSoFar = showingQuestion ? 0 : readoutIdx;

  const grad = isMole ? Gradients.mole : Gradients.reveal;

  return (
    <LinearGradient colors={grad} style={styles.bg}>
      <Animated.View style={{ flex: 1, opacity: fade }}>
        {/* top: who is hosting + how far along */}
        <View style={styles.top}>
          <View style={styles.pill}>
            <Text style={styles.pillTxt}>
              👑 {host ? host.name : 'HOST'} {t('ro_hosting')}
            </Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillTxt}>
              {t('round_n', { a: roundIndex + 1 })}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>
          {isMole ? t('ro_title_mole') : t('ro_title')}
        </Text>
        <Text style={styles.subtitle}>{t('ro_sub')}</Text>

        {/* progress dots: one per slot, the live one glows */}
        <View style={styles.dots}>
          {Array.from({ length: totalSlots }, (_, i) => (
            <View key={i} style={[styles.dot, i === slotIdx && styles.dotOn, i < slotIdx && styles.dotDone]} />
          ))}
        </View>

        {/* THE giant card */}
        <View style={styles.cardArea}>
          <Animated.View
            style={[
              styles.card,
              {
                transform: [
                  { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
                  { translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) },
                ],
              },
            ]}
          >
            {showingQuestion ? (
              <>
                <Text style={styles.qLabel}>{t('ro_q_label')}</Text>
                <Text style={[styles.qText, { fontSize: sm ? 22 : 28 }]} numberOfLines={6} adjustsFontSizeToFit>
                  {round.question.text}
                  {round.question.unit ? ` (${round.question.unit})` : ''}
                </Text>
                <Text style={styles.qRead}>{t('ro_q_read')}</Text>
              </>
            ) : opt ? (
              <>
                <View style={styles.cardTopRow}>
                  <Text style={styles.answerCount}>
                    {isWords
                      ? t('ro_answer', { a: answeredSoFar, b: options.length })
                      : t('ro_answer', { a: answeredSoFar, b: options.length })}
                  </Text>
                  {isMole && opt.owner ? (
                    <View style={styles.ownerBig}>
                      <AvatarFace avatarId={opt.owner.avatarId} size={40} />
                      <Text style={styles.ownerName} numberOfLines={1}>{opt.owner.name}</Text>
                    </View>
                  ) : null}
                </View>

                {isWords ? (
                  <Text style={[styles.wordBig, { fontSize: sm ? 26 : 34 }]} numberOfLines={5} adjustsFontSizeToFit>
                    “{opt.textValue}”
                  </Text>
                ) : opt.value != null ? (
                  <>
                    <Text style={[styles.valueBig, { fontSize: sm ? 64 : 84 }]} numberOfLines={1} adjustsFontSizeToFit>
                      {opt.value.toLocaleString('en-US')}
                    </Text>
                    {opt.unit ? <Text style={styles.unitBig}>{opt.unit}</Text> : null}
                  </>
                ) : (
                  <Text style={styles.passed}>{t('ro_passed')}</Text>
                )}
              </>
            ) : null}
          </Animated.View>
        </View>

        <View style={styles.bottom}>
          <BigButton
            label={
              showingQuestion
                ? t('ro_q_done')
                : isLast
                  ? isMole
                    ? t('ro_last_hunt')
                    : t('ro_last')
                  : t('ro_next')
            }
            onPress={() => {
              play('pop');
              haptic('medium');
              if (isLast && !showingQuestion) readoutDone();
              else readoutNext();
            }}
          />
          <Text style={styles.footNote}>
            {isMole ? t('ro_foot_mole') : t('ro_foot')}
          </Text>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  pill: {
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 3,
    borderColor: '#1B1F3B',
    ...Shadow.pop,
  },
  pillTxt: { color: Palette.ink, fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },
  title: { color: '#fff', fontSize: 28, fontWeight: '900', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.25)', textShadowRadius: 5, textShadowOffset: { width: 0, height: 2 } },
  subtitle: { color: 'rgba(255,255,255,0.92)', fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 4, paddingHorizontal: 24 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 14 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotOn: { backgroundColor: '#fff', width: 30 },
  dotDone: { backgroundColor: '#FFE28A' },
  cardArea: { flex: 1, justifyContent: 'center', paddingHorizontal: 22, paddingTop: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: Radius.xl,
    borderWidth: 5,
    borderColor: '#1B1F3B',
    padding: 26,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    minHeight: 320,
    shadowColor: '#1B1F3B',
    shadowOpacity: 0.35,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  qLabel: { fontSize: 12, fontWeight: '900', letterSpacing: 2, color: Palette.muted },
  qText: { color: Palette.ink, fontWeight: '900', textAlign: 'center', lineHeight: 1.3 },
  qRead: { fontSize: 16, fontWeight: '900', color: Palette.grape, textAlign: 'center', marginTop: 6 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  answerCount: { fontSize: 13, fontWeight: '800', color: Palette.muted, letterSpacing: 0.5 },
  ownerBig: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Palette.soft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 2.5, borderColor: 'rgba(27,31,59,0.2)' },
  ownerName: { color: Palette.ink, fontSize: 20, fontWeight: '900', maxWidth: 130 },
  valueBig: { color: Palette.ink, fontWeight: '900', fontVariant: ['tabular-nums'], maxWidth: '100%' },
  unitBig: { color: Palette.muted, fontSize: 18, fontWeight: '800' },
  wordBig: { color: Palette.ink, fontWeight: '800', textAlign: 'center', lineHeight: 1.3, maxWidth: '100%' },
  passed: { color: Palette.muted, fontSize: 24, fontWeight: '800' },
  bottom: { padding: 16, paddingBottom: 30 },
  footNote: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '800', textAlign: 'center', marginTop: 10 },
});
