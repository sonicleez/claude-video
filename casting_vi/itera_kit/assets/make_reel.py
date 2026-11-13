"""Build a cinematic chapter "Reel" (user's reference rhythm) from a spec JSON.
Usage: python3 assets/make_reel.py assets/shorts/<id>.json
Optional "end": {"text"} = narrator reads the end-card tagline aloud.
Optional "narrator": preset for every line without its own "preset" (default an_human).
Optional "hook": {"lines":[<=3 short lines],"text","footage":{...}} = opening claim readable on frame 0 with a narrator line.
Spec: {"id","template":"reel","endLines":[l1,l2],"chapters":[{"prompt","button"?,"title":[1-2 lines],"accent","text","preset"?,
       "footage":{"mixkit":id,"start":s}}], "youtube":{...}}
The typed-prompt + click beat is the signature and plays ONCE (first chapter). Later chapters cut straight in with a
different treatment each ("style": wipe | count | kinetic | slam; auto-assigned when omitted, "count" for numeric titles). Keep 4-5 chapters, lines <= 3 s.
"""
import json, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
# Reuse the ITERA helpers (http/api/wait/stt, PRESET, NARRATOR, speak, display_tokens) defined at the top of make_short.py.
src = open(os.path.join(HERE, "make_short.py"), encoding="utf-8").read()
exec(src[:src.index("spec = json.load")])
import footage
spec = json.load(open(sys.argv[1], encoding="utf-8")); sid = spec["id"]
work = f"assets/shorts/{sid}"; pub = f"public/shorts/{sid}"; os.makedirs(work, exist_ok=True); os.makedirs(pub, exist_ok=True); os.makedirs("out", exist_ok=True)
import re as _re
items = ([("h", spec["hook"])] if spec.get("hook") else []) + [(str(k), c) for k, c in enumerate(spec["chapters"])] + ([("e", spec["end"])] if spec.get("end") else [])
NARRATOR = spec.get("narrator", NARRATOR)
endVoice = None
ids, credits = {}, 0
for key, c in items:
    if os.path.exists(f"{work}/v{key}.mp3"): continue
    prov, voice, model, lang, vs = PRESET[c.get("preset", NARRATOR)]
    ids[key] = api("POST", f"/v1/text-to-speech/{voice}", {"text": speak(c["text"]), "provider": prov, "model_id": model, "language_code": lang, "voice_settings": vs})["id"]
for key, tid in ids.items():
    r = wait(f"/v1/history/{tid}")
    if r["status"] == "failed": sys.exit(f"TTS failed for {key}: {r.get('error')}")
    open(f"{work}/v{key}.mp3", "wb").write(http("GET", r["result"]["audio_url"])); credits += r.get("credits_deducted") or 0
chapters, hook = [], None
for key, c in items:
    res = stt(f"{work}/v{key}.mp3"); print(f"[v{key}] {res['text']}")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{work}/v{key}.mp3", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000", f"{pub}/v{key}.wav"], check=True)
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f"{pub}/v{key}.wav"]))
    ws = [w for w in res["words"] if w["type"] == "word"]
    clean = _re.sub(r"\[[^\]]*\]\s*", "", c["text"])           # audio tags are not caption words
    disp = display_tokens(clean); n = sum(x for _, x in disp); words, i = [], 0
    for t, x in disp:
        if n == len(ws): words.append({"t": t, "s": round(ws[i]["start"], 3), "e": round(ws[i + x - 1]["end"], 3)})
        else: words.append({"t": t, "s": round(i / n * dur, 3), "e": round((i + x) / n * dur, 3)})
        i += x
    if key == "e": endVoice = round(dur, 3); continue
    footage.get(str(c["footage"]["mixkit"]), f"{pub}/f{key}.mp4", c["footage"].get("start", 0), 1.15 + dur + 1.2)
    if key == "h": hook = {"lines": c["lines"][:3], "voiceDur": round(dur, 3), "words": words}
    else: chapters.append({"prompt": c["prompt"], "button": c.get("button", "Tạo giọng"), "title": c["title"][:2], "accent": c.get("accent", ""), "voiceDur": round(dur, 3), "words": words, **({"style": c["style"]} if c.get("style") else {})})
props = {"id": sid, "tag": spec.get("tag", ""), **({"skin": spec["skin"]} if spec.get("skin") else {}), **({"device": spec["device"]} if spec.get("device") else {}), **({"hook": hook} if hook else {}), "chapters": chapters, "endLines": spec.get("endLines", ["Một kịch bản.", "MỌI GIỌNG."]), **({"endVoiceDur": endVoice} if endVoice else {})}
json.dump(props, open(f"out/{sid}.props.json", "w", encoding="utf-8"), ensure_ascii=False)
subprocess.run(["npx", "remotion", "render", "Reel", f"out/{sid}.raw.mp4", f"--props=out/{sid}.props.json", "--crf=18", "--audio-bitrate=192k", "--log=error"], check=True)
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"out/{sid}.raw.mp4", "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", f"out/{sid}.mp4"], check=True)
os.remove(f"out/{sid}.raw.mp4")
total = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f"out/{sid}.mp4"]))
print(f"DONE out/{sid}.mp4 {total:.1f}s credits={credits}")
