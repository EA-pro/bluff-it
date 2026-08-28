import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LANGS, useAppLang, useQLang, setAppLang, setQLang, t } from '@/i18n';
import { Palette, Radius, Shadow, Gradients } from '@/constants/theme';
import { play } from '@/game/sound';

type LangRow = (typeof LANGS)[number];

/**
 * Settings sheet: APP language (all UI) + QUESTION language (the questions
 * in-game). Both are independent and persist in localStorage.
 */
export default function SettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const appLang = useAppLang();
  const qLang = useQLang();

  const LangPills = ({ value, onPick, accent }: { value: string; onPick: (l: string) => void; accent: string }) => (
    <View style={styles.langRow}>
      {LANGS.map((l: LangRow) => {
        const on = value === l.id;
        return (
          <Pressable
            key={l.id}
            onPress={() => {
              onPick(l.id);
              play(on ? 'tick' : 'pop');
            }}
            style={[styles.langPill, on && { backgroundColor: accent, borderColor: Palette.ink }]}
          >
            <Text style={{ fontSize: 22, marginRight: 6 }}>{l.flag}</Text>
            <Text style={[styles.langTxt, on && { color: '#1B1F3B' }]}>{l.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <LinearGradient colors={Gradients.onboarding} style={styles.root}>
        <View style={styles.backdrop} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{t('set_title')}</Text>

          <View style={styles.section}>
            <Text style={styles.secLabel}>{t('set_app_lang')}</Text>
            <Text style={styles.secSub}>{t('set_app_lang_sub')}</Text>
            <LangPills value={appLang} onPick={(l) => setAppLang(l as 'en' | 'de' | 'nl')} accent="#38BDF8" />
          </View>

          <View style={styles.section}>
            <Text style={styles.secLabel}>{t('set_q_lang')}</Text>
            <Text style={styles.secSub}>{t('set_q_lang_sub')}</Text>
            <LangPills value={qLang} onPick={(l) => setQLang(l as 'en' | 'de' | 'nl')} accent="#FF8A3D" />
          </View>

          <Pressable style={styles.close} onPress={onClose} hitSlop={10}>
            <Text style={styles.closeTxt}>{t('set_close')}</Text>
          </Pressable>
        </View>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(10,12,24,0.6)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    borderWidth: 4,
    borderColor: '#1B1F3B',
    borderBottomWidth: 0,
    padding: 24,
    paddingBottom: 40,
    ...Shadow.pop,
  },
  handle: { alignSelf: 'center', width: 64, height: 8, borderRadius: 4, backgroundColor: 'rgba(27,31,59,0.2)', marginBottom: 18 },
  title: { fontSize: 24, fontWeight: '900', color: '#1B1F3B', marginBottom: 22 },
  section: { marginBottom: 24 },
  secLabel: { fontSize: 16, fontWeight: '900', color: '#1B1F3B', textTransform: 'uppercase', letterSpacing: 1 },
  secSub: { fontSize: 12, fontWeight: '700', color: Palette.muted, marginTop: 4, marginBottom: 12 },
  langRow: { flexDirection: 'row', gap: 10 },
  langPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 3,
    borderColor: 'rgba(27,31,59,0.25)',
    backgroundColor: '#fff',
  },
  langTxt: { fontSize: 14, fontWeight: '800', color: Palette.ink },
  close: {
    marginTop: 6,
    backgroundColor: '#1B1F3B',
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#1B1F3B',
  },
  closeTxt: { color: '#fff', fontSize: 17, fontWeight: '900' },
});
