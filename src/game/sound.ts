import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

export type SoundName = 'pop' | 'tick' | 'whoosh' | 'reveal' | 'win' | 'oops' | 'slide' | 'buzz';
export type MusicTrack = 'home' | 'guess' | 'reveal' | 'vote' | null;

// static requires so Metro can bundle the assets on every platform
const ASSETS: Record<SoundName, number> = {
  pop: require('@/assets/sounds/pop.wav'),
  tick: require('@/assets/sounds/tick.wav'),
  whoosh: require('@/assets/sounds/whoosh.wav'),
  reveal: require('@/assets/sounds/reveal.wav'),
  win: require('@/assets/sounds/win.wav'),
  oops: require('@/assets/sounds/oops.wav'),
  slide: require('@/assets/sounds/slide.wav'),
  buzz: require('@/assets/sounds/buzz.wav'),
};

const MUSIC_ASSETS: Record<Exclude<MusicTrack, null>, number> = {
  home: require('@/assets/sounds/music_home.wav'),
  guess: require('@/assets/sounds/music_guess.wav'),
  reveal: require('@/assets/sounds/music_reveal.wav'),
  vote: require('@/assets/sounds/music_vote.wav'),
};

const loaded: Record<string, Audio.Sound | null> = {};
let enabled = true;

export function setSoundEnabled(v: boolean) {
  enabled = v;
  if (!v) stopAll();
  else if (musicTrack) startMusic().catch(() => {});
}
export function isSoundEnabled() {
  return enabled;
}

async function ensure(name: SoundName): Promise<Audio.Sound | null> {
  if (loaded[name] === undefined) {
    try {
      const s = new Audio.Sound();
      await s.loadAsync(ASSETS[name]);
      loaded[name] = s;
    } catch {
      loaded[name] = null;
    }
  }
  return loaded[name] ?? null;
}

export async function play(name: SoundName) {
  if (!enabled) return;
  try {
    const s = await ensure(name);
    if (!s) return;
    await s.setPositionAsync(0);
    await s.playAsync();
  } catch {
    /* audio never blocks gameplay */
  }
}

export function stopAll() {
  Object.values(loaded).forEach((s) => {
    if (s) s.unloadAsync().catch(() => {});
  });
  for (const k of Object.keys(loaded)) delete loaded[k];
  stopMusic();
}

// ---------- background music (per-phase loops) ----------

let music: Audio.Sound | null = null;
let musicTrack: MusicTrack = null;
let musicBusy = false;

/** Start (or switch to) a phase's background loop. `null` = silence. */
export function setMusic(track: MusicTrack) {
  if (track === musicTrack) return;
  musicTrack = track;
  startMusic().catch(() => {});
}

async function startMusic() {
  if (musicBusy) return;
  musicBusy = true;
  try {
    // stop the previous loop cleanly
    if (music) {
      try {
        await music.stopAsync();
      } catch { /* already stopped */ }
      music.unloadAsync().catch(() => {});
      music = null;
    }
    if (!musicTrack || !enabled) return;
    const s = new Audio.Sound();
    await s.loadAsync(MUSIC_ASSETS[musicTrack]);
    s.setIsLoopingAsync(true).catch(() => {});
    await s.playAsync();
    music = s;
  } catch {
    /* music is never critical — gameplay SFX still work */
  } finally {
    musicBusy = false;
  }
}

export function stopMusic() {
  musicTrack = null;
  if (music) {
    music.stopAsync().catch(() => {});
    music.unloadAsync().catch(() => {});
    music = null;
  }
}

// haptics helper (web-safe)
export function haptic(kind: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') {
  try {
    if (kind === 'light') Haptics.selectionAsync();
    else if (kind === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else if (kind === 'heavy') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    else if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (kind === 'warning') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {
    /* no haptics on web */
  }
}
