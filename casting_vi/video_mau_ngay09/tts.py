import json, os, sys, time, urllib.request
B="https://api.itera102.space"; K=os.environ["API_Itera"]; UA={"User-Agent":"tts-client/1.0"}
TEXT=open(sys.argv[1],encoding="utf-8").read().strip()
def req(m,p,b=None):
    r=urllib.request.Request(B+p,method=m,headers={"xi-api-key":K,"Content-Type":"application/json",**UA},data=json.dumps(b).encode() if b else None)
    return json.load(urllib.request.urlopen(r,timeout=60))
def get(u,f): open(f,"wb").write(urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=120).read())
tid=req("POST","/v1/text-to-speech/8PEPqUGgvwN1Fk9KR8jV",{"text":TEXT,"provider":"elevenlabs","model_id":"eleven_v3","language_code":"vi","voice_settings":{"stability":0.5,"speed":1.0},"export_transcript":True})["id"]
for _ in range(100):
    t=req("GET",f"/v1/history/{tid}")
    if t["status"] in("completed","failed"): break
    time.sleep(3)
json.dump(t,open("task.json","w"),ensure_ascii=False,indent=1)
print(t["status"],t.get("error"),"credits",t.get("credits_deducted"),"chars",t.get("characters_used"))
print(json.dumps(t.get("result"),ensure_ascii=False))
r=t["result"]; get(r["audio_url"],"voice.mp3")
for k,v in r.items():
    if k!="audio_url" and isinstance(v,str) and v.startswith("http"): get(v,"voice."+v.rsplit(".",1)[-1])
