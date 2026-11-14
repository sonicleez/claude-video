"""Synthesize an original calm ambient bed (no drums) -> public/fx/ambient.wav. Soft pads, slow plucks, air. No third-party samples."""
import numpy as np, wave
SR = 44100; L = 48; N = int(SR * L); rng = np.random.default_rng(7); mix = np.zeros((N, 2))
mid = lambda m: 440 * 2 ** ((m - 69) / 12)
def add(x, at, g, pan=0.0):
    i = int(at * SR); j = min(N, i + len(x))
    if i < N: mix[i:j, 0] += x[:j - i] * g * (1 - pan) ; mix[i:j, 1] += x[:j - i] * g * (1 + pan)
chords = [(48, 55, 59, 64), (45, 52, 55, 60), (41, 48, 52, 57), (43, 50, 55, 59)]  # Cmaj7 Am7 Fmaj7 G
bar = 6.0
for b in range(int(L / bar) + 1):
    ch = chords[b % 4]; tt = np.arange(int(SR * (bar + 2))) / SR
    pad = sum(np.sin(2 * np.pi * mid(m) * tt + 0.4 * np.sin(2 * np.pi * 0.13 * tt + m)) + 0.25 * np.sin(2 * np.pi * mid(m + 12) * 1.003 * tt) for m in ch)
    pad *= np.minimum(tt / 2.0, 1) * np.minimum((bar + 2 - tt) / 2.0, 1); add(pad, b * bar, 0.05, -0.2); add(pad, b * bar + 0.02, 0.05, 0.2)
    for k in range(6):
        n = ch[[3, 1, 2, 3, 2, 1][k]] + 12; ta = np.arange(int(SR * 2.5)) / SR
        pl = (np.sin(2 * np.pi * mid(n) * ta) + 0.3 * np.sin(2 * np.pi * mid(n) * 2 * ta)) * np.minimum(ta / 0.01, 1) * np.exp(-ta / 0.9)
        add(pl, b * bar + k * 1.0 + 0.5, 0.05, [-0.5, 0.5][k % 2])
air = np.convolve(rng.standard_normal(N), np.ones(400) / 400, mode="same"); air *= 0.6 + 0.4 * np.sin(2 * np.pi * np.arange(N) / SR / 9)
mix[:, 0] += air * 0.25; mix[:, 1] += np.roll(air, 2000) * 0.25
x = np.tanh(mix * 1.2); x = x / np.max(np.abs(x)) * 0.8
f = int(SR * 2); x[:f] *= np.linspace(0, 1, f)[:, None]; x[-f:] *= np.linspace(1, 0, f)[:, None]
with wave.open("public/fx/ambient.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype(np.int16).tobytes())
print("ok")
