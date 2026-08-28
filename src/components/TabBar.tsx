import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useWallet } from '@/game/wallet';
import { t } from '@/i18n';

/**
 * Clash-Royale-style bottom tab bar.
 * Three tabs, the center one (Home) is elevated in a raised circle.
 * Order:  🛒 Shop · (🏠 HOME) · 👤 Profile
 * (Game history now lives inside the Profile page.)
 */
export type TabId = 'shop' | 'home' | 'profile';

const TABS: { id: TabId; icon: string; center?: boolean }[] = [
  { id: 'shop', icon: '🛒' },
  { id: 'home', icon: '🏠', center: true },
  { id: 'profile', icon: '👤' },
];

export default function TabBar({ tab, onTab }: { tab: TabId; onTab: (t: TabId) => void }) {
  const wallet = useWallet();
  return (
    <View style={styles.bar}>
      {TABS.map((tb) => {
        const active = tab === tb.id;
        if (tb.center) {
          return (
            <Pressable key={tb.id} onPress={() => onTab(tb.id)} style={[styles.centerWrap]} hitSlop={8}>
              <View style={[styles.centerBtn, active && styles.centerBtnActive]}>
                <Text style={styles.centerIcon}>{tb.icon}</Text>
                <Text style={[styles.centerLabel, active && styles.centerLabelActive]}>{t('tab_home')}</Text>
              </View>
            </Pressable>
          );
        }
        return (
          <Pressable key={tb.id} style={[styles.tab, active && styles.tabActive]} onPress={() => onTab(tb.id)}>
            <Text style={[styles.icon, active && styles.iconActive]}>{tb.icon}</Text>
            <Text style={[styles.label, active && styles.labelActive]}>{t(`tab_${tb.id}`)}</Text>
          </Pressable>
        );
      })}
      {/* live coin pill — tappable, jumps to the shop */}
      <Pressable style={styles.coinPill} onPress={() => onTab('shop')} hitSlop={8}>
        <Text style={styles.coinIcon}>🪙</Text>
        <Text style={styles.coinTxt}>{wallet.coins.toLocaleString('en-US')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(27,31,59,0.92)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 3,
    borderTopColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 8,
    paddingBottom: 14,
    zIndex: 50,
  },
  tab: { alignItems: 'center', justifyContent: 'flex-end', gap: 2, width: 64, opacity: 0.62 },
  tabActive: { opacity: 1 },
  icon: { fontSize: 24 },
  iconActive: { fontSize: 26, transform: [{ translateY: -2 }] },
  label: { fontSize: 9.5, fontWeight: '800', color: '#fff', letterSpacing: 0.4 },
  labelActive: { color: '#FFD84D' },
  centerWrap: { alignItems: 'center', justifyContent: 'flex-end' },
  centerBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1B1F3B',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -34,
    borderWidth: 4,
    borderColor: '#FFD84D',
    shadowColor: '#1B1F3B',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  centerBtnActive: { backgroundColor: '#FFD84D' },
  centerIcon: { fontSize: 28 },
  centerLabel: { fontSize: 9.5, fontWeight: '900', color: '#FFD84D', marginTop: 3, letterSpacing: 0.5 },
  centerLabelActive: { color: '#1B1F3B' },
  coinPill: {
    position: 'absolute',
    top: -16,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFD84D',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 3,
    borderColor: '#1B1F3B',
  },
  coinIcon: { fontSize: 13 },
  coinTxt: { fontSize: 13, fontWeight: '900', color: '#1B1F3B' },
});
