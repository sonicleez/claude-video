"""Synthesize an original sweet, gentle melody bed -> public/fx/sweet.wav (~76 BPM, D major, I-V-vi-IV):
soft piano melody + left-hand arpeggios, music-box doubling on the repeat, warm string pad, hall reverb."""
import numpy as np, wave
SR = 44100; bpm = 76; beat = 60 / bpm; L = 62; N = int(SR * L); rng = np.random.default_rng(3)
mid = lambda m: 440 * 2 ** ((m - 69) / 12); dry = np.zeros((N, 2))
def add(s, at, g, pan=0.0):
    i = int(at * SR); j = min(N, i + len(s))
    if 0 <= i < N: dry[i:j, 0] += s[:j - i] * g * (1 - pan); dry[i:j, 1] += s[:j - i] * g * (1 + pan)
def piano(m, d):
    n = int(SR * (d + 1.2)); t = np.arange(n) / SR; f = mid(m)
    s = sum(a * np.sin(2 * np.pi * f * h * (1 + 0.0004 * h) * t) * np.exp(-t * (1.2 + h * 0.9)) for h, a in [(1, 1), (2, 0.45), (3, 0.2), (4, 0.1)])
    return s * np.minimum(t / 0.004, 1) * np.minimum(1, np.maximum(0, (d + 1.2 - t) / 0.6))
def musicbox(m):
    t = np.arange(int(SR * 2)) / SR; f = mid(m + 12)
    return (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * f * 3.01 * t) * np.exp(-t / 0.2)) * np.minimum(t / 0.002, 1) * np.exp(-t / 0.7)
chords = [(50, 57, 62, 66), (45, 52, 57, 61), (47, 54, 59, 62), (43, 50, 55, 59)] * 2   # D A Bm G | D A G A
chords[6] = (43, 50, 55, 59); chords[7] = (45, 52, 57, 61)
mel = [(0,78,1),(1,76,.5),(1.5,74,.5),(2,81,2),(4,76,1),(5,78,.5),(5.5,76,.5),(6,73,2),(8,74,1),(9,78,1),(10,83,1.5),(11.5,81,.5),
       (12,79,1),(13,78,.5),(13.5,76,.5),(14,74,2),(16,78,1),(17,81,1),(18,86,1.5),(19.5,85,.5),(20,83,1),(21,81,1),(22,76,2),
       (24,79,1),(25,78,.5),(25.5,79,.5),(26,83,1),(27,81,1),(28,78,1),(29,76,1),(30,74,2)]
cycle = 32 * beat; start = 2 * beat
for rep in range(int((L - start) / cycle) + 1):
    t0 = start + rep * cycle
    for bar in range(8):
        ch = chords[bar]; tb = t0 + bar * 4 * beat
        # left hand: gentle eighth-note arpeggio
        for k, m in enumerate([ch[0], ch[1], ch[2], ch[3], ch[2], ch[1], ch[2], ch[3]]):
            add(piano(m, beat * 0.6), tb + k * beat / 2, 0.11 if k else 0.16, -0.25)
        # warm string pad
        n = int(SR * (4 * beat + 1.5)); tt = np.arange(n) / SR
        pad = sum(np.sin(2 * np.pi * mid(m + 12) * tt * dt + 0.2 * np.sin(2 * np.pi * 5 * tt)) for m in ch[1:] for dt in (0.998, 1.002))
        pad *= np.minimum(tt / 1.2, 1) * np.minimum(1, (4 * beat + 1.5 - tt) / 1.2); add(pad, tb, 0.012 if rep == 0 else 0.018)
    for b, m, d in mel:
        if rep == 0 and b < 0: continue
        add(piano(m, d * beat), t0 + b * beat, 0.24, 0.15)
        if rep >= 1: add(musicbox(m), t0 + b * beat, 0.07, 0.4)
# hall reverb
ir_len = int(SR * 3.2); ti = np.arange(ir_len) / SR; wet = np.zeros_like(dry)
for c in range(2):
    ir = rng.standard_normal(ir_len) * np.exp(-ti / 0.9); ir = np.convolve(ir, np.ones(10) / 10, "same"); ir /= np.sqrt(np.sum(ir ** 2))
    M = 1 << int(np.ceil(np.log2(N + ir_len))); wet[:, c] = np.fft.irfft(np.fft.rfft(dry[:, c], M) * np.fft.rfft(ir, M), M)[:N]
x = dry * 0.8 + wet * 0.45; x = np.tanh(x / np.max(np.abs(x)) * 1.05); x = x / np.max(np.abs(x)) * 0.8
f = int(SR * 1.5); x[:f] *= np.linspace(0, 1, f)[:, None]; x[-f * 2:] *= np.linspace(1, 0, f * 2)[:, None]
with wave.open("public/fx/sweet.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype(np.int16).tobytes())
print("ok")
