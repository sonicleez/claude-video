"""Read a short text story aloud (tender voice), lines appear as read, illustrated AI-voice end card. No captions beyond the story text.
Usage: python3 assets/make_story.py assets/stories/<id>.json
Spec: {"id","narrator"?, "title","titleSay", "lines":[{"say","display":[..],"gap"?}], "endSay", "music"?}
"""
import json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
src = open(os.path.join(HERE, "make_short.py"), encoding="utf-8").read(); exec(src[:src.index("spec = json.load")])
spec = json.load(open(sys.argv[1], encoding="utf-8")); sid = spec["id"]; NARR = spec.get("narrator", "lamvy_soft")
work = f"assets/stories/{sid}"; pub = f"public/story/{sid}"; os.makedirs(work, exist_ok=True); os.makedirs(pub, exist_ok=True); os.makedirs("out", exist_ok=True)
items = [("t", spec["titleSay"])] + [(str(k), l["say"]) for k, l in enumerate(spec["lines"])] + [("e", spec["endSay"])]
ids, credits = {}, 0
for key, text in items:
    if os.path.exists(f"{work}/v{key}.mp3"): continue
    prov, voice, model, lang, vs = PRESET[NARR]
    ids[key] = api("POST", f"/v1/text-to-speech/{voice}", {"text": speak(text), "provider": prov, "model_id": model, "language_code": lang, "voice_settings": vs})["id"]
for key, tid in ids.items():
    r = wait(f"/v1/history/{tid}")
    if r["status"] == "failed": sys.exit(f"TTS failed for {key}: {r.get('error')}")
    open(f"{work}/v{key}.mp3", "wb").write(http("GET", r["result"]["audio_url"])); credits += r.get("credits_deducted") or 0
def ff(*a): subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *a], check=True)
def dur(p): return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p]))
D = {}
for key, text in items:
    print(f"[v{key}] {stt(f'{work}/v{key}.mp3')['text']}")
    ff("-i", f"{work}/v{key}.mp3", "-af", "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000", f"{pub}/v{key}.wav")
    D[key] = round(dur(f"{pub}/v{key}.wav"), 3)
props = {"id": sid, "title": spec["title"], "titleDur": D["t"], "endDur": D["e"], **({"music": spec["music"]} if spec.get("music") else {}),
         "lines": [{"text": l["say"], "display": l.get("display", [l["say"]]), "voiceDur": D[str(k)], **({"gap": l["gap"]} if "gap" in l else {})} for k, l in enumerate(spec["lines"])]}
json.dump(props, open(f"out/{sid}.props.json", "w", encoding="utf-8"), ensure_ascii=False)
subprocess.run(["npx", "remotion", "render", "Story", f"out/{sid}.raw.mp4", f"--props=out/{sid}.props.json", "--crf=18", "--audio-bitrate=192k", "--log=error"], check=True)
ff("-i", f"out/{sid}.raw.mp4", "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", f"out/{sid}.mp4"); os.remove(f"out/{sid}.raw.mp4")
subprocess.run(["npx", "remotion", "still", "StoryEndCard", f"out/{sid}_endcard.png", "--log=error"], check=True)
print(f"DONE out/{sid}.mp4 {dur(f'out/{sid}.mp4'):.1f}s credits={credits}")
