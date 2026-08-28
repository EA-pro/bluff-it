import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, useWindowDimensions, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import TimerRing from '@/components/TimerRing';
import AvatarFace from '@/components/AvatarFace';
import { useGame } from '@/game/useStore';
import { useCountdown } from '@/hooks/useCountdown';
import { submitVote } from '@/game/store';
import { optionLetter } from '@/game/engine';
import { play, haptic } from '@/game/sound';
import { Palette, Radius, Shadow, Gradients } from '@/constants/theme';
import { t } from '@/i18n';

const LETTER_COLORS = ['#FF5A5F', '#38BDF8', '#FFC53D', '#7ED957', '#A78BFA', '#F472B6', '#2DD4BF', '#FF8A3D'];

/**
 * The picking round. Same anonymous board as the discussion — but now it's
 * YOUR turn. You have 30 seconds, you pick ONE card you believe is the
 * truth, it locks instantly, and you can't re-choose. No pressure.
 *
 * Mole mode: every card keeps showing who wrote it (the evidence stays
 * visible while you decide). Classic: fully anonymous letters.
 *
 * Card sizes are fluid (flexbox grid from the window width).
 */
export default function Vote() {
  const game = useGame();
  const { round, players, config, cursor, timerEndsAt } = game;
  const me = players[cursor];
  const isMole = config.mode === 'mole';
  const { expired } = useCountdown(timerEndsAt, config.voteSeconds);
  const [sel, setSel] = useState<string | null>(null);
  const lockedRef = useRef(false);
  const { width } = useWindowDimensions();

  // reset when the phone moves to the next picker
  useEffect(() => {
    setSel(null);
    lockedRef.current = false;
  }, [me?.id]);

  // 30s hard limit -> no pick
  useEffect(() => {
    if (expired && me && !lockedRef.current) {
      lockedRef.current = true;
      submitVote(null);
    }
  }, [expired, me?.id]);

  const cards = useMemo(() => {
    if (!round) return [];
    return round.optionOrder
      .map((key, i) => {
        const value = key === 'truth' ? (round.question.truth ?? 0) : (round.guesses[key] ?? null);
        const owner = players.find((p) => p.id === key) ?? null;
        return { key, letter: optionLetter(i), value, isOwn: key === me.id, owner, color: LETTER_COLORS[i % LETTER_COLORS.length] };
      })
      .filter((c): c is typeof c & { value: number } => c.value != null);
  }, [round, me?.id, players]);

  // fluid grid: 3 columns on wide screens, 2 on phones
  const columns = width >= 420 ? 3 : 2;
  const sm = width < 380;

  if (!round || !me) return null;

  const pick = (key: string) => {
    if (lockedRef.current) return; // no re-choosing
    if (key === me.id) return; // you can't pick your own card
    lockedRef.current = true;
    play('pop');
    haptic('success');
    setSel(key);
    setTimeout(() => submitVote(key), 500); // beat on the pick, then pass the phone
  };

  return (
    <LinearGradient colors={Gradients.vote} style={styles.bg}>
      <View style={styles.top}>
        <View style={styles.whoPill}>
          <AvatarFace avatarId={me.avatarId} size={40} />
          <View>
            <Text style={styles.whoName}>{t('picking', me.name)}</Text>
            <Text style={styles.whoSub}>{t('vote_sub')}</Text>
          </View>
        </View>
        <TimerRing endsAt={timerEndsAt} totalSeconds={config.voteSeconds} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyInner} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { fontSize: sm ? 19 : 24 }]}>{t('vote_title')}</Text>
        <Text style={styles.subtitle}>
          {isMole ? t('vote_sub_mole') : t('vote_sub_classic')}
        </Text>

        <View style={styles.grid}>
          {cards.map((c) => {
            const active = sel === c.key;
            return (
              <Pressable
                key={c.key}
                onPress={() => pick(c.key)}
                disabled={c.isOwn}
                style={({ pressed }) => [
                  styles.cell,
                  { flexBasis: `${100 / columns}%` },
                  styles.card,
                  c.isOwn && styles.cardOwn,
                  pressed && !c.isOwn && styles.cardPressed,
                  active && styles.cardActive,
                  lockedRef.current && !active && !c.isOwn && styles.cardDim,
                ]}
              >
                <View style={[styles.letter, { backgroundColor: c.color }]}>
                  <Text style={styles.letterTxt}>{c.letter}</Text>
                </View>
                <Text style={[styles.value, { fontSize: sm ? 20 : 28 }]} numberOfLines={1} adjustsFontSizeToFit>
                  {c.value.toLocaleString('en-US')}
                </Text>
                {isMole && c.owner && !c.isOwn ? (
                  <View style={styles.ownerChip}>
                    <AvatarFace avatarId={c.owner.avatarId} size={16} />
                    <Text style={styles.ownerName} numberOfLines={1}>{c.owner.name}</Text>
                  </View>
                ) : null}
                {active ? (
                  <Text style={styles.lockTag}>{t('locked')}</Text>
                ) : c.isOwn ? (
                  <Text style={styles.ownTag}>{t('your_pick')}</Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <Text style={styles.footNote}>
        {lockedRef.current && sel ? t('locked_in') : t('clock_running')}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
  whoPill: {
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
  whoName: { color: Palette.ink, fontWeight: '900', fontSize: 15 },
  whoSub: { color: Palette.muted, fontSize: 10, fontWeight: '700' },
  body: { flex: 1 },
  bodyInner: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  title: { color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.25)', textShadowRadius: 5, textShadowOffset: { width: 0, height: 2 } },
  subtitle: { color: 'rgba(255,255,255,0.92)', fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 4, paddingHorizontal: 24 },
  // fluid flexbox grid — no hardcoded widths
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', padding: 14, gap: 12, marginTop: 8 },
  cell: { flexGrow: 1, flexShrink: 1, padding: 8 },
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
    gap: 4,
    minHeight: 112,
    ...Shadow.pop,
  },
  cardPressed: { transform: [{ scale: 0.96 }] },
  cardActive: { backgroundColor: '#FFF3BF', borderColor: Palette.sunshine, transform: [{ scale: 1.03 }] },
  cardDim: { opacity: 0.4 },
  cardOwn: { backgroundColor: '#EDEAF7', borderColor: 'rgba(27,31,59,0.35)', opacity: 0.55 },
  ownTag: { fontSize: 10, fontWeight: '900', color: Palette.muted, letterSpacing: 1 },
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
  value: { color: Palette.ink, fontSize: 28, fontWeight: '900', fontVariant: ['tabular-nums'], maxWidth: '100%', textAlign: 'center' },
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
  ownerName: { color: Palette.ink, fontSize: 10.5, fontWeight: '900', maxWidth: 70 },
  lockTag: { fontSize: 11, fontWeight: '900', color: '#7A5A00' },
  footNote: { color: 'rgba(255,255,255,0.95)', fontSize: 13, fontWeight: '800', textAlign: 'center', paddingHorizontal: 24, paddingBottom: 12 },
});
