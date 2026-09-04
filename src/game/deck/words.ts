// BLUFF IT — WORDS mode deck (Fibbage-style, objective-only).
//
// Every question has ONE objectively correct answer that is STORED (truthText)
// and appears on the board as its own truth card — exactly like classic shows
// the true number. No personal/{name} questions: those depend on players
// knowing each other, can rest on false premises, and have no ground truth.
//
// Content bar (set by the player): HARD to know + FUNNY to argue about.
// Obvious facts ("Big Apple = New York") are banned — in a bluff game the
// group spots the truth card instantly and the round dies.
//
// Answers are short written strings (UI enforces ~60 chars).
import type { Lang } from '@/i18n';

export type WordsCategory = 'general' | 'funny' | 'sexy' | 'geo' | 'animals';

export interface WordsPrompt {
  id: string;
  cat: WordsCategory;
  text: string;       // fixed (objective trivia)
  truthText: string;  // the stored correct answer — becomes the truth card
}

type W = [id: string, cat: WordsCategory, text: string, truthText: string];
const P = (id: string, cat: WordsCategory, text: string, truthText: string): WordsPrompt =>
  ({ id, cat, text, truthText });

// ---------------------------------------------------------------- EN (base)
const EN: W[] = [
  // general (free)
  ['g01', 'general', 'What is the capital of Australia?', 'Canberra'],
  ['g02', 'general', 'How many hearts does an octopus have?', '3'],
  ['g03', 'general', 'What is the most expensive spice in the world?', 'Saffron'],
  ['g04', 'general', 'What is the national animal of Scotland?', 'Unicorn'],
  ['g05', 'general', 'What is the only mammal that cannot jump?', 'Elephant'],
  ['g06', 'general', 'What is the biggest island in the world?', 'Greenland'],
  ['g07', 'general', 'What colour is a polar bear\'s skin under the fur?', 'Black'],
  ['g08', 'general', 'What is the smallest country in the world?', 'Vatican City'],
  ['g09', 'general', 'What is the only food that never spoils?', 'Honey'],
  ['g10', 'general', 'What is the national sport of Japan?', 'Sumo'],
  // funny (free)
  ['f01', 'funny', 'What is the only planet that spins backwards?', 'Venus'],
  ['f02', 'funny', 'What is the most common blood type in humans?', 'O positive'],
  ['f03', 'funny', 'What is the shortest war in history — and roughly how long did it last?', '38 minutes'],
  ['f04', 'funny', 'Oxford University is older than which empire?', 'The Aztec Empire'],
  ['f05', 'funny', 'What is the oldest living thing on Earth (approx. age)?', 'About 5 000 years old'],
  ['f06', 'funny', 'What is the only food technically poisonous to hamsters?', 'Avocado'],
  ['f07', 'funny', 'What is the smallest primate in the world?', 'Mouse lemur'],
  ['f08', 'funny', 'How many times does the average person blink per day?', 'About 10 000'],
  ['f09', 'funny', 'How many muscles does the human body have?', 'About 600'],
  // sexy (paid — spicy but clean)
  ['x01', 'sexy', 'About how many people does the average person kiss in a lifetime?', 'About 130'],
  ['x02', 'sexy', 'According to research, how long is a "good" hug?', 'About 20 seconds'],
  ['x03', 'sexy', 'About how long is the average foreplay?', 'About 13 minutes'],
  ['x04', 'sexy', 'How many calories does a passionate kiss burn per minute?', '6'],
  ['x05', 'sexy', 'About how fast does your heart beat during a passionate make-out?', 'About 100 bpm'],
  ['x06', 'sexy', 'About how many hours a day do newly-in-love couples spend together?', 'About 5 hours'],
  ['x07', 'sexy', 'How long does it take to fall asleep next to your partner?', 'About 6 minutes'],
  ['x08', 'sexy', 'About how many crushes does the average person have in a lifetime?', 'About 10'],
  // geo (paid)
  ['c01', 'geo', 'What is the capital of Canada?', 'Ottawa'],
  ['c02', 'geo', 'What is the deepest point in the ocean — and roughly how deep?', 'Challenger Deep (about 11 000 m)'],
  ['c03', 'geo', 'What is the driest place on Earth?', 'The Atacama Desert'],
  ['c04', 'geo', 'What is the largest desert in the world?', 'The Antarctic Desert'],
  ['c05', 'geo', 'What is the longest river in the world?', 'The Nile'],
  ['c06', 'geo', 'What country has the most time zones, counting territories?', 'France (18)'],
  ['c07', 'geo', 'What are the only two countries whose flag is not a rectangle?', 'Nepal and Bangladesh'],
  ['c08', 'geo', 'What country has the most islands?', 'Sweden'],
  // animals (paid)
  ['a01', 'animals', 'What is the tallest land animal?', 'Giraffe'],
  ['a02', 'animals', 'What colour is an octopus\' blood?', 'Blue'],
  ['a03', 'animals', 'How many eyes does a giant clam have?', 'About 100 000'],
  ['a04', 'animals', 'What do you call a group of wild boars?', 'A sound'],
  ['a05', 'animals', 'What animal has the most teeth of any land animal?', 'Shark (≈30 000 over its life)'],
];

// ---------------------------------------------------------------- DE
const DE: Record<string, { text: string; truthText: string }> = {
  g01:{text:'Was ist die Hauptstadt von Australien?',truthText:'Canberra'},
  g02:{text:'Wie viele Herzen hat ein Oktopus?',truthText:'3'},
  g03:{text:'Was ist das teuerste Gewürz der Welt?',truthText:'Safran'},
  g04:{text:'Was ist das Nationaltier Schottlands?',truthText:'Einhorn'},
  g05:{text:'Was ist das einzige Säugetier, das nicht springen kann?',truthText:'Elefant'},
  g06:{text:'Was ist die größte Insel der Welt?',truthText:'Grönland'},
  g07:{text:'Welche Farbe hat die Haut eines Eisbären unter dem Fell?',truthText:'Schwarz'},
  g08:{text:'Was ist das kleinste Land der Welt?',truthText:'Vatikanstadt'},
  g09:{text:'Welches Lebensmittel wird nie schlecht?',truthText:'Honig'},
  g10:{text:'Was ist die Nationalsportart Japans?',truthText:'Sumo'},
  f01:{text:'Was ist der einzige Planet, der rückwärts rotiert?',truthText:'Venus'},
  f02:{text:'Was ist die häufigste Blutgruppe beim Menschen?',truthText:'O positiv'},
  f03:{text:'Was ist der kürzeste Krieg der Geschichte — und wie lang dauerte er etwa?',truthText:'38 Minuten'},
  f04:{text:'Die Universität Oxford ist älter als welches Imperium?',truthText:'Das Azteken-Reich'},
  f05:{text:'Was ist das älteste Lebewesen der Erde (ungefähres Alter)?',truthText:'Ca. 5 000 Jahre alt'},
  f06:{text:'Was ist das einzige Lebensmittel, das für Hamster giftig ist?',truthText:'Avocado'},
  f07:{text:'Was ist das kleinste Primat der Welt?',truthText:'Mausmaulmeerkatze'},
  f08:{text:'Wie oft kneift der Durchschnittsmensch pro Tag die Augen zu?',truthText:'Ca. 10 000 Mal'},
  f09:{text:'Wie viele Muskeln hat der menschliche Körper?',truthText:'Ca. 600'},
  x01:{text:'Wie viele Menschen küsst der Durchschnittsmensch im Laufe seines Lebens?',truthText:'Ca. 130'},
  x02:{text:'Wie lang ist ein „guter" Umarmung, laut Forschung?',truthText:'Ca. 20 Sekunden'},
  x03:{text:'Wie lang dauert die durchschnittliche Vorzeit?',truthText:'Ca. 13 Minuten'},
  x04:{text:'Wie viele Kalorien verbrennt ein leidenschaftlicher Kuss pro Minute?',truthText:'6'},
  x05:{text:'Wie schnell schlägt dein Herz bei einem leidenschaftlichen Kuss ungefähr?',truthText:'Ca. 100 bpm'},
  x06:{text:'Wie viele Stunden am Tag verbringen frisch Verliebte ungefähr zusammen?',truthText:'Ca. 5 Stunden'},
  x07:{text:'Wie schnell schläfst du ein, wenn dein Partner neben dir liegt?',truthText:'Ca. 6 Minuten'},
  x08:{text:'Wie viele Schwärmereien hat der Durchschnittsmensch im Laufe seines Lebens?',truthText:'Ca. 10'},
  c01:{text:'Was ist die Hauptstadt von Kanada?',truthText:'Ottawa'},
  c02:{text:'Was ist der tiefste Punkt des Ozeans — und wie tief ist er ungefähr?',truthText:'Challenger Deep (ca. 11 000 m)'},
  c03:{text:'Was ist der trockenste Ort der Erde?',truthText:'Die Atacama-Wüste'},
  c04:{text:'Was ist die größte Wüste der Welt?',truthText:'Die Antarktische Wüste'},
  c05:{text:'Was ist der längste Fluss der Welt?',truthText:'Der Nil'},
  c06:{text:'Welches Land hat die meisten Zeitzonen, inkl. Territorien?',truthText:'Frankreich (18)'},
  c07:{text:'Welche zwei Länder haben die einzigen Flaggen, die kein Rechteck sind?',truthText:'Nepal und Bangladesch'},
  c08:{text:'Welches Land hat die meisten Inseln?',truthText:'Schweden'},
  a01:{text:'Was ist das höchste Landtier?',truthText:'Giraffe'},
  a02:{text:'Welche Farbe hat das Blut eines Oktopus?',truthText:'Blau'},
  a03:{text:'Wie viele Augen hat eine Riesenspiralmuschel?',truthText:'Ca. 100 000'},
  a04:{text:'Wie nennt man eine Herde Wildschweine?',truthText:'Ein Sound'},
  a05:{text:'Welches Landtier hat die meisten Zähne?',truthText:'Haifisch (≈30 000 im Leben)'},
};

// ---------------------------------------------------------------- NL
const NL: Record<string, { text: string; truthText: string }> = {
  g01:{text:'Wat is de hoofdstad van Australië?',truthText:'Canberra'},
  g02:{text:'Hoeveel harten heeft een octopus?',truthText:'3'},
  g03:{text:'Wat is het duurste specerij ter wereld?',truthText:'Safran'},
  g04:{text:'Wat is het nationale dier van Schotland?',truthText:'Eenhoorn'},
  g05:{text:'Wat is het enige zoogdier dat niet kan springen?',truthText:'Olifant'},
  g06:{text:'Wat is het grootste eiland ter wereld?',truthText:'Groenland'},
  g07:{text:'Welke kleur heeft de huid van een ijsbeer onder de vacht?',truthText:'Zwart'},
  g08:{text:'Wat is het kleinste land ter wereld?',truthText:'Vaticaanstad'},
  g09:{text:'Welk voedingsmiddel wordt nooit slecht?',truthText:'Honing'},
  g10:{text:'Wat is de nationale sport van Japan?',truthText:'Sumo'},
  f01:{text:'Welke planeet draait achteruit?',truthText:'Venus'},
  f02:{text:'Wat is de meest voorkomende bloedgroep bij mensen?',truthText:'O positief'},
  f03:{text:'Wat is de kortste oorlog uit de geschiedenis — en hoe lang duurde hij?',truthText:'38 minuten'},
  f04:{text:'De Universiteit van Oxford is ouder dan welk rijk?',truthText:'Het Azteekse Rijk'},
  f05:{text:'Wat is het oudste levende ding op aarde (ongeveerige leeftijd)?',truthText:'Ongeveer 5 000 jaar oud'},
  f06:{text:'Welk voedingsmiddel is technisch gezien giftig voor hamsters?',truthText:'Avocado'},
  f07:{text:'Wat is de kleinste primate ter wereld?',truthText:'Muislemur'},
  f08:{text:'Hoe vaak knippert de gemiddelde persoon per dag?',truthText:'Ongeveer 10 000 keer'},
  f09:{text:'Hoeveel spieren heeft het menselijk lichaam?',truthText:'Ongeveer 600'},
  x01:{text:'Hoeveel mensen kust de gemiddelde persoon in een leven?',truthText:'Ongeveer 130'},
  x02:{text:'Hoe lang is een "goede" omhelzing volgens onderzoek?',truthText:'Ongeveer 20 seconden'},
  x03:{text:'Hoe lang duurt gemiddeld de voorafgang?',truthText:'Ongeveer 13 minuten'},
  x04:{text:'Hoeveel calorieën verbrandt een passievol kusje per minuut?',truthText:'6'},
  x05:{text:'Hoe snel slaat je hart gemiddeld tijdens een passievol kusje?',truthText:'Ongeveer 100 bpm'},
  x06:{text:'Hoeveel uur per dag brengen pas verliefde koppels gemiddeld samen door?',truthText:'Ongeveer 5 uur'},
  x07:{text:'Hoe lang duurt het om in te vallen naast je partner?',truthText:'Ongeveer 6 minuten'},
  x08:{text:'Hoeveel verliefdheden heeft de gemiddelde persoon in een leven?',truthText:'Ongeveer 10'},
  c01:{text:'Wat is de hoofdstad van Canada?',truthText:'Ottawa'},
  c02:{text:'Wat is het diepste punt van de oceaan — en hoe diep is dat ongeveer?',truthText:'Challenger Deep (ongeveer 11 000 m)'},
  c03:{text:'Wat is de droogste plaats op aarde?',truthText:'De Atacama-woestijn'},
  c04:{text:'Wat is de grootste woestijn ter wereld?',truthText:'De Antarctische woestijn'},
  c05:{text:'Wat is de langste rivier ter wereld?',truthText:'De Nijl'},
  c06:{text:'Welk land heeft de meeste tijdzones, inclusief territoria?',truthText:'Frankrijk (18)'},
  c07:{text:'Welke twee landen hebben de enige vlaggen die geen rechthoek zijn?',truthText:'Nepal en Bangladesh'},
  c08:{text:'Welk land heeft het meest eilanden?',truthText:'Zweden'},
  a01:{text:'Wat is het hoogste landdier?',truthText:'Giraffe'},
  a02:{text:'Welke kleur heeft het bloed van een octopus?',truthText:'Blauw'},
  a03:{text:'Hoeveel ogen heeft een reuzenmossel?',truthText:'Ongeveer 100 000'},
  a04:{text:'Hoe noem je een kudde wilde zwijnen?',truthText:'Een sound'},
  a05:{text:'Welk landdier heeft de meeste tanden?',truthText:'Haai (≈30 000 in een leven)'},
};

const EN_ALL: WordsPrompt[] = EN.map(([id, cat, text, truthText]) => P(id, cat, text, truthText));

export const WORDS_CATEGORIES: { id: WordsCategory; free: boolean }[] = [
  { id: 'general', free: true },
  { id: 'funny', free: true },
  { id: 'sexy', free: false },
  { id: 'geo', free: false },
  { id: 'animals', free: false },
];

function localize(list: WordsPrompt[], lang: Lang): WordsPrompt[] {
  const map = lang === 'de' ? DE : lang === 'nl' ? NL : null;
  if (!map) return list;
  return list.map((q) => (map[q.id] ? { ...q, text: map[q.id].text, truthText: map[q.id].truthText } : q));
}

export function buildWordsDeck(cats: WordsCategory[] = ['general', 'funny'], lang: Lang = 'en'): WordsPrompt[] {
  const base = EN_ALL.filter((q) => cats.includes(q.cat));
  return localize(base, lang);
}
