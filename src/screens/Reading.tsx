import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ScrollView, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import TimerRing from '@/components/TimerRing';
import BigButton from '@/components/BigButton';
import { useGame } from '@/game/useStore';
import { useCountdown } from '@/hooks/useCountdown';
import { readingDone } from '@/game/store';
import { Palette, Radius, Shadow, Gradients } from '@/constants/theme';
import { t } from '@/i18n';

/** The question: big sticker card, read out loud, then everyone guesses. */
export default function Reading() {
  const game = useGame();
  const { round, config, roundIndex, deck, timerEndsAt } = game;
  const { expired } = useCountdown(timerEndsAt, config.readSeconds);
  const fade = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  const sm = width < 380;
  useEffect(() => {
    Animated.spring(fade, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
  }, [fade]);

  if (!round) return null;
  const q = round.question;

  return (
    <LinearGradient colors={Gradients.reading} style={styles.bg}>
      <Animated.View
        style={{
          flex: 1,
          opacity: fade,
          transform: [{ scale: fade.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
        }}
      >
        <View style={styles.top}>
          <View style={styles.pill}>
            <Text style={styles.pillTxt}>
              {t('round_of', { a: roundIndex + 1, b: config.rounds })}
            </Text>
          </View>
          <TimerRing endsAt={timerEndsAt} totalSeconds={config.readSeconds} />
        </View>

        <ScrollView style={styles.mid} contentContainerStyle={styles.midInner} showsVerticalScrollIndicator={false}>
          {config.mode === 'mole' ? (
            <View style={styles.qCard}>
              <View style={styles.moleChip}>
                <Text style={styles.moleChipTxt}>{t('read_mole_badge')}</Text>
              </View>
              <Text
                style={[styles.moleText, { fontSize: sm ? 14 : 16, lineHeight: sm ? 20 : 23 }]}
                numberOfLines={12}
                adjustsFontSizeToFit
               
              >
                {t('mole_txt1')}<Text style={styles.moleBold}>{t('mole_txt2')}</Text>
                {t('mole_txt3')}<Text style={styles.moleBold}>{t('mole_txt4')}</Text>
                {t('mole_txt5')}<Text style={styles.moleBold}>{t('mole_txt6')}</Text>
                {t('mole_txt7')}<Text style={styles.moleBold}>{t('mole_txt8')}</Text>
                {t('mole_txt9')}
              </Text>
            </View>
          ) : (
            <View style={styles.qCard}>
              <View style={styles.qLabelChip}>
                <Text style={styles.qLabelTxt}>{t('read_classic')}</Text>
              </View>
              <Text
                style={[styles.qText, { fontSize: sm ? 19 : 25, lineHeight: sm ? 26 : 34 }]}
                numberOfLines={8}
                adjustsFontSizeToFit
               
              >
                {q.text}
              </Text>
              {q.hint ? (
                <View style={styles.hintChip}>
                  <Text style={styles.hintTxt}>💡 {q.hint}</Text>
                </View>
              ) : null}
            </View>
          )}
          <Text style={styles.readOut}>
            {config.mode === 'mole' ? t('mole_silent') : t('read_aloud')}
          </Text>
        </ScrollView>

        <View style={styles.bottom}>
          <BigButton
            label={
              config.mode === 'mole'
                ? expired ? t('next_arrow') : t('got_it_mole')
                : expired ? t('next_arrow') : t('got_it_classic')
            }
            onPress={readingDone}
          />
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
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderWidth: 3,
    borderColor: '#1B1F3B',
    ...Shadow.pop,
  },
  pillTxt: { color: Palette.ink, fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  mid: { flex: 1 },
  midInner: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 },
  qCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.xl,
    borderWidth: 4,
    borderColor: '#1B1F3B',
    padding: 26,
    alignItems: 'center',
    gap: 14,
    shadowColor: '#1B1F3B',
    shadowOpacity: 0.35,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  qLabelChip: { backgroundColor: Palette.ink, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  qLabelTxt: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  moleChip: { backgroundColor: Palette.grape, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  moleChipTxt: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  moleText: { fontSize: 16, fontWeight: '700', color: Palette.ink, textAlign: 'center', lineHeight: 23 },
  moleBold: { fontWeight: '900', color: Palette.grape },
  qText: { fontSize: 25, fontWeight: '900', color: Palette.ink, textAlign: 'center', lineHeight: 34 },
  hintChip: { backgroundColor: '#FFF3BF', borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 2.5, borderColor: 'rgba(27,31,59,0.2)' },
  hintTxt: { color: '#7A5A00', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  readOut: { color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.2)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 2 } },
  bottom: { padding: 20, paddingBottom: 34 },
});
