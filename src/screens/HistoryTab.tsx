import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AvatarFace from '@/components/AvatarFace';
import { Palette, Gradients, Radius, Shadow } from '@/constants/theme';
import { play } from '@/game/sound';
import { useWallet, PlayedGame } from '@/game/wallet';
import { CATEGORIES } from '@/game/deck';
import { t } from '@/i18n';

const CAT_EMOJI: Record<string, string> = { general: '🌍', funny: '😂', sexy: '🔥', geo: '🗺️', animals: '🦁' };

function fmtDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const hm = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return `Today · ${hm}`;
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return `Yesterday · ${hm}`;
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${hm}`;
}

/** HISTORY tab: the last 20 finished games, tap for full detail. */
export default function HistoryTab() {
  const wallet = useWallet();
  const [open, setOpen] = useState<PlayedGame | null>(null);

  if (open) {
    const max = Math.max(1, ...open.scores.map((s) => s.score));
    return (
      <LinearGradient colors={Gradients.home} style={styles.bg}>
        <View style={styles.backBar}>
          <Pressable style={styles.backBtn} onPress={() => { play('tick'); setOpen(null); }} hitSlop={8}>
            <Text style={styles.backTxt}>{t('history_back')}</Text>
          </Pressable>
          <Text style={styles.backTitle}>{fmtDate(open.ts)}</Text>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.detailHead}>
            {open.mode === 'mole' ? '🕵️' : '🎲'} {t(open.mode === 'mole' ? 'history_mode_mole' : 'history_mode_classic')}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Text style={styles.metaTxt}>{open.rounds} {t('history_rounds')}</Text>
            </View>
            <View style={styles.metaPill}>
              {open.categories.map((c) => (
                <Text key={c} style={styles.metaCat}>{CAT_EMOJI[c] ?? '❓'}</Text>
              ))}
            </View>
          </View>

          {open.badges.length > 0 && (
            <View style={styles.badgesRow}>
              {open.badges.map((b, i) => (
                <View key={i} style={styles.badgePill}>
                  <Text style={styles.badgeEmoji}>{b.emoji}</Text>
                  <Text style={styles.badgeTxt}>{b.label}: {b.name}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.scoreHead}>{t('history_score')}</Text>
          {open.scores.map((s, i) => (
            <View key={i} style={styles.scoreRow}>
              <Text style={styles.pos}>{s.score === max ? '👑' : `#${i + 1}`}</Text>
              <AvatarFace avatarId={s.avatarId} size={34} />
              <Text style={styles.scoreName} numberOfLines={1}>{s.name}</Text>
              <View style={styles.barWrap}>
                <View style={[styles.barFill, { width: `${Math.max(4, (s.score / max) * 100)}%` }]} />
              </View>
              <Text style={styles.scoreNum}>{s.score}</Text>
            </View>
          ))}
          <View style={{ height: 130 }} />
        </ScrollView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={Gradients.home} style={styles.bg}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>📜 {t('history_title')}</Text>
        <Text style={styles.sub}>{t('history_sub')}</Text>
        {wallet.history.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🎮</Text>
            <Text style={styles.emptyT1}>{t('history_empty')}</Text>
            <Text style={styles.emptyT2}>{t('history_empty2')}</Text>
          </View>
        ) : (
          wallet.history.map((g) => {
            // TIES: show EVERY winner who shares the top score (top 3 avatars + names).
            const topScore = g.scores[0]?.score ?? 0;
            const topWinners = g.scores.filter((s) => s.score === topScore);
            const shown = topWinners.slice(0, 3);
            return (
              <Pressable key={g.id} style={styles.row} onPress={() => { play('pop'); setOpen(g); }} hitSlop={4}>
                <View style={styles.rowIcon}>
                  <Text style={styles.rowModeEmoji}>{g.mode === 'mole' ? '🕵️' : '🎲'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowMode}>
                    {t(g.mode === 'mole' ? 'history_mode_mole' : 'history_mode_classic')} · {g.rounds} {t('history_rounds')}
                  </Text>
                  <Text style={styles.rowDate}>{fmtDate(g.ts)}</Text>
                </View>
                <View style={styles.rowRight}>
                  {shown.length > 0 && (
                    <>
                      {shown.map((w, wi) => (
                        <AvatarFace key={wi} avatarId={w.avatarId} size={30} />
                      ))}
                      <View>
                        <Text style={styles.rowWinner} numberOfLines={1}>
                          👑 {shown.map((w) => w.name).join(' + ')}
                          {topWinners.length > 3 ? ` +${topWinners.length - 3}` : ''}
                        </Text>
                        <Text style={styles.rowScore}>{topScore} {t('end_points_short')}</Text>
                      </View>
                    </>
                  )}
                </View>
                <Text style={styles.rowArrow}>›</Text>
              </Pressable>
            );
          })
        )}
        <View style={{ height: 130 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  content: { padding: 20 },
  title: { fontSize: 26, fontWeight: '900', color: '#fff', textShadowColor: 'rgba(0,0,0,0.25)', textShadowRadius: 5, textShadowOffset: { width: 0, height: 2 } },
  sub: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  emptyCard: {
    marginTop: 40,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: Radius.lg,
    borderWidth: 4,
    borderColor: '#1B1F3B',
    alignItems: 'center',
    padding: 34,
    ...Shadow.pop,
  },
  emptyEmoji: { fontSize: 52 },
  emptyT1: { fontSize: 17, fontWeight: '900', color: Palette.ink, marginTop: 10 },
  emptyT2: { fontSize: 12, fontWeight: '700', color: Palette.muted, marginTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    borderWidth: 3,
    borderColor: '#1B1F3B',
    padding: 12,
    marginTop: 12,
    ...Shadow.pop,
  },
  rowIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Palette.soft, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: 'rgba(27,31,59,0.25)' },
  rowModeEmoji: { fontSize: 22 },
  rowMode: { fontSize: 13, fontWeight: '900', color: Palette.ink },
  rowDate: { fontSize: 10.5, fontWeight: '700', color: Palette.muted, marginTop: 2 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowWinner: { fontSize: 12, fontWeight: '900', color: Palette.ink, maxWidth: 150 },
  rowScore: { fontSize: 10, fontWeight: '800', color: Palette.muted },
  rowArrow: { fontSize: 26, fontWeight: '900', color: Palette.muted },
  backBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  backBtn: { backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 3, borderColor: '#1B1F3B' },
  backTxt: { fontSize: 13, fontWeight: '900', color: Palette.ink },
  backTitle: { flex: 1, textAlign: 'right', fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.85)' },
  detailHead: { fontSize: 22, fontWeight: '900', color: '#fff', textShadowColor: 'rgba(0,0,0,0.25)', textShadowRadius: 5, textShadowOffset: { width: 0, height: 2 } },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  metaPill: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 2.5, borderColor: 'rgba(27,31,59,0.4)', flexDirection: 'row', gap: 4 },
  metaTxt: { fontSize: 11, fontWeight: '800', color: Palette.ink },
  metaCat: { fontSize: 13 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  badgePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFD84D', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 2.5, borderColor: '#1B1F3B' },
  badgeEmoji: { fontSize: 13 },
  badgeTxt: { fontSize: 10.5, fontWeight: '900', color: '#1B1F3B' },
  scoreHead: { fontSize: 13, fontWeight: '900', color: '#fff', textTransform: 'uppercase', letterSpacing: 1, marginTop: 18, marginBottom: 8, textShadowColor: 'rgba(0,0,0,0.2)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: Radius.md, borderWidth: 3, borderColor: 'rgba(27,31,59,0.35)', padding: 10, marginBottom: 8 },
  pos: { fontSize: 13, fontWeight: '900', color: Palette.ink, width: 30 },
  scoreName: { flex: 1, fontSize: 13, fontWeight: '800', color: Palette.ink },
  barWrap: { width: 90, height: 10, borderRadius: 5, backgroundColor: 'rgba(27,31,59,0.12)', overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5, backgroundColor: Palette.sunshine },
  scoreNum: { fontSize: 15, fontWeight: '900', color: Palette.ink, width: 36, textAlign: 'right' },
});
