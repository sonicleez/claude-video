---
name: itera-video
description: Make and publish ITERA short videos (9:16, Vietnamese AI voice) from the 30-day content plan — generate voices with the ITERA API, build the video in Remotion on the ITERA Video Kit v2 brand assets with energetic motion and clear captions, export SRT, and upload to YouTube with SEO metadata. Use when asked to make, re-render, or post an ITERA video / "video ngày N" / upload to YouTube.
---

# ITERA video: script → voice → Remotion → SEO upload

Project: `casting_vi/itera_kit/` (Remotion 4, React). Read `casting_vi/HANDOFF.md` first for the current state (which days exist, open decisions).

## Inputs and where they live
- **Content plan (source of truth for scripts):** Claude Docs doc "ITERA – Lịch 30 ngày video ngắn" https://claude.ai/artifact/P2b3qCaozFPKUyLmLiic5y — read the day's section with the Claude Docs connector before writing anything.
- **Missing-asset list for the designer:** https://claude.ai/artifact/V81tp1MLZ5pjbrqske2jBE
- **Brand kit (private, not in git):** if `casting_vi/itera_kit/public/kit/` is missing, ask the user to upload the 3 zips (`ITERA-v2-elements-va-hinh`, `ITERA-v2-layout-30-ngay`, `ITERA-video-kit`) and run `bash assets/setup_kit.sh <folder-with-zips>`. Never commit or push kit files or rendered videos (they contain the brand); `.gitignore` already excludes them.
- **Secrets (env vars of the "Itera" cloud environment; never print them):** `API_Itera` (TTS/STT), `Google_Client_ID`, `Google_Client_secret`, `Refresh_token` (YouTube). Env vars only load when a session starts.

## Setup
```bash
cd casting_vi/itera_kit && npm ci          # Remotion; headless Chrome path is in remotion.config.ts
```
ITERA API sits behind Cloudflare: every request needs a non-default `User-Agent` (scripts already send one) or it returns 403/1010.

## Make a day (DayNN)
1. **Script.** Take hook, lines and CTA from the plan doc. Write numbers and symbols as words in TTS text ("ba lẻ hai", "năm mươi phần trăm"); keep digits on screen.
2. **Voices.** `assets/dayNN/jobs.json` → `python3 ../gen.py jobs.json` (run inside `assets/dayNN`). Presets in `assets/gen.py`: `annhien` (narrator, ElevenLabs eleven_v3, nữ miền Nam ~25), `tram`, `camhong`, `minimax_south`, `capcut_sainu`, `capcut_hanu`.
3. **Verify pronunciation + word timing.** `python3 ../stt.py *.mp3` → `*.words.json`. If STT garbles a line, rephrase and regenerate (CapCut Vietnamese voices transcribe poorly; prefer ElevenLabs/MiniMax).
4. **Data.** Loudness-match each clip into `public/dayNN/*.wav` (`ffmpeg -af loudnorm=I=-16:TP=-1.5:LRA=11 -ar 48000`), then write `src/dayNN.data.json` = `{clip: {dur, words}}`.
5. **Composition.** Copy `src/days/Day01.tsx` as the pattern and register it in `src/Root.tsx`. Build from `src/brand/index.tsx`:
   - Kit layers: cut the day's `public/kit/dayNN/layout.png` / `trang-thai-*.png` into parts with `Crop` (measure rects from the PNG alpha) and animate each part separately.
   - Energy: `LiveBg`, `Camera` punch hits on every beat, `Flash` on cuts, staggered spring pop-ins, active element zoom + glow, live audio-reactive waveforms (red = played part only while playing), countdown/reveal moments, `Mascot` (one Nhịp beat per clip), `EndCard`.
   - Captions: export `CAPTION_WORDS` (absolute word timings) and render `PunchCaption` — ExtraBold caps, 2–4 words, active word on a white chip.
   - Sound: kit cues via `Sfx` (tick / reveal / signature) + `Fx` (whoosh, impact, pop, riser, glitch); `fx/beat.wav` low (~0.1) and muted under voice samples that viewers must judge.
6. **Check stills before rendering:** `COMP=DayNN node stills.mjs 1 5 12 …` → look at `out/s_*.png`. Keep content inside x64–920, y240–1480; one red accent per frame.
7. **Render:** `npx remotion render DayNN out/dayNN.mp4 --crf=18 --audio-bitrate=192k`, then `ffmpeg -i out/dayNN.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k -movflags +faststart ITERA_NgayNN.mp4`.
8. **SRT:** `node assets/export_srt.mjs DayNN out/dayNN.vi.srt` (same timing as on-screen captions).

## YouTube upload (SEO)
Write `assets/dayNN/youtube.json` (`title`, `description`, `tags`, `categoryId`), then:
```bash
python3 assets/youtube_upload.py ITERA_NgayNN.mp4 --meta assets/dayNN/youtube.json --srt out/dayNN.vi.srt --dry-run   # SEO check
python3 assets/youtube_upload.py ITERA_NgayNN.mp4 --meta assets/dayNN/youtube.json --srt out/dayNN.vi.srt               # private test
python3 assets/youtube_upload.py ... --publish-at 2026-11-20T12:15:00Z   # schedule (19:15 Vietnam = 12:15Z)
```
Then run full SEO on the uploaded id (metadata + English localization, vi/en captions, thumbnail, series playlist):
```bash
python3 assets/youtube_seo.py VIDEO_ID --meta assets/dayNN/youtube.json --srt vi=out/dayNN.vi.srt --srt en=out/dayNN.en.srt --thumb out/dayNN_thumb.jpg
```
English SRT = same cues as the vi SRT, translated line by line. Thumbnail = a 1080×1920 frame with a 2-line headline in the kit font (see `out/day01_thumb.jpg` recipe in HANDOFF). Series playlist: "Thử tai giọng AI tiếng Việt" (`playlist` key in youtube.json).
SEO rules: title ≤ 70 chars, main keyword in the first ~40 ("giọng AI tiếng Việt", "text to speech tiếng Việt", "lồng tiếng AI"…), ends with `#shorts`; first description line = full keyword sentence; then what the video shows, the question/CTA, the URL https://itera102.space; 3 hashtags at the end; 8–15 tags mixing Vietnamese and English; `defaultLanguage`/`defaultAudioLanguage` vi; always upload the Vietnamese SRT; `containsSyntheticMedia: true` (AI voice). Upload private first and show the user the link; publish or schedule only when they say so. Video must be ≤ 60 s vertical to count as a Short.

## Format, hooks and cadence (user decisions)
- Length 18–30 s (Day 01 went from 40 s to 26 s: each sample reads half a sentence). Payoff/question in frame 1, hook 5–10 words with big on-screen text, open loop answered at the end, a visual change every ~2 s, loop the ending back to the start.
- Write hooks for the two audiences' psychology — creators (no face, "bad" voice, recording takes hours, need volume) and affiliates (many videos/day, no face, cost per video, competitors faster). Use the 10 formulas in the plan doc section "Thư viện hook và lịch 4 bài/ngày"; give each script 2–3 hook variants and keep the one with the best "viewed vs swiped away" in YouTube Studio.
- Cadence: 4 posts/day, 4 h apart (Vietnam time 08:00 educational tip · 12:00 ear test · 16:00 affiliate use case · 20:00 strongest plan video). Mind the YouTube API quota (10,000 units/day; upload ≈1,600, each caption ≈400): drop English captions or request more quota.
- First comment = question + https://itera102.space (`assets/youtube_comment.py`, only once the video is public); the user pins it manually (API cannot pin).
- Making a video public or scheduling `publishAt` needs the user's explicit go-ahead for that video or batch — ask; uploads stay private until then.

## Rules (from the user — do not break)
- No referral/discount codes and no "free credit" promises unless the user approved them; CTA = link in bio / comment keyword / end card "Giọng này làm bằng ITERA." + itera102.space.
- The user does not record their own voice: never present an AI voice as a real person. Days that need a real voice (4, 19, 27) must be rewritten first — ask.
- Disclose AI: "Voice by ITERA" on screen at the reveal/end, platform AI labels on.
- Claims (speed, price, results) only from real runs; leave `[placeholders]` otherwise.
- Commit code to branch `claude/focused-franklin-d30062` (or the branch the user names); never push kit assets or rendered videos.
