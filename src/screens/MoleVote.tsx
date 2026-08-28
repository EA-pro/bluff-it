import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import TimerRing from '@/components/TimerRing';
import AvatarFace from '@/components/AvatarFace';
import { useGame } from '@/game/useStore';
import { useCountdown } from '@/hooks/useCountdown';
import { submitMoleVote } from '@/game/store';
import { play, haptic } from '@/game/sound';
import { Palette, Radius, Shadow, Gradients } from '@/constants/theme';
import { t } from '@/i18n';

/**
 * Mole mode — the HUNT. One-by-one relay, same rhythm as the vote round:
 * the phone goes to EVERYONE in order (including the Mole, so nobody can
 * tell who skipped a turn), 30 seconds, they tap the face they think is
 * the Mole, it locks, next player. The Mole's accusation is taken but
 * doesn't count — only the hunters' votes score, and each is judged on
 * its own (a correct accusation pays regardless of what the others did).
 */
export default function MoleVote() {
  const game = useGame();
  const { round, players, config, cursor, timerEndsAt } = game;
  const me = players[cursor];
  const { expired } = useCountdown(timerEndsAt, config.voteSeconds);
  const { width } = useWindowDimensions();
  const sm = width < 380;
  const [sel, setSel] = useState<string | null>(null);
  const lockedRef = useRef(false);

  // reset when the phone moves to the next hunter
  useEffect(() => {
    setSel(null);
    lockedRef.current = false;
  }, [me?.id]);

  // 30s hard limit -> no accusation
  useEffect(() => {
    if (expired && me && !lockedRef.current) {
      lockedRef.current = true;
      submitMoleVote(null);
    }
  }, [expired, me?.id]);

  const suspects = useMemo(() => {
    if (!round) return [];
    // everyone EXCEPT the current voter (you can't frame yourself)
    return players.filter((p) => p.id !== me.id);
  }, [round, players, me?.id]);

  if (!round || !me) return null;

  const pick = (pid: string) => {
    if (lockedRef.current) return; // no re-choosing
    if (pid === me.id) return; // you can't frame yourself
    lockedRef.current = true;
    play('pop');
    haptic('warning');
    setSel(pid);
    setTimeout(() => submitMoleVote(pid), 500); // beat on the pick, then pass the phone
  };

  return (
    <LinearGradient colors={Gradients.mole} style={styles.bg}>
      <View style={styles.top}>
        <View style={styles.whoPill}>
          <AvatarFace avatarId={me.avatarId} size={40} />
          <View>
            <Text style={styles.whoName}>{t('hunting', me.name)}</Text>
            <Text style={styles.whoSub}>{t('mole_sub')}</Text>
          </View>
        </View>
        <TimerRing endsAt={timerEndsAt} totalSeconds={config.voteSeconds} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyInner} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { fontSize: sm ? 19 : 24 }]}>{t('mole_title')}</Text>
        <Text style={styles.subtitle}>{t('mole_vote_sub')}</Text>

        <View style={styles.grid}>
        {suspects.map((p) => {
          const active = sel === p.id;
          const dimmed = lockedRef.current && !active;
          return (
            <Pressable
              key={p.id}
              onPress={() => pick(p.id)}
              style={({ pressed }) => [
                styles.card,
                pressed && !dimmed && styles.cardPressed,
                active && styles.cardActive,
                dimmed && styles.cardDim,
              ]}
            >
              <View style={styles.faceWrap}>
                <AvatarFace avatarId={p.avatarId} size={72} />
                {active ? (
                  <View style={styles.accuseBadge}>
                    <Text style={styles.accuseBadgeTxt}>{t('framed')}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
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
  bodyInner: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8, gap: 4 },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowRadius: 5,
    textShadowOffset: { width: 0, height: 2 },
  },
  subtitle: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: 16,
    paddingTop: 22,
    gap: 14,
    marginTop: 8,
  },
  card: {
    width: '46%',
    maxWidth: 160,
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: 4,
    borderColor: '#1B1F3B',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    ...Shadow.pop,
  },
  cardPressed: { transform: [{ scale: 0.96 }] },
  cardActive: {
    backgroundColor: '#FFF3BF',
    borderColor: Palette.sunshine,
    transform: [{ scale: 1.04 }],
  },
  cardDim: { opacity: 0.4 },
  faceWrap: { position: 'relative' },
  accuseBadge: {
    position: 'absolute',
    bottom: -6,
    left: 0,
    right: 0,
    alignSelf: 'center',
    backgroundColor: Palette.ink,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderColor: Palette.sunshine,
  },
  accuseBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  name: { color: Palette.ink, fontSize: 15, fontWeight: '900' },
  footNote: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
});
