import { GameConfig, GameState, Player, DEFAULT_CONFIG, TRUTH_KEY } from './types';
import { makeGame, newRoundState, newMoleRoundState, scoreRound, scoreMoleRound, shuffle, checkGuess } from './engine';
import { buildClassicDeck, buildMoleDeck, FREE_CATEGORIES } from './deck';
import { getQLang, t } from '@/i18n';
import { play, setMusic } from './sound';
import type { MusicTrack } from './sound';
import { registerMolePlay, isPremium, isAdmin } from './premium';
import { recordGame, consumeCategoryPasses } from './wallet';

export type Listener = () => void;

const freshState = (): GameState => ({
  phase: 'home',
  players: [],
  config: DEFAULT_CONFIG,
  deck: [],
  moleDeck: [],
  roundIndex: 0,
  round: null,
  cursor: 0,
  handoffKind: 'guess',
  timerEndsAt: null,
});

let state: GameState = freshState();
let listeners = new Set<Listener>();
let lastScores: Record<string, number> = {};
let lastEvent: string | null = null;

// background music follows the game phase (one loop per phase)
function trackFor(s: GameState): MusicTrack {
  switch (s.phase) {
    case 'home':
    case 'setup':
      return 'home';
    case 'reading':
    case 'guess':
      return 'guess';
    case 'handoff':
      return s.handoffKind === 'guess' ? 'guess' : 'vote';
    case 'reveal':
      return 'reveal';
    case 'vote':
    case 'molevote':
    case 'anticipation':
      return 'vote';
    case 'result':
    case 'end':
      return null;
    default:
      return 'home';
  }
}

function emit() {
  setMusic(trackFor(state));
  listeners.forEach((l) => l());
}

export const store = {
  subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; },
  getState: () => state,
  setState(patch: Partial<GameState>) { state = { ...state, ...patch }; emit(); },
};

export function lastScoresMap() { return lastScores; }
export function lastEventName() { return lastEvent; }

function setEvent(e: string | null) { lastEvent = e; }

// ---------- player management (setup phase) ----------

export function addPlayer(name: string, avatarId: string, team: number) {
  if (state.players.length >= 6) return;
  const id = 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1000);
  const p: Player = { id, name, avatarId, team, score: 0, bluffWins: 0, callWins: 0, biggestBluff: 0, fooledTotal: 0, moleWins: 0, huntWins: 0, moleFooledTotal: 0, wordWins: 0, tasteWins: 0 };
  state = { ...state, players: [...state.players, p] };
  play('pop');
  emit();
}

export function removePlayer(id: string) {
  state = { ...state, players: state.players.filter((p) => p.id !== id) };
  play('tick');
  emit();
}

export function updatePlayer(id: string, patch: Partial<Player>) {
  state = { ...state, players: state.players.map((p) => (p.id === id ? { ...p, ...patch } : p)) };
  emit();
}

export function setConfig(patch: Partial<GameConfig>) {
  state = { ...state, config: { ...state.config, ...patch } };
  emit();
}

export function resetAll() {
  state = freshState();
  lastScores = {};
  setEvent(null);
  emit();
}

export function goHome() {
  state = { ...state, phase: 'home' };
  emit();
}

export function goSetup() {
  state = { ...state, phase: 'setup' };
  play('pop');
  emit();
}

// ---------- game flow ----------

function isProNow(): boolean {
  return isPremium() || isAdmin();
}

export function startGame() {
  const isMole = state.config.mode === 'mole';
  const qLang = getQLang();
  // paid categories covered by gacha passes: the Setup picker already gates
  // on (premium || owned || pass), so anything left here is playable.
  consumeCategoryPasses(state.config.categories, FREE_CATEGORIES, isProNow());
  if (isMole) {
    // free tier: one Mole game per day (the Home screen blocks the start when
    // used up; premium/admin never hit this). Register the play now.
    registerMolePlay();
    // localize the pair deck in the question language; shuffle ONCE; the base
    // deck = the base questions of the same pairs, so moleDeck[i] pairs round i.
    const all = buildMoleDeck(qLang);
    const pairs = shuffle(all).slice(0, Math.min(state.config.rounds, all.length));
    state = makeGame(state.players, state.config, pairs.map((p) => p.base), pairs);
    state.timerEndsAt = Date.now() + state.config.readSeconds * 1000;
    play('slide');
    emit();
    return;
  }
  const all = buildClassicDeck(state.config.categories, qLang);
  const deck = shuffle(all).slice(0, Math.min(state.config.rounds, all.length));
  state = makeGame(state.players, state.config, deck, []);
  state.deck = deck;
  state.timerEndsAt = Date.now() + state.config.readSeconds * 1000;
  play('slide');
  emit();
}

function recordHistory() {
  try {
    const scores = state.players.map((p) => ({ name: p.name, avatarId: p.avatarId, score: p.score }));
    const sorted = [...scores].sort((a, b) => b.score - a.score);
    const top = sorted[0];
    // TIES: the winner badge names EVERYONE who shares the top score.
    const winners = top ? sorted.filter((s) => s.score === top.score) : [];
    const badges: { emoji: string; label: string; name: string }[] = [];
    if (top && top.score > 0) badges.push({ emoji: '🏆', label: t('badge_winner'), name: winners.map((w) => w.name).join(' + ') });
    const bf = state.players.reduce((best, p) => (p.bluffWins > (best?.bluffWins ?? 0) ? p : best), null as null | typeof state.players[number]);
    if (bf && bf.bluffWins > 0) badges.push({ emoji: '🎯', label: t('badge_bluffer'), name: bf.name });
    const bw = state.players.reduce((best, p) => (p.moleWins > (best?.moleWins ?? 0) ? p : best), null as null | typeof state.players[number]);
    if (bw && bw.moleWins > 0) badges.push({ emoji: '🦠', label: t('badge_mole'), name: bw.name });
    recordGame(state.config.mode, state.deck.length, state.config.categories, scores, badges);
  } catch {
    /* history is cosmetic — never block the game */
  }
}

function nextRoundOrEnd() {
  if (state.roundIndex + 1 >= state.deck.length) {
    recordHistory();
    state = { ...state, phase: 'end', round: null, timerEndsAt: null, cursor: 0, result: undefined };
    play('win');
  } else {
    const ni = state.roundIndex + 1;
    const isMole = state.config.mode === 'mole';
    const round = isMole
      ? newMoleRoundState(state.moleDeck[ni], state.players)
      : newRoundState(state.deck[ni], state.players);
    state = {
      ...state,
      roundIndex: ni,
      round,
      phase: 'reading',
      cursor: 0,
      handoffKind: 'guess',
      timerEndsAt: Date.now() + state.config.readSeconds * 1000,
      result: undefined,
    };
    play('slide');
  }
  setEvent(null);
  emit();
}

export function readingDone() {
  if (!state.round) return;
  // every question is open-ended numeric: hand the phone to the first guesser
  state = {
    ...state,
    phase: 'handoff',
    cursor: 0,
    handoffKind: 'guess',
    timerEndsAt: null,
  };
  play('pop');
  emit();
}

export function handoffDone() {
  if (state.phase !== 'handoff') return;
  const kind = state.handoffKind;
  const secs =
    kind === 'guess' ? state.config.guessSeconds
    : state.config.voteSeconds; // vote + molevote share the per-turn limit
  state = {
    ...state,
    phase: kind,
    timerEndsAt: Date.now() + secs * 1000,
  };
  play(kind === 'guess' ? 'pop' : 'tick');
  emit();
}

/** Player at cursor submits a numeric guess (or null on timeout). */
export function submitGuess(value: number | null) {
  if (!state.round) return;
  const pid = state.players[state.cursor]?.id;
  if (!pid) return;
  // server-side duplicate guard: the Guess screen already blocks these, but if
  // one slips through (e.g. stale state) treat it as a pass instead of
  // recording an invalid number.
  const v = value != null && !checkGuess(state.round, pid, value).ok ? null : value;
  const guesses = { ...state.round.guesses, [pid]: v };
  const isMole = state.config.mode === 'mole';
  const nextCursor = state.cursor + 1;
  if (nextCursor >= state.players.length) {
    // everyone guessed -> shared anonymous board (all guesses, or +truth in classic)
    state = {
      ...state,
      round: { ...state.round, guesses, revealed: true },
      phase: 'reveal',
      cursor: 0,
      handoffKind: isMole ? 'molevote' : 'vote',
      timerEndsAt: Date.now() + state.config.discussMinutes * 60 * 1000,
    };
    play('reveal');
  } else {
    // handoff to the next guesser
    state = {
      ...state,
      round: { ...state.round, guesses },
      phase: 'handoff',
      cursor: nextCursor,
      handoffKind: 'guess',
      timerEndsAt: null,
    };
    play('tick');
  }
  emit();
}

/** Discussion timer ended or "to the votes" tapped -> first voter. */
export function revealDone() {
  const isMole = state.config.mode === 'mole';
  // mole mode: the hunt goes to EVERYONE in order — including the Mole,
  // so nobody can tell who skipped a turn. The Mole's accusation still
  // doesn't count (scoreMoleRound only tallies the hunters).
  state = {
    ...state,
    phase: 'handoff',
    cursor: 0,
    handoffKind: isMole ? 'molevote' : 'vote',
    timerEndsAt: null,
  };
  play('pop');
  emit();
}

/**
 * Player at cursor votes for an option key (a player id or 'truth').
 * `target = null` means the 10s limit ran out — they guessed wrong by default.
 */
export function submitVote(target: string | null) {
  if (!state.round) return;
  const pid = state.players[state.cursor]?.id;
  if (!pid) return;
  const votes = { ...state.round.votes, [pid]: target };
  const nextCursor = state.cursor + 1;
  if (nextCursor >= state.players.length) {
    // everyone voted -> the anticipation screen, then the verdict
    state = {
      ...state,
      round: { ...state.round, votes },
      phase: 'anticipation',
      cursor: 0,
      timerEndsAt: Date.now() + 4500,
    };
    play('tick');
  } else {
    // handoff to the next voter
    state = {
      ...state,
      round: { ...state.round, votes },
      phase: 'handoff',
      cursor: nextCursor,
      handoffKind: 'vote',
      timerEndsAt: null,
    };
    play('tick');
  }
  emit();
}

/**
 * Mole mode: the player at cursor accuses who they think is the Mole.
 * Everyone votes — including the Mole (so the Mole never skips a turn and
 * gives themselves away). The Mole's accusation is recorded but ignored
 * by scoreMoleRound, which only tallies the hunters. `target = null`
 * means the 10s limit ran out (a "no idea" — no accusation counted).
 */
export function submitMoleVote(target: string | null) {
  if (!state.round) return;
  const pid = state.players[state.cursor]?.id;
  if (!pid) return;
  const moleVotes = { ...state.round.moleVotes, [pid]: target };
  const nextCursor = state.cursor + 1;
  if (nextCursor >= state.players.length) {
    state = {
      ...state,
      round: { ...state.round, moleVotes },
      phase: 'anticipation',
      cursor: 0,
      timerEndsAt: Date.now() + 4500,
    };
    play('tick');
  } else {
    state = {
      ...state,
      round: { ...state.round, moleVotes },
      phase: 'handoff',
      cursor: nextCursor,
      handoffKind: 'molevote',
      timerEndsAt: null,
    };
    play('tick');
  }
  emit();
}

/** Countdown finished on the anticipation screen -> show the verdict. */
export function anticipationDone() {
  finishRound();
}

function finishRound() {
  const round = state.round!;
  const isMole = state.config.mode === 'mole';

  if (isMole) {
    const mres = scoreMoleRound(round, state.players);
    const players = state.players.map((p) => {
      let { moleWins, huntWins, moleFooledTotal, score } = p;
      if (p.id === mres.moleId) {
        // Mole: +6 per hunter they convinced
        moleFooledTotal += mres.moleFoolCount;
        score += mres.ptsMole;
        if (mres.moleFoolCount > 0) moleWins++;
      } else if (mres.correctHunterIds.includes(p.id)) {
        // Hunter: +5 for their OWN correct accusation (individual merit)
        huntWins++;
        score += mres.ptsHunter;
      }
      return { ...p, moleWins, huntWins, moleFooledTotal, score };
    });

    lastScores = Object.fromEntries(
      players.map((p) => {
        if (p.id === mres.moleId) return [p.id, mres.ptsMole];
        if (mres.correctHunterIds.includes(p.id)) return [p.id, mres.ptsHunter];
        return [p.id, 0];
      })
    );
    // drama: the Mole celebrated when they fooled at least one hunter
    setEvent(mres.ptsMole > 0 ? 'winner' : null);

    state = {
      ...state,
      players,
      phase: 'result',
      timerEndsAt: Date.now() + 9999 * 1000, // no auto-advance; user taps
      round: { ...round, revealed: true }, // the Mole is revealed anyway
      result: {
        truth: round.question.truth,
        unit: round.question.unit,
        closestIds: [],
        exactIds: [],
        bestLiarId: null,
        biggestBluffId: null,
        rows: [],
        mole: mres,
      },
    };
    play(mres.ptsMole > 0 ? 'win' : 'oops');
    emit();
    return;
  }

  const res = scoreRound(round, state.players);
  const truth = round.question.truth ?? 0;
  const truthStr = Math.abs(truth).toLocaleString('en-US');

  const players = state.players.map((p) => {
    const row = res.rows.find((r) => r.playerId === p.id)!;
    let { bluffWins, callWins, biggestBluff } = p;
    if (res.closestIds.includes(p.id)) bluffWins++;
    if (round.votes[p.id] === TRUTH_KEY) callWins++;
    if (row.guess != null && truthStr !== '0') {
      if (row.distPct > biggestBluff) biggestBluff = row.distPct;
    }
    return {
      ...p,
      score: p.score + row.pts,
      bluffWins,
      callWins,
      biggestBluff,
      fooledTotal: p.fooledTotal + row.fooled.length,
    };
  });

  lastScores = res.awards;
  setEvent(res.closestIds.length > 0 ? 'winner' : null);

  state = {
    ...state,
    players,
    phase: 'result',
    timerEndsAt: Date.now() + 9999 * 1000, // no auto-advance; user taps
    round: { ...round, revealed: true },
    result: {
      truth,
      unit: round.question.unit,
      closestIds: res.closestIds,
      exactIds: res.exactIds,
      bestLiarId: res.bestLiarId,
      biggestBluffId: res.biggestBluffId,
      rows: res.rows,
    },
  };
  play(res.closestIds.length > 0 ? 'win' : 'oops');
  emit();
}

export function resultContinue() {
  nextRoundOrEnd();
}
