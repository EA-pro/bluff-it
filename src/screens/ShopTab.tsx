import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AvatarFace from '@/components/AvatarFace';
import PremiumSheet from '@/components/PremiumSheet';
import { Palette, Gradients, Radius, Shadow } from '@/constants/theme';
import { play } from '@/game/sound';
import { usePremium } from '@/game/premium';
import {
  useWallet, COIN_PACKS, buyCoinPack, buyAvatar, buyCategory,
  AVATAR_PRICE, CAT_PRICE, isAvatarOwned,
  dailyAvailable, dailyAmountToday, dailyStreakToday, claimDaily,
} from '@/game/wallet';
import { AVATARS } from '@/game/avatars';
import { CATEGORIES, FREE_CATEGORIES } from '@/game/deck';
import { t } from '@/i18n';

const CAT_EMOJI: Record<string, string> = { general: '🌍', funny: '😂', sexy: '🔥', geo: '🗺️', animals: '🦁' };

/** SHOP tab: coin packs (fake IAP), avatar collection, question-pack unlocks, premium pass. */
export default function ShopTab() {
  const wallet = useWallet();
  const premium = usePremium();
  const isPro = premium.premium || premium.admin;
  const [showPremium, setShowPremium] = useState(false);
  const [boughtPack, setBoughtPack] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [dailyBurst, setDailyBurst] = useState<number | null>(null);

  useEffect(() => {
    if (dailyBurst == null) return;
    const id = setTimeout(() => setDailyBurst(null), 1600);
    return () => clearTimeout(id);
  }, [dailyBurst]);

  const onClaimDaily = () => {
    const r = claimDaily();
    if (r.ok) {
      play('win');
      setDailyBurst(r.amount);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const buyPack = (id: string) => {
    buyCoinPack(id);
    play('win');
    setBoughtPack(id);
    setTimeout(() => setBoughtPack(null), 1200);
  };

  const buyAv = (id: string) => {
    if (wallet.coins < AVATAR_PRICE) { play('buzz'); showToast(t('shop_not_enough')); return; }
    if (buyAvatar(id)) { play('win'); } else { play('buzz'); showToast(t('shop_not_enough')); }
  };

  const buyCat = (id: (typeof CATEGORIES)[number]['id']) => {
    if (wallet.coins < CAT_PRICE) { play('buzz'); showToast(t('shop_not_enough')); return; }
    if (buyCategory(id)) play('win'); else { play('buzz'); showToast(t('shop_not_enough')); }
  };

  return (
    <LinearGradient colors={Gradients.home} style={styles.bg}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>🛒 {t('shop_title')}</Text>

        {/* coin balance */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLbl}>{t('shop_coins_have')}</Text>
          <Text style={styles.balanceNum}>🪙 {wallet.coins.toLocaleString('en-US')}</Text>
        </View>

        {/* daily bonus */}
        <View style={styles.dailyCard}>
          <View style={styles.dailyLeft}>
            <Text style={styles.dailyEmoji}>🎁</Text>
            <View>
              <Text style={styles.dailyTitle}>{t('home_daily')}</Text>
              <Text style={styles.dailyStreak}>{t('daily_day', { n: dailyStreakToday() })}{dailyStreakToday() % 7 === 0 ? t('daily_weekly') : ''}</Text>
            </View>
          </View>
          {dailyAvailable() ? (
            <Pressable style={styles.dailyBtn} onPress={onClaimDaily} hitSlop={8}>
              <Text style={styles.dailyBtnTxt}>+{dailyAmountToday()} 🪙</Text>
              <Text style={styles.dailyBtnSub}>{t('home_daily_cta')}</Text>
            </Pressable>
          ) : (
            <View style={styles.dailyDone}>
              <Text style={styles.dailyDoneTxt}>{t('daily_claimed')}</Text>
            </View>
          )}
          {dailyBurst != null && (
            <Text style={styles.burstTxt} pointerEvents="none">+{dailyBurst} 🪙</Text>
          )}
        </View>

        {/* coin packs */}
        <Text style={styles.section}>{t('shop_packs')}</Text>
        <View style={styles.packRow}>
          {COIN_PACKS.map((p) => (
            <Pressable key={p.id} style={[styles.packCard, boughtPack === p.id && styles.packCardOn]} onPress={() => buyPack(p.id)}>
              {p.badge ? <Text style={styles.packBadge}>{p.badge}</Text> : null}
              <Text style={styles.packCoin}>🪙</Text>
              <Text style={styles.packAmt}>{p.coins}</Text>
              <Text style={styles.packPrice}>${p.price}</Text>
            </Pressable>
          ))}
        </View>

        {/* avatar collection */}
        <Text style={styles.section}>
          {t('shop_avatar_title')} <Text style={styles.sectionSub}>· {t('shop_avatar_locked')}: {AVATAR_PRICE} 🪙</Text>
        </Text>
        <View style={styles.avGrid}>
          {AVATARS.filter((a) => a.premium).map((a) => {
            const owned = isAvatarOwned(a.id) || wallet.ownedAvatars.includes(a.id);
            return (
              <Pressable key={a.id} style={[styles.avCard, owned && styles.avCardOwned]} onPress={() => !owned && !isPro && buyAv(a.id)}>
                <View style={[styles.avBg, { backgroundColor: a.face }]}>
                  <AvatarFace avatarId={a.id} size={40} />
                </View>
                <Text style={styles.avName} numberOfLines={1}>{a.emoji}</Text>
                {owned ? (
                  <Text style={styles.avOwned}>{t('shop_avatar_owned')}</Text>
                ) : isPro ? (
                  <Text style={styles.avOwned}>👑</Text>
                ) : (
                  <Text style={styles.avPrice}>{AVATAR_PRICE} 🪙</Text>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* question packs */}
        <Text style={styles.section}>
          {t('shop_cat_title')} <Text style={styles.sectionSub}>· {t('shop_cat_sub')}</Text>
        </Text>
        <View style={styles.catList}>
          {CATEGORIES.filter((c) => !c.free).map((c) => {
            const owned = wallet.ownedCategories.includes(c.id);
            return (
              <View key={c.id} style={styles.catCard}>
                <Text style={styles.catEmoji}>{CAT_EMOJI[c.id]}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.catName}>{t(`cat_${c.id}`)}</Text>
                  <Text style={styles.catDesc} numberOfLines={1}>{t(`cat_${c.id}_desc`)}</Text>
                </View>
                {owned ? (
                  <Text style={styles.catOwned}>{t('shop_cat_owned')}</Text>
                ) : isPro ? (
                  <Text style={styles.catOwned}>👑</Text>
                ) : (
                  <Pressable style={styles.catBuyBtn} onPress={() => buyCat(c.id)} hitSlop={8}>
                    <Text style={styles.catBuyTxt}>{CAT_PRICE} 🪙</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>

        {/* premium pass */}
        <LinearGradient
          colors={['#3B2E63', '#241A45']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.premCard}
        >
          <Text style={styles.premTitle}>👑 {t('shop_prem_title')}</Text>
          <Text style={styles.premSub}>{t('shop_prem_sub')}</Text>
          {isPro ? (
            <Text style={styles.premHas}>{t('shop_already_prem')}</Text>
          ) : (
            <Pressable style={styles.premBtn} onPress={() => { play('pop'); setShowPremium(true); }} hitSlop={8}>
              <Text style={styles.premBtnTxt}>{t('shop_prem_cta')} →</Text>
            </Pressable>
          )}
        </LinearGradient>
        <View style={{ height: 120 }} />
      </ScrollView>

      {toast && <View style={styles.toast}><Text style={styles.toastTxt}>{toast}</Text></View>}
      <PremiumSheet visible={showPremium} onClose={() => setShowPremium(false)} lockLabel={t('shop_prem_title')} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '900', color: '#fff', textShadowColor: 'rgba(0,0,0,0.25)', textShadowRadius: 5, textShadowOffset: { width: 0, height: 2 } },
  balanceCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: Radius.lg,
    borderWidth: 4,
    borderColor: '#1B1F3B',
    paddingVertical: 14,
    marginTop: 16,
    ...Shadow.pop,
  },
  balanceLbl: { fontSize: 12, fontWeight: '800', color: Palette.muted, textTransform: 'uppercase', letterSpacing: 1 },
  balanceNum: { fontSize: 34, fontWeight: '900', color: Palette.ink, marginTop: 2 },
  dailyCard: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    borderWidth: 4,
    borderColor: '#1B1F3B',
    padding: 14,
    marginTop: 14,
    ...Shadow.pop,
  },
  dailyLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dailyEmoji: { fontSize: 30 },
  dailyTitle: { fontSize: 15, fontWeight: '900', color: Palette.ink },
  dailyStreak: { fontSize: 11, fontWeight: '800', color: Palette.muted },
  dailyBtn: {
    backgroundColor: Palette.sunshine,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#1B1F3B',
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  dailyBtnTxt: { fontSize: 17, fontWeight: '900', color: '#1B1F3B' },
  dailyBtnSub: { fontSize: 9.5, fontWeight: '800', color: 'rgba(27,31,59,0.6)', textTransform: 'uppercase', letterSpacing: 1 },
  dailyDone: { alignItems: 'center' },
  dailyDoneTxt: { fontSize: 11, fontWeight: '800', color: Palette.muted, maxWidth: 120 },
  burstTxt: {
    position: 'absolute',
    top: -18,
    right: 14,
    fontSize: 24,
    fontWeight: '900',
    color: '#FFD84D',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 5,
    textShadowOffset: { width: 0, height: 2 },
  },
  section: { fontSize: 13, fontWeight: '900', color: '#fff', textTransform: 'uppercase', letterSpacing: 1, marginTop: 22, marginBottom: 10, textShadowColor: 'rgba(0,0,0,0.2)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
  sectionSub: { fontSize: 10.5, textTransform: 'none', letterSpacing: 0, color: 'rgba(255,255,255,0.75)', fontWeight: '700' },
  packRow: { flexDirection: 'row', gap: 10 },
  packCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    borderWidth: 3,
    borderColor: '#1B1F3B',
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
    ...Shadow.pop,
  },
  packCardOn: { transform: [{ scale: 1.05 }], backgroundColor: Palette.sunshine },
  packBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: Palette.coral,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: '#1B1F3B',
    zIndex: 2,
    fontSize: 8.5,
    fontWeight: '900',
    color: '#fff',
  },
  packCoin: { fontSize: 26 },
  packAmt: { fontSize: 18, fontWeight: '900', color: Palette.ink },
  packPrice: { fontSize: 13, fontWeight: '900', color: Palette.grape, marginTop: 2 },
  avGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  avCard: {
    width: '31%',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: Radius.md,
    borderWidth: 3,
    borderColor: 'rgba(27,31,59,0.35)',
    alignItems: 'center',
    padding: 8,
  },
  avCardOwned: { borderColor: Palette.grape, backgroundColor: '#F5F1FF' },
  avBg: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: '#1B1F3B', backgroundColor: 'rgba(27,31,59,0.08)' },
  avName: { fontSize: 10.5, fontWeight: '900', color: Palette.ink, marginTop: 4 },
  avOwned: { fontSize: 9.5, fontWeight: '900', color: Palette.grape, marginTop: 2 },
  avPrice: { fontSize: 10, fontWeight: '900', color: Palette.sunshine, marginTop: 2 },
  exclRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  exclCard: {
    flex: 1,
    backgroundColor: 'rgba(27,31,59,0.85)',
    borderRadius: Radius.md,
    borderWidth: 3,
    borderColor: 'rgba(255,216,77,0.6)',
    alignItems: 'center',
    padding: 10,
  },
  exclCardOwned: { backgroundColor: 'rgba(255,216,77,0.2)', borderColor: '#FFD84D' },
  exclBg: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: '#FFD84D' },
  exclName: { fontSize: 11, fontWeight: '900', color: '#FFD84D', marginTop: 5 },
  exclTag: { fontSize: 8.5, fontWeight: '900', color: 'rgba(255,255,255,0.7)', letterSpacing: 1, marginTop: 2 },
  catList: { gap: 10 },
  catCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: 3,
    borderColor: '#1B1F3B',
    padding: 12,
  },
  catEmoji: { fontSize: 26 },
  catName: { fontSize: 14, fontWeight: '900', color: Palette.ink },
  catDesc: { fontSize: 10, fontWeight: '700', color: Palette.muted },
  catOwned: { fontSize: 11, fontWeight: '900', color: Palette.grape },
  catBuyBtn: {
    backgroundColor: Palette.sunshine,
    borderRadius: 12,
    borderWidth: 2.5,
    borderColor: '#1B1F3B',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  catBuyTxt: { fontSize: 12, fontWeight: '900', color: '#1B1F3B' },
  premCard: {
    borderRadius: Radius.lg,
    borderWidth: 4,
    borderColor: '#FFD84D',
    padding: 18,
    alignItems: 'center',
    marginTop: 24,
    ...Shadow.pop,
  },
  premTitle: { fontSize: 20, fontWeight: '900', color: '#FFD84D' },
  premSub: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  premHas: { marginTop: 12, fontSize: 13, fontWeight: '900', color: '#fff' },
  premBtn: {
    marginTop: 14,
    backgroundColor: '#FFD84D',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#1B1F3B',
    paddingHorizontal: 26,
    paddingVertical: 12,
  },
  premBtnTxt: { fontSize: 16, fontWeight: '900', color: '#1B1F3B' },
  toast: {
    position: 'absolute',
    top: 90,
    alignSelf: 'center',
    backgroundColor: '#1B1F3B',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 3,
    borderColor: '#FFD84D',
    zIndex: 60,
  },
  toastTxt: { color: '#fff', fontWeight: '900', fontSize: 14 },
});
