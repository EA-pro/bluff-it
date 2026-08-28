import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import TimerRing from '@/components/TimerRing';
import AvatarFace from '@/components/AvatarFace';
import BigButton from '@/components/BigButton';
import { useGame } from '@/game/useStore';
import { useCountdown } from '@/hooks/useCountdown';
import { revealDone } from '@/game/store';
import { optionLetter } from '@/game/engine';
import { play, haptic } from '@/game/sound';
import { Palette, Radius, Shadow, Gradients } from '@/constants/theme';
import { t } from '@/i18n';

const LETTER_COLORS = ['#FF5A5F', '#38BDF8', '#FFC53D', '#7ED957', '#A78BFA', '#F472B6', '#2DD4BF', '#FF8A3D'];

/**
 * The reveal / discussion board.
 *
 * Classic: anonymous letter cards (A–G) with the truth mixed in — NO label
 * or highlight on the truth card, or everyone would know the answer before
 * the vote. Just the numbers, the question, and the argument timer.
 *
 * Mole: the same board WITHOUT the truth card, and every card shows WHO
 * wrote it (always on — the names ARE the evidence for the hunt).
 *
 * Card sizes are fluid: a flexbox grid sized from the window width, so the
 * board always fills the screen cleanly on any phone (2 or 3 columns).
 */
export default function Reveal() {
  const game = useGame();
  const { round, players, config, roundIndex, timerEndsAt } = game;
  const isMole = config.mode === 'mole' && !!round?.moleId;
  const discussSeconds = config.discussMinutes * 60;
  const { expired } = useCountdown(timerEndsAt, discussSeconds);
  const fade = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();

  // per-card bounce: each card springs in with an overshoot, staggered so
  // the board "deals" itself out card by card.
  const cardBounce = useRef<Record<string, Animated.Value>>({});
  const bounceFor = (key: string) => {
    if (!cardBounce.current[key]) cardBounce.current[key] = new Animated.Value(0);
    return cardBounce.current[key];
  };

  useEffect(() => {
    Animated.spring(fade, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
    if (round) {
      cards.forEach((c, i) => {
        const v = cardBounce.current[c.key];
        if (v) {
          v.setValue(0);
          Animated.spring(v, {
            toValue: 1,
            tension: 170,
            friction: 8,
            delay: 120 + i * 75,
            useNativeDriver: true,
          }).start();
        }
      });
    }
    play('reveal');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cards = useMemo(() => {
    if (!round) return [];
    return round.optionOrder
      .map((key, i) => {
        const value = key === 'truth' ? (round.question.truth ?? 0) : (round.guesses[key] ?? null);
        const owner = players.find((p) => p.id === key) ?? null;
        return {
          key,
          letter: optionLetter(i),
          value,
          isTruth: key === 'truth',
          owner,
          unit: round.question.unit,
          color: LETTER_COLORS[i % LETTER_COLORS.length],
        };
      })
      // mole mode: no truth card at all; classic: drop nulls
      .filter((c) => (isMole ? !c.isTruth : c.value != null));
  }, [round, players, isMole]);

  // fluid grid: 3 columns on wide screens, 2 on phones — cards flex to fill
  const columns = width >= 420 ? 3 : 2;
  const sm = width < 380;

  if (!round) return null;

  const grad = isMole ? Gradients.mole : Gradients.reveal;

  return (
    <LinearGradient colors={grad} style={styles.bg}>
      <Animated.View style={{ flex: 1, opacity: fade }}>
        <View style={styles.top}>
          <View style={styles.pill}>
            <Text style={styles.pillTxt}>
              {isMole ? t('reveal_pill_mole') : t('reveal_pill_classic')} {roundIndex + 1}/{config.rounds}
            </Text>
          </View>
          <TimerRing endsAt={timerEndsAt} totalSeconds={discussSeconds} />
        </View>

        {/* the discussion board — fully static, everything fits on one screen */}
        <View style={styles.boardArea}>
        <Text style={[styles.title, { fontSize: sm ? 18 : 24 }]}>
          {isMole ? t('reveal_title_mole') : t('reveal_title_classic')}
        </Text>
        <Text style={styles.subtitle}>
          {isMole ? t('reveal_sub_mole') : t('reveal_sub_classic')}
        </Text>

        {/* the actual question, up top so the group can argue about it */}
        <View style={styles.qBanner}>
          <Text style={styles.qBannerLabel}>{t('reveal_q')}</Text>
          <Text style={styles.qBannerTxt} numberOfLines={2} adjustsFontSizeToFit>
            {round.question.text} {round.question.unit ? `(${round.question.unit})` : ''}
          </Text>
          {isMole ? (
            <Text style={styles.qBannerSub}>{t('reveal_mole_note')}</Text>
          ) : null}
        </View>

        <View style={styles.cardsWrap}>
          {cards.map((c, i) => (
            <Animated.View
              key={c.key}
              style={[
                styles.cell,
                { flexBasis: `${100 / columns}%` },
                {
                  transform: [
                    { scale: bounceFor(c.key) },
                    { rotate: `${(c.key.charCodeAt(0) % 2 === 0 ? -1 : 1) * 0.8}deg` },
                  ],
                },
              ]}
            >
              <View style={styles.card}>
                <View style={[styles.letter, { backgroundColor: c.color }]}>
                  <Text style={styles.letterTxt}>{c.letter}</Text>
                </View>
                <Text style={[styles.value, { fontSize: sm ? 20 : 26 }]} numberOfLines={1} adjustsFontSizeToFit>
                  {c.value != null ? c.value.toLocaleString('en-US') : '—'}
                </Text>
                {c.unit && c.value != null ? (
                  <Text style={styles.unitTxt}>{c.unit}</Text>
                ) : null}
                {/* mole mode: who wrote it is ALWAYS visible — it's the evidence */}
                {isMole && c.owner ? (
                  <View style={styles.ownerChip}>
                    <AvatarFace avatarId={c.owner.avatarId} size={18} />
                    <Text style={styles.ownerName} numberOfLines={1}>{c.owner.name}</Text>
                  </View>
                ) : null}
              </View>
            </Animated.View>
          ))}
        </View>
        </View>

        <View style={styles.bottom}>
          <BigButton
            label={isMole ? t('reveal_hunt') : expired ? t('reveal_to_votes') : t('reveal_vote')}
            onPress={() => { play('pop'); haptic('medium'); revealDone(); }}
          />
          <Text style={styles.footNote}>
            {isMole ? t('reveal_foot_mole') : t('reveal_foot_classic')}
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
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderWidth: 3,
    borderColor: '#1B1F3B',
    ...Shadow.pop,
  },
  pillTxt: { color: Palette.ink, fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  title: { color: '#fff', fontSize: 26, fontWeight: '900', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.25)', textShadowRadius: 5, textShadowOffset: { width: 0, height: 2 } },
  subtitle: { color: 'rgba(255,255,255,0.92)', fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 4, paddingHorizontal: 24 },
  qBanner: {
    alignSelf: 'center',
    marginTop: 12,
    marginHorizontal: 18,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 4,
    borderColor: '#1B1F3B',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 2,
    ...Shadow.pop,
  },
  qBannerLabel: {
    alignSelf: 'center',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    color: Palette.muted,
  },
  qBannerTxt: {
    color: Palette.ink,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 19,
  },
  qBannerSub: {
    alignSelf: 'center',
    fontSize: 11,
    fontWeight: '800',
    color: Palette.grape,
    marginTop: 1,
  },
  boardArea: { flex: 1, justifyContent: 'center' },
  // fluid flexbox grid — no hardcoded widths
  cardsWrap: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', alignContent: 'center', paddingHorizontal: 14, gap: 10 },
  cell: { flexGrow: 1, flexShrink: 1, padding: 5 },
  card: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: 4,
    borderColor: '#1B1F3B',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 5,
    minHeight: 118,
    ...Shadow.pop,
  },
  letter: {
    position: 'absolute',
    top: -10,
    left: -10,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    borderColor: '#1B1F3B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterTxt: { color: '#fff', fontSize: 16, fontWeight: '900' },
  value: { color: Palette.ink, fontSize: 26, fontWeight: '900', fontVariant: ['tabular-nums'], maxWidth: '100%', textAlign: 'center' },
  unitTxt: { color: Palette.muted, fontSize: 11, fontWeight: '800' },
  ownerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Palette.soft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: '100%',
    borderWidth: 2,
    borderColor: 'rgba(27,31,59,0.15)',
  },
  ownerName: { color: Palette.ink, fontSize: 11, fontWeight: '900', maxWidth: 80 },
  bottom: { padding: 16, paddingBottom: 30 },
  footNote: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '800', textAlign: 'center', marginTop: 10 },
});
