"""Generate tiny 16-bit mono WAV sound effects for BLUFF IT (procedural, no assets)."""
import math, struct, wave, os

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sounds')
os.makedirs(OUT, exist_ok=True)

RATE = 22050

def env_ad(n, attack=0.01, decay=None):
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

def tone(freq, dur, kind='sine', glide=None, vol=1.0):
    n = int(dur * RATE)
    e = env_ad(n)
    out = []
    for i in range(n):
        t = i / RATE
        f = freq if glide is None else freq + (glide - freq) * (i / n)
        p = 2 * math.pi * f * t
        v = 0.0
        if kind == 'sine':
            v = math.sin(p)
        elif kind == 'square':
            v = 1.0 if math.sin(p) >= 0 else -1.0
            v *= 0.5
        elif kind == 'triangle':
            v = 2 / math.pi * (2 * math.asin(math.sin(p)) )
        elif kind == 'noise':
            import random
            v = random.uniform(-1, 1)
        out.append(v * e[i] * vol)
    return out

def seq(*chunks):
    return [s for c in chunks for s in c]

# pop — tap confirm
write_wav('pop.wav', tone(520, 0.09, 'triangle', 880, 0.9))
# tick — countdown / timer pulse
write_wav('tick.wav', tone(950, 0.05, 'square', 900, 0.35))
# whoosh — screen transition
n = int(0.22 * RATE)
write_wav('whoosh.wav', [
    (1 if (i // 3) % 2 == 0 else -1) * 0.3 * (1 - i / n) * math.sin(2*math.pi*(300+1200*i/n)*i/RATE)
    for i in range(n)
])
# reveal — big answer flip
write_wav('reveal.wav', seq(
    tone(392, 0.08, 'triangle', vol=0.8),
    tone(523, 0.08, 'triangle', vol=0.8),
    tone(659, 0.16, 'triangle', vol=0.9),
))
# win — happy arpeggio
write_wav('win.wav', seq(
    tone(523, 0.09, 'triangle', vol=0.8),
    tone(659, 0.09, 'triangle', vol=0.8),
    tone(784, 0.09, 'triangle', vol=0.8),
    tone(1047, 0.30, 'triangle', vol=0.9),
))
# oops — wrong / bluff caught
write_wav('oops.wav', seq(
    tone(330, 0.10, 'saw' if False else 'triangle', vol=0.7),
    tone(247, 0.22, 'triangle', vol=0.7),
))
# slide — page turn in avatar picker
write_wav('slide.wav', tone(300, 0.12, 'sine', 620, 0.5))
# buzz — wrong verdict (low, short)
write_wav('buzz.wav', seq(tone(140, 0.06, 'square', vol=0.5), tone(140, 0.06, 'square', vol=0.5), tone(140, 0.12, 'square', vol=0.45)))

# ================= BACKGROUND MUSIC (seamless 8-beat loops @ 120 BPM) =================
BEAT = 0.5            # 120 BPM
LOOP = BEAT * 8       # 8 beats -> seamless loop (all notes decay before the end)

def mix(*layers):
    n = max(len(l) for l in layers)
    out = [0.0] * n
    for l in layers:
        for i, s in enumerate(l):
            out[i] += s
    return out

def place(seq_list, offset_beats=0.0, vol=1.0):
    """Place a list of note-chunks on a beat grid inside one loop."""
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

# home — sunny ukulele-ish arp (C major), soft bass
home_notes = []
for b, f in [(0, 262), (0.5, 330), (1, 392), (1.5, 523), (2, 440), (2.5, 523), (3, 659), (3.5, 523),
             (4, 330), (4.5, 392), (5, 494), (5.5, 659), (6, 440), (6.5, 523), (7, 659), (7.5, 784)]:
    home_notes.append((b, tone(f, 0.42, 'triangle', vol=0.5)))
home_bass = []
for b, f in [(0, 131), (2, 98), (4, 131), (6, 196)]:
    home_bass.append((b, tone(f, 0.9, 'sine', vol=0.55)))
home = mix(place(home_notes), place(home_bass))
peak = max(abs(s) for s in home)
write_wav('music_home.wav', [s / peak * 0.6 for s in home])

# guess — tension: low pulsing bass + soft 16th hats + sparse minor arp
hat = [((1 if (i // 4) % 2 == 0 else -1) * 0.16) * (1 - i / (int(0.05 * RATE))) for i in range(int(0.05 * RATE))]
hat_lay, arp_lay = [], []
for k in range(32):
    hat_lay.append((k * 0.25, hat))
for b, f in [(0, 220), (0.5, 262), (1, 330), (2, 220), (2.5, 262), (3, 330),
             (4, 220), (4.5, 262), (5, 330), (6, 220), (6.5, 262), (7, 330)]:
    arp_lay.append((b, tone(f, 0.35, 'sine', vol=0.28)))
guess_bass, guess = [], []
for b in range(8):
    guess_bass.append((b, tone(110, 0.4, 'sine', vol=0.4)))
guess = mix(place(guess_bass), place(arp_lay), place(hat_lay, vol=0.5))
peak = max(abs(s) for s in guess)
write_wav('music_guess.wav', [s / peak * 0.6 for s in guess])

# reveal — playful staccato pizzicato (G major), bouncy
rev_lay = []
mel = [392, 494, 587, 784, 587, 494, 392, 494, 392, 494, 587, 784, 988, 784, 587, 494]
for i, f in enumerate(mel):
    rev_lay.append((i * 0.25, tone(f, 0.16, 'triangle', vol=0.5)))
for b, f in [(0, 196), (2, 262), (4, 196), (6, 262)]:
    rev_lay.append((b, tone(f, 0.5, 'sine', vol=0.35)))
reveal_music = place(rev_lay)
peak = max(abs(s) for s in reveal_music)
write_wav('music_reveal.wav', [s / peak * 0.6 for s in reveal_music])

# vote — suspense heartbeat + ticking
vote_lay = []
for b in [0.0, 0.28]:
    vote_lay.append((b, tone(55, 0.18, 'sine', vol=0.9)))
for b in [1.0, 1.28]:
    vote_lay.append((b, tone(55, 0.18, 'sine', vol=0.9)))
for b in range(8):
    vote_lay.append((b + 0.5, tone(1200, 0.03, 'square', vol=0.12)))
vote_lay.append((2.0, tone(110, 1.6, 'sine', vol=0.25)))
vote_lay.append((4.0, tone(110, 1.6, 'sine', vol=0.25)))
vote_music = place(vote_lay)
peak = max(abs(s) for s in vote_music)
write_wav('music_vote.wav', [s / peak * 0.6 for s in vote_music])
