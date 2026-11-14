"""Synthesize an original gentle, spacious bed -> public/fx/vast.wav: slow wide pads, shimmer, sparse bell notes, long hall reverb."""
import numpy as np, wave
SR = 44100; L = 50; N = int(SR * L); rng = np.random.default_rng(21)
mid = lambda m: 440 * 2 ** ((m - 69) / 12)
dry = np.zeros((N, 2))
def add(x, at, g, pan=0.0):
    i = int(at * SR); j = min(N, i + len(x))
    if i < N: dry[i:j, 0] += x[:j - i] * g * (1 - pan); dry[i:j, 1] += x[:j - i] * g * (1 + pan)
chords = [(45, 52, 57, 59, 64), (41, 48, 52, 57, 64), (48, 55, 59, 64, 67), (43, 50, 55, 59, 62)]  # Am(add9) Fmaj7 Cmaj7 G
bar = 8.0
for b in range(int(L / bar) + 1):
    ch = chords[b % 4]; n = int(SR * (bar + 4)); tt = np.arange(n) / SR
    envp = np.minimum(tt / 3.0, 1) * np.minimum((bar + 4 - tt) / 3.0, 1)
    for k, m in enumerate(ch):
        for det, pan in [(0.997, -0.7), (1.003, 0.7)]:
            tone = np.sin(2 * np.pi * mid(m) * det * tt + 0.3 * np.sin(2 * np.pi * 0.11 * tt + k)) + 0.2 * np.sin(2 * np.pi * mid(m) * 2 * det * tt)
            add(tone * envp, b * bar, 0.022, pan)
    shim = np.sin(2 * np.pi * mid(ch[-1] + 24) * tt) * envp * (0.5 + 0.5 * np.sin(2 * np.pi * tt / 5)); add(shim, b * bar, 0.012, 0.3)
    sub = np.sin(2 * np.pi * mid(ch[0] - 12) * tt) * envp; add(sub, b * bar, 0.07)
    for k in range(3):
        m = ch[[2, 4, 3][k]] + 12; nb = int(SR * 4); tb = np.arange(nb) / SR
        bell = (np.sin(2 * np.pi * mid(m) * tb) + 0.35 * np.sin(2 * np.pi * mid(m) * 2.76 * tb) * np.exp(-tb / 0.4)) * np.minimum(tb / 0.005, 1) * np.exp(-tb / 1.6)
        add(bell, b * bar + 1.0 + k * 2.6 + rng.uniform(0, 0.4), 0.05, [-0.6, 0.6, 0.0][k])
# long hall reverb (decorrelated noise IR per channel), FFT convolution
ir_len = int(SR * 5.0); ti = np.arange(ir_len) / SR
wet = np.zeros_like(dry)
for c in range(2):
    ir = rng.standard_normal(ir_len) * np.exp(-ti / 1.4); ir = np.convolve(ir, np.ones(8) / 8, mode="same"); ir /= np.sqrt(np.sum(ir ** 2))
    M = 1 << int(np.ceil(np.log2(N + ir_len)))
    wet[:, c] = np.fft.irfft(np.fft.rfft(dry[:, c], M) * np.fft.rfft(ir, M), M)[:N]
x = dry * 0.45 + wet * 0.9
x = np.tanh(x / np.max(np.abs(x)) * 1.1); x = x / np.max(np.abs(x)) * 0.8
f = int(SR * 3); x[:f] *= np.linspace(0, 1, f)[:, None]; x[-f:] *= np.linspace(1, 0, f)[:, None]
with wave.open("public/fx/vast.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype(np.int16).tobytes())
print("ok")
