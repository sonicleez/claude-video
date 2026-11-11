/**
 * Ngày 01 · "Giọng nào là người thật?" — kit layout 10-layout-30-ngay/01-doan-giong-nguoi-that.
 * Order per the plan: 1 ElevenLabs · 2 self-recorded · 3 MiniMax · 4 CapCut. Answer card flips at the end.
 */
import React from 'react';
import {AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {BrandBg, Caption, EndCard, FPS, H, KitLayer, Label, Mascot, Playhead, Sfx, T, W, Word, sec} from '../brand';
import DATA from '../day01.data.json';

type Clip = {dur: number; words: Word[]};
const D = DATA as unknown as Record<string, Clip> & {self?: Clip};

// Giọng 2 is the creator's own recording. Drop it at public/day01/v2_self.wav and add it to day01.data.json as "self".
const SELF: Clip | null = (D as any).self ?? null;
const SENTENCE = 'Sáng nay mình dậy sớm, pha ly cà phê, và quyết định làm một việc mình đã trì hoãn cả năm.';
const GAP = 0.4;

const tokens = SENTENCE.split(' ');
const sentenceWords = (clip: Clip | null, dur: number): Word[] => {
  // Show the script text; take timing from STT when the word count matches, else spread evenly.
  if (clip && clip.words.length === tokens.length) return tokens.map((t, i) => ({t, s: clip.words[i].s, e: clip.words[i].e}));
  return tokens.map((t, i) => ({t, s: (i / tokens.length) * dur, e: ((i + 1) / tokens.length) * dur}));
};

const voices = [
  {key: 'v1_eleven', file: 'day01/v1_eleven.wav', clip: D.v1_eleven},
  {key: 'v2_self', file: SELF ? 'day01/v2_self.wav' : null, clip: SELF ?? {dur: 5.5, words: []}},
  {key: 'v3_minimax', file: 'day01/v3_minimax.wav', clip: D.v3_minimax},
  {key: 'v4_capcut', file: 'day01/v4_capcut.wav', clip: D.v4_capcut},
];

// Timeline (seconds)
const tHook = 0.25;
let cursor = tHook + D.n1_hook.dur + 0.35;
const vStart = voices.map((v) => { const s = cursor; cursor += v.clip.dur + GAP; return s; });
const tAsk = cursor;
const tFlip = tAsk + D.n2_ask.dur + 0.25;
const FLIP = 0.5;
const tReveal = tFlip + FLIP * 0.6;
const tEnd = tReveal + D.n3_reveal.dur + 0.5;
export const DAY01_DURATION = sec(tEnd + 3.0);

// Card geometry on the 1080×1920 layout (waveform rows).
const CARDS = [
  {x0: 92, x1: 452, y: 846}, {x0: 533, x1: 893, y: 846},
  {x0: 92, x1: 452, y: 1134}, {x0: 533, x1: 893, y: 1134},
];
const GRID = {y0: 630, y1: 1220};

const shift = (ws: Word[], by: number) => ws.map((w) => ({...w, s: w.s + by, e: w.e + by}));

const Grid: React.FC<{src: string}> = ({src}) => (
  <div style={{position: 'absolute', left: 0, top: GRID.y0, width: W, height: GRID.y1 - GRID.y0, overflow: 'hidden'}}>
    <Img src={staticFile(src)} style={{position: 'absolute', left: 0, top: -GRID.y0, width: W, height: H}} />
  </div>
);

/** Layout with the grid flipping from one state to another (card-flip feel). */
const FlipLayout: React.FC<{from: string; to: string; at: number}> = ({from, to, at}) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const p = interpolate(t, [at, at + FLIP], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const showTo = p >= 0.5;
  const rot = showTo ? -90 + (p - 0.5) * 180 : p * 180;
  return (
    <AbsoluteFill>
      {/* Static header and footer come from whichever state is current. */}
      <div style={{position: 'absolute', inset: 0, clipPath: `polygon(0 0, 100% 0, 100% ${GRID.y0}px, 0 ${GRID.y0}px, 0 ${GRID.y1}px, 100% ${GRID.y1}px, 100% 100%, 0 100%)`}}>
        <Img src={staticFile(showTo ? to : from)} style={{width: W, height: H}} />
      </div>
      <div style={{position: 'absolute', inset: 0, perspective: 1600}}>
        <div style={{position: 'absolute', inset: 0, transform: `rotateX(${rot}deg)`, transformOrigin: `50% ${(GRID.y0 + GRID.y1) / 2}px`}}>
          <Grid src={showTo ? to : from} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Day01: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const active = vStart.findIndex((s, i) => t >= s && t < s + voices[i].clip.dur + GAP);
  let layer = 'kit/day01/layout.png';
  if (active >= 0) layer = `kit/day01/trang-thai-0${active + 1}.png`;
  else if (t >= vStart[3]) layer = 'kit/day01/trang-thai-04.png';

  return (
    <AbsoluteFill style={{background: T.bg}}>
      <BrandBg />
      {t < tEnd && (t < tFlip ? <KitLayer key={layer} src={layer} fadeIn={t < 0.5 ? 10 : 3} /> : <FlipLayout from="kit/day01/trang-thai-04.png" to="kit/day01/trang-thai-dap-an.png" at={tFlip} />)}

      {/* Hook: Nhịp listens next to the question (one mascot beat). */}
      <Sequence from={sec(1.1)} durationInFrames={sec(0.8)}><Mascot pose="lang-nghe" x={760} y={330} size={230} hold={0.8} /></Sequence>

      {/* Playhead over the active card + draft label when the self-recording is missing. */}
      {voices.map((v, i) => (
        <Sequence key={v.key} from={sec(vStart[i])} durationInFrames={sec(v.clip.dur)}>
          <Playhead x0={CARDS[i].x0} x1={CARDS[i].x1} y={CARDS[i].y} dur={v.clip.dur} />
          {v.file && <Audio src={staticFile(v.file)} />}
          {!v.file && <Label x={CARDS[i].x0 - 4} y={CARDS[i].y + 26} color={T.text} size={22}>[CHÈN BẢN TỰ THU]</Label>}
        </Sequence>
      ))}
      {vStart.map((s, i) => <Sfx key={i} at={s - 0.12} name="tick" volume={0.5} />)}

      {/* Captions: narration word-by-word; the test sentence for each sample. */}
      {t < tEnd && (
        <Caption y={1215} width={860} height={140} fontSize={44} words={[
          ...shift(D.n1_hook.words, tHook),
          ...voices.flatMap((v, i) => shift(sentenceWords(v.clip.words.length ? v.clip : null, v.clip.dur), vStart[i])),
          ...shift(D.n2_ask.words, tAsk),
          ...shift(D.n3_reveal.words, tReveal),
        ]} />
      )}

      {/* Reveal: source labels are on the answer layout; credit ITERA here. */}
      {t >= tReveal && t < tEnd && (
        <Img src={staticFile('kit/el/voice-by-itera-nen-toi.png')} style={{position: 'absolute', left: 50, top: 552, width: 330,
          opacity: interpolate(t, [tReveal, tReveal + 0.3], [0, 1], {extrapolateRight: 'clamp'})}} />
      )}
      <Sfx at={tFlip + FLIP * 0.45} name="reveal" volume={0.7} />

      <Sequence from={sec(tHook)}><Audio src={staticFile('day01/n1_hook.wav')} /></Sequence>
      <Sequence from={sec(tAsk)}><Audio src={staticFile('day01/n2_ask.wav')} /></Sequence>
      <Sequence from={sec(tReveal)}><Audio src={staticFile('day01/n3_reveal.wav')} /></Sequence>

      <Sequence from={sec(tEnd)}><EndCard /></Sequence>

      {!SELF && (
        <Label x={0} y={196} align="center" color={T.sub} size={22}>BẢN NHÁP · GIỌNG 2 CHỜ BẢN TỰ THU</Label>
      )}
    </AbsoluteFill>
  );
};
