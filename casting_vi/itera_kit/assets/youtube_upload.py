"""Upload a video to YouTube (Data API v3, resumable upload). Stdlib only.

Reads OAuth settings from environment variables (never printed):
  Google_Client_ID, Google_Client_secret, Refresh_token   (Access_token is used only if no refresh token)

Usage:
  python3 assets/youtube_upload.py VIDEO.mp4 --title "..." [--desc-file caption.txt] [--privacy private|unlisted|public]
Defaults to private so a test upload is never public by accident. Marks the video as altered/synthetic (AI voice).
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
    ap.add_argument("--title", required=True)
    ap.add_argument("--desc-file")
    ap.add_argument("--tags", default="")
    ap.add_argument("--privacy", default="private", choices=["private", "unlisted", "public"])
    a = ap.parse_args()
    tok = access_token()
    auth = {"Authorization": f"Bearer {tok}", **UA}

    ch = json.load(urllib.request.urlopen(urllib.request.Request(
        "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", headers=auth), timeout=30))
    if not ch.get("items"):
        sys.exit("Token works but no channel found for this account.")
    print("Channel:", ch["items"][0]["snippet"]["title"])

    meta = {
        "snippet": {"title": a.title[:100], "description": open(a.desc_file, encoding="utf-8").read() if a.desc_file else "",
                    "tags": [t for t in a.tags.split(",") if t], "categoryId": "22", "defaultLanguage": "vi"},
        "status": {"privacyStatus": a.privacy, "selfDeclaredMadeForKids": False, "containsSyntheticMedia": True},
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
    print("Uploaded:", res["id"], res["status"]["privacyStatus"], f"https://youtube.com/shorts/{res['id']}")


if __name__ == "__main__":
    main()
