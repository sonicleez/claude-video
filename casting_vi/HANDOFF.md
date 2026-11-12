# ITERA video project — handoff

A new session does not remember earlier chats. This file and the skill `.claude/skills/itera-video` hold everything needed to continue. Branch: `claude/focused-franklin-d30062`.

## Docs (Claude Docs, read with the connector)
- 30-day plan and scripts (fixed: no unapproved codes, kit rules, Day 01 all-AI): https://claude.ai/artifact/P2b3qCaozFPKUyLmLiic5y
- Missing brand-kit assets to create (backgrounds, mascot poses, objects, sounds, FX): https://claude.ai/artifact/V81tp1MLZ5pjbrqske2jBE

## Decisions so far
- Narrator voice: **An Nhiên** (ElevenLabs eleven_v3, `8PEPqUGgvwN1Fk9KR8jV`).
- Style: ITERA Video Kit v2 (graphite #09090C, red #D93F3F only for "playing"/CTA, Be Vietnam Pro + JetBrains Mono) with high-energy motion and big word-by-word captions (user approved "like the earlier ad").
- No discount/referral codes, no "free credit" claims until approved. CTA = link in bio / itera102.space.
- User will **not** record a real voice. Day 01 changed to an all-AI twist. Days 4, 19, 27 still need rewriting.
- Kit assets and rendered videos stay out of git (brand privacy).

## Status
| Item | State |
|---|---|
| `itera_kit` Remotion system (`src/brand`, helpers in `assets/`) | done |
| Day 01 "Giọng nào là người thật?" v3 (39.7 s): voices Trâm, Cẩm Hồng, MiniMax, CapCut + An Nhiên narration | rendered locally (not in git — re-render: `npx remotion render Day01 …`) |
| Day 01 SEO metadata `assets/day01/youtube.json`, SRT via `assets/export_srt.mjs` | ready |
| Day 01 short cut (25.7 s, card 4 now ElevenLabs Ân) | uploaded **private** with full SEO: https://youtube.com/shorts/1BQ4Zm7TI64 — awaiting the user's go-ahead to publish/schedule; then run `assets/youtube_comment.py` and ask the user to pin it |
| YouTube upload `assets/youtube_upload.py` | works. Old 40 s cut (superseded, removed from playlist) uploaded **private** to channel "Sonic Journey": https://youtube.com/shorts/5Lyhw46T3d8 with full SEO applied (2026-11-11): vi title/desc/15 tags, English localization, vi+en captions, custom thumbnail, playlist "Thử tai giọng AI tiếng Việt", containsSyntheticMedia=true. Still private: publish/schedule only on the user's go-ahead, then post the first comment |
| Days 02–30 | not built |
| Postiz auto-posting | paused by user; options: Postiz Cloud ($29+/mo) or self-host on user's VPS |

## Open items
1. User to approve publishing Day 01 short (1BQ4Zm7TI64), e.g. 20:00 VN; old 40 s cut 5Lyhw46T3d8 can be deleted by the user.
5. Plan: 4 posts/day at 08/12/16/20 VN — needs 4 videos/day; hook library is in the plan doc.
2. Card 4 uses a CapCut voice that STT transcribes poorly — user to decide whether to swap.
3. Day 01 is 39.7 s: fine as a Short (< 60 s).
4. Earlier ad (casting_vi/itera_ad) and voice casting samples exist; ad is not on the brand kit.

## Thumbnail recipe
`ffmpeg -ss 6.2 -i ITERA_NgayNN.mp4 -frames:v 1 -vf "drawbox=x=0:y=1215:w=1080:h=560:color=0x09090C@1:t=fill,drawtext=fontfile=public/kit/fonts/BeVietnamPro-ExtraBold.ttf:text='AI hay NGƯỜI?':fontsize=124:fontcolor=white:x=(w-tw)/2:y=1290,drawtext=...:fontcolor=0xD93F3F:y=1470" out/dayNN_thumb.jpg`

## 2026-11-11 late: first scheduled batch + daily automation
- Scheduled public on 2026-11-12 (VN time): 08:00 h9YI_hF307g (tip list) · 12:00 UQ5rsBv7Es0 (voice comparison) · 16:00 yFSPymfJ1Rw (affiliate) · 20:00 1BQ4Zm7TI64 (Day 01 ear test). No caption files (user decision).
- Data-driven template `src/Short.tsx` + `assets/make_short.py`; stats `assets/youtube_stats.py`; routine in `.claude/skills/itera-video/DAILY.md`; log in `casting_vi/analytics/`.
- A daily scheduled task (15:20 VN) runs the routine in the original session.
- Fix (user feedback): "AI" was spoken as Vietnamese "ai". All four videos were rebuilt with "ây ai" and re-uploaded; new scheduled ids: 08:00 1Q4WExlv0q8 · 12:00 AEpQT0qtXtk · 16:00 qwqDoBmYpYA · 20:00 JU9vIGRMYBg. Superseded private uploads (unscheduled, safe for the user to delete): h9YI_hF307g, UQ5rsBv7Es0, yFSPymfJ1Rw, 1BQ4Zm7TI64, 5Lyhw46T3d8.
- User wants the next batch to sound more human (breath, imperfection) and to use internet footage. Voice tests A–D sent (`casting_vi/voice_test/`): A current; B human script, stability 0.5; C human script, stability 0.0; D voice Ân, stability 0.0 — **awaiting the user's pick**. Footage: `assets/footage.py` (Mixkit) + `footage` field in specs; demo `assets/shorts/demo-footage-affiliate.json` (not uploaded) awaiting feedback.
- **User picked voice test D**: narrator Ân, stability 0.0, human-style script. Reference script: "[exhales] Ờ... làm affiliate mà ngại nói hả? Xem cái này nè. Hồi trước á, mình thu một video... mất hai tiếng lận đó. [laughs] Giờ thì, à, dán kịch bản vô là xong." (In D the opening "Ờ" was dropped by the model; don't rely on a filler as the very first word.) Footage demo feedback still pending.
- User gave a reference video for rhythm and mood (AVIS promo, 32 s, 16:9, music only ~86 BPM, 7 chapters of ~3.5 s: grey before → prompt bar typed → click → colour reveal → big title; counter, corner marks; brand-colour end card). Built `src/Reel.tsx` + `assets/make_reel.py` + `assets/music_synth.py` (fx/bed86.wav) as the 9:16 ITERA version; demo `assets/shorts/demo-reel-moi-giong.json` sent, not uploaded, awaiting feedback. Reel is now the default template in DAILY.md.

## 2026-11-12: Reel template approved, channel reset, storytelling strategy
- User approved the Reel template and asked to delete all earlier ITERA videos: the 9 earlier uploads were deleted. Channel now holds only the new batch, scheduled (VN time) 08:00 bOg08QKedac (AI reads "AI" wrong) · 12:00 d0z4yhHq6V0 (4 voice styles) · 16:00 LZW550zp9FU (affiliate, first 3 seconds) · 20:00 lJd67RlbAgU (Nhật ký xây kênh: Ngày 1).
- Reel gained an opening `hook` block and an AI-voice disclosure line on the end card. Narrator Ân (test D).
- Content strategy: storytelling pillars and the daily "Nhật ký xây kênh" series (see DAILY.md and the plan doc section "Chiến lược nội dung mới").
- 2026-11-12: journey + research + analytics lessons written to Claude Doc "ITERA – Nhật ký hành trình và bài học" (https://claude.ai/artifact/D84eeq9ffEJXEuoR5Uvcdv); raw channel history in `casting_vi/analytics/channel_history_2026-11-12.json`. The OAuth token can read YouTube Analytics (average view %, subs gained). Reel timing tightened (see strategy.md).
