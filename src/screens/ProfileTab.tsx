import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import SettingsSheet from '@/components/SettingsSheet';
import PremiumSheet from '@/components/PremiumSheet';
import { Palette, Gradients, Radius, Shadow } from '@/constants/theme';
import { play } from '@/game/sound';
import { usePremium } from '@/game/premium';
import { useWallet, resetWallet } from '@/game/wallet';
import { AVATARS, EXCLUSIVE_AVATARS } from '@/game/avatars';
import { CATEGORIES } from '@/game/deck';
import { t } from '@/i18n';

/** PROFILE tab: stats, collection progress, language settings, premium, reset. */
export default function ProfileTab() {
  const wallet = useWallet();
  const premium = usePremium();
  const isPro = premium.premium || premium.admin;
  const [showSettings, setShowSettings] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const avatarsOwned = AVATARS.filter((a) => !a.premium || wallet.ownedAvatars.includes(a.id)).length;
  const catsOwned = CATEGORIES.filter((c) => c.free || wallet.ownedCategories.includes(c.id)).length;

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

        {/* exclusive collection */}
        <Text style={styles.section}>👑 {t('gacha_excl_title')}</Text>
        <View style={styles.exclRow}>
          {EXCLUSIVE_AVATARS.map((e) => {
            const owned = wallet.ownedAvatars.includes(e.id);
            return (
              <View key={e.id} style={[styles.exclChip, owned ? styles.exclChipOwned : styles.exclChipLocked]}>
                <Text style={styles.exclChipEmoji}>{owned ? e.emoji : '❓'}</Text>
                <Text style={styles.exclChipName}>{owned ? e.name : '???'}</Text>
              </View>
            );
          })}
          <View style={styles.exclCount}>
            <Text style={styles.exclCountTxt}>{wallet.ownedAvatars.length}/{EXCLUSIVE_AVATARS.length}</Text>
          </View>
        </View>

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
  exclRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  exclChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 3,
  },
  exclChipLocked: { backgroundColor: 'rgba(27,31,59,0.8)', borderColor: 'rgba(255,216,77,0.4)', borderStyle: 'dashed' },
  exclChipOwned: { backgroundColor: 'rgba(255,216,77,0.2)', borderColor: '#FFD84D' },
  exclChipEmoji: { fontSize: 16 },
  exclChipName: { fontSize: 12, fontWeight: '900', color: '#fff' },
  exclCount: { marginLeft: 'auto' },
  exclCountTxt: { fontSize: 13, fontWeight: '900', color: 'rgba(255,255,255,0.85)' },
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
