import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import BigButton from '@/components/BigButton';
import AvatarFace from '@/components/AvatarFace';
import Confetti from '@/components/Confetti';
import { useGame } from '@/game/useStore';
import { resetAll, goSetup } from '@/game/store';
import { Palette, Radius, Shadow, Gradients } from '@/constants/theme';
import { t } from '@/i18n';
import type { Player } from '@/game/types';

export default function End() {
  const { players, config } = useGame();
  const isMole = config.mode === 'mole';
  const ranked = [...players].sort((a, b) => b.score - a.score);
  // TIES: everyone with the top score is a winner — never pick just one.
  const topScore = ranked[0].score;
  const winners = ranked.filter((p) => p.score === topScore);
  // rank by score, so tied players share a rank (and both get the crown)
  const rankOf = (p: Player) => ranked.findIndex((x) => x.score === p.score) + 1;
  // Top-N by a stat, returning only players who actually have some (avoids
  // naming a random 0-0 player). Handles ties by joining the names.
  const topBy = (stat: (p: Player) => number, fallback: string) => {
    const max = Math.max(0, ...players.map(stat));
    if (max <= 0) return { names: [fallback], count: 0 };
    return {
      names: players.filter((p) => stat(p) === max).map((p) => p.name),
      count: max,
    };
  };
  const king = topBy((p) => p.bluffWins, t('nobody_yet'));
  const brain = topBy((p) => p.callWins, t('nobody_yet'));
  const bestMole = topBy((p) => p.moleFooledTotal, t('nobody_fooled'));
  const bestHunter = topBy((p) => p.huntWins, t('nobody_caught'));

  const podiumOrder =
    ranked.length >= 3 ? [ranked[1], ranked[0], ranked[2]] : ranked.length === 2 ? [ranked[1], ranked[0]] : ranked;

  const burst = useRef(0);
  useEffect(() => {
    burst.current += 1;
  }, []);

  return (
    <LinearGradient colors={Gradients.end} style={styles.bg}>
      <Confetti trigger={burst.current} height={240} />
      <View style={styles.wrap}>
        <Text style={styles.title}>🏆 GAME OVER!</Text>
        <Text style={styles.sub}>{t('end_sub', config.rounds)}</Text>

        {/* podium */}
        <View style={styles.podiumRow}>
          {podiumOrder.map((p) => {
            const rank = rankOf(p);
            const isTiedTop = p.score === topScore;
            const h = rank === 1 ? 118 : rank === 2 ? 92 : 74;
            return (
              <View key={p.id} style={styles.podiumCol}>
                {isTiedTop ? <Text style={styles.crown}>👑</Text> : null}
                <AvatarFace avatarId={p.avatarId} size={isTiedTop ? 64 : 52} />
                <Text style={styles.podiumName} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={styles.podiumScore}>{p.score} pts</Text>
                <View
                  style={[
                    styles.block,
                    {
                      height: h,
                      backgroundColor: isTiedTop ? Palette.sunshine : rank === 2 ? '#C7CCD9' : '#D9A066',
                    },
                  ]}
                >
                  <Text style={styles.blockNum}>{rank}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* badges */}
        {isMole ? (
          <View style={styles.badges}>
            <View style={styles.badge}>
              <Text style={styles.badgeEmoji}>🕵️</Text>
              <View>
                <Text style={styles.badgeTitle}>{t('end_best_mole')}</Text>
                <Text style={styles.badgeName}>{bestMole.count === 0 ? bestMole.names[0] : bestMole.names.length === 1 ? t('mole_fooled_n', { a: bestMole.names[0], b: bestMole.count }) : bestMole.names.join(' + ')}</Text>
              </View>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeEmoji}>🔍</Text>
              <View>
                <Text style={styles.badgeTitle}>{t('end_top_hunter')}</Text>
                <Text style={styles.badgeName}>{bestHunter.count === 0 ? bestHunter.names[0] : bestHunter.names.length === 1 ? t('hunter_catches_n', { a: bestHunter.names[0], b: bestHunter.count }) : bestHunter.names.join(' + ')}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.badges}>
            <View style={styles.badge}>
              <Text style={styles.badgeEmoji}>🃏</Text>
              <View>
                <Text style={styles.badgeTitle}>{t('end_bluff_king')}</Text>
                <Text style={styles.badgeName}>{king.names.join(' + ')}</Text>
              </View>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeEmoji}>🧠</Text>
              <View>
                <Text style={styles.badgeTitle}>{t('end_best_reads')}</Text>
                <Text style={styles.badgeName}>{brain.names.join(' + ')}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.btnRow}>
          <BigButton label="Play again! 🔄" variant="soft" small onPress={goSetup} style={{ flex: 1 }} />
          <BigButton label="New players 👥" onPress={() => resetAll()} style={{ flex: 1, marginLeft: 10 }} />
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  wrap: { flex: 1, padding: 20, paddingBottom: 30 },
  title: { fontSize: 30, fontWeight: '900', color: '#fff', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.2)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 3 } },
  sub: { color: 'rgba(255,255,255,0.95)', textAlign: 'center', fontWeight: '700', marginTop: 4 },
  podiumRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginTop: 16, gap: 14 },
  podiumCol: { alignItems: 'center', flex: 1, maxWidth: 110 },
  crown: { fontSize: 26, marginBottom: -6 },
  podiumName: { fontSize: 13, fontWeight: '900', color: '#fff', marginTop: 8, maxWidth: 90, textAlign: 'center' },
  podiumScore: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.85)' },
  block: { width: '100%', borderRadius: 14, marginTop: 6, alignItems: 'center', justifyContent: 'center' },
  blockNum: { fontSize: 24, fontWeight: '900', color: 'rgba(27,31,59,0.7)' },
  badges: { flexDirection: 'row', gap: 10, marginTop: 20 },
  badge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: 3,
    borderColor: '#1B1F3B',
    padding: 12,
    ...Shadow.pop,
  },
  badgeEmoji: { fontSize: 24 },
  badgeTitle: { fontSize: 11, fontWeight: '800', color: Palette.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  badgeName: { fontSize: 15, fontWeight: '900', color: Palette.ink },
  btnRow: { flexDirection: 'row', marginTop: 'auto', paddingTop: 16 },
});
