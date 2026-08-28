import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import BigButton from '@/components/BigButton';
import AvatarFace from '@/components/AvatarFace';
import { useGame } from '@/game/useStore';
import { handoffDone } from '@/game/store';
import { play } from '@/game/sound';
import { Palette, Radius, Shadow, Gradients } from '@/constants/theme';
import { t } from '@/i18n';

/**
 * Pass-and-play interstitial: full-screen "hand the phone to X" shown before
 * every secret turn (guess + pick). Stops the group from crowding the screen.
 */
export default function Handoff() {
  const game = useGame();
  const me = game.players[game.cursor];
  const kind = game.handoffKind;

  const pop = useRef(new Animated.Value(0)).current;
  const wave = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(pop, { toValue: 1, tension: 40, friction: 9, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(wave, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(wave, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
    play('slide');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id, kind]);

  if (!me) return null;

  const isGuess = kind === 'guess';
  const isMoleVote = kind === 'molevote';
  const title = isMoleVote
    ? t('ho_mole_title')
    : isGuess
      ? t('ho_guess_title')
      : t('ho_vote_title');
  const grad = isMoleVote ? Gradients.mole : isGuess ? Gradients.guess : Gradients.vote;
  const ring = wave.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.12] });

  return (
    <LinearGradient colors={grad} style={styles.bg}>
      <View style={styles.content}>
        <View style={styles.roundPill}>
          <Text style={styles.roundTxt}>{t('round_n', { a: game.roundIndex + 1 })}</Text>
        </View>

        <Text style={styles.title}>{title}</Text>

        <Animated.View style={{ transform: [{ scale: pop }] }}>
          <View style={[styles.phoneCard, { transform: [{ scale: ring }] }]}>
            <Text style={styles.phoneEmoji}>{isMoleVote ? '🔍' : '📱'}</Text>
            <Text style={styles.handTxt}>{t('handoff')}</Text>
            <View style={styles.who}>
              <AvatarFace avatarId={me.avatarId} size={76} />
              <Text style={styles.name}>{me.name}</Text>
            </View>
            {isMoleVote ? (
              <Text style={styles.moleHint}>{t('ho_mole_hint')}</Text>
            ) : null}
          </View>
        </Animated.View>

        <BigButton
          label={isMoleVote ? t('ho_ready_hunt') : t('ho_ready')}
          onPress={() => {
            play('pop');
            handoffDone();
          }}
          variant={isMoleVote ? 'vote' : isGuess ? 'guess' : 'vote'}
          style={styles.btn}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 20 },
  roundPill: { backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 3, borderColor: '#1B1F3B', ...Shadow.pop },
  roundTxt: { color: Palette.ink, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  title: { color: '#fff', fontSize: 36, fontWeight: '900', letterSpacing: 1, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.25)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 3 } },
  phoneCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.xl,
    borderWidth: 4,
    borderColor: '#1B1F3B',
    padding: 30,
    alignItems: 'center',
    gap: 8,
    minWidth: 300,
    maxWidth: 400,
    ...Shadow.pop,
  },
  phoneEmoji: { fontSize: 48, transform: [{ rotate: '-8deg' }] },
  handTxt: { color: Palette.muted, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  name: { color: Palette.ink, fontSize: 32, fontWeight: '900' },
  moleHint: { color: Palette.muted, fontSize: 13, fontWeight: '800', textAlign: 'center', marginTop: 6, lineHeight: 19 },
  btn: { width: '100%', maxWidth: 400 },
});
