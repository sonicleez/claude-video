"""Voice-over an existing screen recording: one TTS line per on-screen step, each placed at its timestamp.
Usage: python3 assets/make_voiceover.py assets/voiceover/<id>.json  ->  out/<id>.mp4 (original audio muted)
Spec: {"id","preset","video","lines":[[start_seconds, "text"], ...], "tempo"?}
Lines never overlap: a line starts at max(its timestamp, previous end + 0.15 s); the script reports any drift."""
import json, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
src = open(os.path.join(HERE, "make_short.py"), encoding="utf-8").read(); exec(src[:src.index("spec = json.load")])
spec = json.load(open(sys.argv[1], encoding="utf-8")); sid = spec["id"]; work = f"assets/voiceover/{sid}"; os.makedirs(work, exist_ok=True); os.makedirs("out", exist_ok=True)
prov, voice, model, lang, vs = PRESET[spec.get("preset", "an_human")]
ids, credits = {}, 0
for k, (t, text) in enumerate(spec["lines"]):
    if not os.path.exists(f"{work}/l{k}.mp3"):
        ids[k] = api("POST", f"/v1/text-to-speech/{voice}", {"text": speak(text), "provider": prov, "model_id": model, "language_code": lang, "voice_settings": vs})["id"]
for k, tid in ids.items():
    r = wait(f"/v1/history/{tid}")
    if r["status"] == "failed": sys.exit(f"TTS failed for line {k}: {r.get('error')}")
    open(f"{work}/l{k}.mp3", "wb").write(http("GET", r["result"]["audio_url"])); credits += r.get("credits_deducted") or 0
def ff(*a): subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *a], check=True)
def dur(p): return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p]))
TRIM = "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse"
starts, end = [], 0.0
for k, (t, text) in enumerate(spec["lines"]):
    if not os.environ.get("SKIP_STT"):
        try: print(f"[l{k}] {stt(f'{work}/l{k}.mp3')['text']}")
        except Exception as e: print(f"[l{k}] STT failed: {e}")
    ff("-i", f"{work}/l{k}.mp3", "-af", f"{TRIM},atempo={spec.get('tempo', 1.0)},loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000", "-ac", "2", f"{work}/l{k}.wav")
    s = max(t, end + 0.15); d = dur(f"{work}/l{k}.wav"); starts.append(s); end = s + d
    print(f"  line {k}: wanted {t:5.1f}s  placed {s:5.1f}s  len {d:4.1f}s" + ("  (late %.1fs)" % (s - t) if s - t > 0.3 else ""))
V = spec["video"]; vd = dur(V)
ins = sum([["-i", f"{work}/l{k}.wav"] for k in range(len(starts))], [])
flt = "".join(f"[{k + 1}:a]adelay={int(s * 1000)}|{int(s * 1000)}[a{k}];" for k, s in enumerate(starts))
n = len(starts)
flt += "".join(f"[a{k}]" for k in range(n)) + f"amix=inputs={n}:normalize=0,apad,atrim=0:{vd}[v0];"
mus = spec.get("music")  # optional {"file","gain"}: soft bed, ducked under the voice (sidechain), faded in/out
if mus:
    ins += ["-stream_loop", "-1", "-i", mus["file"]]; mi = n + 1
    flt += (f"[v0]asplit[vk][vsc];[{mi}:a]atrim=0:{vd},volume={mus.get('gain', 0.25)},afade=t=in:d=1.5,afade=t=out:st={max(0, vd - 2.5)}:d=2.5[m0];"
            f"[m0][vsc]sidechaincompress=threshold=0.02:ratio=6:attack=30:release=500[md];[vk][md]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[vo]")
else:
    flt += "[v0]loudnorm=I=-14:TP=-1.5:LRA=11[vo]"
cover = spec.get("cover")  # optional cover image embedded as the MP4 poster (attached_pic)
extra = (["-i", cover] if cover else [])
maps = ["-map", "0:v", "-map", "[vo]"] + (["-map", f"{n + 2 if mus else n + 1}:v", "-c:v:1", "mjpeg", "-disposition:v:1", "attached_pic"] if cover else [])
ff("-i", V, *ins, *extra, "-filter_complex", flt, *maps, "-c:v:0", "libx264", "-crf", "20", "-preset", "medium", "-pix_fmt:v:0", "yuv420p",
   "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", f"out/{sid}.mp4")
print(f"DONE out/{sid}.mp4 {dur(f'out/{sid}.mp4'):.1f}s credits={credits} last line ends {end:.1f}s / video {vd:.1f}s")
