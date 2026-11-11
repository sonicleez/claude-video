"""Apply full SEO to an uploaded YouTube video. Stdlib only; reads the same OAuth env vars as youtube_upload.py.
Usage:
  python3 assets/youtube_seo.py VIDEO_ID --meta assets/dayNN/youtube.json [--srt vi=out/dayNN.vi.srt --srt en=out/dayNN.en.srt]
        [--thumb out/dayNN_thumb.jpg]
Does: snippet (title, description, tags, category, languages) + localizations; replaces captions per language;
custom thumbnail (needs a verified channel); adds the video to the series playlist from meta["playlist"] (created once).
"""
import argparse, json, os, sys, urllib.parse, urllib.request
sys.path.insert(0, os.path.dirname(__file__))
from youtube_upload import access_token, check_seo, UA

API = "https://www.googleapis.com/youtube/v3"


def call(auth, method, url, body=None, ctype="application/json; charset=UTF-8", raw=None):
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    h = {**auth, **({"Content-Type": ctype} if data is not None else {})}
    try:
        r = urllib.request.urlopen(urllib.request.Request(url, data=data, method=method, headers=h), timeout=120)
        txt = r.read()
        return json.loads(txt) if txt else {}
    except urllib.error.HTTPError as e:
        return {"_error": e.code, "_body": e.read()[:300].decode("utf-8", "replace")}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video_id")
    ap.add_argument("--meta", required=True)
    ap.add_argument("--srt", action="append", default=[], help="lang=path")
    ap.add_argument("--thumb")
    a = ap.parse_args()
    m = json.load(open(a.meta, encoding="utf-8"))
    for p in check_seo(m["title"], m["description"], m["tags"]): print("SEO:", p)
    auth = {"Authorization": f"Bearer {access_token()}", **UA}
    vid = a.video_id

    body = {"id": vid, "snippet": {"title": m["title"][:100], "description": m["description"][:5000], "tags": m["tags"],
                                   "categoryId": m.get("categoryId", "28"), "defaultLanguage": "vi", "defaultAudioLanguage": "vi"}}
    parts = "snippet"
    if m.get("localizations"):
        body["localizations"] = m["localizations"]; parts += ",localizations"
    r = call(auth, "PUT", f"{API}/videos?part={parts}", body)
    print("metadata:", "ok" if "_error" not in r else r)

    existing = call(auth, "GET", f"{API}/captions?part=snippet&videoId={vid}").get("items", [])
    for spec in a.srt:
        lang, path = spec.split("=", 1)
        for c in existing:
            if c["snippet"]["language"] == lang:
                call(auth, "DELETE", f"{API}/captions?id={c['id']}")
        bnd = "itera" + os.urandom(6).hex()
        name = {"vi": "Tiếng Việt", "en": "English"}.get(lang, lang)
        meta = json.dumps({"snippet": {"videoId": vid, "language": lang, "name": name, "isDraft": False}})
        raw = (f"--{bnd}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{meta}\r\n--{bnd}\r\nContent-Type: application/x-subrip\r\n\r\n").encode() \
            + open(path, "rb").read() + f"\r\n--{bnd}--\r\n".encode()
        r = call(auth, "POST", "https://www.googleapis.com/upload/youtube/v3/captions?part=snippet&uploadType=multipart",
                 raw=raw, ctype=f"multipart/related; boundary={bnd}")
        print(f"captions {lang}:", "ok" if "_error" not in r else r)

    if a.thumb:
        r = call(auth, "POST", f"https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId={vid}",
                 raw=open(a.thumb, "rb").read(), ctype="image/jpeg")
        print("thumbnail:", "ok" if "_error" not in r else f"not set ({r['_error']}): custom thumbnails need a phone-verified channel; Shorts feed may still show a video frame")

    pl = m.get("playlist")
    if pl:
        mine = call(auth, "GET", f"{API}/playlists?part=snippet&mine=true&maxResults=50").get("items", [])
        pid = next((p["id"] for p in mine if p["snippet"]["title"] == pl["title"]), None)
        if not pid:
            r = call(auth, "POST", f"{API}/playlists?part=snippet,status",
                     {"snippet": {"title": pl["title"], "description": pl.get("description", ""), "defaultLanguage": "vi"},
                      "status": {"privacyStatus": "public"}})
            pid = r.get("id"); print("playlist created:", pid or r)
        items = call(auth, "GET", f"{API}/playlistItems?part=snippet&playlistId={pid}&maxResults=50").get("items", [])
        if pid and not any(i["snippet"]["resourceId"]["videoId"] == vid for i in items):
            r = call(auth, "POST", f"{API}/playlistItems?part=snippet",
                     {"snippet": {"playlistId": pid, "resourceId": {"kind": "youtube#video", "videoId": vid}}})
            print("playlist add:", "ok" if "_error" not in r else r)
        else:
            print("playlist: already in", pid)

    v = call(auth, "GET", f"{API}/videos?part=snippet,status,localizations,contentDetails&id={vid}")["items"][0]
    print("now:", v["snippet"]["title"], "|", v["status"]["privacyStatus"], "| synthetic:", v["status"].get("containsSyntheticMedia"),
          "| duration:", v["contentDetails"]["duration"], "| langs:", list(v.get("localizations", {}).keys()))


if __name__ == "__main__":
    main()
