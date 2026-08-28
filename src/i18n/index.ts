// i18n runtime: app-language + question-language, EN/DE/NL.
// Small reactive store (no deps) — screens subscribe via useAppLang/useQLang,
// and translate UI strings with t() / tq().
import { useSyncExternalStore } from 'react';
import en from './strings-en';
import de from './strings-de';
import nl from './strings-nl';

export type Lang = 'en' | 'de' | 'nl';
export type Strings = Record<string, string>;

export const LANGS: { id: Lang; flag: string; label: string }[] = [
  { id: 'en', flag: '🇬🇧', label: 'English' },
  { id: 'de', flag: '🇩🇪', label: 'Deutsch' },
  { id: 'nl', flag: '🇳🇱', label: 'Nederlands' },
];

const DICTS: Record<Lang, Strings> = { en, de, nl };

const LS_APP = 'bluff_app_lang';
const LS_Q = 'bluff_q_lang';

function load(): Lang {
  try {
    const raw =
      typeof localStorage !== 'undefined' ? localStorage.getItem(LS_APP) : null;
    if (raw === 'en' || raw === 'de' || raw === 'nl') return raw;
  } catch {}
  return 'en';
}

function loadQ(): Lang {
  try {
    const raw =
      typeof localStorage !== 'undefined' ? localStorage.getItem(LS_Q) : null;
    if (raw === 'en' || raw === 'de' || raw === 'nl') return raw;
  } catch {}
  return 'en';
}

let appLang: Lang = load();
let qLang: Lang = loadQ();
const subs = new Set<() => void>();

function emit() {
  subs.forEach((f) => f());
}

function subscribe(f: () => void) {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
}

export function getAppLang(): Lang {
  return appLang;
}
export function getQLang(): Lang {
  return qLang;
}

export function setAppLang(l: Lang) {
  appLang = l;
  try {
    localStorage.setItem(LS_APP, l);
  } catch {}
  emit();
}

export function setQLang(l: Lang) {
  qLang = l;
  try {
    localStorage.setItem(LS_Q, l);
  } catch {}
  emit();
}

export function useAppLang(): Lang {
  return useSyncExternalStore(subscribe, () => appLang, () => appLang);
}
export function useQLang(): Lang {
  return useSyncExternalStore(subscribe, () => qLang, () => qLang);
}

function fill(s: string, vars?: Record<string, string | number> | string | number): string {
  if (vars == null) return s;
  const v: Record<string, string | number> =
    typeof vars === 'object' ? vars : { 0: vars };
  for (const [k, val] of Object.entries(v)) {
    s = s.split(`{${k}}`).join(String(val));
  }
  return s;
}

/** Translate a UI string using the current APP language (falls back to EN, then key). */
export function t(key: string, vars?: Record<string, string | number> | string | number): string {
  const s = DICTS[appLang][key] ?? DICTS.en[key] ?? key;
  return fill(s, vars);
}

/** Translate using the current QUESTION language (for in-game question text). */
export function tq(key: string, vars?: Record<string, string | number> | string | number): string {
  const s = DICTS[qLang][key] ?? DICTS.en[key] ?? key;
  return fill(s, vars);
}
