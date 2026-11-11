"""Batch ITERA TTS: python3 gen.py jobs.json -> <name>.mp3 (+ .srt when export_transcript)."""
import json, os, sys, time, urllib.request
_open=urllib.request.urlopen
def _retry(*a,**k):
    for i in range(6):
        try:
            r=_open(*a,**k); d=r.read()
            class R:
                def read(self,*_): return d
            return R()
        except Exception as e:
            if i==5: raise
            time.sleep(2*(i+1))
urllib.request.urlopen=_retry
B="https://api.itera102.space"; K=os.environ["API_Itera"]; UA={"User-Agent":"tts-client/1.0"}
def req(m,p,b=None):
    r=urllib.request.Request(B+p,method=m,headers={"xi-api-key":K,"Content-Type":"application/json",**UA},data=json.dumps(b).encode() if b else None)
    return json.load(urllib.request.urlopen(r,timeout=60))
def get(u,f): open(f,"wb").write(urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=120).read())
PRESET={
 "annhien":dict(provider="elevenlabs",voice="8PEPqUGgvwN1Fk9KR8jV",model_id="eleven_v3",language_code="vi",voice_settings={"stability":0.5,"speed":1.0}),
 "tram":dict(provider="elevenlabs",voice="6Xq32rHt6oAu98TBDKfr",model_id="eleven_v3",language_code="vi",voice_settings={"stability":0.5,"speed":1.0}),
 "minimax_south":dict(provider="minimax",voice="Vietnamese_Articulate_Assistant_v1",model_id="speech-2.8-hd",language_code="Vietnamese",voice_settings={"speed":1.0,"pitch":0,"vol":1.0}),
 "an_bubbly":dict(provider="elevenlabs",voice="zIusdI28yOZPwIBus0aI",model_id="eleven_v3",language_code="vi",voice_settings={"stability":0.5,"speed":1.0}),
 "camhong":dict(provider="elevenlabs",voice="x4KAhuXs2G8TfK9Zr7Q4",model_id="eleven_v3",language_code="vi",voice_settings={"stability":0.5,"speed":1.0}),
 "capcut_hanu":dict(provider="capcut",voice="7491607926562361857",model_id="capcut",language_code="vi",voice_settings={"speed":1.0,"pitch":0}),
 "capcut_sainu":dict(provider="capcut",voice="7491607853086544400",model_id="capcut",language_code="vi",voice_settings={"speed":1.0,"pitch":0}),
}
jobs=json.load(open(sys.argv[1],encoding="utf-8")); ids={}
for j in jobs:
    p=dict(PRESET[j["preset"]]); v=p.pop("voice")
    body={"text":j["text"],**p,"export_transcript":j.get("srt",False)}
    ids[j["name"]]=req("POST",f"/v1/text-to-speech/{v}",body)["id"]
pend=dict(ids); cost=0
while pend:
    for n,t in list(pend.items()):
        r=req("GET",f"/v1/history/{t}")
        if r["status"]=="completed":
            get(r["result"]["audio_url"],f"{n}.mp3"); cost+=r.get("credits_deducted") or 0
            if r["result"].get("srt_url"): get(r["result"]["srt_url"],f"{n}.srt")
            pend.pop(n); print("ok",n,r.get("credits_deducted"))
        elif r["status"]=="failed": print("FAIL",n,r.get("error")); pend.pop(n)
    time.sleep(3)
print("credits",cost)
