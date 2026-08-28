export type Phase =
  | 'home'
  | 'setup'      // players + settings
  | 'reading'    // question read aloud (classic) / round rules (mole)
  | 'handoff'    // "hand the phone to X" interstitial before a relay turn
  | 'guess'      // relay: one player types a secret number
  | 'reveal'     // all guesses shown (anonymous or named) + discussion
  | 'vote'       // relay (classic): each player taps the answer they think is true
  | 'molevote'   // relay (mole): each player accuses who they think is the Mole
  | 'anticipation' // "the answer shows up soon…" + big 3-2-1 countdown
  | 'result'     // answer revealed dramatically + points
  | 'end';       // podium + share card

/** The three game modes, picked on the home screen. */
export type GameMode = 'classic' | 'mole' | 'words';

/** What the next relay turn will be, shown on the handoff screen. */
export type HandoffKind = 'guess' | 'vote' | 'molevote';

export interface Avatar {
  id: string;
  emoji: string;
  face: string;
  shirt: string;
  accent: string;
}

export interface Player {
  id: string;
  name: string;
  avatarId: string;
  team: number;
  score: number;
  bluffWins: number;    // rounds: closest to truth
  callWins: number;     // rounds: picked the truth card in the vote
  biggestBluff: number; // biggest % off truth they claimed (fun stat)
  fooledTotal: number;  // lifetime: how many people they've gaslit into picking their number
  moleWins: number;     // mole mode: rounds as the Mole where you fooled ≥1 hunter
  huntWins: number;     // mole mode: times you correctly accused the Mole
  moleFooledTotal: number; // lifetime: hunters you (as Mole) convinced
  wordWins: number;     // words mode: answers crowned "funniest"
  tasteWins: number;    // words mode: times your vote landed on the crowned answer
}

export type QuestionType = 'numeric';

/** Question categories. Free: general + funny. Paid (premium): sexy, geo, animals. */
export type CategoryId = 'general' | 'funny' | 'sexy' | 'geo' | 'animals';

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  hint?: string;
  // numeric: the real answer players are estimating
  truth: number;
  unit?: string;
  // words mode: the real (short written) answer, hidden as a board card
  truthText?: string;
  // words mode: personal = the target player's answer IS the truth; trivia = stored truthText
  kind?: 'personal' | 'trivia';
  // which category pack this question belongs to (drives the free/paid picker)
  cat?: CategoryId;
}

/**
 * A mole-mode round: the whole group answers `base`; one secret player (the
 * Mole) answers the related-but-different `mole` instead, so their number
 * lands a little off. The reveal hides who saw which — then the hunters
 * vote on who the Mole is.
 */
export interface MolePair {
  id: string;
  base: Question;
  mole: Question;
}

/**
 * An option on the anonymous reveal board.
 * key = the player's id for a player guess, or the literal 'truth'.
 */
export const TRUTH_KEY = 'truth';

export interface RoundState {
  question: Question;              // base question (classic / shown to hunters in mole)
  moleQuestion?: Question;         // mole mode: the Mole's secret alternate question
  moleId?: string | null;          // mole mode: who's the Mole (secret until the result)
  guessOrder: string[];            // player ids, guess relay order
  guesses: Record<string, number | null>;
  guessesText?: Record<string, string | null>; // words mode: written answers
  wordsTargetId?: string | null;               // words mode: target player for personal questions (their answer is the truth)
  votes: Record<string, string | null>;       // classic/words: voter id -> option key
  moleVotes?: Record<string, string | null>;  // mole: voter id -> accused playerId
  optionOrder: string[];           // shuffled option keys = the A,B,C… letters (stable across reveal+vote)
  revealed: boolean;
}

export interface GameConfig {
  /** Which game mode this session is playing. */
  mode: GameMode;
  rounds: number;
  readSeconds: number;
  guessSeconds: number;   // secret numpad turn (30s)
  discussMinutes: 1 | 2; // reveal board timer (user picks 1 or 2 minutes)
  voteSeconds: number;   // hard limit per voter (30s, auto-advance)
  /** Question categories enabled for this game (free: general+funny, paid: rest). */
  categories: CategoryId[];
}

export interface ResultRow {
  playerId: string;
  guess: number | null;
  fooled: string[];    // player ids who picked this player's card
  distPct: number;     // % off truth (fun stat / biggest bluff)
  pts: number;
  parts: string[];     // human-readable breakdown, e.g. '+25 exact!'
}

/**
 * Mole-mode result, PER-PERSON scoring (no majority):
 *  - the Mole earns MOLE_PTS_PER_FOOL for every hunter they convinced
 *    (each hunter who accused the wrong person).
 *  - every hunter earns HUNTER_PTS_CATCH if THEIR OWN accusation named the
 *    real Mole — individually, nobody else's vote matters.
 * 6 vs 5: the Mole answers a different question (plays blind), so the
 * mole side carries a small edge; at ~54% hunter accuracy the two sides'
 * expected points per round are equal, and the max round stays 30/30
 * (old binary 30/15 system) so a full game's point scale is unchanged.
 */
export interface MoleResult {
  moleId: string;
  moleFoolCount: number;       // hunters who accused the wrong person (the Mole's "convinced")
  correctHunterIds: string[];  // hunters who accused the Mole (each scores individually)
  ptsMole: number;             // total points the Mole earned this round (= 6 × foolCount)
  ptsHunter: number;           // points each correct hunter earns
}

export interface GameState {
  phase: Phase;
  players: Player[];
  config: GameConfig;
  deck: Question[];        // classic mode question deck
  moleDeck: MolePair[];    // mole mode pair deck
  roundIndex: number;
  round: RoundState | null;
  cursor: number;
  handoffKind: HandoffKind;
  timerEndsAt: number | null;
  result?: {
    truth: number;
    unit?: string;
    closestIds: string[];     // tied for closest guess (everyone gets credit)
    exactIds: string[];       // nailed it exactly
    bestLiarId: string | null;   // guess card that got the most votes (not truth)
    biggestBluffId: string | null; // furthest off, but fooled people
    rows: ResultRow[];
    mole?: MoleResult;        // set in mole mode
  };
}

export const DEFAULT_CONFIG: GameConfig = {
  mode: 'classic',
  rounds: 10,
  readSeconds: 10,
  guessSeconds: 30,
  discussMinutes: 2,
  voteSeconds: 30,
  categories: ['general', 'funny'],
};
