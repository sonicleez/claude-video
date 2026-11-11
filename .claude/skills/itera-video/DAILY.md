# Daily routine: measure → adjust → make 4 Shorts → schedule

Run from `casting_vi/itera_kit` (after `npm ci` if `node_modules` is missing). Works without the private kit (code end card).
The user approved this routine on 2026-11-11: 4 Shorts per day, full SEO, scheduled public, no caption files.

1. **Measure.** `python3 assets/youtube_stats.py --comment` → table sorted by views/hour, snapshot appended to
   `casting_vi/analytics/stats.jsonl`, and the link comment posted on newly public videos (user pins manually).
2. **Learn.** Compare formats (tip list / voice comparison / affiliate use case / ear test), hooks and time slots using
   the whole stats history. Write 3–6 lines in `casting_vi/analytics/strategy.md` (date, what worked, what to change).
   Double down on the best format and hook pattern, drop the weakest, keep one experiment per day.
3. **Trends.** One or two web searches for current short-video hooks/topics for Vietnamese creators and affiliates
   (AI voice, faceless video, TikTok Shop/Shopee affiliate). Use only as topic/hook ideas; never copy a video.
4. **Write 4 specs** in `assets/shorts/<YYYY-MM-DD-HHMM-slug>.json` (see existing ones): 18–30 s, hook ≤ 2 short lines,
   ≤ 3 items, one audience pain each, hook formulas from the plan doc. Full SEO block: title ≤ 70 chars with keyword
   first and `#shorts`, keyword-rich first description line, https://itera102.space, 3 hashtags, 10–12 tags, English
   localization, `pinned_comment` with a question + link. No discount codes, no "free" promises, no invented numbers
   or results, no claim that a voice is human; plan days 4, 19, 27 need a real voice — skip them.
   **Footage:** give each segment a stock clip that shows its idea — `"footage": {"mixkit": <id>, "start": <sec>}`.
   Find clips with `python3 assets/footage.py search "<english query>"`, then ALWAYS view
   `python3 assets/footage.py sheet out/sheet.jpg <ids…>` before choosing (ids ≥ 100000 do not download; skip them).
   Mixkit Free License only; no logos/brand names in frame; one clip per segment so the picture changes every 3–4 s.
   **Voice style:** the user asked for a more human delivery (breaths, small hesitations, a laugh). Test clips A–D are in
   `casting_vi/voice_test/`; until the user picks one, keep the current style. Once picked, record the choice in HANDOFF.md
   and write scripts that way (eleven_v3 audio tags such as [exhales], [laughs]; fillers "ờ", "á", "nè"; ellipses).
5. **Build.** `python3 assets/make_short.py assets/shorts/<id>.json` for each. Read the STT lines it prints; if a line
   is garbled, re-word and delete `assets/shorts/<id>/sK.mp3` to regenerate. Check 3 frames of each video
   (`ffmpeg -ss T -i out/<id>.mp4 -frames:v 1 x.png`) for overflow before uploading.
6. **Upload + schedule** into the next 4 free slots (Vietnam time 08:00, 12:00, 16:00, 20:00 = 01:00Z, 05:00Z, 09:00Z,
   13:00Z; check `publishAt` of existing videos in the stats output first):
   `python3 assets/youtube_upload.py out/<id>.mp4 --meta assets/shorts/<id>.json --publish-at <UTC ISO>`
   No `--srt`. Quota is 10,000 units/day and resets at 15:00 Vietnam time; an upload costs ~1,600, so 4 uploads fit
   only if little else was spent. On `quotaExceeded`, stop and report; do not retry in a loop.
7. **Record.** Commit specs, `analytics/` and any code fixes to the working branch and push. Never commit kit files
   or rendered videos. Finish with a short report to the user in Vietnamese: yesterday's numbers, what changed, the 4
   new videos with links and times, credits spent, anything that failed.

Honest expectations: nobody can guarantee a video goes viral. The routine's job is volume, fast feedback and steady
improvement of hook retention; report real numbers, including bad ones.
