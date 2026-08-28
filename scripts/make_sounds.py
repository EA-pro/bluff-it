"""Generate tiny 16-bit mono WAV sound effects for BLUFF IT (procedural, no assets).

v2 — "less ringly": warmer sine/marimba palette instead of bright triangle
arps, slower note density, softer attacks, rounded high end. SFX are shorter
and rounder.
"""
import math, struct, wave, os

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sounds')
os.makedirs(OUT, exist_ok=True)

RATE = 22050

def env_ad(n, attack=0.008, decay=None):
    decay = decay or (n / RATE)
    a = max(1, int(attack * RATE))
    d = max(1, int(decay * RATE))
    out = []
    for i in range(n):
        if i < a:
            out.append(i / a)
        else:
            out.append(max(0.0, 1 - (i - a) / d))
    return out

def write_wav(name, samples):
    peak = max(1e-9, max(abs(s) for s in samples))
    norm = [min(1.0, s / peak) * 0.85 for s in samples]
    path = os.path.join(OUT, name)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        frames = b''.join(struct.pack('<h', int(s * 32767)) for s in norm)
        w.writeframes(frames)
    print(f'{name}: {len(samples)/RATE:.2f}s')

def note(freq, dur, kind='sine', glide=None, vol=1.0, attack=0.008):
    n = int(dur * RATE)
    e = env_ad(n, attack=attack)
    out = []
    for i in range(n):
        t = i / RATE
        f = freq if glide is None else freq + (glide - freq) * (i / n)
        p = 2 * math.pi * f * t
        v = 0.0
        if kind == 'sine':
            v = math.sin(p)
        elif kind == 'warm':
            # sine + a little 2nd harmonic = rounded "marimba" body, no harsh edge
            v = math.sin(p) + 0.25 * math.sin(2 * p)
        elif kind == 'triangle':
            v = 2 / math.pi * (2 * math.asin(math.sin(p)))
        elif kind == 'noise':
            import random
            v = random.uniform(-1, 1)
        out.append(v * e[i] * vol)
    return out

def seq(*chunks):
    return [s for c in chunks for s in c]

# pop — round tap confirm (sine, soft pitch lift, no edge)
write_wav('pop.wav', note(420, 0.10, 'warm', 620, 0.9))
# tick — soft rounded pulse instead of a square-wave zap
write_wav('tick.wav', note(740, 0.05, 'sine', 700, 0.35))
# whoosh — softer filtered sweep
n = int(0.22 * RATE)
whoosh = []
for i in range(n):
    t = i / RATE
    env = (1 - i / n)
    f = 220 + 700 * (i / n)
    whoosh.append(math.sin(2 * math.pi * f * t) * 0.5 * env)
write_wav('whoosh.wav', whoosh)
# reveal — warm rising triad, slow attack (pizzicato feel, no ringing)
write_wav('reveal.wav', seq(
    note(330, 0.09, 'warm', vol=0.8, attack=0.012),
    note(440, 0.09, 'warm', vol=0.8, attack=0.012),
    note(554, 0.18, 'warm', vol=0.9, attack=0.012),
))
# win — warm happy arpeggio, longer final note with soft decay
write_wav('win.wav', seq(
    note(440, 0.10, 'warm', vol=0.8),
    note(554, 0.10, 'warm', vol=0.8),
    note(660, 0.10, 'warm', vol=0.8),
    note(880, 0.34, 'warm', vol=0.9),
))
# oops — low, soft two-note dip
write_wav('oops.wav', seq(
    note(294, 0.11, 'warm', vol=0.7),
    note(220, 0.24, 'warm', vol=0.7),
))
# slide — gentle page turn
write_wav('slide.wav', note(260, 0.13, 'sine', 480, 0.45))
# buzz — rounder "blop" (sine pulses, not square)
write_wav('buzz.wav', seq(
    note(150, 0.07, 'warm', vol=0.6),
    note(150, 0.07, 'warm', vol=0.6),
    note(130, 0.12, 'warm', vol=0.55),
))

# ================= BACKGROUND MUSIC (seamless 8-beat loops @ 112 BPM) =================
BEAT = 60 / 112 / 1          # 112 BPM quarter note
LOOP = BEAT * 8              # 8 beats, all notes decay before the end

def mix(*layers):
    n = max(len(l) for l in layers)
    out = [0.0] * n
    for l in layers:
        for i, s in enumerate(l):
            out[i] += s
    return out

def place(seq_list, vol=1.0):
    """Place note-chunks on a beat grid inside one loop."""
    n = int(LOOP * RATE)
    out = [0.0] * n
    for off_b, chunk in seq_list:
        s = [x * vol for x in chunk]
        start = int(off_b * BEAT * RATE)
        for i, v in enumerate(s):
            j = start + i
            if 0 <= j < n:
                out[j] += v
    return out

# home — gentle marimba-ish C major, quarter notes only (was 8th-note arps = ringy),
# soft sine bass. Feels like a sunny uke, not a music box.
home_lay = []
mel = [(0, 262), (1, 330), (2, 392), (3, 262),
       (4, 330), (5, 392), (6, 523), (7, 392)]
for b, f in mel:
    home_lay.append((b, note(f, 1.1 * BEAT, 'warm', vol=0.55, attack=0.01)))
home_bass_lay = []
for b, f in [(0, 131), (2, 98), (4, 131), (6, 196)]:
    home_bass_lay.append((b, note(f, 1.8 * BEAT, 'sine', vol=0.5, attack=0.02)))
home = mix(place(home_lay), place(home_bass_lay))
peak = max(abs(s) for s in home)
write_wav('music_home.wav', [s / peak * 0.62 for s in home])

# guess — warm low pulse + sparse A-minor hint, no 16th hats (hats = ringy ticks)
guess_lay = []
for b, f in [(0, 220), (2, 262), (4, 330), (6, 262)]:
    guess_lay.append((b, note(f, 1.4 * BEAT, 'sine', vol=0.30, attack=0.015)))
guess_bass = []
for b in range(8):
    guess_bass.append((b, note(110, 0.7 * BEAT, 'sine', vol=0.42, attack=0.02)))
guess = mix(place(guess_bass), place(guess_lay))
peak = max(abs(s) for s in guess)
write_wav('music_guess.wav', [s / peak * 0.6 for s in guess])

# reveal — bouncy but rounded: eighths on a warm body, G major, slower 112
rev_lay = []
mel = [392, 494, 587, 392, 494, 587, 784, 587, 494, 392, 494, 587, 784, 988, 784, 587]
for i, f in enumerate(mel):
    rev_lay.append((i * 0.5, note(f, 0.55 * BEAT, 'warm', vol=0.5, attack=0.01)))
rev_bass = []
for b, f in [(0, 196), (4, 262)]:
    rev_bass.append((b, note(f, 1.6 * BEAT, 'sine', vol=0.35, attack=0.02)))
reveal_music = mix(place(rev_lay), place(rev_bass))
peak = max(abs(s) for s in reveal_music)
write_wav('music_reveal.wav', [s / peak * 0.6 for s in reveal_music])

# vote — warm heartbeat (was 55Hz thump + 1200Hz square ticks)
vote_lay = []
for beat_off in (0.0, 0.28):
    vote_lay.append((beat_off, note(65, 0.16, 'sine', vol=0.85, attack=0.015)))
    vote_lay.append((beat_off + 1.0, note(65, 0.16, 'sine', vol=0.85, attack=0.015)))
vote_lay.append((2.0, note(110, 1.8 * BEAT, 'sine', vol=0.22, attack=0.03)))
vote_lay.append((4.0, note(110, 1.8 * BEAT, 'sine', vol=0.22, attack=0.03)))
vote_music = place(vote_lay)
peak = max(abs(s) for s in vote_music)
write_wav('music_vote.wav', [s / peak * 0.6 for s in vote_music])
