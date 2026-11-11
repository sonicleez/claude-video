"""python3 stt.py a.mp3 b.mp3 ... -> a.words.json; prints transcript."""
import json, os, sys, time, urllib.request, uuid
B="https://api.itera102.space"; K=os.environ["API_Itera"]; UA="tts-client/1.0"
def post(path):
    bnd=uuid.uuid4().hex; data=open(path,"rb").read()
    parts=[]
    for k,v in [("language_code","vi"),("tag_audio_events","false"),("keyterms","ITERA")]:
        parts.append(f'--{bnd}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
    parts.append(f'--{bnd}\r\nContent-Disposition: form-data; name="file"; filename="a.mp3"\r\nContent-Type: audio/mpeg\r\n\r\n'.encode()+data+b"\r\n")
    body=b"".join(parts)+f"--{bnd}--\r\n".encode()
    r=urllib.request.Request(B+"/v1/speech-to-text",data=body,method="POST",headers={"xi-api-key":K,"User-Agent":UA,"Content-Type":f"multipart/form-data; boundary={bnd}"})
    return json.load(urllib.request.urlopen(r,timeout=120))["task_id"]
ids={f:post(f) for f in sys.argv[1:]}
while ids:
    for f,t in list(ids.items()):
        r=json.load(urllib.request.urlopen(urllib.request.Request(f"{B}/v1/speech-to-text/{t}",headers={"xi-api-key":K,"User-Agent":UA}),timeout=60))
        if r["status"] in("completed","failed"):
            ids.pop(f)
            if r["status"]=="failed": print("FAIL",f); continue
            res=r["result"]; print(f"{f}: {res['text']}")
            w=[{"t":x["text"],"s":round(x["start"],3),"e":round(x["end"],3)} for x in res["words"] if x["type"]=="word"]
            json.dump(w,open(f.rsplit(".",1)[0]+".words.json","w"),ensure_ascii=False)
    time.sleep(3)
