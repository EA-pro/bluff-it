// BLUFF IT — WORDS mode deck (Fibbage-style).
//
// Every question has ONE objectively correct answer. There are two kinds:
//
//   kind: 'personal'
//     The question is about a real player at the table ({name}). The correct
//     answer is whatever the TARGET player writes about themselves — the game
//     detects it automatically (their card is the truth card). No stored
//     answer needed, and it's the funniest gaslighting format: the target
//     has to convince everyone their answer is right.
//
//   kind: 'trivia'
//     An objective fact. `truthText` is stored and appears on the board as a
//     separate truth card (exactly like classic shows the true number).
//
// Answers are short written strings (UI enforces ~60 chars). No {item}
// placeholder — personal questions personalize with {name}, trivia is fixed.
import type { Lang } from '@/i18n';

export type WordsCategory = 'general' | 'funny' | 'sexy' | 'geo' | 'animals';

export interface WordsPrompt {
  id: string;
  cat: WordsCategory;
  text: string;        // may contain {name} (personal) or be fixed (trivia)
  kind: 'personal' | 'trivia';
  truthText?: string;  // trivia only — the stored correct answer
}

type W = [id: string, cat: WordsCategory, kind: 'personal' | 'trivia', text: string, truthText?: string];
const P = (id: string, cat: WordsCategory, kind: 'personal' | 'trivia', text: string, truthText?: string): WordsPrompt =>
  ({ id, cat, kind, text, ...(truthText ? { truthText } : {}) });

// ---------------------------------------------------------------- EN (base)
// Personal — about {name}. The target's own answer is the truth.
const EN_PERSONAL: W[] = [
  ['p1','general','personal','What is {name}\'s mother\'s name?'],
  ['p2','general','personal','What is {name}\'s father\'s name?'],
  ['p3','general','personal','When is {name}\'s birthday?'],
  ['p4','general','personal','What is {name}\'s zodiac sign?'],
  ['p5','general','personal','Where is {name} from?'],
  ['p6','general','personal','What was {name}\'s first job?'],
  ['p7','general','personal','What was {name}\'s first car?'],
  ['p8','general','personal','What is {name}\'s lucky number?'],
  ['p9','general','personal','What was {name}\'s childhood nickname?'],
  ['p10','general','personal','What is {name}\'s blood type?'],
  ['p11','general','personal','Who is {name}\'s best friend?'],
  ['p12','general','personal','What is {name}\'s dream job?'],
  ['p13','general','personal','What was {name}\'s first pet\'s name?'],
  ['p14','general','personal','What school did {name} go to?'],
  ['p15','general','personal','What is {name}\'s favorite food?'],
  ['p16','general','personal','What is {name}\'s favorite team?'],
  ['p17','funny','personal','What is {name}\'s worst habit?'],
  ['p18','funny','personal','What did {name} do last weekend?'],
  ['p19','funny','personal','What is {name}\'s most embarrassing moment?'],
  ['p20','funny','personal','Who does {name} secretly look like?'],
  ['p21','funny','personal','What is {name} hiding from everyone?'],
  ['p22','funny','personal','Why is {name} still single?'],
  ['p23','funny','personal','What would {name} be famous for?'],
  ['p24','sexy','personal','What is {name}\'s guilty pleasure?'],
  ['p25','sexy','personal','What song does {name} dance to when alone?'],
  ['p26','sexy','personal','Which celebrity would {name} dream about?'],
  ['p27','sexy','personal','What is {name}\'s love language?'],
  ['p28','sexy','personal','What perfume does {name} actually wear?'],
  ['p29','sexy','personal','One word: {name} in a bikini on the beach?'],
  ['p30','sexy','personal','What does {name} whisper in the shower?'],
];

// Trivia — objective facts with a stored correct answer (truth card on board).
const EN_TRIVIA: W[] = [
  ['t1','general','trivia','What is the capital of Australia?','Canberra'],
  ['t2','general','trivia','What is the fastest land animal?','Cheetah'],
  ['t3','general','trivia','How many hearts does an octopus have?','3'],
  ['t4','general','trivia','What is the most expensive spice?','Saffron'],
  ['t5','general','trivia','What is the national animal of Scotland?','Unicorn'],
  ['t6','general','trivia','What is the only mammal that cannot jump?','Elephant'],
  ['t7','general','trivia','What is the biggest island in the world?','Greenland'],
  ['t8','general','trivia','What colour is a polar bear\'s skin?','Black'],
  ['t9','general','trivia','What is the smallest country in the world?','Vatican City'],
  ['t10','general','trivia','What is the only food that never spoils?','Honey'],
  ['t11','geo','trivia','What is the capital of Canada?','Ottawa'],
  ['t12','geo','trivia','What is the longest river in the world?','The Nile'],
  ['t13','geo','trivia','What country has the most islands?','Sweden'],
  ['t14','geo','trivia','What is the driest place on Earth?','The Atacama Desert'],
  ['t15','geo','trivia','What is the largest desert in the world?','The Antarctic Desert'],
  ['t16','geo','trivia','What city is known as the Big Apple?','New York'],
  ['t17','animals','trivia','What is the tallest animal?','Giraffe'],
  ['t18','animals','trivia','How many bones are in the human body?','206'],
  ['t19','animals','trivia','What is the national sport of Japan?','Sumo'],
  ['t20','animals','trivia','What animal is on the Austrian flag?','An eagle'],
  ['t21','funny','trivia','What is the only planet that spins backwards?','Venus'],
  ['t22','funny','trivia','What is the most common blood type?','O positive'],
];

// ---------------------------------------------------------------- DE
const DE: Record<string, { text: string; truthText?: string }> = {
  p1:{text:'Wie heißt {name}s Mutter?'}, p2:{text:'Wie heißt {name}s Vater?'},
  p3:{text:'Wann ist {name}s Geburtstag?'}, p4:{text:'Was ist {name}s Sternzeichen?'},
  p5:{text:'Woher kommt {name}?'}, p6:{text:'Was war {name}s erster Job?'},
  p7:{text:'Was war {name}s erstes Auto?'}, p8:{text:'Was ist {name}s Glückszahl?'},
  p9:{text:'Was war {name}s Kinderkosenname?'}, p10:{text:'Was ist {name}s Blutgruppe?'},
  p11:{text:'Wer ist {name}s bester Freund?'}, p12:{text:'Was ist {name}s Traumjob?'},
  p13:{text:'Wie hieß {name}s erstes Haustier?'}, p14:{text:'Welche Schule hat {name} besucht?'},
  p15:{text:'Was ist {name}s Lieblingsspeise?'}, p16:{text:'Welches Team mag {name} am meisten?'},
  p17:{text:'Was ist {name}s schlechteste Angewohnheit?'}, p18:{text:'Was hat {name} am Wochenende gemacht?'},
  p19:{text:'Was ist {name}s peinlichster Moment?'}, p20:{text:'Wem sieht {name} heimlich ähnlich?'},
  p21:{text:'Wor versteckt sich {name} vor allen?'}, p22:{text:'Warum ist {name} noch Single?'},
  p23:{text:'Wofür wäre {name} berühmt?'}, p24:{text:'Was ist {name}s guilty pleasure?'},
  p25:{text:'Zu welchem Lied tanzt {name} allein?'}, p26:{text:'Welchen Star träumt {name} von?'},
  p27:{text:'Was ist {name}s Liebe-Sprache?'}, p28:{text:'Welches Parfum trägt {name} wirklich?'},
  p29:{text:'Ein Wort: {name} im Bikini am Strand?'}, p30:{text:'Was flüstert {name} in der Dusche?'},
  t1:{text:'Was ist die Hauptstadt von Australien?',truthText:'Canberra'},
  t2:{text:'Was ist das schnellste Landtier?',truthText:'Gepard'},
  t3:{text:'Wie viele Herzen hat ein Oktopus?',truthText:'3'},
  t4:{text:'Was ist das teuerste Gewürz?',truthText:'Safran'},
  t5:{text:'Was ist das Nationaltier Schottlands?',truthText:'Einhorn'},
  t6:{text:'Was ist das einzige Säugetier, das nicht springen kann?',truthText:'Elefant'},
  t7:{text:'Was ist die größte Insel der Welt?',truthText:'Grönland'},
  t8:{text:'Welche Farbe hat die Haut eines Eisbären?',truthText:'Schwarz'},
  t9:{text:'Was ist das kleinste Land der Welt?',truthText:'Vatikanstadt'},
  t10:{text:'Welches Lebensmittel wird nie schlecht?',truthText:'Honig'},
  t11:{text:'Was ist die Hauptstadt Kanadas?',truthText:'Ottawa'},
  t12:{text:'Was ist der längste Fluss der Welt?',truthText:'Der Nil'},
  t13:{text:'Welches Land hat die meisten Inseln?',truthText:'Schweden'},
  t14:{text:'Was ist der trockenste Ort der Erde?',truthText:'Die Atacama-Wüste'},
  t15:{text:'Was ist die größte Wüste der Welt?',truthText:'Die Antarktische Wüste'},
  t16:{text:'Welche Stadt wird "Big Apple" genannt?',truthText:'New York'},
  t17:{text:'Was ist das höchste Tier?',truthText:'Giraffe'},
  t18:{text:'Wie viele Knochen hat der menschliche Körper?',truthText:'206'},
  t19:{text:'Was ist die Nationalsportart Japans?',truthText:'Sumo'},
  t20:{text:'Welches Tier ist auf der österreichischen Flagge?',truthText:'Ein Adler'},
  t21:{text:'Was ist der einzige Planet, der rückwärts rotiert?',truthText:'Venus'},
  t22:{text:'Was ist die häufigste Blutgruppe?',truthText:'O positiv'},
};

// ---------------------------------------------------------------- NL
const NL: Record<string, { text: string; truthText?: string }> = {
  p1:{text:'Hoe heet {name}s moeder?'}, p2:{text:'Hoe heet {name}s vader?'},
  p3:{text:'Wanneer is {name}s verjaardag?'}, p4:{text:'Wat is {name}s sterrenbeeld?'},
  p5:{text:'Waar komt {name} vandaan?'}, p6:{text:'Wat was {name}s eerste job?'},
  p7:{text:'Wat was {name}s eerste auto?'}, p8:{text:'Wat is {name}s geluksgetal?'},
  p9:{text:'Wat was {name}s bijnaam als kind?'}, p10:{text:'Wat is {name}s bloedgroep?'},
  p11:{text:'Wie is {name}s beste vriend?'}, p12:{text:'Wat is {name}s droomjob?'},
  p13:{text:'Hoe heette {name}s eerste huisdier?'}, p14:{text:'Welke school bezocht {name}?'},
  p15:{text:'Wat is {name}s favoriete eten?'}, p16:{text:'Welk team houdt {name} het meest?'},
  p17:{text:'Wat is {name}s slechtste gewoonte?'}, p18:{text:'Wat deed {name} het weekend?'},
  p19:{text:'Wat is {name}s meest gênante moment?'}, p20:{text:'Op wie lijkt {name} stiekem?'},
  p21:{text:'Waar verstopt {name} zich voor iedereen?'}, p22:{text:'Waarom is {name} nog single?'},
  p23:{text:'Waarmee zou {name} beroemd worden?'}, p24:{text:'Wat is {name}s guilty pleasure?'},
  p25:{text:'Op welk nummer danst {name} alleen?'}, p26:{text:'Over welke celebrity droomt {name}?'},
  p27:{text:'Wat is {name}s taal van liefde?'}, p28:{text:'Welk parfum draagt {name} echt?'},
  p29:{text:'Een woord: {name} in bikini op het strand?'}, p30:{text:'Wat fluistert {name} in de douche?'},
  t1:{text:'Wat is de hoofdstad van Australië?',truthText:'Canberra'},
  t2:{text:'Wat is het snelste landdier?',truthText:'Gepard'},
  t3:{text:'Hoeveel harten heeft een octopus?',truthText:'3'},
  t4:{text:'Wat is het duurste specerij?',truthText:'Safran'},
  t5:{text:'Wat is het nationale dier van Schotland?',truthText:'Eenhoorn'},
  t6:{text:'Wat is het enige zoogdier dat niet kan springen?',truthText:'Olifant'},
  t7:{text:'Wat is het grootste eiland ter wereld?',truthText:'Groenland'},
  t8:{text:'Welke kleur heeft de huid van een ijsbeer?',truthText:'Zwart'},
  t9:{text:'Wat is het kleinste land ter wereld?',truthText:'Vaticaanstad'},
  t10:{text:'Welk voedingsmiddel wordt nooit slecht?',truthText:'Honing'},
  t11:{text:'Wat is de hoofdstad van Canada?',truthText:'Ottawa'},
  t12:{text:'Wat is de langste rivier ter wereld?',truthText:'De Nijl'},
  t13:{text:'Welk land heeft het meeste eilanden?',truthText:'Zweden'},
  t14:{text:'Wat is de droogste plaats op aarde?',truthText:'De Atacama-woestijn'},
  t15:{text:'Wat is de grootste woestijn ter wereld?',truthText:'De Antarctische woestijn'},
  t16:{text:'Welke stad wordt "Big Apple" genoemd?',truthText:'New York'},
  t17:{text:'Wat is het hoogste dier?',truthText:'Giraffe'},
  t18:{text:'Hoeveel botten heeft het menselijk lichaam?',truthText:'206'},
  t19:{text:'Wat is de nationale sport van Japan?',truthText:'Sumo'},
  t20:{text:'Welk dier staat op de Oostenrijkse vlag?',truthText:'Een adelaar'},
  t21:{text:'Wat is de enige planeet die achteruit draait?',truthText:'Venus'},
  t22:{text:'Wat is de meest voorkomende bloedgroep?',truthText:'O positief'},
};

const EN_ALL: WordsPrompt[] = [
  ...EN_PERSONAL.map(([id,cat,kind,text]) => P(id,cat,kind,text)),
  ...EN_TRIVIA.map(([id,cat,kind,text,truthText]) => P(id,cat,kind,text,truthText)),
];

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
  return list.map((q) => (map[q.id] ? { ...q, text: map[q.id].text, truthText: map[q.id].truthText ?? q.truthText } : q));
}

export function buildWordsDeck(cats: WordsCategory[] = ['general','funny'], lang: Lang = 'en'): WordsPrompt[] {
  const base = EN_ALL.filter((q) => cats.includes(q.cat));
  return localize(base, lang);
}

/** Render {name} placeholder with the target player's first name. */
export function renderWordsPrompt(text: string, name: string): string {
  return text.split('{name}').join(name);
}
