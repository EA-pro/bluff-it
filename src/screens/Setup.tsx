import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AvatarFace from '@/components/AvatarFace';
import BigButton from '@/components/BigButton';
import { AVATARS, isPremiumAvatar } from '@/game/avatars';
import { getFaceEmoji } from '@/game/facepick';
import { useGame } from '@/game/useStore';
import { addPlayer, removePlayer, startGame, setConfig, goHome } from '@/game/store';
import { usePremium, scansLeftToday, consumeFaceScan, FACE_SCAN_FREE_PER_DAY } from '@/game/premium';
import { useAds, grantAvatarPass, consumeAvatarPass, completeAd } from '@/game/ads';
import PremiumSheet from '@/components/PremiumSheet';
import AdModal from '@/components/AdModal';
import { Palette, Radius, Shadow, Gradients } from '@/constants/theme';
import FaceScan from '@/screens/FaceScan';
import { play } from '@/game/sound';
import { t } from '@/i18n';
import { CATEGORIES } from '@/game/deck';
import type { CategoryId } from '@/game/types';

/**
 * Player setup. 2–6 players, name + avatar, optional face-scan to auto-pick
 * a matching emoji.
 *
 * Premium locks: crown-tier avatars (🦄🐲🎮🎧🚀💎) and face-scans
 * (3/day free, unlimited on premium).
 */
export default function Setup() {
  const { players, config } = useGame();
  const premium = usePremium();
  const [name, setName] = useState('');
  const [avatarId, setAvatarId] = useState(AVATARS[0].id);
  const [scanOpen, setScanOpen] = useState(false);
  const [roundsOpen, setRoundsOpen] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [premiumReason, setPremiumReason] = useState('avatars');
  // FAKE rewarded-ad: "watch a short ad → use this crown avatar once"
  const ads = useAds();
  const [adForAvatar, setAdForAvatar] = useState(false);
  const [adAvatarId, setAdAvatarId] = useState<string | null>(null);
  const [premiumCat, setPremiumCat] = useState<CategoryId | null>(null);

  const isPro = premium.premium || premium.admin;
  const scansLeft = scansLeftToday();
  const passId = ads.avatarPassId;

  const full = players.length >= 6;
  const canStart = players.length >= 2;

  const takenIds = new Set(players.map((p) => p.avatarId));
  const takenEmojis = players
    .map((p) => getFaceEmoji(p.avatarId)?.emoji)
    .filter((e): e is string => !!e);

  // The picker only shows avatars nobody is using yet.
  const picker = AVATARS.filter((a) => !takenIds.has(a.id));
  const current = picker.find((a) => a.id === avatarId) ?? picker[0] ?? AVATARS[0];

  function onAdd() {
    // premium avatar guard (covers the case where the current avatar is
    // crown-tier but this device just lost premium somehow)
    const viaPass = current.premium && !isPro && passId === current.id;
    if (current.premium && !isPro && !viaPass) {
      setPremiumReason('avatars');
      setShowPremium(true);
      play('buzz');
      return;
    }
    if (viaPass) consumeAvatarPass(); // spend the one-time ad reward
    addPlayer(name.trim() || `Player ${players.length + 1}`, current.id, players.length);
    setName('');
    // next default: first avatar nobody has (incl. the one just added) — and
    // never a locked premium one
    const next = AVATARS.find((a) => !takenIds.has(a.id) && a.id !== current.id && !(a.premium && !isPro)) ?? AVATARS[0];
    setAvatarId(next.id);
  }

  function onScanPress() {
    if (!isPro && scansLeft <= 0) {
      setPremiumReason('face-scan');
      setShowPremium(true);
      play('buzz');
      return;
    }
    setScanOpen(true);
  }

  const cats = config.categories;
  const toggleCat = (id: CategoryId) => {
    const cat = CATEGORIES.find((c) => c.id === id);
    if (!cat) return;
    const has = cats.includes(id);
    if (!has && !cat.free && !isPro) {
      // paid topic locked → premium sheet (with a note)
      setPremiumCat(id);
      setShowPremium(true);
      play('buzz');
      return;
    }
    if (has && cats.length <= 1) return; // keep at least one topic
    setConfig({ categories: has ? cats.filter((c) => c !== id) : [...cats, id] });
    play(has ? 'tick' : 'pop');
  };

  function onScanDone(avatarId: string | null) {
    if (avatarId) {
      setAvatarId(avatarId);
      consumeFaceScan(); // spend one free scan (premium: no-op cap)
    }
    setScanOpen(false);
  }

  return (
    <LinearGradient colors={Gradients.onboarding} style={styles.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={goHome} style={styles.back} hitSlop={12}>
            <Text style={{ fontSize: 24, color: Palette.ink, fontWeight: '900' }}>←</Text>
          </Pressable>
          <Text style={styles.title}>{t('setup_title')}</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {players.length === 0 && (
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>📱</Text>
              <Text style={styles.emptyText}>
                {t('setup_empty1')}
                <Text style={{ fontWeight: '800' }}>  {t('setup_empty2')}</Text>
              </Text>
            </View>
          )}

          {players.map((p, i) => (
            <View key={p.id} style={styles.playerRow}>
              <View style={styles.playerAvatar}>
                <AvatarFace avatarId={p.avatarId} size={48} />
                <View style={[styles.teamDot, { backgroundColor: TEAM_COLORS[i % TEAM_COLORS.length] }]} />
              </View>
              <Text style={styles.playerName}>{p.name}</Text>
              <Text style={styles.playerPts}>{t('ready')}</Text>
              <Pressable onPress={() => removePlayer(p.id)} style={styles.del} hitSlop={10}>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>✕</Text>
              </Pressable>
            </View>
          ))}

          {!full && (
            <View style={styles.addCard}>
              <Text style={styles.addLabel}>{t('new_player')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('name_ph')}
                placeholderTextColor={Palette.muted}
                value={name}
                onChangeText={setName}
                maxLength={12}
                returnKeyType="done"
                onSubmitEditing={onAdd}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.avScroll}>
                {picker.map((a) => {
                  const hasPassFor = !isPro && a.premium && passId === a.id;
                  const lockedAv = a.premium && !isPro && !hasPassFor;
                  return (
                    <Pressable
                      key={a.id}
                      onPress={() => {
                        if (lockedAv) {
                          setPremiumReason('avatars');
                          setAdAvatarId(a.id);
                          setShowPremium(true);
                          play('buzz');
                        } else {
                          setAvatarId(a.id);
                        }
                      }}
                      style={[styles.avPick, current.id === a.id && !lockedAv && styles.avPickOn, lockedAv && styles.avPickLocked]}
                    >
                      {lockedAv && <Text style={styles.avLock}>🔒</Text>}
                      {hasPassFor && <Text style={styles.avLock}>📺</Text>}
                      <AvatarFace avatarId={a.id} size={42} />
                      {a.premium && !lockedAv && <Text style={styles.avCrown}>👑</Text>}
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Text style={styles.avHint}>{t('swipe')}</Text>
              {Platform.OS === 'web' && (
                <Pressable style={styles.scanBtn} onPress={onScanPress}>
                  <Text style={styles.scanBtnText}>
                    {t('face_scan')}
                    {!isPro ? t('scans_left', { n: scansLeft }) : t('unlimited')}
                  </Text>
                </Pressable>
              )}
              <BigButton label={t('add_player')} onPress={onAdd} variant="win" style={{ marginTop: 14 }} />
            </View>
          )}

          <View style={styles.roundsCard}>
            <Text style={styles.addLabel}>{t('cats')}</Text>
            <Text style={styles.discussSub}>{t('cats_sub')}</Text>
            <View style={styles.catGrid}>
              {CATEGORIES.map((c) => {
                const on = cats.includes(c.id);
                const lockedCat = !c.free && !isPro;
                const emoji = { general: '🌍', funny: '😂', sexy: '🔥', geo: '🗺️', animals: '🦁' }[c.id];
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => toggleCat(c.id)}
                    style={[styles.catPill, on && styles.catPillOn]}
                  >
                    <Text style={styles.catEmoji}>{emoji}</Text>
                    <Text style={[styles.catName, on && styles.catNameOn]}>
                      {t(`cat_${c.id}`)}
                    </Text>
                    <Text style={styles.catDesc}>
                      {t(`cat_${c.id}_desc`)}
                    </Text>
                    {lockedCat && <Text style={styles.catLock}>🔒</Text>}
                    {on && !lockedCat && <Text style={styles.catCheck}>✓</Text>}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.roundsCard}>
            <Text style={styles.addLabel}>{t('rounds')}</Text>
            <Pressable style={styles.roundsNum} onPress={() => setRoundsOpen((v) => !v)} hitSlop={6}>
              <Text style={styles.roundsNumTxt}>{config.rounds}</Text>
              <Text style={styles.roundsCaret}>{roundsOpen ? '▲' : '▼'}</Text>
            </Pressable>
            {roundsOpen && (
              <View style={styles.roundsGrid}>
                {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                  <Pressable
                    key={n}
                    style={[styles.roundsCell, config.rounds === n && styles.roundsCellOn]}
                    onPress={() => {
                      setConfig({ rounds: n });
                      setRoundsOpen(false);
                    }}
                  >
                    <Text style={[styles.roundsCellTxt, config.rounds === n && styles.roundsCellOnTxt]}>{n}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={styles.roundsCard}>
            <Text style={styles.addLabel}>{t('discussion')}</Text>
            <Text style={styles.discussSub}>{t('discuss_sub')}</Text>
            <View style={styles.stepperRow}>
              {([1, 2] as const).map((m) => (
                <Pressable
                  key={m}
                  style={[styles.minBtn, config.discussMinutes === m && styles.minBtnOn]}
                  onPress={() => setConfig({ discussMinutes: m })}
                >
                  <Text style={[styles.minTxt, config.discussMinutes === m && styles.minTxtOn]}>
                    {m} {t('min')}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <BigButton
            label={canStart ? t('start_chaos', { n: players.length }) : t('need_two')}
            variant="end"
            disabled={!canStart}
            onPress={startGame}
            style={{ marginTop: 20 }}
          />
          <Text style={styles.footNote}>{t('foot')}</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <FaceScan visible={scanOpen} playerName={name.trim()} excludeEmojis={takenEmojis} onClose={onScanDone} />
      <PremiumSheet
        visible={showPremium}
        onClose={() => { setShowPremium(false); setAdAvatarId(null); setPremiumCat(null); }}
        lockLabel={
          premiumReason === 'face-scan'
            ? 'unlimited face-scan'
            : premiumCat
              ? t(`cat_${premiumCat}`)
              : 'premium avatars'
        }
        note={premiumCat ? t('cats_need_premium') : undefined}
        reward={
          premiumReason === 'avatars' && adAvatarId
            ? {
                label: 'use this avatar once',
                onWatch: () => setAdForAvatar(true),
                onReward: () => {},
              }
            : undefined
        }
      />
      {adAvatarId && (
        <AdModal
          visible={adForAvatar}
          onClose={() => {
            // SKIP (didn't claim) → the pass wasn't earned; clean up.
            // CLAIM already ran onClaim (grant + completeAd) and closed the sheet.
            setAdForAvatar(false);
            setShowPremium(false);
            setAdAvatarId(null);
          }}
          rewardLabel={`use this 👑 avatar once`}
          onClaim={() => {
            completeAd();
            grantAvatarPass(adAvatarId);
            setAvatarId(adAvatarId);
            play('win');
            setAdForAvatar(false);
            setShowPremium(false);
            setAdAvatarId(null);
          }}
        />
      )}
    </LinearGradient>
  );
}

const TEAM_COLORS = [Palette.coral, Palette.sky, Palette.sunshine, Palette.grape, Palette.mint, Palette.bubblegum];

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#1B1F3B', ...Shadow.pop },
  title: { fontSize: 22, fontWeight: '900', color: '#fff', textShadowColor: 'rgba(0,0,0,0.2)', textShadowRadius: 5, textShadowOffset: { width: 0, height: 2 } },
  empty: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { color: '#fff', textAlign: 'center', marginTop: 8, fontSize: 15, lineHeight: 22, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.15)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 2 } },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    padding: 10,
    marginBottom: 10,
    borderWidth: 3,
    borderColor: '#1B1F3B',
    ...Shadow.pop,
  },
  playerAvatar: { position: 'relative', marginRight: 12 },
  teamDot: { position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#1B1F3B' },
  playerName: { flex: 1, fontSize: 17, fontWeight: '900', color: Palette.ink },
  playerPts: { fontSize: 11, fontWeight: '800', color: Palette.muted, marginRight: 10 },
  del: { width: 30, height: 30, borderRadius: 15, backgroundColor: Palette.coral, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: '#1B1F3B' },
  addCard: { backgroundColor: '#fff', borderRadius: Radius.lg, padding: 16, marginTop: 16, borderWidth: 4, borderColor: '#1B1F3B', ...Shadow.pop },
  addLabel: { fontSize: 13, fontWeight: '900', color: Palette.muted, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 },
  input: {
    backgroundColor: Palette.soft,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 17,
    fontWeight: '700',
    color: Palette.ink,
    borderWidth: 3,
    borderColor: '#1B1F3B',
  },
  avScroll: { marginTop: 12 },
  avHint: { textAlign: 'center', marginTop: 6, fontSize: 11, fontWeight: '800', color: Palette.muted },
  avPick: { width: 52, height: 52, borderRadius: 26, marginHorizontal: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 3.5, borderColor: 'transparent', position: 'relative' },
  avPickOn: { borderColor: Palette.ink, backgroundColor: Palette.soft },
  avPickLocked: { opacity: 0.55 },
  avLock: { position: 'absolute', top: -4, right: -4, fontSize: 14, zIndex: 2 },
  avCrown: { position: 'absolute', top: -4, right: -4, fontSize: 12, zIndex: 2 },
  scanBtn: {
    marginTop: 12,
    borderRadius: Radius.md,
    borderWidth: 3,
    borderColor: Palette.grape,
    backgroundColor: '#F5F1FF',
    paddingVertical: 12,
    alignItems: 'center',
  },
  scanBtnText: { color: Palette.grape, fontWeight: '900', fontSize: 15 },
  catGrid: { gap: 10 },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Palette.soft,
    borderRadius: Radius.md,
    borderWidth: 3,
    borderColor: 'rgba(27,31,59,0.3)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    position: 'relative',
  },
  catPillOn: { backgroundColor: Palette.sunshine, borderColor: '#1B1F3B' },
  catEmoji: { fontSize: 24 },
  catName: { fontSize: 15, fontWeight: '900', color: Palette.muted },
  catNameOn: { color: Palette.ink },
  catDesc: { flex: 1, fontSize: 10.5, fontWeight: '700', color: Palette.muted, textAlign: 'right' },
  catLock: { position: 'absolute', top: -6, right: -6, fontSize: 14, zIndex: 2 },
  catCheck: { position: 'absolute', top: -6, right: -6, fontSize: 14, fontWeight: '900', color: '#1B1F3B', backgroundColor: '#fff', borderRadius: 8, borderWidth: 2, borderColor: '#1B1F3B', padding: 2, zIndex: 2 },
  roundsCard: { backgroundColor: '#fff', borderRadius: Radius.lg, padding: 16, marginTop: 16, borderWidth: 4, borderColor: '#1B1F3B', ...Shadow.pop },
  roundsNum: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Palette.soft, borderRadius: 999, paddingHorizontal: 26, paddingVertical: 10, borderWidth: 3, borderColor: '#1B1F3B' },
  roundsNumTxt: { fontSize: 24, fontWeight: '900', color: Palette.ink },
  roundsCaret: { fontSize: 12, fontWeight: '900', color: Palette.muted },
  roundsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 14 },
  roundsCell: { width: 44, height: 44, borderRadius: 14, backgroundColor: Palette.soft, borderWidth: 2.5, borderColor: '#1B1F3B', alignItems: 'center', justifyContent: 'center' },
  roundsCellOn: { backgroundColor: Palette.sunshine, transform: [{ scale: 1.08 }] },
  roundsCellTxt: { fontSize: 16, fontWeight: '900', color: Palette.ink },
  roundsCellOnTxt: { color: '#1B1F3B' },
  discussSub: { color: Palette.muted, fontSize: 12, fontWeight: '700', marginBottom: 10 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  minBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 999, backgroundColor: Palette.soft, borderWidth: 3, borderColor: '#1B1F3B' },
  minBtnOn: { backgroundColor: Palette.sunshine, transform: [{ scale: 1.05 }] },
  minTxt: { fontSize: 17, fontWeight: '900', color: Palette.ink },
  minTxtOn: { color: '#1B1F3B' },
  stepBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: Palette.soft, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#1B1F3B' },
  stepTxt: { fontSize: 26, fontWeight: '900', color: Palette.ink },
  stepperNum: { fontSize: 26, fontWeight: '900', color: Palette.ink, minWidth: 40, textAlign: 'center' },
  footNote: { textAlign: 'center', marginTop: 14, color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.15)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
});
