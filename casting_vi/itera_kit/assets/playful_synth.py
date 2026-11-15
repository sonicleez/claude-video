"""Synthesize an original playful, bouncy bed -> public/fx/playful.wav: pizzicato plucks, glockenspiel hook, soft kick + claps (~112 BPM)."""
import numpy as np, wave
SR = 44100; L = 40; N = int(SR * L); rng = np.random.default_rng(5); bpm = 112; beat = 60 / bpm
mid = lambda m: 440 * 2 ** ((m - 69) / 12); x = np.zeros((N, 2))
def add(s, at, g, pan=0.0):
    i = int(at * SR); j = min(N, i + len(s))
    if i < N: x[i:j, 0] += s[:j - i] * g * (1 - pan); x[i:j, 1] += s[:j - i] * g * (1 + pan)
def pluck(m, d=0.35):
    t = np.arange(int(SR * d)) / SR; f = mid(m)
    return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(4 * np.pi * f * t) * np.exp(-t / 0.03)) * np.minimum(t / 0.002, 1) * np.exp(-t / 0.09)
def glock(m):
    t = np.arange(int(SR * 1.2)) / SR; f = mid(m)
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.15)) * np.minimum(t / 0.001, 1) * np.exp(-t / 0.45)
t = np.arange(int(SR * 0.3)) / SR; kick = np.sin(2 * np.pi * (50 + 90 * np.exp(-t * 35)) * t) * np.exp(-t / 0.12)
t = np.arange(int(SR * 0.2)) / SR; clap = np.convolve(rng.standard_normal(len(t)), np.ones(6) / 6, "same") * np.exp(-t / 0.05)
t = np.arange(int(SR * 0.04)) / SR; shaker = rng.standard_normal(len(t)) * np.exp(-t / 0.012)
chords = [(60, 64, 67), (55, 59, 62), (57, 60, 64), (53, 57, 60)]  # C G Am F
hook = [76, 79, 81, 79, 76, 74, 72, None, 74, 76, 79, 76, 74, None, 72, None]
nb = int(L / beat)
for b in range(nb):
    tb = b * beat; ch = chords[(b // 4) % 4]
    if b % 2 == 0: add(kick, tb, 0.7)
    if b % 4 in (1, 3): add(clap, tb, 0.35)
    add(shaker, tb + beat / 2, 0.1, 0.4); add(shaker, tb, 0.05, -0.4)
    add(pluck(ch[0] - 12, 0.4), tb, 0.35)
    for k, m in enumerate([ch[1], ch[2], ch[1] + 12]):
        if k < 2: add(pluck(m), tb + beat / 2 + k * beat / 4, 0.18, [-0.5, 0.5][k])
    if b >= 8:
        n = hook[(b * 2) % 16]
        if n: add(glock(n), tb, 0.12, 0.2)
        n2 = hook[(b * 2 + 1) % 16]
        if n2: add(glock(n2), tb + beat / 2, 0.1, -0.2)
y = np.tanh(x * 1.2); y = y / np.max(np.abs(y)) * 0.8
f = int(SR * 1); y[:f] *= np.linspace(0, 1, f)[:, None]; y[-f * 2:] *= np.linspace(1, 0, f * 2)[:, None]
with wave.open("public/fx/playful.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((y * 32767).astype(np.int16).tobytes())
print("ok")
