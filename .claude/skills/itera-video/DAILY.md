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
   **Rhythm and mood (user's reference, 2026-11-11):** default to the **Reel** template (`"template":"reel"`, build with
   `python3 assets/make_reel.py <spec>`; example `assets/shorts/demo-reel-moi-giong.json`). 4–5 chapters of ~3.5–4 s, each
   The grey footage → typed prompt bar → cursor click → mosaic reveal beat is the series signature and plays **once, on
   the first chapter only** (user feedback 2026-11-12: repeating it every chapter looks mechanical). Every later chapter
   cuts straight in and must look different: `"style"` = `count` (number counts up + red bar; auto for numeric titles),
   `wipe` (red scan line), `kinetic` (spoken words land big one by one), `slam` (title slams in with flash). Vary the
   order between videos and keep adding new treatments in `src/Reel.tsx` rather than reusing one. Each chapter has a
   voice line (≤ 3 s) and a big 1–2 line title with a small red accent word; chapter counter, corner marks; red end card
   with a two-line tagline. Cinematic, few words, no list cards, music-led (fx/bed86.wav, ~86 BPM). One idea per video
   expressed as chapters (use cases, voice styles, before/after of a script…). Use the list `Short` template only when
   the content really is a checklist. Prefer footage of hands, objects and places over close-up faces; no children.
   **Content strategy (user, 2026-11-12): think like a storytelling creator.** Every video is a mini story:
   hook with stakes or curiosity (readable on frame 0 via the Reel `hook` block) → tension → turn → payoff that
   honours the hook. Result or incident first, method second. Tell true stories from this channel (numbers,
   incidents, experiments); never invent people, testimonials or results. Title = searched keyword + curiosity gap.
   Four pillars by slot: **08:00** real incident/experiment → one tip · **12:00** pick/guess (comments) ·
   **16:00** affiliate/creator pain · **20:00** "Nhật ký xây kênh: Ngày N" — the backbone series: yesterday's real
   numbers from `youtube_stats.py` (subs, views, what flopped, what was changed) and what will be tested next; Day 1
   was 2026-11-12 (94 subs; rules: no recording, 4 videos/day, real numbers in public). Keep the day counter going.
   A joke that depends on TTS mispronouncing a word is unreliable — keep such contrasts visual (on-screen text).
   **Lessons from the channel's own analytics (2026-11-12; full write-up in the Claude Doc "ITERA – Nhật ký hành trình
   và bài học", https://claude.ai/artifact/D84eeq9ffEJXEuoR5Uvcdv — append a dated entry there after each run):**
   videos ≤ 40 s got 3× the median views and 62% average viewed; subscribers came mostly from denser 71–180 s
   "5 tips" videos; the channel's best video is about making videos with Claude + Remotion (the audience likes seeing
   AI do real work) → make the diary series show the real behind-the-scenes (script → ITERA voice → Remotion code →
   stats); 25% of views come from search → titles carry concrete searched names (giọng AI tiếng Việt, text to speech,
   Remotion, Claude, ElevenLabs), never generic "bí mật ít ai biết"; hard-sell videos died (6.7% viewed); the first two
   ITERA videos got ~55 views/hour but 0 comments → end every video with a question answerable in one word/number.
   **Second-by-second:** 0–1 s hook text on frame 0, readable muted · 1–3 s who/what + stakes, open a question ·
   3–8 s the incident/proof · 8–15 s turn or first reward, open a sub-question · 15–22 s pay off the hook exactly ·
   last 2 s line that loops back to the hook + reason to follow. No dead air: voice starts while the prompt types.
   `youtube_stats.py` now also prints average viewed % and subs gained (Analytics lags 1–2 days) — use them, not views
   alone. "Viewed vs swiped away" is only in YouTube Studio; ask the user for a screenshot when needed.
   **Selling inside the story (user, 2026-11-13):** creative + sales: the product should be the twist or the tool the
   story turns on (e.g. a market skit where every character is an AI voice → "one account made the whole market"),
   not a pitch tacked on after. Pick-a-voice and short fiction are the proven formats; aim selling ones at shop owners
   and affiliates. Shorts links are believed not to be clickable, so the name ITERA must be spoken/shown clearly.
4. **Write 4 specs** in `assets/shorts/<YYYY-MM-DD-HHMM-slug>.json` (see existing ones): 18–30 s, hook ≤ 2 short lines,
   ≤ 3 items, one audience pain each, hook formulas from the plan doc. Full SEO block: title ≤ 70 chars with keyword
   first and `#shorts`, keyword-rich first description line, https://itera102.space, 3 hashtags, 10–12 tags, English
   localization, `pinned_comment` with a question + link. No discount codes, no "free" promises, no invented numbers
   or results, no claim that a voice is human; plan days 4, 19, 27 need a real voice — skip them.
   **Footage:** give each segment a stock clip that shows its idea — `"footage": {"mixkit": <id>, "start": <sec>}`.
   Find clips with `python3 assets/footage.py search "<english query>"`, then ALWAYS view
   `python3 assets/footage.py sheet out/sheet.jpg <ids…>` before choosing (ids ≥ 100000 do not download; skip them).
   Mixkit Free License only; no logos/brand names in frame; one clip per segment so the picture changes every 3–4 s.
   **Voice style (user picked test D on 2026-11-11):** narrator = voice **Ân** (`an_human` preset, the default in
   `make_short.py`: eleven_v3, stability 0.0). Write narration the way a young Southern Vietnamese creator talks, not
   read-aloud copy: a breath or small reaction at the start (`[exhales]`, `[laughs]`), fillers ("ờ", "á", "nè", "hả",
   "lận đó", "vô"), a hesitation with "…" once or twice, short uneven sentences. One or two such touches per segment,
   not every sentence. Tags must not be spoken: check the STT line. Reference: `casting_vi/voice_test/D_tu_nhien_giong_An.mp3`
   and the script in HANDOFF.md. Sample voices in comparisons keep their own presets.
5. **Build.** `python3 assets/make_reel.py assets/shorts/<id>.json` (or `make_short.py` for list videos) for each. Read the STT lines it prints; if a line
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
