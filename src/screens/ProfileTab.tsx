import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import SettingsSheet from '@/components/SettingsSheet';
import PremiumSheet from '@/components/PremiumSheet';
import AvatarFace from '@/components/AvatarFace';
import { Palette, Gradients, Radius, Shadow } from '@/constants/theme';
import { play } from '@/game/sound';
import { usePremium } from '@/game/premium';
import { useWallet, resetWallet, PlayedGame } from '@/game/wallet';
import { AVATARS } from '@/game/avatars';
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

/** PROFILE tab: stats, game history (list + detail), premium, settings, reset. */
export default function ProfileTab() {
  const wallet = useWallet();
  const premium = usePremium();
  const isPro = premium.premium || premium.admin;
  const [showSettings, setShowSettings] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [open, setOpen] = useState<PlayedGame | null>(null);

  const avatarsOwned = AVATARS.filter((a) => !a.premium || wallet.ownedAvatars.includes(a.id)).length;
  const catsOwned = CATEGORIES.filter((c) => c.free || wallet.ownedCategories.includes(c.id)).length;

  // ---- full-screen history detail (opened from a history row) ----
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

  const stats = [
    { icon: '🎮', label: t('profile_games_played'), val: String(wallet.history.length) },
    { icon: '🪙', label: t('profile_coins'), val: wallet.coins.toLocaleString('en-US') },
    { icon: '🎭', label: t('profile_avatars'), val: `${avatarsOwned}/${AVATARS.length}` },
    { icon: '📦', label: t('profile_packs'), val: `${catsOwned}/${CATEGORIES.length}` },
  ];

  return (
    <LinearGradient colors={Gradients.home} style={styles.bg}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>👤 {t('profile_title')}</Text>

        {/* stats grid */}
        <View style={styles.statsGrid}>
          {stats.map((s, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={styles.statVal}>{s.val}</Text>
              <Text style={styles.statLbl}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* game history — the last 20 games, tap for full detail */}
        <Text style={styles.section}>📜 {t('history_title')}</Text>
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

        {/* premium status */}
        <LinearGradient
          colors={isPro ? ['#FFD84D', '#FFB800'] : ['#3B2E63', '#241A45']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.premCard}
        >
          <Text style={styles.premIcon}>👑</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.premName, isPro && styles.premNamePro]}>{t('profile_prem')}</Text>
            <Text style={[styles.premStatus, isPro && styles.premStatusPro]}>{isPro ? t('profile_yes') : t('profile_no')}</Text>
          </View>
          {isPro ? (
            <View style={styles.premCheck}><Text style={styles.premCheckTxt}>✓</Text></View>
          ) : (
            <Pressable style={styles.premGet} onPress={() => { play('pop'); setShowPremium(true); }} hitSlop={8}>
              <Text style={styles.premGetTxt}>{t('shop_prem_cta')}</Text>
            </Pressable>
          )}
        </LinearGradient>

        {/* settings */}
        <Pressable style={styles.settingRow} onPress={() => { play('tick'); setShowSettings(true); }} hitSlop={6}>
          <Text style={styles.settingIcon}>⚙️</Text>
          <Text style={styles.settingTxt}>{t('set_title')}</Text>
          <Text style={styles.settingArrow}>›</Text>
        </Pressable>

        {/* reset */}
        <Pressable style={styles.resetRow} onPress={() => { play('buzz'); setConfirmReset(true); }} hitSlop={6}>
          <Text style={styles.settingIcon}>🗑️</Text>
          <Text style={[styles.settingTxt, styles.resetTxt]}>{t('profile_reset')}</Text>
          <Text style={styles.settingArrow}>›</Text>
        </Pressable>

        <Text style={styles.by}>{t('profile_by')} @evajonas.mp4</Text>
        <View style={{ height: 130 }} />
      </ScrollView>

      <SettingsSheet visible={showSettings} onClose={() => setShowSettings(false)} />
      <PremiumSheet visible={showPremium} onClose={() => setShowPremium(false)} lockLabel={t('profile_prem')} />

      {confirmReset && (
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogQ}>{t('profile_reset_q')}</Text>
            <View style={styles.dialogRow}>
              <Pressable style={styles.dialogBtn} onPress={() => setConfirmReset(false)} hitSlop={8}>
                <Text style={styles.dialogBtnTxt}>{t('profile_reset_no')}</Text>
              </Pressable>
              <Pressable style={[styles.dialogBtn, styles.dialogBtnYes]} onPress={() => { resetWallet(); play('win'); setConfirmReset(false); }} hitSlop={8}>
                <Text style={[styles.dialogBtnTxt, styles.dialogBtnYesTxt]}>{t('profile_reset_yes')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  content: { padding: 20 },
  title: { fontSize: 26, fontWeight: '900', color: '#fff', textShadowColor: 'rgba(0,0,0,0.25)', textShadowRadius: 5, textShadowOffset: { width: 0, height: 2 } },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    borderWidth: 3,
    borderColor: '#1B1F3B',
    padding: 14,
    alignItems: 'center',
    ...Shadow.pop,
  },
  statIcon: { fontSize: 24 },
  statVal: { fontSize: 20, fontWeight: '900', color: Palette.ink, marginTop: 4 },
  statLbl: { fontSize: 10, fontWeight: '800', color: Palette.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 2 },
  section: { fontSize: 14, fontWeight: '900', color: '#FFD84D', textTransform: 'uppercase', letterSpacing: 1, marginTop: 24, textShadowColor: 'rgba(0,0,0,0.3)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 2 } },
  // ---- history (list + detail, moved in from the old History tab) ----
  emptyCard: {
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: Radius.lg,
    borderWidth: 4,
    borderColor: '#1B1F3B',
    alignItems: 'center',
    padding: 26,
    ...Shadow.pop,
  },
  emptyEmoji: { fontSize: 44 },
  emptyT1: { fontSize: 15, fontWeight: '900', color: Palette.ink, marginTop: 8 },
  emptyT2: { fontSize: 11, fontWeight: '700', color: Palette.muted, marginTop: 3 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    borderWidth: 3,
    borderColor: '#1B1F3B',
    padding: 12,
    marginTop: 10,
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
  premCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: Radius.lg,
    borderWidth: 4,
    borderColor: '#FFD84D',
    padding: 16,
    marginTop: 22,
    ...Shadow.pop,
  },
  premIcon: { fontSize: 30 },
  premName: { fontSize: 17, fontWeight: '900', color: '#fff' },
  premNamePro: { color: '#1B1F3B' },
  premStatus: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  premStatusPro: { color: 'rgba(27,31,59,0.7)' },
  premCheck: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(27,31,59,0.85)', alignItems: 'center', justifyContent: 'center' },
  premCheckTxt: { color: '#FFD84D', fontWeight: '900', fontSize: 18 },
  premGet: { backgroundColor: '#1B1F3B', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 2.5, borderColor: '#FFD84D' },
  premGetTxt: { color: '#FFD84D', fontWeight: '900', fontSize: 13 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: Radius.lg,
    borderWidth: 3,
    borderColor: '#1B1F3B',
    padding: 14,
    marginTop: 14,
  },
  settingIcon: { fontSize: 20 },
  settingTxt: { flex: 1, fontSize: 15, fontWeight: '900', color: Palette.ink },
  resetTxt: { color: Palette.coral },
  settingArrow: { fontSize: 24, fontWeight: '900', color: Palette.muted },
  resetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: Radius.lg,
    borderWidth: 3,
    borderColor: 'rgba(27,31,59,0.3)',
    padding: 14,
    marginTop: 12,
  },
  by: { marginTop: 22, textAlign: 'center', fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.75)' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(20,16,45,0.72)', alignItems: 'center', justifyContent: 'center', zIndex: 70 },
  dialog: { width: 300, backgroundColor: '#fff', borderRadius: 24, borderWidth: 4, borderColor: '#1B1F3B', padding: 22, alignItems: 'center', ...Shadow.pop },
  dialogQ: { fontSize: 14, fontWeight: '800', color: Palette.ink, textAlign: 'center' },
  dialogRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  dialogBtn: { flex: 1, borderRadius: 14, borderWidth: 3, borderColor: '#1B1F3B', paddingVertical: 12, alignItems: 'center', backgroundColor: 'rgba(27,31,59,0.06)' },
  dialogBtnTxt: { fontSize: 13, fontWeight: '900', color: Palette.ink },
  dialogBtnYes: { backgroundColor: Palette.coral },
  dialogBtnYesTxt: { color: '#fff' },
});
