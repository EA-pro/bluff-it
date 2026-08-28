import { Question, CategoryId } from '../types';

// Master question pool. EVERY question has one real numeric answer and one
// category:
//   FREE : general (science/world/body), funny (party & social)
//   PAID : sexy (spicy but clean), geo (countries/land/sea), animals
// DE/NL text + hints live in ./translations.ts (keyed by id); deck/index.ts
// applies them per question language.
export const QUESTIONS: Question[] = [
  // ================= GENERAL (science / world / body) =================
  { id: 'n01', type: 'numeric', cat: 'general', text: 'About how many times does lightning strike the Earth every single second?', unit: '', truth: 100, hint: 'Right now, as we speak' },
  { id: 'n02', type: 'numeric', cat: 'general', text: 'How many people have ever been to space in total?', unit: '', truth: 700, hint: 'A very exclusive club' },
  { id: 'n04', type: 'numeric', cat: 'general', text: 'About how many neurons are in your brain?', unit: 'billion', truth: 86, hint: 'Big brain, big number' },
  { id: 'n05', type: 'numeric', cat: 'general', text: 'How fast does the International Space Station travel?', unit: 'km/h', truth: 28000, hint: 'Faster than a bullet' },
  { id: 'n06', type: 'numeric', cat: 'general', text: 'How many seconds of free-fall until you hit terminal velocity?', unit: 's', truth: 12, hint: 'Roughly 450 m of falling' },
  { id: 'n07', type: 'numeric', cat: 'general', text: 'How many hairs are on an average human head?', unit: '', truth: 100000, hint: 'Please do NOT count them' },
  { id: 'n08', type: 'numeric', cat: 'general', text: 'How many kilometers of blood vessels are inside your body?', unit: 'km', truth: 100000, hint: 'Around the Earth 2.5×' },
  { id: 'n09', type: 'numeric', cat: 'general', text: 'How much does an average fluffy cumulus cloud weigh, roughly?', unit: 'kg', truth: 500000, hint: 'It’s floating — how?!' },
  { id: 'n11', type: 'numeric', cat: 'general', text: 'About how many atoms are in your body?', unit: 'sextillion', truth: 70, hint: 'A whole lot of atoms' },
  { id: 'n12', type: 'numeric', cat: 'general', text: 'In the lightning rule, how many seconds pass per kilometer between flash and thunder?', unit: 's', truth: 3, hint: 'The counting trick' },
  { id: 'n14', type: 'numeric', cat: 'general', text: 'How old was the oldest person in recorded history?', unit: 'years', truth: 122, hint: 'A French lady named Jeanne' },
  { id: 'n15', type: 'numeric', cat: 'general', text: 'How many times does the average person blink in one day?', unit: 'thousand', truth: 15, hint: 'Your eyes never get a break' },
  { id: 'n16', type: 'numeric', cat: 'general', text: 'How many liters of air does the average person breathe in one day?', unit: 'thousand l', truth: 11, hint: 'It’s free, but it’s huge' },
  { id: 'n21', type: 'numeric', cat: 'general', text: 'How many kilometers does Earth travel around the Sun in one day?', unit: 'km', truth: 2600000, hint: 'We’re always moving' },
  { id: 'n22', type: 'numeric', cat: 'general', text: 'How many times has the ISS orbited the Earth since launch?', unit: 'thousand', truth: 150, hint: 'Up there since 1998' },
  { id: 'n23', type: 'numeric', cat: 'general', text: 'How many times does the average person swallow in a day, roughly?', unit: 'hundred', truth: 10, hint: 'Even in your sleep' },
  { id: 'n24', type: 'numeric', cat: 'general', text: 'How much of your body is water?', unit: '%', truth: 60, hint: 'You’re basically a water bag' },
  { id: 'n26', type: 'numeric', cat: 'general', text: 'How many times faster is light than sound?', unit: '×', truth: 875000, hint: 'That’s why thunder is late' },
  { id: 'n27', type: 'numeric', cat: 'general', text: 'How many pieces of space debris bigger than a fist are in orbit?', unit: 'thousand', truth: 36, hint: 'And the number grows' },
  { id: 'n29', type: 'numeric', cat: 'general', text: 'How many liters of blood does an adult have?', unit: 'l', truth: 5, hint: 'About 7 pints' },
  { id: 'n31', type: 'numeric', cat: 'general', text: 'How many seconds are in a leap year?', unit: '× 100k s', truth: 316, hint: 'Math time (or bluff time)' },
  { id: 'n32', type: 'numeric', cat: 'general', text: 'How many times does your heart beat in an 80-year life?', unit: 'million', truth: 300, hint: 'It never takes a day off' },
  { id: 'n35', type: 'numeric', cat: 'general', text: 'How many other people share your exact birthday?', unit: 'million', truth: 22, hint: 'You’re not that unique' },
  { id: 'n36', type: 'numeric', cat: 'general', text: 'How many hours of daylight does the ISS get every day?', unit: 'h', truth: 16, hint: '16 sunsets a day' },
  { id: 'n37', type: 'numeric', cat: 'general', text: 'How fast does a category 5 hurricane have to blow, at minimum?', unit: 'km/h', truth: 250, hint: 'Above this = pure chaos' },
  { id: 'n38', type: 'numeric', cat: 'general', text: 'How much does the average human brain weigh?', unit: 'g', truth: 1400, hint: 'About 2% of your body weight' },
  { id: 'n39', type: 'numeric', cat: 'general', text: 'How far is the ISS from Earth’s surface, roughly?', unit: 'km', truth: 400, hint: '“Low” Earth orbit' },
  { id: 'g06', type: 'numeric', cat: 'general', text: 'Roughly how many countries are in the world?', unit: '', truth: 195, hint: 'More than a handful' },

  // ================= FUNNY (party & social) =================
  { id: 'n13', type: 'numeric', cat: 'funny', text: 'About how many times does the average person laugh in a day?', unit: '', truth: 15, hint: 'Some of them count double' },
  { id: 'n25', type: 'numeric', cat: 'funny', text: 'How long does a yawn last, on average?', unit: 's', truth: 5, hint: 'Sorry, now you have to' },
  { id: 'n28', type: 'numeric', cat: 'funny', text: 'How fast does the average pro golfer hit the ball on a driver swing?', unit: 'km/h', truth: 280, hint: 'Fastest hit in sports' },
  { id: 'n30', type: 'numeric', cat: 'funny', text: 'How many times does the average person fall in one year?', unit: 'times', truth: 12, hint: 'There’s a study, sorry' },
  { id: 's01', type: 'numeric', cat: 'funny', text: 'About how many TikTok videos are uploaded every day?', unit: 'million', truth: 100, hint: 'It never stops' },
  { id: 's02', type: 'numeric', cat: 'funny', text: 'How many hours of video get uploaded to YouTube every single minute?', unit: 'hours', truth: 500, hint: 'More than a human lifetime' },
  { id: 's03', type: 'numeric', cat: 'funny', text: 'How many minutes does it take the average person to fall asleep?', unit: 'min', truth: 15, hint: 'Not too fast, not too slow' },
  { id: 's04', type: 'numeric', cat: 'funny', text: 'How many dreams does the average person have per night?', unit: '', truth: 5, hint: 'You probably won’t remember most' },
  { id: 's05', type: 'numeric', cat: 'funny', text: 'How many times does the average person look at their phone per day?', unit: 'times', truth: 100, hint: 'Scary, right?' },
  { id: 's06', type: 'numeric', cat: 'funny', text: 'How many steps does the average person walk per day?', unit: '', truth: 5000, hint: 'The 10k goal is a lie' },
  { id: 's07', type: 'numeric', cat: 'funny', text: 'How many hours of sleep do teenagers need per night, on average?', unit: 'h', truth: 9, hint: 'Your brain is still cooking' },
  { id: 's08', type: 'numeric', cat: 'funny', text: 'How long does it take to watch every Harry Potter movie, roughly?', unit: 'h', truth: 30, hint: 'One very long weekend' },
  { id: 's09', type: 'numeric', cat: 'funny', text: 'How many cups of coffee does the average American drink per day?', unit: 'cups', truth: 2, hint: 'Coffee is a personality trait' },
  { id: 's10', type: 'numeric', cat: 'funny', text: 'About how many people are online right now?', unit: 'billion', truth: 5, hint: 'Most of Earth is awake' },

  // ================= GEO (countries, borders, deserts & seas) — PAID =================
  { id: 'n03', type: 'numeric', cat: 'geo', text: 'How deep is the Mariana Trench?', unit: 'm', truth: 11000, hint: 'Deeper than Everest is tall' },
  { id: 'n10', type: 'numeric', cat: 'geo', text: 'How much of the ocean floor has been mapped, roughly?', unit: '%', truth: 25, hint: 'We’ve mapped the Moon better' },
  { id: 'n17', type: 'numeric', cat: 'geo', text: 'How far does the tip of the Eiffel Tower move on a hot sunny day?', unit: 'cm', truth: 15, hint: 'The sun stretches it' },
  { id: 'n34', type: 'numeric', cat: 'geo', text: 'How long is the Nile River, roughly?', unit: 'km', truth: 6650, hint: 'Longest river (probably)' },
  { id: 'n40', type: 'numeric', cat: 'geo', text: 'How many grains of sand are on Earth, roughly?', unit: 'quintillion', truth: 7500, hint: 'Beach math' },
  { id: 'g01', type: 'numeric', cat: 'geo', text: 'How many countries does Brazil share a land border with?', unit: '', truth: 5, hint: 'Paraguay and Chile are NOT on the list' },
  { id: 'g02', type: 'numeric', cat: 'geo', text: 'How long is the Great Wall of China, in total?', unit: 'km', truth: 21000, hint: 'Longer than any border on Earth' },
  { id: 'g03', type: 'numeric', cat: 'geo', text: 'How many time zones does Russia span?', unit: '', truth: 11, hint: 'From sunrise to sunset' },
  { id: 'g04', type: 'numeric', cat: 'geo', text: 'How many lakes does Canada have, roughly?', unit: 'million', truth: 6, hint: 'More than all other countries combined' },
  { id: 'g05', type: 'numeric', cat: 'geo', text: 'What is the area of the Sahara Desert?', unit: 'million km²', truth: 9, hint: 'Bigger than the whole USA' },
  { id: 'g06b', type: 'numeric', cat: 'geo', text: 'How many countries are in Africa?', unit: '', truth: 54, hint: 'The most of any continent' },
  { id: 'g07', type: 'numeric', cat: 'geo', text: 'How many countries does the Amazon River flow through?', unit: '', truth: 7, hint: 'A river of nations' },
  { id: 'g08', type: 'numeric', cat: 'geo', text: 'What is the population of the Tokyo metro area?', unit: 'million', truth: 37, hint: 'The largest on Earth' },
  { id: 'g09', type: 'numeric', cat: 'geo', text: 'How many countries does the Nile flow through?', unit: '', truth: 11, hint: 'The longest river’s long journey' },
  { id: 'g10', type: 'numeric', cat: 'geo', text: 'How many islands make up the Philippines, roughly?', unit: 'thousand', truth: 7, hint: 'One of the biggest archipelagos' },

  // ================= ANIMALS — PAID =================
  { id: 'n18', type: 'numeric', cat: 'animals', text: 'About how many species of fish are there on Earth?', unit: 'thousand', truth: 35, hint: 'More diverse than any other animal' },
  { id: 'n19', type: 'numeric', cat: 'animals', text: 'How many ants are on Earth right now?', unit: 'quadrillion', truth: 20, hint: 'Their total weight rivals all humans' },
  { id: 'n20', type: 'numeric', cat: 'animals', text: 'How many birds are on Earth right now, roughly?', unit: 'billion', truth: 40, hint: 'Scientists actually counted' },
  { id: 'n33', type: 'numeric', cat: 'animals', text: 'About how many bees live in a healthy summer beehive?', unit: 'thousand', truth: 60, hint: 'The queen rules for years' },
  { id: 'a01', type: 'numeric', cat: 'animals', text: 'How many hearts does an octopus have?', unit: '', truth: 3, hint: 'Two for the gills, one for the body' },
  { id: 'a02', type: 'numeric', cat: 'animals', text: 'What is the top speed of a cheetah?', unit: 'km/h', truth: 110, hint: 'Fastest on land' },
  { id: 'a03', type: 'numeric', cat: 'animals', text: 'How many hours a day does a giraffe sleep, on average?', unit: 'h', truth: 2, hint: 'They stand up for most of it' },
  { id: 'a04', type: 'numeric', cat: 'animals', text: 'How many wings does a bee have?', unit: '', truth: 4, hint: 'Two pairs, 200 beats per second' },
  { id: 'a05', type: 'numeric', cat: 'animals', text: 'How many teeth does a shark have in its lifetime?', unit: 'thousand', truth: 30, hint: 'It keeps replacing them' },

  // ================= SEXY (spicy but clean) — PAID =================
  { id: 'x01', type: 'numeric', cat: 'sexy', text: 'How many calories does a passionate kiss burn per minute?', unit: 'kcal', truth: 6, hint: 'Cardio, but small' },
  { id: 'x02', type: 'numeric', cat: 'sexy', text: 'About how many people does the average person kiss in a lifetime?', unit: '', truth: 130, hint: 'A poll said so' },
  { id: 'x03', type: 'numeric', cat: 'sexy', text: 'About how long is the average foreplay?', unit: 'min', truth: 13, hint: 'There is a study — yes, really' },
  { id: 'x04', type: 'numeric', cat: 'sexy', text: 'About how many times a day does the average person blush?', unit: '', truth: 4, hint: 'Attraction, embarrassment or a hot soup' },
  { id: 'x05', type: 'numeric', cat: 'sexy', text: 'How long is a “good” hug, according to research?', unit: 's', truth: 20, hint: 'Longer than a hello-hug' },
  { id: 'x06', type: 'numeric', cat: 'sexy', text: 'About how fast does your heart beat during a passionate make-out?', unit: 'bpm', truth: 100, hint: 'Pumping' },
  { id: 'x07', type: 'numeric', cat: 'sexy', text: 'About how many hours a day do newly-in-love couples spend together?', unit: 'h', truth: 5, hint: 'The honeymoon phase' },
  { id: 'x08', type: 'numeric', cat: 'sexy', text: 'How long does it take to fall asleep next to your partner?', unit: 'min', truth: 6, hint: 'Faster than with a friend' },
  { id: 'x09', type: 'numeric', cat: 'sexy', text: 'About how many crushes does the average person have in a lifetime?', unit: '', truth: 10, hint: 'First grade does count' },
  { id: 'x10', type: 'numeric', cat: 'sexy', text: 'About how many calories does a couple burn in an hour of, um… intimacy?', unit: 'kcal', truth: 250, hint: 'A light workout' },
];

export type { CategoryId };
