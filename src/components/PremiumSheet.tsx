import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Animated,
  Easing,
  TextInput,
} from 'react-native';
import { Palette, Radius, Shadow } from '@/constants/theme';
import {
  PLANS,
  usePremium,
  purchasePremium,
  activateAdmin,
} from '@/game/premium';
import { useAds, AD_FREE_PER_DAY } from '@/game/ads';
import { play } from '@/game/sound';
import { t } from '@/i18n';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** what triggered the lock — shown in the headline, e.g. "MOLE mode" */
  lockLabel?: string;
  /**
   * Optional FAKE rewarded-ad escape hatch: "watch a short ad → one-time
   * pass". The parent opens its AdModal from `onWatch`; `onReward` is
   * called by the parent AFTER the ad completes (grants the pass).
   */
  reward?: {
    label: string;
    onWatch: () => void;
    onReward: () => void;
  };
  /** Optional note under the headline (e.g. why the topic is locked). */
  note?: string;
}

/**
 * The paywall sheet.
 *
 * Explains what premium unlocks, offers monthly vs yearly (yearly carries
 * the "SAVE 58%" discount), and has a hidden-ish ADMIN KEY entry: the owner
 * types the master key and every feature is theirs without paying.
 *
 * Demo checkout — "buy" just flips the device's premium flag.
 */
export default function PremiumSheet({ visible, onClose, lockLabel, reward, note }: Props) {
  const premium = usePremium();
  const ads = useAds();
  const [bought, setBought] = useState(false);
  const [adminInput, setAdminInput] = useState('');
  const [adminMsg, setAdminMsg] = useState<'idle' | 'wrong' | 'done'>('idle');
  const [showAdmin, setShowAdmin] = useState(false);

  const alreadyIn = premium.premium || premium.admin;

  const buy = (plan: 'monthly' | 'yearly') => {
    purchasePremium(plan);
    setBought(true);
    play('win');
    setTimeout(onClose, 1400);
  };

  const tryAdmin = () => {
    if (activateAdmin(adminInput)) {
      setAdminMsg('done');
      play('win');
      setTimeout(onClose, 1200);
    } else {
      setAdminMsg('wrong');
      play('buzz');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          {/* header */}
          <View style={styles.crownRow}>
            <Text style={styles.crown}>👑</Text>
            <Text style={styles.sheetTitle}>{t('prem_title')}</Text>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={10}>
              <Text style={styles.closeTxt}>✕</Text>
            </Pressable>
          </View>

          <Text style={styles.sheetHeadline}>
            {lockLabel ? (
              <>
                <Text style={styles.headLock}>🔒 {lockLabel}</Text> {t('prem_locked')}
              </>
            ) : (
              t('prem_sub')
            )}
          </Text>
          {note ? <Text style={styles.noteTxt}>{note}</Text> : null}

          {/* FAKE rewarded-ad escape hatch — the "I don't wanna pay" door */}
          {reward ? (
            <Pressable
              style={[styles.adCard, ads.adsLeftToday <= 0 && styles.adCardDone]}
              onPress={() => ads.adsLeftToday > 0 && !ads.coolingDown && reward.onWatch()}
              hitSlop={6}
            >
              <Text style={styles.adCardEmoji}>📺</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.adCardTitle}>
                  {ads.adsLeftToday <= 0 ? t('no_ads_left') : `${t('watch_ad_short')} → ${reward.label}`}
                </Text>
                <Text style={styles.adCardSub}>
                  {ads.adsLeftToday <= 0
                    ? t('ads_done_sub')
                    : t('ads_left', { n: ads.adsLeftToday, max: AD_FREE_PER_DAY })}
                </Text>
              </View>
              {ads.adsLeftToday > 0 ? (
                <View style={styles.adCardBtn}>
                  <Text style={styles.adCardBtnTxt}>{ads.coolingDown ? '…' : 'PLAY ▶'}</Text>
                </View>
              ) : (
                <Text style={styles.adCardCheck}>—</Text>
              )}
            </Pressable>
          ) : null}

          {/* features */}
          <View style={styles.features}>
            <FeatureRow emoji="🕵️" text={t('prem_b1')} sub={t('prem_b1_sub')} />
            <FeatureRow emoji="🖼️" text={t('prem_b2')} sub={t('prem_b2_sub')} />
            <FeatureRow emoji="🤳" text={t('prem_b3')} sub={t('prem_b3_sub')} />
            <FeatureRow emoji="🗺️" text={t('prem_b4')} sub={t('prem_b4_sub')} />
          </View>

          {/* plans */}
          <View style={styles.plansRow}>
            {/* monthly */}
            <Pressable
              style={[styles.planCard, !bought && styles.planCardMonthly]}
              onPress={() => !bought && buy('monthly')}
            >
              <Text style={styles.planName}>{t('monthly')}</Text>
              <Text style={styles.planPrice}>${PLANS.monthly.price.toFixed(2)}</Text>
              <Text style={styles.planPer}>{t('per_month')}</Text>
              <Text style={styles.planCta}>{t('start')}</Text>
            </Pressable>

            {/* yearly — the discounted one */}
            <Pressable
              style={[styles.planCard, styles.planCardYearly, !bought && { opacity: bought ? 0.5 : 1 }]}
              onPress={() => !bought && buy('yearly')}
            >
              <View style={styles.discountBadge}>
                <Text style={styles.discountBadgeTxt}>{PLANS.yearly.badge}</Text>
              </View>
              <Text style={styles.planName}>{t('yearly')}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.oldPrice}>${PLANS.yearly.oldPrice.toFixed(2)}</Text>
                <Text style={styles.planPrice}>${PLANS.yearly.price.toFixed(2)}</Text>
              </View>
              <Text style={styles.planPer}>{t('per_year')} · {t('months_free')}</Text>
              <Text style={styles.planCta}>{t('best_deal')}</Text>
            </Pressable>
          </View>

          {/* already premium / bought confirmation */}
          {alreadyIn || bought ? (
            <View style={styles.doneRow}>
              <Text style={styles.doneTxt}>
                {bought ? t('bought_ok') : t('already_prem')}
              </Text>
            </View>
          ) : null}

          <Text style={styles.terms}>
            {t('demo_note')}
          </Text>

          {/* admin key */}
          <View style={styles.adminWrap}>
            {showAdmin ? (
              <View style={styles.adminInner}>
                {adminMsg === 'done' ? (
                  <Text style={styles.doneTxt}>{t('admin_ok')}</Text>
                ) : (
                  <>
                    <TextInput
                      style={[styles.adminInput, adminMsg === 'wrong' && styles.adminInputWrong]}
                      value={adminInput}
                      onChangeText={(t) => {
                        setAdminInput(t);
                        if (adminMsg === 'wrong') setAdminMsg('idle');
                      }}
                      placeholder="ADMIN KEY"
                      placeholderTextColor={Palette.muted}
                      autoCapitalize="none"
                      autoCorrect={false}
                      maxLength={12}
                    />
                    {adminMsg === 'wrong' ? (
                      <Text style={styles.adminWrong}>{t('admin_no')}</Text>
                    ) : null}
                    <Pressable style={styles.adminBtn} onPress={tryAdmin} hitSlop={6}>
                      <Text style={styles.adminBtnTxt}>{t('activate')}</Text>
                    </Pressable>
                  </>
                )}
              </View>
            ) : (
              <Pressable onPress={() => { setShowAdmin(true); play('tick'); }} hitSlop={8}>
                <Text style={styles.adminLink}>{t('admin_cta')}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function FeatureRow({ emoji, text, sub }: { emoji: string; text: string; sub: string }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureEmoji}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.featureTxt}>{text}</Text>
        <Text style={styles.featureSub}>{sub}</Text>
      </View>
      <Text style={styles.featureCheck}>✓</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(21,26,46,0.72)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 4,
    borderColor: Palette.ink,
    borderBottomWidth: 0,
    padding: 20,
    paddingBottom: 30,
    gap: 12,
    maxHeight: '92%',
  },
  crownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 3,
    borderBottomColor: Palette.ink,
    paddingBottom: 10,
  },
  crown: { fontSize: 26 },
  sheetTitle: { flex: 1, fontSize: 18, fontWeight: '900', color: Palette.ink, letterSpacing: 1 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTxt: { color: '#fff', fontSize: 15, fontWeight: '900' },
  sheetHeadline: { fontSize: 13.5, fontWeight: '800', color: Palette.muted, textAlign: 'center' },
  noteTxt: { fontSize: 11, fontWeight: '700', color: Palette.coral, textAlign: 'center' },
  headLock: { color: Palette.ink, fontWeight: '900' },
  adCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#E8FBF0',
    borderRadius: Radius.lg,
    borderWidth: 3,
    borderColor: Palette.lime,
    padding: 14,
  },
  adCardDone: { opacity: 0.6, borderColor: 'rgba(27,31,59,0.2)', backgroundColor: 'rgba(27,31,59,0.05)' },
  adCardEmoji: { fontSize: 26 },
  adCardTitle: { fontSize: 14, fontWeight: '900', color: Palette.ink },
  adCardSub: { fontSize: 10.5, fontWeight: '700', color: Palette.muted, marginTop: 1 },
  adCardBtn: {
    backgroundColor: Palette.lime,
    borderRadius: 999,
    borderWidth: 2.5,
    borderColor: '#1B1F3B',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  adCardBtnTxt: { fontSize: 12, fontWeight: '900', color: '#1B1F3B', letterSpacing: 0.5 },
  adCardCheck: { fontSize: 18, fontWeight: '900', color: Palette.muted },
  features: { gap: 8 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF9EE',
    borderRadius: Radius.md,
    borderWidth: 2.5,
    borderColor: 'rgba(27,31,59,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  featureEmoji: { fontSize: 22 },
  featureTxt: { fontSize: 13.5, fontWeight: '900', color: Palette.ink },
  featureSub: { fontSize: 10.5, fontWeight: '700', color: Palette.muted },
  featureCheck: { fontSize: 18, fontWeight: '900', color: Palette.lime },
  plansRow: { flexDirection: 'row', gap: 10 },
  planCard: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 3.5,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap: 3,
    position: 'relative',
  },
  planCardMonthly: { backgroundColor: '#F4F2FB', borderColor: Palette.ink },
  planCardYearly: { backgroundColor: '#1B1F3B', borderColor: Palette.sunshine },
  discountBadge: {
    position: 'absolute',
    top: -12,
    backgroundColor: Palette.coral,
    borderRadius: 999,
    borderWidth: 2.5,
    borderColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 3,
    ...Shadow.soft,
  },
  discountBadgeTxt: { color: '#fff', fontSize: 10.5, fontWeight: '900', letterSpacing: 0.5 },
  planName: { fontSize: 12, fontWeight: '900', color: '#fff', letterSpacing: 1.5, opacity: 0.85 },
  planNameLight: { color: Palette.ink },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  oldPrice: { fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.55)', textDecorationLine: 'line-through' },
  planPrice: { fontSize: 24, fontWeight: '900', color: '#fff' },
  planPer: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.75)' },
  planCta: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    backgroundColor: Palette.sunshine,
    color: Palette.ink,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  doneRow: { alignItems: 'center' },
  doneTxt: { fontSize: 13.5, fontWeight: '900', color: Palette.lime, textAlign: 'center' },
  terms: { fontSize: 9.5, fontWeight: '700', color: Palette.muted, textAlign: 'center' },
  adminWrap: { alignItems: 'center' },
  adminInner: { width: '100%', gap: 8, alignItems: 'center' },
  adminLink: { fontSize: 11.5, fontWeight: '800', color: Palette.muted, textDecorationLine: 'underline' },
  adminInput: {
    width: '70%',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 3,
    textAlign: 'center',
    color: Palette.ink,
    backgroundColor: '#F3F5FF',
    borderRadius: Radius.sm,
    borderWidth: 3,
    borderColor: Palette.ink,
    paddingVertical: 9,
  },
  adminInputWrong: { borderColor: Palette.coral, backgroundColor: '#FFF0F0' },
  adminWrong: { fontSize: 11, fontWeight: '900', color: Palette.coral },
  adminBtn: {
    backgroundColor: Palette.ink,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 8,
  },
  adminBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
});
