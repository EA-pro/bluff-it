import { Question, MolePair, CategoryId } from '../types';
import { QUESTIONS } from './questions';
import { MOLE } from './mole';
import { CLASSIC_DE, CLASSIC_NL, MOLE_DE, MOLE_NL, DeckTrans } from './translations';
import { buildWordsDeck, WORDS_CATEGORIES, WordsCategory, WordsPrompt } from './words';
import type { Lang } from '@/i18n';

export { buildWordsDeck, WORDS_CATEGORIES };
export type { WordsCategory, WordsPrompt };

/** Question categories and their free/paid status (the Setup picker). */
export const CATEGORIES: { id: CategoryId; free: boolean }[] = [
  { id: 'general', free: true },
  { id: 'funny', free: true },
  { id: 'sexy', free: false },
  { id: 'geo', free: false },
  { id: 'animals', free: false },
];

/** Free-tier categories (no premium needed). */
export const FREE_CATEGORIES: CategoryId[] = CATEGORIES.filter((c) => c.free).map((c) => c.id);

function applyTrans(q: Question, trans: DeckTrans | undefined): Question {
  const tr = trans?.[q.id];
  if (!tr) return q;
  return {
    ...q,
    text: tr.t,
    unit: tr.u ?? q.unit,
    hint: tr.h ?? q.hint,
  };
}

function localizeClassic(qs: Question[], lang: Lang): Question[] {
  if (lang === 'de') return qs.map((q) => applyTrans(q, CLASSIC_DE));
  if (lang === 'nl') return qs.map((q) => applyTrans(q, CLASSIC_NL));
  return qs;
}

function localizeMole(pairs: MolePair[], lang: Lang): MolePair[] {
  const de = lang === 'de', nl = lang === 'nl';
  if (!de && !nl) return pairs;
  return pairs.map((p) => ({
    id: p.id,
    base: applyTrans(p.base, de ? MOLE_DE : MOLE_NL),
    mole: applyTrans(p.mole, de ? MOLE_DE : MOLE_NL),
  }));
}

/**
 * Classic-mode deck: every question in the selected categories, in the
 * requested question language (EN/DE/NL). `cats` defaults to all free
 * categories. Order is shuffled by the caller (the store shuffles it).
 */
export function buildClassicDeck(cats: CategoryId[] = FREE_CATEGORIES, lang: Lang = 'en'): Question[] {
  const wanted = new Set(cats.length ? cats : FREE_CATEGORIES);
  return localizeClassic(
    QUESTIONS.filter((q) => wanted.has(q.cat ?? 'general')),
    lang,
  );
}

/**
 * Mole-mode deck: the base/mole PAIRS, in the requested question language.
 * Pairs are topic-agnostic (every pair plays in any category mix) so the
 * same 20 pairs serve all category selections.
 */
export function buildMoleDeck(lang: Lang = 'en'): MolePair[] {
  return localizeMole(MOLE, lang);
}

// Back-compat: the old DECK export (EN classic deck).
export const DECK: Question[] = buildClassicDeck();

/** WordsPrompt -> Question (the store/engine operate on Questions). */
export function wordsPromptToQuestion(p: WordsPrompt): Question {
  return { id: p.id, type: 'numeric', text: p.text, truth: 0, truthText: p.truthText, cat: p.cat };
}
