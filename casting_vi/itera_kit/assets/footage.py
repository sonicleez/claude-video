"""Find and prepare stock footage from Mixkit (Mixkit Free License: free for commercial use, no attribution;
skip items marked "Restricted"). Stdlib + ffmpeg.
  python3 assets/footage.py search "typing laptop"            -> id<TAB>slug lines
  python3 assets/footage.py get 1808 out.mp4 [start] [dur]    -> 1080x1920, 30 fps, muted, centre-cropped clip
  python3 assets/footage.py sheet out.jpg 1808 4827 ...       -> contact sheet (middle frame of each) to choose from
Always look at the sheet before using a clip: no logos, readable brand names, or identifiable faces in close-up.
"""
import os, re, subprocess, sys, tempfile, urllib.parse, urllib.request
UA = {"User-Agent": "Mozilla/5.0"}
def fetch(url, timeout=60):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout).read()
def search(q):
    html = fetch("https://mixkit.co/free-stock-video/" + urllib.parse.quote(q.strip().replace(" ", "-")) + "/").decode("utf-8", "replace")
    seen = []
    for slug, vid in re.findall(r'href="/free-stock-video/([a-z0-9-]+)-(\d+)/"', html):
        if vid not in [v for v, _ in seen]: seen.append((vid, slug))
    return seen
def download(vid):
    path = os.path.join(tempfile.gettempdir(), f"mixkit_{vid}.mp4")
    if os.path.exists(path) and os.path.getsize(path) > 10000: return path
    for res in ("1080", "720"):
        try:
            open(path, "wb").write(fetch(f"https://assets.mixkit.co/videos/{vid}/{vid}-{res}.mp4", 180)); return path
        except Exception:
            continue
    sys.exit(f"cannot download mixkit {vid}")
def get(vid, out, start=0.0, dur=6.0):
    src = download(vid)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-stream_loop", "-1", "-ss", str(start), "-i", src, "-t", str(dur), "-an", "-r", "30",
                    "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920", "-c:v", "libx264", "-crf", "20", "-pix_fmt", "yuv420p", out], check=True)
if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "search":
        for vid, slug in search(sys.argv[2])[:24]: print(f"{vid}\t{slug}")
    elif cmd == "get":
        get(sys.argv[2], sys.argv[3], float(sys.argv[4]) if len(sys.argv) > 4 else 0, float(sys.argv[5]) if len(sys.argv) > 5 else 6)
    elif cmd == "sheet":
        ins, flt = [], []
        for i, vid in enumerate(sys.argv[3:]):
            src = download(vid)
            d = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", src]))
            ins += ["-ss", str(d / 2), "-i", src]
            flt.append(f"[{i}:v]scale=270:480:force_original_aspect_ratio=increase,crop=270:480,drawtext=text='{vid} {d:.0f}s':fontcolor=white:fontsize=22:x=8:y=8:box=1:boxcolor=black@0.6[v{i}]")
        n = len(flt)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *ins, "-filter_complex", ";".join(flt) + ";" + "".join(f"[v{i}]" for i in range(n)) + f"hstack={n}", "-frames:v", "1", sys.argv[2]], check=True)
