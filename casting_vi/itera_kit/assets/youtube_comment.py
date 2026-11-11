"""Post the channel's first comment (with link) on a public/scheduled-and-live video.
Usage: python3 assets/youtube_comment.py VIDEO_ID --meta assets/dayNN/youtube.json
Uses meta["pinned_comment"]. The API cannot pin comments: pin it in YouTube Studio / the app (⋮ → Pin).
"""
import argparse, json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from youtube_upload import access_token, UA
from youtube_seo import call, API
ap = argparse.ArgumentParser(); ap.add_argument("video_id"); ap.add_argument("--meta", required=True); a = ap.parse_args()
text = json.load(open(a.meta, encoding="utf-8"))["pinned_comment"]
auth = {"Authorization": f"Bearer {access_token()}", **UA}
st = call(auth, "GET", f"{API}/videos?part=status&id={a.video_id}")["items"][0]["status"]["privacyStatus"]
if st != "public": sys.exit(f"Video is {st}; comments can be posted once it is public.")
r = call(auth, "POST", f"{API}/commentThreads?part=snippet",
         {"snippet": {"videoId": a.video_id, "topLevelComment": {"snippet": {"textOriginal": text}}}})
print("comment:", r.get("id") or r, "-> pin it in YouTube Studio")
