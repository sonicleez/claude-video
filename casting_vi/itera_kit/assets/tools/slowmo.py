"""Slow down chosen spans of a video (with an on-screen label) and print a time-remap for later voice-over.
Usage: python3 slowmo.py in.mov out.mp4 '[[13.0,15.0,0.35,"TRƯỚC: CẮT CỨNG, BỊ GIẬT"],[51.5,53.5,0.35,"SAU: MỜ DẦN, MƯỢT MÀ"]]'"""
import json, subprocess, sys
src, out, spans = sys.argv[1], sys.argv[2], json.loads(sys.argv[3])
dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", src]))
W = int(subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width", "-of", "csv=p=0", src]))
font = "public/fonts/BeVietnamPro-ExtraBold.ttf"; parts, t, filt = [], 0.0, []
for a, b, sp, label in spans:
    if a > t: parts.append((t, a, 1.0, None))
    parts.append((a, b, sp, label)); t = b
if t < dur: parts.append((t, dur, 1.0, None))
import os, tempfile
tmp = tempfile.mkdtemp(); W = 1080; lst = []
for i, (a, b, sp, label) in enumerate(parts):
    # one segment at a time (4K 120 fps sources are heavy), scaled to 1080 wide
    f = f"scale={W}:-2,setpts=(PTS-STARTPTS)/{sp},fps=30"
    if label:
        fs = round(W * 0.05)
        f += (f",drawtext=fontfile={font}:text='{label.replace(':', chr(92) + ':')}':fontsize={fs}:fontcolor=0x101010:box=1:boxcolor=0xFFD60A:boxborderw={fs // 2}:x=(w-tw)/2:y=h*0.135"
              f",drawtext=fontfile={font}:text='TỐC ĐỘ {sp}x':fontsize={round(fs * 0.7)}:fontcolor=white:box=1:boxcolor=0x000000@0.6:boxborderw={fs // 3}:x=(w-tw)/2:y=h*0.135+{fs * 2}")
    seg = os.path.join(tmp, f"p{i}.mp4"); lst.append(seg)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-threads", "2", "-ss", str(a), "-to", str(b), "-i", src, "-an", "-vf", f,
                    "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-threads", "2", seg], check=True)
open(os.path.join(tmp, "l.txt"), "w").write("".join(f"file '{p}'\n" for p in lst))
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", os.path.join(tmp, "l.txt"), "-c", "copy", out], check=True)
remap = [[a, b, sp] for a, b, sp, _ in spans]
print(json.dumps(remap))
