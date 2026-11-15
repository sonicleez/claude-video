import sys, numpy as np
from PIL import Image, ImageFilter
src, out, k, thr = sys.argv[1], sys.argv[2], int(sys.argv[3]), float(sys.argv[4])
im = Image.open(src).convert("RGB")
W, H = im.size; s = 1400 / W; small = im.resize((1400, int(H * s)), Image.LANCZOS)
g = small.convert("L")
clo = g.filter(ImageFilter.MaxFilter(k)).filter(ImageFilter.MinFilter(k))
bh = np.asarray(clo, np.float32) - np.asarray(g, np.float32)
mask = bh > thr
m = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))
mask = np.asarray(m) > 0
a = np.asarray(small, np.float32).copy()
# init masked pixels with the morphological closing per channel, then diffuse
for c in range(3):
    ch = Image.fromarray(a[..., c].astype(np.uint8)).filter(ImageFilter.MaxFilter(k)).filter(ImageFilter.MinFilter(k))
    a[..., c][mask] = np.asarray(ch, np.float32)[mask]
for it in range(60):
    b = np.asarray(Image.fromarray(a.clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2)), np.float32)
    a[mask] = b[mask]
res = Image.fromarray(a.clip(0, 255).astype(np.uint8)).resize((W, H), Image.LANCZOS)
# keep full-res detail outside the mask
mfull = Image.fromarray((mask * 255).astype(np.uint8)).resize((W, H), Image.BILINEAR).filter(ImageFilter.GaussianBlur(1.5))
Image.composite(res, im, mfull).save(out, quality=92)
print("masked %.1f%%" % (mask.mean() * 100))
