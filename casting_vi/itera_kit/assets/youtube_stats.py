"""Daily channel check for the ITERA series. Stdlib only; same OAuth env vars as youtube_upload.py.
Usage: python3 assets/youtube_stats.py [--comment]
- Lists the channel's uploads whose description links itera102.space, with views/likes/comments, age and views-per-hour.
- Appends a snapshot to ../analytics/stats.jsonl (commit it: the history is how the strategy learns).
- --comment: on public series videos with no comment from the channel yet, posts the spec's pinned_comment
  (matched by title in assets/shorts/*.json or assets/day*/youtube.json) or a default question + link. Pin manually.
Quota: ~3 units + 1 per video checked for comments + 50 per comment posted.
"""
import datetime, glob, json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from youtube_upload import access_token, UA
from youtube_seo import call, API

auth = {"Authorization": f"Bearer {access_token()}", **UA}
ch = call(auth, "GET", f"{API}/channels?part=contentDetails,statistics&mine=true")["items"][0]
uploads, me = ch["contentDetails"]["relatedPlaylists"]["uploads"], ch["id"]
ids = [i["contentDetails"]["videoId"] for i in call(auth, "GET", f"{API}/playlistItems?part=contentDetails&playlistId={uploads}&maxResults=50").get("items", [])]
vids = call(auth, "GET", f"{API}/videos?part=snippet,statistics,status,contentDetails&id={','.join(ids)}").get("items", []) if ids else []
series = [v for v in vids if "itera102.space" in v["snippet"].get("description", "")]
now = datetime.datetime.now(datetime.timezone.utc)
rows = []
for v in series:
    st, sn, s = v["statistics"], v["snippet"], v["status"]
    live = s["privacyStatus"] == "public"
    pub = datetime.datetime.fromisoformat((s.get("publishAt") or sn["publishedAt"]).replace("Z", "+00:00"))
    hours = max((now - pub).total_seconds() / 3600, 0.1) if live else 0
    views = int(st.get("viewCount", 0))
    rows.append({"id": v["id"], "title": sn["title"], "state": s["privacyStatus"], "publishAt": s.get("publishAt"), "hours_live": round(hours, 1),
                 "views": views, "likes": int(st.get("likeCount", 0)), "comments": int(st.get("commentCount", 0)),
                 "views_per_hour": round(views / hours, 1) if live else None})
rows.sort(key=lambda r: -(r["views_per_hour"] or -1))
os.makedirs(os.path.join(os.path.dirname(__file__), "../../analytics"), exist_ok=True)
with open(os.path.join(os.path.dirname(__file__), "../../analytics/stats.jsonl"), "a", encoding="utf-8") as f:
    f.write(json.dumps({"at": now.isoformat(timespec="seconds"), "subscribers": ch["statistics"].get("subscriberCount"), "videos": rows}, ensure_ascii=False) + "\n")
print(f"subscribers={ch['statistics'].get('subscriberCount')} series_videos={len(rows)}")
for r in rows:
    print(f"{r['id']} {r['state']:8} {r['hours_live']:>6}h views={r['views']:<6} vph={r['views_per_hour']} likes={r['likes']} cmts={r['comments']} | {r['title']}")

if "--comment" in sys.argv:
    texts = {}
    for p in glob.glob(os.path.join(os.path.dirname(__file__), "shorts/*.json")) + glob.glob(os.path.join(os.path.dirname(__file__), "day*/youtube.json")):
        m = json.load(open(p, encoding="utf-8")); m = m.get("youtube", m)
        if m.get("pinned_comment"): texts[m["title"]] = m["pinned_comment"]
    for r in rows:
        if r["state"] != "public": continue
        th = call(auth, "GET", f"{API}/commentThreads?part=snippet&videoId={r['id']}&maxResults=50").get("items", [])
        if any(t["snippet"]["topLevelComment"]["snippet"].get("authorChannelId", {}).get("value") == me for t in th): continue
        text = texts.get(r["title"], "Bạn thấy video này sao? 👇 Tạo giọng đọc AI tiếng Việt tại: https://itera102.space")
        c = call(auth, "POST", f"{API}/commentThreads?part=snippet", {"snippet": {"videoId": r["id"], "topLevelComment": {"snippet": {"textOriginal": text}}}})
        print("commented on", r["id"], c.get("id") or c)
