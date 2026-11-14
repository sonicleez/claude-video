"""Synthesize an original eerie bed -> public/fx/eerie.wav: low beating drone, cold dissonant pad, wind, slow heartbeat, reverse swells."""
import numpy as np, wave
SR = 44100; L = 48; N = int(SR * L); t = np.arange(N) / SR; rng = np.random.default_rng(13)
mid = lambda m: 440 * 2 ** ((m - 69) / 12)
x = np.zeros((N, 2))
drone = sum(np.sin(2 * np.pi * f * t + 0.6 * np.sin(2 * np.pi * 0.07 * t * (k + 1))) for k, f in enumerate([mid(26), mid(26) * 1.004, mid(33) * 0.997]))
x[:, 0] += drone * 0.22; x[:, 1] += np.roll(drone, 900) * 0.22
pad = (np.sin(2 * np.pi * mid(74) * t) + np.sin(2 * np.pi * mid(75) * t) * 0.8) * (0.5 + 0.5 * np.sin(2 * np.pi * t / 11 - 1.2)) ** 2
x[:, 0] += pad * 0.035; x[:, 1] += np.roll(pad, 3000) * 0.035
wind = np.convolve(rng.standard_normal(N), np.ones(120) / 120, mode="same") * (0.5 + 0.5 * np.sin(2 * np.pi * t / 7.3)) * 0.9
x[:, 0] += wind * 0.35; x[:, 1] += np.roll(wind, 4000) * 0.35
def thump(at, g):
    n = int(SR * 0.35); tt = np.arange(n) / SR; s = np.sin(2 * np.pi * (38 + 40 * np.exp(-tt * 30)) * tt) * np.exp(-tt / 0.09)
    i = int(at * SR); j = min(N, i + n)
    if i < N: x[i:j] += (s[:j - i] * g)[:, None]
for b in np.arange(3.0, L - 2, 2.4): thump(b, 0.55); thump(b + 0.32, 0.35)
for s0 in [5.0, 13.0, 21.5, 30.0, 38.0]:
    n = int(SR * 2.2); tt = np.arange(n) / SR; sw = rng.standard_normal(n) * (tt / 2.2) ** 3; sw = np.convolve(sw, np.ones(30) / 30, mode="same")
    i = int(s0 * SR); x[i:i + n] += (sw * 0.5)[:, None]
y = np.tanh(x * 1.4); y = y / np.max(np.abs(y)) * 0.8
f = int(SR * 2); y[:f] *= np.linspace(0, 1, f)[:, None]; y[-f:] *= np.linspace(1, 0, f)[:, None]
with wave.open("public/fx/eerie.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((y * 32767).astype(np.int16).tobytes())
print("ok")
