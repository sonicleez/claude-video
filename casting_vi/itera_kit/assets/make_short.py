"""Build one data-driven ITERA Short from a spec JSON: voices (ITERA TTS) -> STT check -> props -> Remotion render.
Usage (from casting_vi/itera_kit): python3 assets/make_short.py assets/shorts/<id>.json
Segments may carry "footage": {"mixkit": <id>, "start": <sec>} for a graded stock-footage backdrop.
Spec: {"id","tag","index","hook":[<=2 lines],"pill","segs":[{"kind":"hook|item|cta","text","preset"?,"title"?,"sub"?,"sample"?}],
       "youtube":{"title","description","tags","localizations"?,"pinned_comment"?}}
Output: out/<id>.mp4 (-14 LUFS). Prints each clip's STT transcript: re-word the spec if a line is garbled.
"""
import json, os, re, subprocess, sys, time, urllib.request, uuid
B = "https://api.itera102.space"; K = os.environ["API_Itera"]; UA = "tts-client/1.0"
# Narrator chosen by the user on 2026-11-11 (voice test D): Ân, eleven_v3, stability 0.0, human-style script.
NARRATOR = "an_human"
PRESET = {
 "an_human": ("elevenlabs", "zIusdI28yOZPwIBus0aI", "eleven_v3", "vi", {"stability": 0.0, "speed": 1.0}),
 # Softer, calmer Ân (user 2026-11-13: "dịu dàng hơn"): higher stability, slightly slower; write calm scripts, use [softly].
 "an_soft": ("elevenlabs", "zIusdI28yOZPwIBus0aI", "eleven_v3", "vi", {"stability": 0.5, "similarity_boost": 0.8, "style": 0.0, "speed": 0.92}),
 # Warm, gentle cast for dialogue skits (user 2026-11-13: "giống người thật, nhẹ nhàng tình cảm hơn").
 "tram_soft": ("elevenlabs", "6Xq32rHt6oAu98TBDKfr", "eleven_v3", "vi", {"stability": 0.5, "similarity_boost": 0.8, "style": 0.0, "speed": 0.94}),
 "camhong_soft": ("elevenlabs", "x4KAhuXs2G8TfK9Zr7Q4", "eleven_v3", "vi", {"stability": 0.5, "similarity_boost": 0.8, "style": 0.0, "speed": 0.94}),
 "annhien_soft": ("elevenlabs", "8PEPqUGgvwN1Fk9KR8jV", "eleven_v3", "vi", {"stability": 0.5, "similarity_boost": 0.8, "style": 0.0, "speed": 0.94}),
 "annhien": ("elevenlabs", "8PEPqUGgvwN1Fk9KR8jV", "eleven_v3", "vi", {"stability": 0.5, "speed": 1.0}),
 "tram": ("elevenlabs", "6Xq32rHt6oAu98TBDKfr", "eleven_v3", "vi", {"stability": 0.5, "speed": 1.0}),
 "camhong": ("elevenlabs", "x4KAhuXs2G8TfK9Zr7Q4", "eleven_v3", "vi", {"stability": 0.5, "speed": 1.0}),
 "an_bubbly": ("elevenlabs", "zIusdI28yOZPwIBus0aI", "eleven_v3", "vi", {"stability": 0.5, "speed": 1.0}),
 "minimax_south": ("minimax", "Vietnamese_Articulate_Assistant_v1", "speech-2.8-hd", "Vietnamese", {"speed": 1.0, "pitch": 0, "vol": 1.0}),
}
def http(method, url, data=None, headers=None, timeout=120):
    for i in range(6):
        try:
            r = urllib.request.urlopen(urllib.request.Request(url, data=data, method=method, headers={"xi-api-key": K, "User-Agent": UA, **(headers or {})}), timeout=timeout)
            return r.read()
        except Exception:
            if i == 5: raise
            time.sleep(2 * (i + 1))
def api(method, path, body=None):
    return json.loads(http(method, B + path, json.dumps(body).encode() if body else None, {"Content-Type": "application/json"}))
def wait(path):
    while True:
        r = api("GET", path)
        if r["status"] in ("completed", "failed"): return r
        time.sleep(2)
def stt(path):
    bnd = uuid.uuid4().hex
    parts = [f'--{bnd}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode() for k, v in [("language_code", "vi"), ("tag_audio_events", "false"), ("keyterms", "ITERA")]]
    parts.append(f'--{bnd}\r\nContent-Disposition: form-data; name="file"; filename="a.mp3"\r\nContent-Type: audio/mpeg\r\n\r\n'.encode() + open(path, "rb").read() + b"\r\n")
    tid = json.loads(http("POST", B + "/v1/speech-to-text", b"".join(parts) + f"--{bnd}--\r\n".encode(), {"Content-Type": f"multipart/form-data; boundary={bnd}"}))["task_id"]
    return wait(f"/v1/speech-to-text/{tid}")["result"]

# Pronunciation: TTS reads "AI" as the Vietnamese word "ai". Speak it as "ây ai"; captions still show "AI".
SAY = [(r"\bAI\b", "ây ai")]
def speak(text):
    for pat, rep in SAY: text = re.sub(pat, rep, text)
    return text
def display_tokens(text):
    """Tokens of the spoken text, each with the caption text to show ("ây ai" -> one caption word "AI")."""
    out, toks, i = [], speak(text).split(), 0
    while i < len(toks):
        if toks[i] == "ây" and i + 1 < len(toks) and re.sub(r"[.,!?]", "", toks[i + 1]) == "ai":
            out.append(("AI" + toks[i + 1][2:], 2)); i += 2
        else:
            out.append((toks[i].replace("Itera", "ITERA"), 1)); i += 1
    return out
spec = json.load(open(sys.argv[1], encoding="utf-8")); sid = spec["id"]
work = f"assets/shorts/{sid}"; pub = f"public/shorts/{sid}"; os.makedirs(work, exist_ok=True); os.makedirs(pub, exist_ok=True); os.makedirs("out", exist_ok=True)
ids = {}
for k, s in enumerate(spec["segs"]):
    if os.path.exists(f"{work}/s{k}.mp3"): continue
    prov, voice, model, lang, vs = PRESET[s.get("preset", NARRATOR)]
    ids[k] = api("POST", f"/v1/text-to-speech/{voice}", {"text": speak(s["text"]), "provider": prov, "model_id": model, "language_code": lang, "voice_settings": vs})["id"]
credits = 0
for k, tid in ids.items():
    r = wait(f"/v1/history/{tid}")
    if r["status"] == "failed": sys.exit(f"TTS failed for seg {k}: {r.get('error')}")
    open(f"{work}/s{k}.mp3", "wb").write(http("GET", r["result"]["audio_url"])); credits += r.get("credits_deducted") or 0
segs = []
for k, s in enumerate(spec["segs"]):
    res = stt(f"{work}/s{k}.mp3"); print(f"[s{k}] {res['text']}")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{work}/s{k}.mp3", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000", f"{pub}/s{k}.wav"], check=True)
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f"{pub}/s{k}.wav"]))
    ws = [w for w in res["words"] if w["type"] == "word"]; disp = display_tokens(s["text"]); n = sum(c for _, c in disp)
    words, i = [], 0
    for t, c in disp:
        if n == len(ws): words.append({"t": t, "s": round(ws[i]["start"], 3), "e": round(ws[i + c - 1]["end"], 3)})
        else: words.append({"t": t, "s": round(i / n * dur, 3), "e": round((i + c) / n * dur, 3)})
        i += c
    segs.append({"kind": s["kind"], "dur": round(dur, 3), "words": words, **{f: s[f] for f in ("title", "sub", "sample") if f in s}})
# Optional stock footage per segment: "footage": {"mixkit": 1808, "start": 2} (see assets/footage.py). It plays until the next footage segment.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
for k, s in enumerate(spec["segs"]):
    if not s.get("footage"): continue
    nxt = next((i for i in range(k + 1, len(segs)) if spec["segs"][i].get("footage")), len(segs))
    span = sum(segs[i]["dur"] + 0.18 for i in range(k, nxt)) + 1.2
    import footage
    footage.get(str(s["footage"]["mixkit"]), f"{pub}/f{k}.mp4", s["footage"].get("start", 0), span)
    segs[k]["footage"] = f"shorts/{sid}/f{k}.mp4"
props = {"id": sid, "tag": spec["tag"], "index": spec.get("index", ""), "hook": spec["hook"][:2], "segs": segs, "pill": spec.get("pill"),
         "endKit": os.path.exists("public/kit/end/art.jpg") and os.path.exists("public/kit/sfx/03-sonic-signature.wav")}
json.dump(props, open(f"out/{sid}.props.json", "w", encoding="utf-8"), ensure_ascii=False)
subprocess.run(["npx", "remotion", "render", "Short", f"out/{sid}.raw.mp4", f"--props=out/{sid}.props.json", "--crf=18", "--audio-bitrate=192k", "--log=error"], check=True)
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"out/{sid}.raw.mp4", "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", f"out/{sid}.mp4"], check=True)
os.remove(f"out/{sid}.raw.mp4")
total = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f"out/{sid}.mp4"]))
print(f"DONE out/{sid}.mp4 {total:.1f}s credits={credits}" + (" WARNING: over 30 s, shorten the script" if total > 30 else ""))
