import {
  GameConfig, GameState, Player, Question, MolePair, RoundState, ResultRow, MoleResult, TRUTH_KEY,
} from './types';
import { t } from '@/i18n';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
export const MIN_ROUNDS = 1;
export const MAX_ROUNDS = 20;

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Build the anonymous board: every guess + the truth, as shuffled letter
 * options. The order is stored on the round so the reveal board and every
 * voter's screen show the EXACT same A/B/C… layout.
 */
export function newRoundState(q: Question, players: Player[]): RoundState {
  const guessKeys = players.map((p) => p.id).filter((id) => true);
  const options = shuffle([...guessKeys, TRUTH_KEY]);
  return {
    question: q,
    guessOrder: shuffle(players.map((p) => p.id)),
    guesses: Object.fromEntries(players.map((p) => [p.id, null])),
    votes: Object.fromEntries(players.map((p) => [p.id, null])),
    optionOrder: options,
    revealed: false,
  };
}

/**
 * Mole-mode round: pick a random secret Mole from the players. The whole
 * group answers the base question; the Mole answers the related-but-
 * different mole question, so their number lands a little off.
 */
export function newMoleRoundState(pair: MolePair, players: Player[]): RoundState {
  const moleId = pick(players).id;
  return {
    question: pair.base,
    moleQuestion: pair.mole,
    moleId,
    guessOrder: shuffle(players.map((p) => p.id)),
    guesses: Object.fromEntries(players.map((p) => [p.id, null])),
    votes: Object.fromEntries(players.map((p) => [p.id, null])),
    moleVotes: Object.fromEntries(players.map((p) => [p.id, null])),
    optionOrder: shuffle(players.map((p) => p.id)),
    revealed: false,
  };
}

/** The question the player at `pid` must answer this round (mode-aware). */
export function questionFor(round: RoundState, pid: string): Question {
  const isMole = !!round.moleId && round.moleId === pid && round.moleQuestion;
  return isMole ? round.moleQuestion! : round.question;
}

export const optionLetter = (i: number) => String.fromCharCode(65 + i); // A, B, C…

export type GuessCheck =
  | { ok: true }
  | { ok: false; reason: 'exact' | 'duplicate' };

/**
 * Duplicate-answer validation (Finto-style):
 *  - 'exact'     : the guess EQUALS the real answer to the player's question
 *                  (the Mole answers the mole question, hunters the base one)
 *  - 'duplicate' : somebody who already submitted picked this same number
 * Both are rejected — the answer stays on the keypad and the UI shows a
 * "already submitted"-style popup.
 */
export function checkGuess(round: RoundState, pid: string, value: number): GuessCheck {
  const q = questionFor(round, pid);
  if (q.truth === value) return { ok: false, reason: 'exact' };
  for (const [otherId, g] of Object.entries(round.guesses)) {
    if (otherId !== pid && g != null && g === value) return { ok: false, reason: 'duplicate' };
  }
  return { ok: true };
}

/** Distance of a guess from truth, as a percent (used for the "biggest bluff" stat). */
export function distPct(g: number, truth: number): number {
  if (truth === 0) return g === 0 ? 0 : 100;
  return clamp((Math.abs(g - truth) / Math.abs(truth)) * 100, 0, 100);
}

// ---------------------------------------------------------------- WORDS mode
// Fibbage-style, objective-only: every question is a hard, funny trivia fact
// with ONE stored correct answer (truthText). That answer appears on the board
// as its own truth card — exactly like classic shows the true number. Players
// write a short answer (or the truth if they know it); the group votes for
// which written card is the real one.
// Scoring: +5 for voting the true card, +2 per person who voted YOUR card
// (the gaslighting bonus — same economy as classic).
export const WORDS_MAX_CHARS = 60;

/** Lenient text equality: case/punctuation/whitespace-insensitive. */
export function normText(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9à-öø-ÿ]+/g, '');
}

/** Words round state: options = every player's text card + the stored truth card. */
export function newWordsRoundState(q: Question, players: Player[]): RoundState {
  const options = shuffle([...players.map((p) => p.id), TRUTH_KEY]);
  return {
    question: q,
    guessOrder: shuffle(players.map((p) => p.id)),
    guesses: Object.fromEntries(players.map((p) => [p.id, null])),
    guessesText: Object.fromEntries(players.map((p) => [p.id, null])),
    votes: Object.fromEntries(players.map((p) => [p.id, null])),
    optionOrder: options,
    revealed: false,
  };
}

/** The option key that is the true answer in words mode (always the stored truth). */
export function wordsTruthKey(round: RoundState): string {
  return TRUTH_KEY;
}

/**
 * Words duplicate/truth guard (mirrors the numeric keypad popup):
 *  - 'exact'     : the written answer EQUALS the stored truth — rejected
 *                  (typing the obvious true answer is not a bluff; in a
 *                  Fibbage game the group votes for which card is real, so
 *                  there can only ever be ONE truth card on the board)
 *  - 'duplicate' : somebody already submitted the same answer
 */
export function checkWordsGuess(round: RoundState, pid: string, text: string): GuessCheck {
  const t = normText(text);
  if (!t) return { ok: false, reason: 'duplicate' };
  if (round.question.truthText && normText(round.question.truthText) === t) {
    return { ok: false, reason: 'exact' };
  }
  for (const [otherId, g] of Object.entries(round.guessesText ?? {})) {
    if (otherId !== pid && g != null && normText(g) === t) return { ok: false, reason: 'duplicate' };
  }
  return { ok: true };
}

/**
 * Words-mode round scoring (Fibbage, same point economy as classic):
 *  - every voter who picked the TRUE card: +5
 *  - every player: +2 per person who voted THEIR card (gaslit by you)
 */
export function scoreWordsRound(round: RoundState, players: Player[]): RoundScore {
  const truthKey = wordsTruthKey(round);
  const texts = round.guessesText ?? {};

  const fooled: Record<string, string[]> = {};
  for (const p of players) (fooled[p.id] = []);
  for (const [voter, target] of Object.entries(round.votes)) {
    if (target && target !== TRUTH_KEY && target !== voter && target in fooled) fooled[target].push(voter);
  }

  const rows: ResultRow[] = players.map((p) => {
    const g = texts[p.id];
    const f = g != null ? fooled[p.id].length : 0;
    const votedTruth = round.votes[p.id] === truthKey;
    const parts: string[] = [];
    let pts = 0;
    if (votedTruth) {
      pts += 5;
      parts.push(t('pt_truth_vote'));
    }
    if (f > 0) {
      pts += 2 * f;
      parts.push(t('pt_fooled', { a: 2 * f, b: f }));
    }
    if (parts.length === 0) parts.push(t('pt_none'));
    return {
      playerId: p.id,
      guess: null,
      fooled: f > 0 ? [...fooled[p.id]] : [],
      distPct: 0,
      pts,
      parts,
    };
  });

  // best "liar": non-truth player card that fooled the most people
  let bestLiarId: string | null = null;
  let bestLiarVotes = 0;
  for (const p of players) {
    if (p.id === truthKey) continue;
    const v = fooled[p.id].length;
    if (v > bestLiarVotes) { bestLiarVotes = v; bestLiarId = p.id; }
  }

  const awards: Record<string, number> = {};
  rows.forEach((r) => (awards[r.playerId] = r.pts));

  return {
    awards,
    rows,
    closestIds: [], // words: no numeric closeness
    exactIds: [],
    bestLiarId,
    biggestBluffId: bestLiarId,
  };
}

export interface RoundScore {
  awards: Record<string, number>;
  rows: ResultRow[];
  closestIds: string[];     // tied for closest to truth (everyone gets credit)
  exactIds: string[];       // everyone who nailed it exactly
  bestLiarId: string | null;   // non-truth card with the most votes
  biggestBluffId: string | null; // furthest off truth, yet fooled ≥1 person
}

/**
 * Round scoring:
 *  - nailed it exactly: +25
 *  - every voter who picked YOUR card (gaslit by you): +2 each
 *  - "closest" gets a badge, no points. No distance multiplier.
 */
export function scoreRound(round: RoundState, players: Player[]): RoundScore {
  const truth = round.question.truth ?? 0;
  const withGuess = players
    .map((p) => ({ id: p.id, g: round.guesses[p.id] as number | null }))
    .filter((x): x is { id: string; g: number } => x.g != null);

  // who picked whose card (a self-vote can never count as fooling yourself)
  const fooled: Record<string, string[]> = {};
  for (const p of players) (fooled[p.id] = []);
  for (const [voter, target] of Object.entries(round.votes)) {
    if (target && target !== TRUTH_KEY && target !== voter && target in fooled) fooled[target].push(voter);
  }

  // closest + exact — tracked for the result screen (display), ties count for all
  let closestIds: string[] = [];
  let exactIds: string[] = [];
  if (withGuess.length > 0) {
    const sorted = [...withGuess].sort((a, b) => Math.abs(a.g - truth) - Math.abs(b.g - truth));
    const bestDist = Math.abs(sorted[0].g - truth);
    closestIds = sorted.filter((x) => Math.abs(x.g - truth) === bestDist).map((x) => x.id);
    if (bestDist === 0) exactIds = sorted.filter((x) => x.g === truth).map((x) => x.id);
  }

  const rows: ResultRow[] = players.map((p) => {
    const g = round.guesses[p.id];
    const d = g != null ? distPct(g, truth) : 100;
    const f = g != null ? fooled[p.id].length : 0;
    const parts: string[] = [];
    let pts = 0;
    if (g != null) {
      if (exactIds.includes(p.id)) {
        pts += 25;
        parts.push(t('pt_exact'));
      }
      if (f > 0) {
        pts += 2 * f;
        parts.push(t('pt_fooled', { a: 2 * f, b: f }));
      }
      if (parts.length === 0) parts.push(t('pt_none'));
    } else {
      parts.push(t('no_guess'));
    }
    return {
      playerId: p.id,
      guess: g ?? null,
      fooled: f > 0 ? [...fooled[p.id]] : [],
      distPct: Math.round(d),
      pts,
      parts,
    };
  });

  // best liar: player card that got the most votes
  let bestLiarId: string | null = null;
  let bestLiarVotes = 0;
  for (const p of players) {
    const g = round.guesses[p.id];
    if (g == null) continue;
    const v = fooled[p.id].length;
    if (v > bestLiarVotes) {
      bestLiarVotes = v;
      bestLiarId = p.id;
    }
  }

  // biggest bluff: furthest from truth, but fooled at least one person
  let biggestBluffId: string | null = null;
  let bluffD = -1;
  for (const p of players) {
    const g = round.guesses[p.id];
    if (g == null || fooled[p.id].length < 1) continue;
    const d = distPct(g, truth);
    if (d > bluffD) {
      bluffD = d;
      biggestBluffId = p.id;
    }
  }

  const awards: Record<string, number> = {};
  rows.forEach((r) => (awards[r.playerId] = r.pts));

  return { awards, rows, closestIds, exactIds, bestLiarId, biggestBluffId };
}

export const MOLE_PTS_PER_FOOL = 6;  // Mole: points per hunter they convinced (accused the wrong person)
export const HUNTER_PTS_CATCH = 5;   // each hunter who named the real Mole, individually

/**
 * Mole-mode scoring (PER-PERSON, no majority vote):
 *  - Every hunter's accusation is scored on its own merit:
 *    named the real Mole -> +HUNTER_PTS_CATCH for THAT hunter.
 *  - The Mole earns +MOLE_PTS_PER_FOOL for every hunter they convinced
 *    (i.e. every hunter whose accusation landed on the wrong person).
 *
 * Why 6 vs 5: the Mole answers a DIFFERENT question (plays blind), so the
 * mole side carries a small edge. Expected points per round at hunter
 * accuracy q (independent votes): mole = 6·H·(1-q), hunters = 5·H·q —
 * they balance at q = 54.5%, and a perfect round is 30 vs 5×H, matching
 * the old binary 30/15 system's point scale.
 */
export function scoreMoleRound(round: RoundState, players: Player[]): MoleResult {
  const moleId = round.moleId!;
  const hunters = players.filter((p) => p.id !== moleId);

  // each hunter is judged on their OWN vote (self-accusations are impossible
  // in the UI; missing votes / timeouts count as the Mole fooling them)
  const correctHunterIds = hunters
    .filter((h) => (round.moleVotes?.[h.id] ?? null) === moleId)
    .map((h) => h.id);
  const moleFoolCount = hunters.length - correctHunterIds.length;

  return {
    moleId,
    moleFoolCount,
    correctHunterIds,
    ptsMole: MOLE_PTS_PER_FOOL * moleFoolCount,
    ptsHunter: HUNTER_PTS_CATCH,
  };
}

export function makeGame(players: Player[], config: GameConfig, deck: Question[], moleDeck: MolePair[]): GameState {
  const isMole = config.mode === 'mole';
  const isWords = config.mode === 'words';
  const round = isMole
    ? newMoleRoundState(moleDeck[0], players)
    : isWords
      ? newWordsRoundState(deck[0], players)
      : newRoundState(deck[0], players);
  return {
    phase: 'reading',
    players,
    config,
    deck: [...deck],
    moleDeck: [...moleDeck],
    roundIndex: 0,
    round,
    cursor: 0,
    handoffKind: 'guess',
    timerEndsAt: null,
  };
}
