"""Read a short text story aloud (tender voice), lines appear as read, illustrated AI-voice end card. No captions beyond the story text.
Usage: python3 assets/make_story.py assets/stories/<id>.json
Spec: {"id","narrator"?, "title","titleSay"|"titleParts", "lines":[{"say"|"parts":[{"say","preset"}],"display":[..],"gap"?}], "endSay", "endLead"?, "music"?}
A line with "parts" is voiced by several presets (e.g. narrator "Con bảo:" + child "Tại mắt mẹ."), joined with a short pause.
"""
import json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
src = open(os.path.join(HERE, "make_short.py"), encoding="utf-8").read(); exec(src[:src.index("spec = json.load")])
spec = json.load(open(sys.argv[1], encoding="utf-8")); sid = spec["id"]; NARR = spec.get("narrator", "lamvy_soft")
work = f"assets/stories/{sid}"; pub = f"public/story/{sid}"; os.makedirs(work, exist_ok=True); os.makedirs(pub, exist_ok=True); os.makedirs("out", exist_ok=True)
def parts_of(x, text_key="say"):
    return x["parts"] if isinstance(x, dict) and "parts" in x else [{"say": x[text_key] if isinstance(x, dict) else x}]
items = [("t", spec.get("titleParts") or [{"say": spec["titleSay"]}])] + [(str(k), parts_of(l)) for k, l in enumerate(spec["lines"])] + [("e", [{"say": spec["endSay"]}])]
ids, credits = {}, 0
for key, parts in items:
    for j, pt in enumerate(parts):
        f = f"{work}/v{key}_{j}.mp3"
        if os.path.exists(f): continue
        prov, voice, model, lang, vs = PRESET[pt.get("preset", NARR)]
        ids[(key, j)] = api("POST", f"/v1/text-to-speech/{voice}", {"text": speak(pt["say"]), "provider": prov, "model_id": model, "language_code": lang, "voice_settings": vs})["id"]
for (key, j), tid in ids.items():
    r = wait(f"/v1/history/{tid}")
    if r["status"] == "failed": sys.exit(f"TTS failed for {key}/{j}: {r.get('error')}")
    open(f"{work}/v{key}_{j}.mp3", "wb").write(http("GET", r["result"]["audio_url"])); credits += r.get("credits_deducted") or 0
def ff(*a): subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *a], check=True)
def dur(p): return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p]))
TRIM = "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,loudnorm=I=-16:TP=-1.5:LRA=11"
D = {}
for key, parts in items:
    segs = []
    for j, pt in enumerate(parts):
        try: print(f"[v{key}_{j}] {stt(f'{work}/v{key}_{j}.mp3')['text']}")
        except Exception as e: print(f"[v{key}_{j}] STT failed: {e}")
        ff("-i", f"{work}/v{key}_{j}.mp3", "-af", TRIM, "-ar", "48000", "-ac", "2", f"{work}/p{key}_{j}.wav"); segs.append(f"{work}/p{key}_{j}.wav")
    if len(segs) == 1: ff("-i", segs[0], f"{pub}/v{key}.wav")
    else:
        ins = sum([["-i", s] for s in segs], []); n = len(segs)
        flt = "".join(f"[{k}:a]apad=pad_dur=0.35[a{k}];" for k in range(n - 1)) + "".join(f"[a{k}]" for k in range(n - 1)) + f"[{n-1}:a]concat=n={n}:v=0:a=1[o]"
        ff(*ins, "-filter_complex", flt, "-map", "[o]", "-ar", "48000", f"{pub}/v{key}.wav")
    D[key] = round(dur(f"{pub}/v{key}.wav"), 3)
props = {"id": sid, "title": spec["title"], "endLead": spec.get("endLead", "Giọng đọc bạn vừa nghe"), "titleDur": D["t"], "endDur": D["e"], **({"music": spec["music"]} if spec.get("music") else {}),
         "lines": [{"text": l.get("say") or " ".join(p["say"] for p in l["parts"]), "display": l.get("display", [l["say"]]), "voiceDur": D[str(k)], **({"gap": l["gap"]} if "gap" in l else {})} for k, l in enumerate(spec["lines"])]}
json.dump(props, open(f"out/{sid}.props.json", "w", encoding="utf-8"), ensure_ascii=False)
subprocess.run(["npx", "remotion", "render", "Story", f"out/{sid}.raw.mp4", f"--props=out/{sid}.props.json", "--crf=18", "--audio-bitrate=192k", "--log=error"], check=True)
ff("-i", f"out/{sid}.raw.mp4", "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", f"out/{sid}.mp4"); os.remove(f"out/{sid}.raw.mp4")
json.dump({"lead": spec.get("endLead", "Giọng đọc bạn vừa nghe")}, open(f"out/{sid}.end.json", "w", encoding="utf-8"), ensure_ascii=False)
subprocess.run(["npx", "remotion", "still", "StoryEndCard", f"out/{sid}_endcard.png", f"--props=out/{sid}.end.json", "--log=error"], check=True)
print(f"DONE out/{sid}.mp4 {dur(f'out/{sid}.mp4'):.1f}s credits={credits}")
