import sys, numpy as np
from PIL import Image, ImageFilter
src = Image.open(sys.argv[1]).convert("RGB"); W, H = src.size
a = np.asarray(src).astype(np.float32) / 255
r, g, b = a[..., 0], a[..., 1], a[..., 2]
mx, mn = a.max(-1), a.min(-1); sat = (mx - mn) / (mx + 1e-6)
green = (g > r * 1.05) & (g > b * 1.15) & (sat > 0.22) & (mx > 0.18)
m = Image.fromarray((green * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(2.5))
out = src.copy()
def paste(box, dst, scale, flip=False, rot=0):
    piece = src.crop(box); pm = m.crop(box)
    bw, bh = pm.size; fe = int(min(bw, bh) * 0.16)
    yy, xx = np.mgrid[0:bh, 0:bw]; d = np.minimum(np.minimum(xx, bw - 1 - xx), np.minimum(yy, bh - 1 - yy))
    pm = Image.fromarray((np.asarray(pm, np.float32) * np.clip(d / fe, 0, 1)).astype(np.uint8))
    if flip: piece = piece.transpose(Image.FLIP_LEFT_RIGHT); pm = pm.transpose(Image.FLIP_LEFT_RIGHT)
    w, h = int(piece.width * scale), int(piece.height * scale)
    piece = piece.resize((w, h), Image.LANCZOS); pm = pm.resize((w, h), Image.LANCZOS)
    if rot: piece = piece.rotate(rot, expand=True, resample=Image.BICUBIC); pm = pm.rotate(rot, expand=True, resample=Image.BICUBIC)
    # soft shadow under the pasted leaves
    sh = Image.new("RGB", piece.size, (10, 10, 12)); shm = pm.filter(ImageFilter.GaussianBlur(14)).point(lambda v: int(v * 0.45))
    out.paste(sh, (dst[0] + 10, dst[1] + 16), shm); out.paste(piece, dst, pm)
s = W / 2000
B = lambda *v: tuple(int(x * s) for x in v)
paste(B(1000, 0, 1950, 760), B(230, 60), 0.82, flip=True, rot=-6)      # crown daisy + lettuce, mirrored to the empty left side
paste(B(440, 330, 1150, 760), B(380, 300), 0.9, flip=False, rot=4)     # extra lettuce leaves, lower left
paste(B(1350, 200, 1820, 600), B(1180, 240), 0.85, flip=True, rot=-10) # more lettuce on the right
out.save(sys.argv[2], quality=93)
