import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import BigButton from '@/components/BigButton';
import AvatarFace from '@/components/AvatarFace';
import Confetti from '@/components/Confetti';
import { useGame } from '@/game/useStore';
import { resultContinue } from '@/game/store';
import { play } from '@/game/sound';
import { Palette, Radius, Shadow, Gradients } from '@/constants/theme';
import { t } from '@/i18n';
import type { MoleResult as MoleResultData, RoundState, Player } from '@/game/types';

/**
 * The verdict, in two beats:
 *  1) the truth + who guessed WHAT and who fooled WHOM (no points yet)
 *  2) the points fly in — so the "story" lands before the scoreboard.
 * No auto-advance — tap to continue.
 */
export default function Result() {
  const game = useGame();
  const { round, players, result, roundIndex, config } = game;
  const isLast = roundIndex + 1 >= config.rounds;

  const [showBoard, setShowBoard] = useState(false);
  const [showPts, setShowPts] = useState(false);
  const popIn = useRef(new Animated.Value(0)).current;
  const rows = useRef(players.map(() => new Animated.Value(0))).current;
  const ptsIn = useRef(new Animated.Value(0)).current;
  const burst = useRef(0);

  useEffect(() => {
    if (result?.mole) return; // mole rounds have their own choreography
    Animated.timing(popIn, { toValue: 1, duration: 450, easing: Easing.out(Easing.back(1.7)), useNativeDriver: true }).start();
    const board = setTimeout(() => {
      setShowBoard(true);
      players.forEach((_, i) => {
        setTimeout(() => {
          if (rows[i]) {
            rows[i].setValue(0);
            Animated.timing(rows[i], { toValue: 1, duration: 350, useNativeDriver: true }).start();
          }
        }, i * 140);
      });
    }, 900);
    const pts = setTimeout(() => revealPts(), 5600);
    return () => {
      clearTimeout(board);
      clearTimeout(pts);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const revealPts = () => {
    if (showPts) return;
    setShowPts(true);
    ptsIn.setValue(0);
    Animated.timing(ptsIn, { toValue: 1, duration: 420, useNativeDriver: true }).start();
    burst.current += 1;
    play('win');
  };

  if (!round || !result) return null;
  if (result.mole) {
    return <MoleResult result={result} round={round} players={players} isLast={isLast} />;
  }

  const byPts = [...players].sort((a, b) => {
    const ra = result.rows.find((r) => r.playerId === a.id)?.pts ?? 0;
    const rb = result.rows.find((r) => r.playerId === b.id)?.pts ?? 0;
    return rb - ra;
  });
  const maxRoundPts = Math.max(0, ...players.map((p) => result.rows.find((r) => r.playerId === p.id)?.pts ?? 0));

  const exact = players.filter((p) => result.exactIds.includes(p.id));
  const closest = players.filter((p) => result.closestIds.includes(p.id) && !result.exactIds.includes(p.id));
  const liar = players.find((p) => p.id === result.bestLiarId);
  const bluff = players.find((p) => p.id === result.biggestBluffId);

  return (
    <LinearGradient colors={Gradients.result} style={styles.bg}>
      <Confetti trigger={burst.current} height={220} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: popIn, transform: [{ scale: popIn }] }}>
          <View style={styles.truthCard}>
            <Text style={styles.truthEyebrow}>{t('res_truth')}</Text>
            <Text style={styles.truthBig}>
              {result.truth.toLocaleString('en-US')}
              {result.unit ? <Text style={styles.truthUnit}> {result.unit}</Text> : null}
            </Text>
            {exact.length > 0 ? (
              <View style={styles.winnerRow}>
                <AvatarFace avatarId={exact[0].avatarId} size={40} />
                <Text style={styles.winnerTxt}>
                  {t('res_nailed', exact.map((p) => p.name).join(' + '))}
                </Text>
              </View>
            ) : closest.length > 0 ? (
              <View style={styles.winnerRow}>
                <AvatarFace avatarId={closest[0].avatarId} size={40} />
                <Text style={styles.winnerTxt}>
                  {t('res_closest', closest.map((p) => p.name).join(' + '))}
                </Text>
              </View>
            ) : (
              <View style={[styles.winnerRow, styles.nobodyRow]}>
                <Text style={styles.nobodyTxt}>{t('res_nobody')}</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {showBoard && (
          <View style={styles.board}>
            <Text style={styles.boardTitle}>{t('res_board')}</Text>
            {byPts.map((p, i) => {
              const row = result.rows.find((r) => r.playerId === p.id)!;
              const fooledNames = row.fooled
                .map((fid) => players.find((x) => x.id === fid)?.name)
                .filter(Boolean);
              return (
                <Animated.View
                  key={p.id}
                  style={{
                    opacity: rows[i] ? rows[i] : 1,
                    transform: [
                      {
                        translateX: rows[i]
                          ? rows[i].interpolate({ inputRange: [0, 1], outputRange: [60, 0] })
                          : 0,
                      },
                    ],
                  }}
                >
                  <View style={styles.row}>
                    <AvatarFace avatarId={p.avatarId} size={38} />
                    <View style={styles.rowMid}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {p.name} <Text style={styles.rowGuess}>· {row.guess != null ? row.guess.toLocaleString('en-US') : t('no_guess')}</Text>
                      </Text>
                      <View style={styles.rowTags}>
                        {row.guess != null && (
                          <Text style={[styles.rowTag, row.distPct < 25 && styles.rowTagWin]}>
                            {t('off_pct', Math.round(row.distPct))}
                          </Text>
                        )}
                        {result.exactIds.includes(p.id) && <Text style={[styles.rowTag, styles.rowTagWin]}>{t('exact')}</Text>}
                        {fooledNames.length > 0 && (
                          <Text style={styles.foolTag} numberOfLines={1}>
                            {t('res_fooled', fooledNames.join(', '))}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        )}

        {showPts && (
          <Animated.View style={[styles.ptsWrap, { opacity: ptsIn }]}>
            <Text style={styles.boardTitle}>{t('res_pts')}</Text>
            {byPts.map((p, i) => {
              const row = result.rows.find((r) => r.playerId === p.id)!;
              const pts = row.pts;
              // NOTE: clamp the stagger stop below 1 — with 6 players,
              // 0.5 + i*0.12 reaches 1.1, a non-monotonic inputRange that
              // throws and blanks the whole result screen.
              const delayed = ptsIn.interpolate({
                inputRange: [0, Math.min(0.98, 0.5 + i * 0.12), 1],
                outputRange: [0, 0, 1],
              });
              return (
                <Animated.View key={p.id} style={{ opacity: delayed }}>
                  <View style={[styles.row, pts === maxRoundPts && pts > 0 && styles.rowTop, p.id === result.biggestBluffId && styles.rowBluff]}>
                    {pts === maxRoundPts && pts > 0 ? <Text style={styles.crown}>👑</Text> : <View style={{ width: 20 }} />}
                    <View style={styles.rowMid}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <View style={styles.rowTags}>
                        {row.parts.map((part, j) => (
                          <Text key={j} style={[styles.rowTag, part.startsWith('+') && styles.rowTagWin]}>{part}</Text>
                        ))}
                      </View>
                    </View>
                    <Text style={[styles.rowPts, pts > 0 && styles.rowPtsWin]}>{pts > 0 ? `+${pts}` : '0'}</Text>
                  </View>
                </Animated.View>
              );
            })}
          </Animated.View>
        )}

        {showPts && (
          <View style={styles.badges}>
            {liar && (
              <View style={styles.badge}>
                <Text style={styles.badgeEmoji}>🎭</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.badgeTitle}>{t('best_liar')}</Text>
                  <Text style={styles.badgeTxt} numberOfLines={2}>
                    {t('best_liar_txt', liar.name)}
                  </Text>
                </View>
              </View>
            )}
            {bluff && (
              <View style={styles.badge}>
                <Text style={styles.badgeEmoji}>🕵️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.badgeTitle}>{t('big_bluff')}</Text>
                  <Text style={styles.badgeTxt} numberOfLines={2}>
                    {t('big_bluff_txt', bluff.name)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.btnRow}>
        <BigButton
          label={!showPts ? t('show_points') : isLast ? t('to_champ') : t('next_round')}
          onPress={() => {
            if (!showPts) {
              revealPts();
              return;
            }
            play('slide');
            resultContinue();
          }}
          variant={isLast ? 'end' : 'win'}
          style={styles.btn}
          disabled={false}
        />
      </View>
    </LinearGradient>
  );
}

/**
 * Mole-mode verdict, in two beats:
 *  1) DRAMA: "WHO WAS THE MOLE?" + how many hunters they convinced
 *  2) the two questions (group vs secret) + per-person points:
 *     every accusation is shown (who accused whom) so the "who fooled
 *     whom" story is legible at a glance.
 */
function MoleResult({
  result,
  round,
  players,
  isLast,
}: {
  result: NonNullable<ReturnType<typeof useGame>['result']>;
  round: RoundState;
  players: Player[];
  isLast: boolean;
}) {
  const mole = result.mole!;
  const [showDetails, setShowDetails] = useState(false);
  const popIn = useRef(new Animated.Value(0)).current;
  const ptsIn = useRef(new Animated.Value(0)).current;
  const burst = useRef(0);

  const nameOf = (pid: string | null | undefined) =>
    players.find((p) => p.id === pid)?.name ?? 'nobody';
  const molePlayer = players.find((p) => p.id === mole.moleId) ?? players[0];
  const allHunters = players.filter((p) => p.id !== mole.moleId);
  const fooledNames = allHunters
    .filter((h) => !mole.correctHunterIds.includes(h.id))
    .map((h) => h.name);
  const caughtNames = players.filter((p) => mole.correctHunterIds.includes(p.id)).map((p) => p.name);

  useEffect(() => {
    Animated.timing(popIn, { toValue: 1, duration: 450, easing: Easing.out(Easing.back(1.7)), useNativeDriver: true }).start();
    const details = setTimeout(() => {
      setShowDetails(true);
      ptsIn.setValue(0);
      Animated.timing(ptsIn, { toValue: 1, duration: 420, useNativeDriver: true }).start();
      burst.current += 1;
      play('win');
    }, 2600);
    return () => clearTimeout(details);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // per-person rows, Mole first, then hunters by points
  const rows = players
    .map((p) => {
      const isMole = p.id === mole.moleId;
      const pts = isMole ? mole.ptsMole : mole.correctHunterIds.includes(p.id) ? mole.ptsHunter : 0;
      return { p, isMole, pts, accused: round.moleVotes?.[p.id] ?? null };
    })
    .sort((a, b) => (a.isMole === b.isMole ? b.pts - a.pts : a.isMole ? -1 : 1));

  return (
    <LinearGradient colors={Gradients.result} style={styles.bg}>
      <Confetti trigger={burst.current} height={220} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: popIn, transform: [{ scale: popIn }] }}>
          <View style={[styles.truthCard, styles.moleCard]}>
            <Text style={styles.truthEyebrow}>{t('mole_was')}</Text>
            <View style={styles.moleWho}>
              <AvatarFace avatarId={molePlayer.avatarId} size={56} />
              <Text style={styles.moleName}>{molePlayer.name}</Text>
            </View>
            {mole.ptsMole > 0 ? (
              <View style={[styles.moleBanner, styles.moleBannerEscaped]}>
                <Text style={[styles.moleBannerTxt, styles.moleBannerTxtEscaped]}>
                  {caughtNames.length > 0
                    ? t('mole_conv_but', { a: fooledNames.join(', '), b: caughtNames.join(', ') })
                    : t('mole_conv_all', { a: fooledNames.length, b: allHunters.length, c: mole.ptsMole })}
                </Text>
              </View>
            ) : (
              <View style={[styles.moleBanner, styles.moleBannerCaught]}>
                <Text style={[styles.moleBannerTxt, styles.moleBannerTxtCaught]}>
                  {t('mole_caught_all', allHunters.length)}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>

        {showDetails && (
          <Animated.View style={{ opacity: ptsIn }}>
            <View style={styles.qPair}>
              <View style={[styles.qMini, styles.qMiniGroup]}>
                <Text style={styles.qMiniLabel}>{t('group_q')}</Text>
                <Text style={styles.qMiniText}>{round.question.text}</Text>
                <Text style={styles.qMiniTruth}>{t('truth_of', round.question.truth)}</Text>
              </View>
              {round.moleQuestion ? (
                <View style={[styles.qMini, styles.qMiniMole]}>
                  <Text style={styles.qMiniLabel}>{t('mole_q')}</Text>
                  <Text style={styles.qMiniText}>{round.moleQuestion.text}</Text>
                  <Text style={styles.qMiniTruth}>truth: {round.moleQuestion.truth}{round.moleQuestion.unit ? ` ${round.moleQuestion.unit}` : ''}</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.boardTitle}>{t('pts_accused')}</Text>
            {rows.map(({ p, isMole, pts, accused }) => (
              <View key={p.id} style={[styles.row, isMole && pts > 0 && styles.rowTop]}>
                {isMole && pts > 0 ? <Text style={styles.crown}>👑</Text> : <View style={{ width: 20 }} />}
                <AvatarFace avatarId={p.avatarId} size={38} />
                <View style={styles.rowMid}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {p.name}
                    {isMole && <Text style={styles.moleTag}>{t('the_mole_tag')}</Text>}
                  </Text>
                  <Text style={styles.rowPtsSmall} numberOfLines={2}>
                    {isMole
                      ? pts > 0
                        ? t('mole_convinced_n', { a: fooledNames.length, b: fooledNames.join(', ') })
                        : t('mole_named_all')
                      : mole.correctHunterIds.includes(p.id)
                        ? t('mole_spot_on')
                        : t('mole_pointed', nameOf(accused))}
                  </Text>
                </View>
                <Text style={[styles.rowPts, pts > 0 && styles.rowPtsWin]}>{pts > 0 ? `+${pts}` : '0'}</Text>
              </View>
            ))}

            {mole.ptsMole > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeEmoji}>🎭</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.badgeTitle}>{t('best_actor')}</Text>
                  <Text style={styles.badgeTxt} numberOfLines={2}>
                    {t('best_actor_txt', { a: molePlayer.name, b: fooledNames.length, c: allHunters.length })}
                  </Text>
                </View>
              </View>
            ) : null}
          </Animated.View>
        )}
      </ScrollView>

      <View style={styles.btnRow}>
        <BigButton
          label={isLast ? '🏆 To the champion!' : '➜ Next round'}
          onPress={() => {
            play('slide');
            resultContinue();
          }}
          variant={isLast ? 'end' : 'win'}
          style={styles.btn}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  content: { flex: 1, padding: 18, paddingBottom: 4, gap: 10 },
  nobodyRow: { backgroundColor: '#F5F1FF', borderColor: '#A78BFA' },
  nobodyTxt: { color: '#6D28D9', fontSize: 13, fontWeight: '900' },
  boardTitle: { color: Palette.ink, fontSize: 13, fontWeight: '900', letterSpacing: 1.5, marginBottom: 4 },
  ptsWrap: { gap: 8, marginTop: 4 },
  truthCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    borderWidth: 4,
    borderColor: '#1B1F3B',
    alignItems: 'center',
    paddingVertical: 16,
    ...Shadow.pop,
  },
  truthEyebrow: { color: Palette.muted, fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  truthBig: { color: Palette.ink, fontSize: 56, fontWeight: '900', fontVariant: ['tabular-nums'], marginTop: 2 },
  truthUnit: { fontSize: 26, fontWeight: '800' },
  winnerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, backgroundColor: '#E3F8E7', borderRadius: 999, paddingLeft: 6, paddingRight: 14, paddingVertical: 5, borderWidth: 2.5, borderColor: '#1F7A2E' },
  winnerTxt: { color: '#1F7A2E', fontSize: 14, fontWeight: '900' },
  board: { gap: 8, marginTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: 3,
    borderColor: 'transparent',
    padding: 10,
    ...Shadow.pop,
  },
  rowTop: { borderColor: Palette.sunshine, borderWidth: 3.5 },
  rowBluff: { borderColor: '#A78BFA' },
  crown: { fontSize: 18 },
  rowMid: { flex: 1, gap: 3 },
  rowName: { color: Palette.ink, fontSize: 14, fontWeight: '900' },
  rowGuess: { color: Palette.muted, fontWeight: '800' },
  rowTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  rowTag: {
    color: 'rgba(27,31,59,0.72)',
    fontSize: 10,
    fontWeight: '800',
    backgroundColor: 'rgba(27,31,59,0.09)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  rowTagWin: { color: '#1F7A2E', backgroundColor: '#E3F8E7' },
  foolTag: { color: '#6D28D9', fontSize: 10, fontWeight: '800', flex: 1, maxWidth: 160 },
  rowPts: { color: Palette.muted, fontSize: 20, fontWeight: '900', minWidth: 44, textAlign: 'right' },
  rowPtsWin: { color: '#1F7A2E' },
  badges: { gap: 8 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1B1F3B',
    borderRadius: Radius.md,
    padding: 12,
    borderWidth: 3,
    borderColor: '#1B1F3B',
    ...Shadow.pop,
  },
  badgeEmoji: { fontSize: 24 },
  badgeTitle: { color: Palette.sunshine, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  badgeTxt: { color: '#fff', fontSize: 13, fontWeight: '800', marginTop: 2 },
  btnRow: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 18 },
  btn: { marginBottom: 4 },
  // --- mole mode ---
  moleCard: { gap: 6 },
  moleWho: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  moleName: { color: Palette.ink, fontSize: 34, fontWeight: '900' },
  moleBanner: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 2.5, alignSelf: 'stretch' },
  moleBannerEscaped: { backgroundColor: '#D9F99D', borderColor: '#65A30D' },
  moleBannerCaught: { backgroundColor: '#FFD6D6', borderColor: '#DC2626' },
  moleBannerTxt: { fontSize: 13, fontWeight: '900', textAlign: 'center' },
  moleBannerTxtEscaped: { color: '#3F6212' },
  moleBannerTxtCaught: { color: '#991B1B' },
  qPair: { gap: 8 },
  qMini: { borderRadius: Radius.md, borderWidth: 3, padding: 12, gap: 4 },
  qMiniGroup: { backgroundColor: '#fff', borderColor: '#1B1F3B' },
  qMiniMole: { backgroundColor: '#F5F1FF', borderColor: '#7C3AED' },
  qMiniLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, color: Palette.muted },
  qMiniText: { fontSize: 13, fontWeight: '800', color: Palette.ink, lineHeight: 18 },
  qMiniTruth: { fontSize: 12, fontWeight: '900', color: '#1F7A2E' },
  moleTag: { color: '#7C3AED' },
  rowPtsSmall: { color: Palette.muted, fontSize: 11, fontWeight: '800' },
});
