"""Cover/thumbnail maker: background frame + bold stacked headline with a highlight chip. Usage: python3 cover.py bg.png out.png"""
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont
F = "public/fonts/BeVietnamPro-ExtraBold.ttf"; M = "public/fonts/BeVietnamPro-SemiBold.ttf"
bg = Image.open(sys.argv[1]).convert("RGB").resize((1080, 1920))
W, H = bg.size
# darken top & bottom for text
grad = Image.new("L", (1, H)); 
for y in range(H):
    a = max(0, 1 - y / 900) * 200 if y < 900 else max(0, (y - 1300) / 620) * 170
    grad.putpixel((0, y), int(a))
dark = Image.new("RGB", (W, H), (8, 8, 12)); bg = Image.composite(dark, bg, grad.resize((W, H)))
d = ImageDraw.Draw(bg)
def text(xy, s, size, fill, font=F, shadow=True, anchor="la"):
    f = ImageFont.truetype(font, size)
    if shadow:
        sh = Image.new("RGBA", (W, H), (0, 0, 0, 0)); ImageDraw.Draw(sh).text((xy[0] + 6, xy[1] + 8), s, font=f, fill=(0, 0, 0, 170), anchor=anchor)
        bg.paste(Image.alpha_composite(bg.convert("RGBA"), sh.filter(ImageFilter.GaussianBlur(8))).convert("RGB"))
    ImageDraw.Draw(bg).text(xy, s, font=f, fill=fill, anchor=anchor); return f
# kicker chip
f = ImageFont.truetype(M, 44); s = "MẸO CAPCUT"; tw = d.textlength(s, font=f)
d.rounded_rectangle((70, 150, 70 + tw + 56, 230), 40, fill=(255, 255, 255)); d.text((98, 162), s, font=f, fill=(15, 15, 20))
text((70, 270), "NỐI VIDEO", 150, (255, 255, 255))
# highlighted word on a yellow tilted chip
f = ImageFont.truetype(F, 170); s = "MƯỢT MÀ"; tw = d.textlength(s, font=f)
chip = Image.new("RGBA", (int(tw) + 80, 230), (0, 0, 0, 0)); cd = ImageDraw.Draw(chip)
cd.rounded_rectangle((0, 0, chip.width - 1, 229), 28, fill=(255, 214, 10)); cd.text((40, 12), s, font=f, fill=(15, 15, 20))
chip = chip.rotate(-3, expand=True, resample=Image.BICUBIC); bg.paste(chip, (55, 445), chip)
text((70, 700), "KHÔNG KẼ HỞ", 128, (255, 255, 255))
# bottom line
text((70, 1700), "Lớp phủ + độ trong suốt + keyframe", 46, (255, 255, 255), font=M)
text((70, 1775), "Lồng tiếng AI · ITERA", 36, (220, 220, 220), font=M)
bg.save(sys.argv[2], quality=95)
