"""Upload a video to YouTube (Data API v3, resumable upload). Stdlib only.

Reads OAuth settings from environment variables (never printed):
  Google_Client_ID, Google_Client_secret, Refresh_token   (Access_token is used only if no refresh token)

Usage:
  python3 assets/youtube_upload.py VIDEO.mp4 --meta assets/day01/youtube.json [--srt out/day01.vi.srt]
        [--privacy private|unlisted|public] [--publish-at 2026-11-20T12:30:00Z] [--dry-run]
--meta JSON: {"title", "description", "tags": [...], "categoryId"}; --title/--desc-file still work for quick tests.
Defaults to private so a test upload is never public by accident. --publish-at schedules it (YouTube needs private + publishAt).
Marks the video as altered/synthetic (AI voice). Caption upload needs the youtube.force-ssl scope.
"""
import argparse, json, os, sys, urllib.parse, urllib.request

UA = {"User-Agent": "itera-uploader/1.0"}


def access_token() -> str:
    cid, sec, rt = (os.environ.get(k) for k in ("Google_Client_ID", "Google_Client_secret", "Refresh_token"))
    if cid and sec and rt:
        body = urllib.parse.urlencode({"client_id": cid, "client_secret": sec, "refresh_token": rt, "grant_type": "refresh_token"}).encode()
        r = urllib.request.Request("https://oauth2.googleapis.com/token", data=body, headers=UA)
        try:
            tok = json.load(urllib.request.urlopen(r, timeout=30))
        except urllib.error.HTTPError as e:
            sys.exit(f"Token refresh failed: HTTP {e.code} {json.load(e).get('error', '')}")
        print("Token refreshed; scopes:", tok.get("scope", "?"))
        return tok["access_token"]
    at = os.environ.get("Access_token")
    if at:
        print("Using Access_token (no refresh token found; it expires after ~1 hour).")
        return at
    sys.exit("Missing Google_Client_ID / Google_Client_secret / Refresh_token in the environment.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--meta")
    ap.add_argument("--title")
    ap.add_argument("--srt")
    ap.add_argument("--publish-at")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--desc-file")
    ap.add_argument("--tags", default="")
    ap.add_argument("--privacy", default="private", choices=["private", "unlisted", "public"])
    a = ap.parse_args()
    m = json.load(open(a.meta, encoding="utf-8")) if a.meta else {}
    title = a.title or m.get("title") or sys.exit("Need --title or --meta with a title")
    desc = open(a.desc_file, encoding="utf-8").read() if a.desc_file else m.get("description", "")
    tags = [t for t in a.tags.split(",") if t] or m.get("tags", [])
    problems = check_seo(title, desc, tags)
    for p_ in problems: print("SEO:", p_)
    if a.dry_run:
        print(json.dumps({"title": title, "tags": tags, "chars_desc": len(desc)}, ensure_ascii=False)); return
    tok = access_token()
    auth = {"Authorization": f"Bearer {tok}", **UA}

    ch = json.load(urllib.request.urlopen(urllib.request.Request(
        "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", headers=auth), timeout=30))
    if not ch.get("items"):
        sys.exit("Token works but no channel found for this account.")
    print("Channel:", ch["items"][0]["snippet"]["title"])

    meta = {
        "snippet": {"title": title[:100], "description": desc[:5000], "tags": tags, "categoryId": m.get("categoryId", "28"),
                    "defaultLanguage": "vi", "defaultAudioLanguage": "vi"},
        "status": {"privacyStatus": "private" if a.publish_at else a.privacy, "selfDeclaredMadeForKids": False,
                   "containsSyntheticMedia": True, **({"publishAt": a.publish_at} if a.publish_at else {})},
    }
    size = os.path.getsize(a.video)
    init = urllib.request.Request(
        "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
        data=json.dumps(meta).encode(), method="POST",
        headers={**auth, "Content-Type": "application/json; charset=UTF-8",
                 "X-Upload-Content-Type": "video/mp4", "X-Upload-Content-Length": str(size)})
    try:
        loc = urllib.request.urlopen(init, timeout=60).headers["Location"]
    except urllib.error.HTTPError as e:
        sys.exit(f"Upload init failed: HTTP {e.code} {e.read()[:400]!r}")
    put = urllib.request.Request(loc, data=open(a.video, "rb").read(), method="PUT",
                                 headers={**auth, "Content-Type": "video/mp4", "Content-Length": str(size)})
    try:
        res = json.load(urllib.request.urlopen(put, timeout=600))
    except urllib.error.HTTPError as e:
        sys.exit(f"Upload failed: HTTP {e.code} {e.read()[:400]!r}")
    print("Uploaded:", res["id"], res["status"]["privacyStatus"], res["status"].get("publishAt", ""), f"https://youtube.com/shorts/{res['id']}")
    if a.srt:
        upload_captions(auth, res["id"], a.srt)


def check_seo(title, desc, tags):
    out = []
    if len(title) > 70: out.append(f"title {len(title)} chars; keep the keyword in the first ~40 and total <= 70 so it is not cut on mobile")
    if "#shorts" not in (title + desc).lower(): out.append("add #shorts to the title or description")
    first = desc.split("\n")[0] if desc else ""
    if len(first) < 40: out.append("first description line should be a full keyword sentence (it shows under the video)")
    if desc.count("#") > 5: out.append("more than 5 hashtags; YouTube may ignore them all past 15, keep 3-5")
    if sum(len(t) + 1 for t in tags) > 480: out.append("tags exceed ~500 chars limit")
    return out


def upload_captions(auth, vid, path):
    bnd = "itera" + os.urandom(6).hex()
    meta = json.dumps({"snippet": {"videoId": vid, "language": "vi", "name": "Tiếng Việt", "isDraft": False}})
    body = (f"--{bnd}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{meta}\r\n"
            f"--{bnd}\r\nContent-Type: application/x-subrip\r\n\r\n").encode() + open(path, "rb").read() + f"\r\n--{bnd}--\r\n".encode()
    r = urllib.request.Request("https://www.googleapis.com/upload/youtube/v3/captions?part=snippet&uploadType=multipart",
                               data=body, method="POST", headers={**auth, "Content-Type": f"multipart/related; boundary={bnd}"})
    try:
        c = json.load(urllib.request.urlopen(r, timeout=120))
        print("Captions uploaded:", c["id"])
    except urllib.error.HTTPError as e:
        print(f"Caption upload failed (HTTP {e.code}); token may lack youtube.force-ssl scope. Video is uploaded; add the SRT in YouTube Studio.")


if __name__ == "__main__":
    main()
