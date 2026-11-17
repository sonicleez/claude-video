"""Synthesize an original gentle lullaby about mother -> public/fx/lullaby.wav: 3/4 at ~66 BPM, F major pentatonic melody
(ru-con feel) on soft piano + music box, warm low pad, slow rocking bass, hall reverb. No third-party samples."""
import numpy as np, wave
SR = 44100; bpm = 66; beat = 60 / bpm; L = 66; N = int(SR * L); rng = np.random.default_rng(9)
mid = lambda m: 440 * 2 ** ((m - 69) / 12); dry = np.zeros((N, 2))
def add(s, at, g, pan=0.0):
    i = int(at * SR); j = min(N, i + len(s))
    if 0 <= i < N: dry[i:j, 0] += s[:j - i] * g * (1 - pan); dry[i:j, 1] += s[:j - i] * g * (1 + pan)
def piano(m, d, soft=1.0):
    n = int(SR * (d + 1.6)); t = np.arange(n) / SR; f = mid(m)
    s = sum(a * np.sin(2 * np.pi * f * h * t) * np.exp(-t * (1.0 + h * 1.1)) for h, a in [(1, 1), (2, 0.35 * soft), (3, 0.12 * soft)])
    return s * np.minimum(t / 0.008, 1) * np.minimum(1, np.maximum(0, (d + 1.6 - t) / 0.8))
def mbox(m):
    t = np.arange(int(SR * 2.2)) / SR; f = mid(m + 12)
    return (np.sin(2 * np.pi * f * t) + 0.2 * np.sin(2 * np.pi * f * 3 * t) * np.exp(-t / 0.15)) * np.minimum(t / 0.002, 1) * np.exp(-t / 0.8)
# chords per bar (3 beats): F  Dm  Bb  C | F  Am  Bb-C  F
ch = [(41, 48, 53, 57), (38, 45, 50, 53), (46, 53, 58, 62), (48, 55, 60, 64), (41, 48, 53, 57), (45, 52, 57, 60), (46, 53, 58, 62), (41, 48, 53, 57)]
# pentatonic melody F G A C D (65 67 69 72 74 77), beats within each 3-beat bar: (beat, midi, dur)
mel = [(0, 72, 1.5), (1.5, 69, .5), (2, 67, 1), (3, 69, 2), (5, 65, 1), (6, 70, 1.5), (7.5, 69, .5), (8, 67, 1), (9, 67, 2), (11, 64, 1),
       (12, 72, 1.5), (13.5, 74, .5), (14, 72, 1), (15, 69, 2), (17, 67, 1), (18, 65, 1), (19, 67, 1), (20, 69, 1), (21, 65, 3)]
cyc = 24 * beat; t0 = 1.5
for rep in range(int((L - t0) / cyc) + 1):
    base = t0 + rep * cyc
    for bar in range(8):
        c = ch[bar]; tb = base + bar * 3 * beat
        add(piano(c[0] - 12 if rep else c[0], beat * 2.5, 0.5), tb, 0.14, -0.2)                   # rocking bass on beat 1
        for k, m in enumerate((c[1], c[2])): add(piano(m + 12, beat * 0.8, 0.6), tb + (k + 1) * beat, 0.07, -0.3)  # soft "dah-dah" on 2 and 3
        n = int(SR * (3 * beat + 2)); tt = np.arange(n) / SR
        pad = sum(np.sin(2 * np.pi * mid(m + 12) * tt * d) for m in c[1:] for d in (0.997, 1.003)) * np.minimum(tt / 1.5, 1) * np.minimum(1, (3 * beat + 2 - tt) / 1.5)
        add(pad, tb, 0.009)
    for b, m, d in mel:
        add(piano(m, d * beat), base + b * beat, 0.2, 0.1)
        if rep % 2 == 1: add(mbox(m), base + b * beat, 0.05, 0.4)
ir_len = int(SR * 3.6); ti = np.arange(ir_len) / SR; wet = np.zeros_like(dry)
for c in range(2):
    ir = rng.standard_normal(ir_len) * np.exp(-ti / 1.0); ir = np.convolve(ir, np.ones(12) / 12, "same"); ir /= np.sqrt(np.sum(ir ** 2))
    M = 1 << int(np.ceil(np.log2(N + ir_len))); wet[:, c] = np.fft.irfft(np.fft.rfft(dry[:, c], M) * np.fft.rfft(ir, M), M)[:N]
x = dry * 0.75 + wet * 0.55; x = np.tanh(x / np.max(np.abs(x)) * 1.05); x = x / np.max(np.abs(x)) * 0.8
f = int(SR * 2); x[:f] *= np.linspace(0, 1, f)[:, None]; x[-f * 2:] *= np.linspace(1, 0, f * 2)[:, None]
with wave.open("public/fx/lullaby.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype(np.int16).tobytes())
print("ok")
