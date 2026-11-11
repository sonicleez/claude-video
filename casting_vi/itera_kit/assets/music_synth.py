"""Synthesize an original cinematic bed (~86 BPM, half-time) -> public/fx/bed86.wav. No third-party samples."""
import numpy as np, wave
SR = 44100; rng = np.random.default_rng(11); bpm = 86; beat = 60 / bpm; L = 34; N = int(SR * L); mix = np.zeros(N)
def env(n, a, d): t = np.arange(n) / SR; return np.minimum(t / a, 1) * np.exp(-t / d)
def add(x, at, g=1.0):
    i = int(at * SR); j = min(N, i + len(x))
    if i < N: mix[i:j] += x[:j - i] * g
def lp(x, a):
    y = np.zeros_like(x); acc = 0.0
    for i, v in enumerate(x): acc += a * (v - acc); y[i] = acc
    return y
t = np.arange(int(SR * 0.7)) / SR; kick = np.sin(2 * np.pi * (42 + 120 * np.exp(-t * 26)) * t) * env(len(t), 0.002, 0.2)
t = np.arange(int(SR * 0.35)) / SR; clap = lp(rng.standard_normal(len(t)), 0.3) * env(len(t), 0.001, 0.09)
t = np.arange(int(SR * 0.05)) / SR; hat = np.diff(np.concatenate([[0], rng.standard_normal(len(t))])) * env(len(t), 0.0005, 0.012)
mid = lambda m: 440 * 2 ** ((m - 69) / 12)
chords = [(50, 57, 62, 65), (46, 53, 58, 62), (48, 55, 60, 64), (45, 52, 57, 60)]  # Dm Bb C Am
nb = int(L / beat)
for b in range(nb):
    tb = b * beat
    if b % 4 == 0 or b % 8 == 6: add(kick, tb, 1.0)
    if b % 4 == 2: add(clap, tb, 0.5)
    add(hat, tb + beat / 2, 0.12); add(hat, tb + beat * 0.75, 0.05)
for bar in range(nb // 4 + 1):
    ch = chords[bar % 4]; tb = bar * 4 * beat; d = 4 * beat; tt = np.arange(int(SR * d)) / SR
    pad = sum(np.sin(2 * np.pi * mid(m) * tt + 0.3 * np.sin(2 * np.pi * 0.2 * tt)) + 0.4 * np.sin(2 * np.pi * mid(m) * 2.005 * tt) for m in ch)
    pad *= np.minimum(tt / 0.6, 1) * np.minimum((d - tt) / 0.6, 1); add(pad, tb, 0.045)
    sub = np.sin(2 * np.pi * mid(ch[0] - 12) * tt) * np.minimum(tt / 0.03, 1) * np.minimum((d - tt) / 0.2, 1); add(sub, tb, 0.2)
    for k in range(8):  # slow arpeggio
        n = ch[(k * 2) % 4] + 12; ta = np.arange(int(SR * 0.5)) / SR
        add(np.sin(2 * np.pi * mid(n) * ta) * env(len(ta), 0.004, 0.16), tb + k * beat / 2, 0.06)
x = np.tanh(mix * 1.3); x = x / np.max(np.abs(x)) * 0.85; x[-int(SR * 1.5):] *= np.linspace(1, 0, int(SR * 1.5))
st = np.stack([x, x], 1)
with wave.open("public/fx/bed86.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype(np.int16).tobytes())
print("ok")
