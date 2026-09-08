import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, ScrollView, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import TimerRing from '@/components/TimerRing';
import AvatarFace from '@/components/AvatarFace';
import BigButton from '@/components/BigButton';
import { useGame } from '@/game/useStore';
import { useCountdown } from '@/hooks/useCountdown';
import { revealDone } from '@/game/store';
import { play, haptic } from '@/game/sound';
import { Palette, Radius, Shadow, Gradients } from '@/constants/theme';
import { t } from '@/i18n';

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
 * Layout: the question banner and the bottom button are FIXED, and the card
 * grid sits in a ScrollView — on a phone the grid is bigger than one screen
 * with 5+ answers, and centering a fixed-size container is exactly how the
 * question got clipped and the last row got hidden. Now everything is
 * readable: scroll to argue, banner always visible, cards stay large.
 */
export default function Reveal() {
  const game = useGame();
  const { round, players, config, roundIndex, timerEndsAt } = game;
  const isMole = config.mode === 'mole' && !!round?.moleId;
  const isWords = config.mode === 'words' && !!round;
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
    const texts = round.guessesText ?? {};
    return round.optionOrder
      .map((key, i) => {
        const value = key === 'truth' ? (round.question.truth ?? 0) : (round.guesses[key] ?? null);
        const textValue = key === 'truth' ? round.question.truthText ?? null : (texts[key] ?? null);
        const owner = players.find((p) => p.id === key) ?? null;
        return {
          key,
          value,
          textValue,
          isTruth: key === 'truth',
          owner,
          unit: round.question.unit,
        };
      })
      // mole mode: no truth card at all; words: drop nulls; classic: drop nulls
      .filter((c) => (isMole ? !c.isTruth : isWords ? c.textValue != null : c.value != null));
  }, [round, players, isMole, isWords]);

  // Layout: fixed, readable cards in a scrollable grid. Columns grow with
  // the answer count; the ScrollView takes whatever room is left, so the
  // board can never push the question banner off-screen or hide the last row.
  const n = cards.length;
  const cols = n >= 6 ? 3 : 2;
  const cardH = cols === 3 ? 96 : 112;
  const sm = width < 380;
  const tight = cardH < 100;

  if (!round) return null;

  const grad = isMole ? Gradients.mole : isWords ? Gradients.reveal : Gradients.reveal;
  const bannerText = round.question.text;

  return (
    <LinearGradient colors={grad} style={styles.bg}>
      <Animated.View style={{ flex: 1, opacity: fade }}>
        <View style={styles.top}>
          <View style={styles.pill}>
            <Text style={styles.pillTxt}>
              {isMole
                ? t('reveal_pill_mole')
                : isWords
                  ? t('reveal_pill_words')
                  : t('reveal_pill_classic')}{' '}
              {roundIndex + 1}/{config.rounds}
            </Text>
          </View>
          <TimerRing endsAt={timerEndsAt} totalSeconds={discussSeconds} />
        </View>

        {/* the discussion board — question banner + button stay fixed;
            the card grid scrolls when it's bigger than one phone screen */}
        <Text style={[styles.title, { fontSize: sm ? 18 : 24 }]}>
          {isMole
            ? t('reveal_title_mole')
            : isWords
              ? t('reveal_title_words')
              : t('reveal_title_classic')}
        </Text>
        <Text style={styles.subtitle}>
          {isMole
            ? t('reveal_sub_mole')
            : isWords
              ? t('reveal_sub_words')
              : t('reveal_sub_classic')}
        </Text>

        {/* the actual question — ALWAYS visible, pinned above the cards */}
        <View style={styles.qBanner}>
          <Text style={styles.qBannerLabel}>{t('reveal_q')}</Text>
          <Text style={styles.qBannerTxt} numberOfLines={2} adjustsFontSizeToFit>
            {isWords ? bannerText : `${bannerText} ${round.question.unit ? `(${round.question.unit})` : ''}`}
          </Text>
          {isMole ? (
            <Text style={styles.qBannerSub}>{t('reveal_mole_note')}</Text>
          ) : null}
        </View>

        <ScrollView
          style={styles.boardArea}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.cardsWrap}>
          {cards.map((c, i) => (
            <Animated.View
              key={c.key}
              style={[
                styles.cell,
                {
                  flexBasis: `${100 / cols}%`,
                  height: cardH + 10,
                  transform: [
                    { scale: bounceFor(c.key) },
                    { rotate: `${(c.key.charCodeAt(0) % 2 === 0 ? -1 : 1) * 0.8}deg` },
                  ],
                },
              ]}
            >
              <View style={styles.card}>
                {isWords ? (
                  <Text
                    style={[styles.wordValue, { fontSize: tight ? 11 : sm ? 12.5 : 14 }]}
                    numberOfLines={tight ? 3 : 4}
                  >
                    “{c.textValue}”
                  </Text>
                ) : (
                  <Text style={[styles.value, { fontSize: sm ? 20 : 26 }]} numberOfLines={1} adjustsFontSizeToFit>
                    {c.value != null ? c.value.toLocaleString('en-US') : '—'}
                  </Text>
                )}
                {c.unit && c.value != null && !tight && !isWords ? (
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
        </ScrollView>

        <View style={styles.bottom}>
          <BigButton
            label={
              isMole
                ? t('reveal_hunt')
                : isWords
                  ? expired ? t('reveal_to_votes') : t('reveal_vote_words')
                  : expired ? t('reveal_to_votes') : t('reveal_vote')
            }
            onPress={() => { play('pop'); haptic('medium'); revealDone(); }}
          />
          <Text style={styles.footNote}>
            {isMole ? t('reveal_foot_mole') : isWords ? t('reveal_foot_words') : t('reveal_foot_classic')}
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
  boardArea: { flex: 1 },
  // fluid flexbox grid — no hardcoded widths. Natural height inside the
  // ScrollView (no flex:1, no justify-center) so the board scrolls when it
  // exceeds one phone screen.
  cardsWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 14, paddingTop: 6, paddingBottom: 10, gap: 10 },
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
    overflow: 'hidden',
    ...Shadow.pop,
  },
  value: { color: Palette.ink, fontSize: 26, fontWeight: '900', fontVariant: ['tabular-nums'], maxWidth: '100%', textAlign: 'center' },
  wordValue: { color: Palette.ink, fontWeight: '800', maxWidth: '100%', textAlign: 'center', lineHeight: 18 },
  correctTag: {
    position: 'absolute',
    bottom: -10,
    right: -8,
    backgroundColor: '#7ED957',
    borderRadius: 999,
    borderWidth: 3,
    borderColor: '#1B1F3B',
    paddingHorizontal: 9,
    paddingVertical: 3,
    ...Shadow.pop,
  },
  correctTagTxt: { color: '#1B1F3B', fontSize: 10, fontWeight: '900' },
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
