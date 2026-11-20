"""Build a calm "Scenic" short (clouds/mountains/sea style) from a spec JSON. No waveform, no captions.
Usage: python3 assets/make_scenic.py assets/shorts/<id>.json
Spec: {"id","narrator"?, "scenes":[{"word","line","label","text","preset"?,"media":M}], "end":{"words":[..],"line","label","text","media":M},
       "youtube":{...}}
M = {"mixkit": id, "start": s} | {"video": path, "boomerang": true, "ambient": true} | {"image": path}
User media: a short phone clip is slowed 2x as a forward+reverse loop (smooth from 60 fps sources); a photo is panned.
"""
import json, os, shutil, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
src = open(os.path.join(HERE, "make_short.py"), encoding="utf-8").read()
exec(src[:src.index("spec = json.load")])
import footage
spec = json.load(open(sys.argv[1], encoding="utf-8")); sid = spec["id"]
NARR = spec.get("narrator", "an_soft")
work = f"assets/shorts/{sid}"; pub = f"public/scenic/{sid}"; os.makedirs(work, exist_ok=True); os.makedirs(pub, exist_ok=True); os.makedirs("out", exist_ok=True)
items = [(str(k), s) for k, s in enumerate(spec["scenes"])] + [("e", spec["end"])]
ids, credits = {}, 0
for key, c in items:
    if os.path.exists(f"{work}/v{key}.mp3"): continue
    prov, voice, model, lang, vs = PRESET[c.get("preset", NARR)]
    ids[key] = api("POST", f"/v1/text-to-speech/{voice}", {"text": speak(c["text"]), "provider": prov, "model_id": model, "language_code": lang, "voice_settings": vs})["id"]
for key, tid in ids.items():
    r = wait(f"/v1/history/{tid}")
    if r["status"] == "failed": sys.exit(f"TTS failed for {key}: {r.get('error')}")
    open(f"{work}/v{key}.mp3", "wb").write(http("GET", r["result"]["audio_url"])); credits += r.get("credits_deducted") or 0
def ff(*a): subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *a], check=True)
def dur_of(p): return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p]))
def prep(key, m, need):
    """Return (file name in pub, kind, ambient file or None)."""
    if "mixkit" in m:
        footage.get(str(m["mixkit"]), f"{pub}/m{key}.mp4", m.get("start", 0), need); return f"m{key}.mp4", "video", None
    if "image" in m:
        ext = os.path.splitext(m["image"])[1].lower() or ".jpg"
        ff("-i", m["image"], "-vf", "scale='min(iw,3200)':-2", "-q:v", "3", f"{pub}/m{key}.jpg"); return f"m{key}.jpg", "image", None
    v = m["video"]; vf = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920"
    if m.get("boomerang"):
        ff("-i", v, "-filter_complex", f"[0:v]{vf},split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1,setpts=2*PTS,fps=30[o]", "-map", "[o]", "-an", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", f"{work}/loop{key}.mp4")
        ff("-stream_loop", "-1", "-i", f"{work}/loop{key}.mp4", "-t", str(need), "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", f"{pub}/m{key}.mp4")
    else:
        ff("-stream_loop", "-1", "-i", v, "-t", str(need), "-an", "-vf", vf + ",fps=30", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", f"{pub}/m{key}.mp4")
    amb = None
    if m.get("ambient"):
        ff("-i", v, "-filter_complex", "[0:a]asplit[a][b];[b]areverse[r];[a][r]concat=n=2:v=0:a=1,atempo=0.5,lowpass=f=6000[o]", "-map", "[o]", f"{work}/amb{key}.wav")
        ff("-stream_loop", "-1", "-i", f"{work}/amb{key}.wav", "-t", str(need), "-af", "loudnorm=I=-24:TP=-3", "-ar", "48000", f"{pub}/amb{key}.wav"); amb = f"amb{key}.wav"
    return f"m{key}.mp4", "video", amb
scenes, end = [], None
for key, c in items:
    if os.environ.get("SKIP_STT"): pass  # STT check skipped (API slow); run assets/stt.py separately
    else:
      try: print(f"[v{key}] {stt(f'{work}/v{key}.mp3')['text']}")
      except Exception as e: print(f"[v{key}] STT failed: {e}")
    if spec.get("voiceFx") == "eerie":
        # Darker, scarier narrator: pitch down (formants kept, still intelligible), a faint lower whisper double
        # a few ms behind, and a cold forest echo. Re-checked with STT below.
        fx = ("[0:a]aformat=channel_layouts=mono,silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
              f"atempo={spec.get('voiceTempo', 1.0)},rubberband=pitch=0.88:formant=preserved,asplit[a][b];"
              "[b]rubberband=pitch=0.78:formant=shifted,highpass=f=180,lowpass=f=2800,volume=0.22,adelay=35[w];"
              "[a][w]amix=inputs=2:normalize=0,aecho=0.85:0.55:110|240:0.22|0.12,equalizer=f=120:t=q:w=1:g=3,loudnorm=I=-16:TP=-1.5:LRA=11[o]")
        ff("-i", f"{work}/v{key}.mp3", "-filter_complex", fx, "-map", "[o]", "-ar", "48000", "-ac", "2", f"{pub}/v{key}.wav")
        ff("-i", f"{pub}/v{key}.wav", "-b:a", "128k", f"{work}/v{key}_fx.mp3")
        if not os.environ.get("SKIP_STT"):
            try: print(f"[v{key} fx] {stt(f'{work}/v{key}_fx.mp3')['text']}")
            except Exception as e: print(f"[v{key} fx] STT failed: {e}")
    else:
        ff("-i", f"{work}/v{key}.mp3", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000", f"{pub}/v{key}.wav")
    d = dur_of(f"{pub}/v{key}.wav")
    media, kind, amb = prep(key, c["media"], max(5, d + 3.0))
    asp = None
    if kind == "image":
        w_, h_ = map(int, subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "stream=width,height", "-of", "csv=p=0", f"{pub}/{media}"]).decode().strip().split(","))
        asp = round(w_ / h_, 4)
    sc = {**({"aspect": asp} if asp else {}), "word": c.get("word", ""), "line": c["line"], "label": c["label"], "media": media, "kind": kind, "voiceDur": round(d, 3), **({"ambient": amb} if amb else {})}
    if key == "e": end = {**sc, "words": c["words"]}
    else: scenes.append(sc)
props = {"id": sid, "scenes": scenes, "end": end, **({"mood": spec["mood"]} if spec.get("mood") else {}), **({"music": spec["music"]} if spec.get("music") else {}), **{k: spec[k] for k in ("chrome", "disclosure", "text", "endEmphasis") if spec.get(k)}}
json.dump(props, open(f"out/{sid}.props.json", "w", encoding="utf-8"), ensure_ascii=False)
subprocess.run(["npx", "remotion", "render", "Scenic", f"out/{sid}.raw.mp4", f"--props=out/{sid}.props.json", "--crf=18", "--audio-bitrate=192k", "--log=error"], check=True)
ff("-i", f"out/{sid}.raw.mp4", "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", f"out/{sid}.mp4")
os.remove(f"out/{sid}.raw.mp4")
print(f"DONE out/{sid}.mp4 {dur_of(f'out/{sid}.mp4'):.1f}s credits={credits}")
