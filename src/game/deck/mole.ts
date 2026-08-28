import { MolePair, Question } from '../types';

/**
 * Mole mode deck: 20 base / mole question PAIRS.
 *
 *  - base  : easy, guessable for the whole group.
 *  - mole  : a RELATED but different question. Same ballpark, different
 *            number — so the Mole's answer lands a little off, and the
 *            Hunters can (or can't) spot the odd one out.
 *
 * Pairs are designed so both numbers are the same "flavour" (same unit,
 * same topic) but not identical. The Mole sees `mole`; everyone else sees
 * `base`. The reveal hides WHO saw which — that's the whole game.
 */
const q = (
  id: string,
  text: string,
  truth: number,
  unit?: string,
  hint?: string
): Question => ({ id, type: 'numeric', text, truth, unit, hint });

export const MOLE: MolePair[] = [
  {
    id: 'mp1',
    base: q('mp1b', 'How many minutes of sleep do adults need each night?', 8, 'hrs'),
    mole: q('mp1m', 'How many hours do newborn babies sleep each day?', 16, 'hrs'),
  },
  {
    id: 'mp2',
    base: q('mp2b', 'About how many minutes is a full marathon (in km)?', 42, 'km'),
    mole: q('mp2m', 'How long is a half marathon, in km?', 21, 'km'),
  },
  {
    id: 'mp3',
    base: q('mp3b', 'Roughly how many countries are in the world?', 195),
    mole: q('mp3m', 'About how many countries are in the European Union?', 27),
  },
  {
    id: 'mp4',
    base: q('mp4b', 'How many days are in a typical school year in the US?', 180),
    mole: q('mp4m', 'How many days are in a standard work year (5 days/wk)?', 260),
  },
  {
    id: 'mp5',
    base: q('mp5b', 'How many levels does the Eiffel Tower have?', 3),
    mole: q('mp5m', 'About how many floors is the Empire State Building?', 102),
  },
  {
    id: 'mp6',
    base: q('mp6b', 'How many players on a basketball team on the court?', 5),
    mole: q('mp6m', 'How many players on a baseball team on the field?', 9),
  },
  {
    id: 'mp7',
    base: q('mp7b', 'Roughly how many hours of daylight on a summer day in the UK?', 16, 'hrs'),
    mole: q('mp7m', 'How many hours of daylight on a winter day in the UK?', 8, 'hrs'),
  },
  {
    id: 'mp8',
    base: q('mp8b', 'About how many minutes does a standard tennis match last on average?', 90, 'min'),
    mole: q('mp8m', 'How long is a standard table-tennis (ping pong) match, on average?', 30, 'min'),
  },
  {
    id: 'mp9',
    base: q('mp9b', 'How many wheels does a typical school bus have?', 6),
    mole: q('mp9m', 'How many wheels does a standard 18-wheel truck have?', 18),
  },
  {
    id: 'mp10',
    base: q('mp10b', 'About how many people watch the Super Bowl, on average?', 120, 'million'),
    mole: q('mp10m', 'About how many people watch an average Monday Night Football game?', 17, 'million'),
  },
  {
    id: 'mp11',
    base: q('mp11b', 'Roughly how many minutes is a movie, on average?', 110, 'min'),
    mole: q('mp11m', 'How long is the average TV episode (sitcom) on average?', 22, 'min'),
  },
  {
    id: 'mp12',
    base: q('mp12b', 'How many days in a common (non-leap) year?', 365),
    mole: q('mp12m', 'How many days in a school year, on average?', 180),
  },
  {
    id: 'mp13',
    base: q('mp13b', 'About how many students are in a typical classroom?', 30),
    mole: q('mp13m', 'How many kids roughly fit in a school bus?', 60),
  },
  {
    id: 'mp14',
    base: q('mp14b', 'How many panels does a classic (soccer) football have?', 32),
    mole: q('mp14m', 'About how wide is a football (soccer) goal, in metres?', 7, 'm'),
  },
  {
    id: 'mp15',
    base: q('mp15b', 'About how many minutes to boil an egg for a soft yolk?', 6, 'min'),
    mole: q('mp15m', 'How many minutes for a fully hard-boiled egg?', 12, 'min'),
  },
  {
    id: 'mp16',
    base: q('mp16b', 'How many strings on a standard guitar?', 6),
    mole: q('mp16m', 'How many keys on a standard piano?', 88),
  },
  {
    id: 'mp17',
    base: q('mp17b', 'Roughly how many minutes does a typical shower last?', 8, 'min'),
    mole: q('mp17m', 'About how many minutes does an average full bath (soak) take?', 20, 'min'),
  },
  {
    id: 'mp18',
    base: q('mp18b', 'How many minutes is a standard (half-hour) TV slot?', 30, 'min'),
    mole: q('mp18m', 'How many minutes is a standard "half hour" actually billed as?', 22, 'min'),
  },
  {
    id: 'mp19',
    base: q('mp19b', 'About how many floors does a "tall" skyscraper usually have?', 50),
    mole: q('mp19m', 'How many storeys is the Burj Khalifa?', 163),
  },
  {
    id: 'mp20',
    base: q('mp20b', 'Roughly how many minutes is the average commute?', 28, 'min'),
    mole: q('mp20m', 'About how many minutes is the average daily drive to work AND back?', 56, 'min'),
  },
];
