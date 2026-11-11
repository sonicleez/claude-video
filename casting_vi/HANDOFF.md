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
| YouTube upload `assets/youtube_upload.py` | works. Day 01 uploaded **private** to channel "Sonic Journey": https://youtube.com/shorts/5Lyhw46T3d8 with Vietnamese captions (2026-11-11). Publish/schedule only on the user's go-ahead |
| Days 02–30 | not built |
| Postiz auto-posting | paused by user; options: Postiz Cloud ($29+/mo) or self-host on user's VPS |

## Open items
1. User to review the private Day 01 upload, then publish or schedule it.
2. Card 4 uses a CapCut voice that STT transcribes poorly — user to decide whether to swap.
3. Day 01 is 39.7 s: fine as a Short (< 60 s).
4. Earlier ad (casting_vi/itera_ad) and voice casting samples exist; ad is not on the brand kit.
