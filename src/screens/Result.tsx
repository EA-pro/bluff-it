import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, ScrollView, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import BigButton from '@/components/BigButton';
import AvatarFace from '@/components/AvatarFace';
import Confetti from '@/components/Confetti';
import { useGame } from '@/game/useStore';
import { resultContinue } from '@/game/store';
import { optionLetter } from '@/game/engine';
import { play } from '@/game/sound';
import { Palette, Radius, Shadow, Gradients } from '@/constants/theme';
import { t } from '@/i18n';
import { TRUTH_KEY } from '@/game/types';
import type { MoleResult as MoleResultData, RoundState, Player } from '@/game/types';

/** One answer in the stepped reveal: its value, who voted it, and (if a lie) who wrote it. */
type Step = {
  key: string;
  letter: string;
  value: number;
  isTruth: boolean;
  voters: Player[];
  author: Player | null;
};

/**
 * The verdict, in a stepped "answer show" (Jackbox-style), then the scoreboard:
 *
 *  STEPS — every option that got at least one vote, lies first (most votes
 *  first), the truth always last; 0-vote options are skipped. Each step
 *  unfolds in three beats: (1) the answer big on screen, (2) who voted for
 *  it, (3) the verdict — A LIE (and who made it up) or THE TRUTH.
 *  Tapping skips a beat, then advances.
 *
 *  SCORES — the old two-beat scoreboard (truth anchor → who said what →
 *  points fly in), minus the %-off numbers.
 *
 * No auto-advance between steps — the group drives the pace.
 */
export default function Result() {
  const game = useGame();
  const { round, players, result, roundIndex, config } = game;
  const isLast = roundIndex + 1 >= config.rounds;
  const { height: winH } = useWindowDimensions();
  const compact = winH < 760;

  // ---------- stepped reveal state ----------
  const [phase, setPhase] = useState<'steps' | 'scores'>('steps');
  const [step, setStep] = useState(0);
  const [showVerdict, setShowVerdict] = useState(false);
  const cardIn = useRef(new Animated.Value(0)).current;
  const votersIn = useRef(new Animated.Value(0)).current;
  const verdictIn = useRef(new Animated.Value(0)).current;
  const votersShown = useRef(false);
  const verdictShown = useRef(false);
  const revToken = useRef(0);

  // ---------- scores state ----------
  const [showBoard, setShowBoard] = useState(false);
  const [showPts, setShowPts] = useState(false);
  const popIn = useRef(new Animated.Value(0)).current;
  const rows = useRef(players.map(() => new Animated.Value(0))).current;
  const ptsIn = useRef(new Animated.Value(0)).current;
  const burst = useRef(0);

  /** Lies (≥1 vote, most votes first), then the truth — always. 0-vote lies skipped. */
  const steps: Step[] = useMemo(() => {
    if (!round || result?.mole) return [];
    const truthValue = round.question.truth ?? 0;
    const mk = (key: string): Step | null => {
      const i = round.optionOrder.indexOf(key);
      const value = key === TRUTH_KEY ? truthValue : (round.guesses[key] ?? null);
      if (value == null || i < 0) return null;
      return {
        key,
        letter: optionLetter(i),
        value,
        isTruth: key === TRUTH_KEY,
        voters: players.filter((p) => round.votes[p.id] === key),
        author: key === TRUTH_KEY ? null : players.find((p) => p.id === key) ?? null,
      };
    };
    const lies = round.optionOrder
      .filter((k) => k !== TRUTH_KEY)
      .map(mk)
      .filter((s): s is Step => s !== null && s.voters.length > 0)
      .sort((a, b) => b.voters.length - a.voters.length);
    const truthStep = mk(TRUTH_KEY);
    return [...lies, ...(truthStep ? [truthStep] : [])];
  }, [round, players, result]);

  const cur: Step | undefined = steps[step];

  const revealVerdict = () => {
    if (verdictShown.current) return;
    verdictShown.current = true;
    if (cur?.isTruth) {
      burst.current += 1;
      play('win');
    } else {
      play('pop');
    }
    Animated.spring(verdictIn, { toValue: 1, tension: 170, friction: 6, useNativeDriver: true }).start();
    setShowVerdict(true);
  };

  // step choreography: card pops in → voters slide in → verdict lands
  useEffect(() => {
    if (phase !== 'steps') return;
    const token = ++revToken.current;
    cardIn.setValue(0);
    votersIn.setValue(0);
    verdictIn.setValue(0);
    votersShown.current = false;
    verdictShown.current = false;
    setShowVerdict(false);
    Animated.spring(cardIn, { toValue: 1, tension: 150, friction: 7, useNativeDriver: true }).start();
    const t1 = setTimeout(() => {
      if (revToken.current !== token || votersShown.current) return;
      votersShown.current = true;
      play('whoosh');
      Animated.timing(votersIn, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    }, 950);
    const t2 = setTimeout(() => {
      if (revToken.current !== token || verdictShown.current) return;
      revealVerdict();
    }, 2300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, step]);

  // scores choreography (two beats, unchanged pacing)
  useEffect(() => {
    if (phase !== 'scores') return;
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
  }, [phase]);

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

  // ================= STEPPED REVEAL =================
  if (phase === 'steps') {
    return (
      <LinearGradient colors={Gradients.result} style={styles.bg}>
        <Confetti trigger={burst.current} height={220} />

        <View style={styles.stepTop}>
          <View style={styles.stepPill}>
            <Text style={styles.stepPillTxt}>
              {t('res_reveal_label')} · {roundIndex + 1}/{config.rounds}
            </Text>
          </View>
          <View style={styles.dots}>
            {steps.map((s, i) => (
              <View
                key={s.key}
                style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotDone]}
              />
            ))}
          </View>
        </View>

        <View style={styles.qBannerMini}>
          <Text style={styles.qBannerMiniLabel}>{t('reveal_q')}</Text>
          <Text style={styles.qBannerMiniTxt} numberOfLines={2} adjustsFontSizeToFit>
            {round.question.text} {round.question.unit ? `(${round.question.unit})` : ''}
          </Text>
        </View>

        {cur ? (
          <View style={styles.stepArea}>
            <Text style={styles.stepLabel}>{t('res_step_of', { a: step + 1, b: steps.length })}</Text>

            {/* beat 1 — the answer, big */}
            <Animated.View
              style={{
                opacity: cardIn,
                transform: [
                  { scale: cardIn },
                  { rotate: `${(cur.key.charCodeAt(0) % 2 === 0 ? -1 : 1) * 0.6}deg` },
                ],
              }}
            >
              <View style={[styles.bigCard, showVerdict && cur.isTruth && styles.bigCardTruth]}>
                <Text style={[styles.bigValue, compact && styles.bigValueSm]} numberOfLines={1} adjustsFontSizeToFit>
                  {cur.value.toLocaleString('en-US')}
                </Text>
                {round.question.unit ? <Text style={styles.bigUnit}>{round.question.unit}</Text> : null}
              </View>
            </Animated.View>

            {/* beat 2 — who voted for it */}
            <Animated.View
              style={{
                opacity: votersIn,
                transform: [{ translateY: votersIn.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
              }}
            >
              {cur.voters.length > 0 ? (
                <View>
                  <Text style={styles.votersLabel}>{t('res_who_voted')}</Text>
                  <View style={styles.votersRow}>
                    {cur.voters.map((p) => (
                      <View key={p.id} style={styles.voterChip}>
                        <AvatarFace avatarId={p.avatarId} size={22} />
                        <Text style={styles.voterName} numberOfLines={1}>
                          {p.name}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <Text style={styles.nobodyPicked}>{t('res_nobody_picked')}</Text>
              )}
            </Animated.View>

            {/* beat 3 — the verdict */}
            {showVerdict ? (
              <Animated.View
                style={[
                  styles.verdict,
                  cur.isTruth ? styles.verdictTruth : styles.verdictLie,
                  {
                    opacity: verdictIn,
                    transform: [{ scale: verdictIn.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
                  },
                ]}
              >
                <Text style={styles.verdictEmoji}>{cur.isTruth ? '✅' : '🎭'}</Text>
                <View style={styles.verdictMid}>
                  <Text style={[styles.verdictTitle, cur.isTruth ? styles.verdictTitleTruth : styles.verdictTitleLie]}>
                    {cur.isTruth ? t('res_truth_verdict') : t('res_lie')}
                  </Text>
                  <Text style={[styles.verdictSub, cur.isTruth && styles.verdictSubTruth]}>
                    {cur.isTruth ? t('res_truth_was') : cur.author ? t('res_lie_by', cur.author.name) : ''}
                  </Text>
                </View>
              </Animated.View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.stepsBottom}>
          <BigButton
            label={
              !showVerdict
                ? t('res_skip')
                : step + 1 < steps.length
                  ? t('res_next_answer')
                  : t('res_to_scores')
            }
            onPress={() => {
              if (!showVerdict) {
                revealVerdict();
                return;
              }
              if (step + 1 < steps.length) {
                play('slide');
                setStep(step + 1);
              } else {
                play('slide');
                setPhase('scores');
              }
            }}
            variant="win"
          />
        </View>
      </LinearGradient>
    );
  }

  // ================= SCOREBOARD =================
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
  // --- stepped reveal ---
  stepTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingHorizontal: 22 },
  stepPill: {
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 3,
    borderColor: '#1B1F3B',
    ...Shadow.pop,
  },
  stepPillTxt: { color: Palette.ink, fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.4)', borderWidth: 2, borderColor: 'rgba(27,31,59,0.5)' },
  dotActive: { backgroundColor: '#FFC53D', transform: [{ scale: 1.35 }] },
  dotDone: { backgroundColor: '#7ED957' },
  qBannerMini: {
    alignSelf: 'center',
    marginHorizontal: 18,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#1B1F3B',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 2,
    ...Shadow.pop,
  },
  qBannerMiniLabel: { alignSelf: 'center', fontSize: 9, fontWeight: '900', letterSpacing: 2, color: Palette.muted },
  qBannerMiniTxt: { color: Palette.ink, fontSize: 13, fontWeight: '900', textAlign: 'center', lineHeight: 17 },
  stepArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 18, paddingTop: 8 },
  stepLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  bigCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    borderWidth: 4,
    borderColor: '#1B1F3B',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 2,
    minWidth: 200,
    ...Shadow.pop,
  },
  bigCardTruth: { backgroundColor: '#F0FDF4', borderColor: '#1F7A2E' },
  bigValue: { color: Palette.ink, fontSize: 48, fontWeight: '900', fontVariant: ['tabular-nums'], textAlign: 'center' },
  bigValueSm: { fontSize: 38 },
  bigUnit: { color: Palette.muted, fontSize: 15, fontWeight: '800' },
  votersLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '900', letterSpacing: 1.5, textAlign: 'center', marginBottom: 7 },
  votersRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 7, maxWidth: 340 },
  voterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingLeft: 5,
    paddingRight: 10,
    paddingVertical: 4,
    borderWidth: 2.5,
    borderColor: '#1B1F3B',
    ...Shadow.pop,
  },
  voterName: { color: Palette.ink, fontSize: 12, fontWeight: '900', maxWidth: 84 },
  nobodyPicked: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '800', fontStyle: 'italic', textAlign: 'center' },
  verdict: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'stretch',
    borderRadius: Radius.md,
    borderWidth: 4,
    padding: 14,
    ...Shadow.pop,
  },
  verdictTruth: { backgroundColor: '#1F7A2E', borderColor: '#0E4F1D' },
  verdictLie: { backgroundColor: '#DC2626', borderColor: '#7F1D1D' },
  verdictEmoji: { fontSize: 26 },
  verdictMid: { flex: 1, gap: 1 },
  verdictTitle: { fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  verdictTitleTruth: { color: '#D9F99D' },
  verdictTitleLie: { color: '#FECACA' },
  verdictSub: { color: '#fff', fontSize: 13, fontWeight: '800' },
  verdictSubTruth: { color: '#EAFBEF' },
  stepsBottom: { padding: 16, paddingBottom: 30 },
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
