/**
 * Ngày 01 · "Giọng nào là người thật?" — kit layout 10-layout-30-ngay/01-doan-giong-nguoi-that.
 * v2: kit layers are cut into header / title / 4 cards / pill and animated separately for energy.
 * Short cut (~26 s). All four are AI: 1 ElevenLabs Trâm · 2 ElevenLabs Cẩm Hồng · 3 MiniMax · 4 ElevenLabs Ân. Twist reveal: none is human.
 */
import React from 'react';
import {AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, random} from 'remotion';
import {useAudioData, visualizeAudio} from '@remotion/media-utils';
import {
  Camera, Crop, EndCard, FPS, Flash, Fx, LiveBg, Mascot, PunchCaption, Sfx, T, Word, sec,
} from '../brand';
import DATA from '../day01.data.json';

type Clip = {dur: number; words: Word[]};
const D = DATA as unknown as Record<string, Clip>;
const SENTENCE = 'Sáng nay mình dậy sớm, pha ly cà phê.';
const tokens = SENTENCE.split(' ');
const sentenceWords = (clip: Clip | null, dur: number): Word[] =>
  clip && clip.words.length === tokens.length
    ? tokens.map((t, i) => ({t, s: clip.words[i].s, e: clip.words[i].e}))
    : tokens.map((t, i) => ({t, s: (i / tokens.length) * dur, e: ((i + 1) / tokens.length) * dur}));

const voices = [
  {file: 'day01/v1_eleven.wav', clip: D.v1_eleven},
  {file: 'day01/v2_camhong.wav', clip: D.v2_camhong},
  {file: 'day01/v3_minimax.wav', clip: D.v3_minimax},
  {file: 'day01/v4_capcut.wav', clip: D.v4_capcut},
];

/* ---------- Timeline (s) ---------- */
const GAP = 0.2;
const tHook = 0.35;
let c = tHook + D.n1_hook.dur + 0.15;
const vStart = voices.map((v) => { const s = c; c += v.clip.dur + GAP; return s; });
const tAsk = c;
const tCount = tAsk + D.n2_ask.dur + 0.05;
const COUNT = 1.2;
const tFlip = tCount + COUNT;
const tReveal = tFlip + 0.55;
const tEnd = tReveal + D.n3_reveal.dur + 0.3;
export const DAY01_DURATION = sec(tEnd + 2.0);

/** Every spoken word with absolute timing — drives on-screen captions and the exported YouTube SRT. */
export const CAPTION_WORDS: Word[] = [
  ...D.n1_hook.words.map((w) => ({...w, s: w.s + tHook, e: w.e + tHook})),
  ...voices.flatMap((v, i) => sentenceWords(v.clip.words.length ? v.clip : null, v.clip.dur).map((w) => ({...w, s: w.s + vStart[i], e: w.e + vStart[i]}))),
  ...D.n2_ask.words.map((w) => ({...w, s: w.s + tAsk, e: w.e + tAsk})),
  ...D.n3_reveal.words.map((w) => ({...w, s: w.s + tReveal, e: w.e + tReveal})),
];

/* ---------- Kit geometry (measured from the layout PNG) ---------- */
type R = [number, number, number, number];
const HEADER: R = [60, 250, 924, 312];
const TITLE: R = [60, 336, 924, 552];
const CARDS: R[] = [[60, 646, 484, 918], [500, 646, 924, 918], [60, 935, 484, 1207], [500, 935, 924, 1207]];
const PILL: R = [60, 1350, 634, 1435];
const WAVE_Y = [846, 846, 1135, 1135];

const stateAt = (t: number) => {
  const a = vStart.findIndex((s, i) => t >= s && t < s + voices[i].clip.dur + GAP);
  if (t >= tFlip) return {src: 'kit/day01/trang-thai-dap-an.png', active: -1};
  if (a >= 0) return {src: `kit/day01/trang-thai-0${a + 1}.png`, active: a};
  if (t >= vStart[3]) return {src: 'kit/day01/trang-thai-04.png', active: -1};
  return {src: 'kit/day01/layout.png', active: -1};
};

/** Live waveform replacing the baked one: audio-reactive while playing, red for the played part. */
const BARS = 46;
const LiveWave: React.FC<{i: number; r: R; state: 'idle' | 'active' | 'done'}> = ({i, r, state}) => {
  const frame = useCurrentFrame();
  const v = voices[i];
  const audio = useAudioData(staticFile(v.file ?? 'day01/v1_eleven.wav'));
  const local = frame - sec(vStart[i]);
  const prog = state === 'active' ? Math.min(1, local / sec(v.clip.dur)) : state === 'done' ? 1 : 0;
  let spec: number[] | null = null;
  if (state === 'active' && audio && v.file && local >= 0) spec = visualizeAudio({fps: FPS, frame: local, audioData: audio, numberOfSamples: 64});
  const x0 = 26, x1 = 391, cy = WAVE_Y[i] - r[1];
  const bw = (x1 - x0) / BARS;
  return (
    <>
      <div style={{position: 'absolute', left: x0 - 6, top: cy - 36, width: x1 - x0 + 12, height: 70, background: state === 'active' ? 'rgb(30,21,25)' : 'rgb(20,21,26)'}} />
      {Array.from({length: BARS}, (_, k) => {
        const base = 0.25 + 0.75 * Math.abs(Math.sin(k * 1.37 + i)) * (0.4 + 0.6 * random(`w${i}${k}`));
        let h: number;
        if (spec) h = Math.min(1, 0.18 + spec[(k * 3) % 40] * 16 + (random(`j${frame}${k}`) - 0.5) * 0.1);
        else if (state === 'active') h = base * (0.5 + 0.5 * Math.abs(Math.sin(frame / 3 + k)));
        else h = base * (0.55 + 0.12 * Math.sin(frame / 9 + k * 0.6));
        const played = state === 'active' && k / BARS < prog;
        return <div key={k} style={{position: 'absolute', left: x0 + k * bw + bw * 0.25, top: cy - 32 * h, width: bw * 0.5, height: 64 * h, borderRadius: 3,
          background: played ? T.red : state === 'active' ? '#8A90A2' : state === 'done' ? '#7A8091' : '#4E5262', boxShadow: played && state === 'active' ? `0 0 10px ${T.red}` : undefined}} />;
      })}
    </>
  );
};

const Cards: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const st = stateAt(t);
  return (
    <>
      {CARDS.map((r, i) => {
        const inP = spring({frame: frame - sec(0.45 + i * 0.1), fps: FPS, config: {damping: 11, stiffness: 170}});
        const f0 = tFlip + i * 0.09, f1 = f0 + 0.36;
        const fp = interpolate(t, [f0, f1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        const src = t < tFlip ? st.src : fp < 0.5 ? 'kit/day01/trang-thai-04.png' : 'kit/day01/trang-thai-dap-an.png';
        const rotY = fp < 0.5 ? fp * 180 : (fp - 1) * 180;
        const isActive = st.active === i;
        const anyActive = st.active >= 0;
        const actP = isActive ? spring({frame: frame - sec(vStart[i]), fps: FPS, config: {damping: 10, stiffness: 200}}) : 0;
        const answer = t >= tReveal + i * 0.15;
        const pulse = answer ? 1 + 0.03 * Math.max(0, Math.sin((t - tReveal - i * 0.15) * 6)) : 1;
        const scale = interpolate(inP, [0, 1], [0.4, 1]) * (isActive ? 1 + 0.06 * actP : anyActive ? 0.96 : 1) * pulse;
        const dim = anyActive && !isActive ? 0.55 : 1;
        return (
          <div key={i} style={{position: 'absolute', left: r[0], top: r[1], width: r[2] - r[0], height: r[3] - r[1], perspective: 1200,
            transform: `scale(${scale}) translateY(${(1 - inP) * 120}px)`, opacity: Math.min(1, inP * 1.5) * dim,
            filter: isActive || answer ? `drop-shadow(0 0 ${30 + 20 * actP}px rgba(217,63,63,0.45))` : undefined}}>
            <div style={{position: 'absolute', inset: 0, transform: `rotateY(${rotY}deg)`}}>
              <Crop src={src} r={r} style={{left: 0, top: 0}} />
              {i === 1 && fp >= 0.5 && <Crop src="kit/day01/trang-thai-dap-an.png" r={[80, 866, 322, 905]} style={{left: 20, top: 220}} />}
              {t < tFlip && <LiveWave i={i} r={r} state={isActive ? 'active' : t >= vStart[i] + voices[i].clip.dur ? 'done' : 'idle'} />}
            </div>
          </div>
        );
      })}
    </>
  );
};

const HeaderTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const h = spring({frame, fps: FPS, config: {damping: 14, stiffness: 160}});
  const ti = spring({frame: frame - sec(0.12), fps: FPS, config: {damping: 13, stiffness: 170}});
  const ti2 = spring({frame: frame - sec(0.4), fps: FPS, config: {damping: 9, stiffness: 150, mass: 0.8}});
  return (
    <>
      <Crop src="kit/day01/layout.png" r={HEADER} style={{transform: `translateY(${(1 - h) * -80}px)`, opacity: h}} />
      <Crop src="kit/day01/layout.png" r={[60, 336, 924, 446]} style={{transform: `translateX(${(1 - ti) * -500}px) skewX(${(1 - ti) * -12}deg)`, opacity: Math.min(1, ti * 2)}} />
      <Crop src="kit/day01/layout.png" r={[60, 446, 924, 552]} style={{transform: `scale(${interpolate(ti2, [0, 1], [1.7, 1])}) rotate(${(1 - ti2) * -4}deg)`, transformOrigin: '25% 50%', opacity: Math.min(1, ti2 * 2)}} />
      <div style={{position: 'absolute', left: 64, top: 309, height: 2, width: 856 * h, background: 'rgba(249,250,251,0.25)'}} />
    </>
  );
};

const Pill: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const show = (t >= tAsk && t < tFlip) || (t >= tReveal + 0.4 && t < tEnd);
  const at = t >= tReveal ? tReveal + 0.4 : tAsk;
  const p = spring({frame: frame - sec(at), fps: FPS, config: {damping: 12, stiffness: 200}});
  if (!show) return null;
  return <Crop src={t >= tReveal ? 'kit/day01/trang-thai-dap-an.png' : 'kit/day01/layout.png'} r={PILL}
    style={{transform: `translateY(${(1 - p) * 60}px) scale(${(0.9 + 0.1 * p) * (1 + 0.025 * Math.sin(t * 7))})`, opacity: p,
      boxShadow: `0 0 ${18 + 12 * Math.sin(t * 7)}px rgba(249,250,251,0.18)`, borderRadius: 16}} />;
};

const Countdown: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS - tCount;
  if (t < 0 || t >= COUNT) return null;
  const step = COUNT / 3;
  const n = 3 - Math.floor(t / step);
  const lp = (t % step) / step;
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 60, width: 864, top: 646, height: 561, background: 'rgba(9,9,12,0.6)', borderRadius: 24}} />
      <div style={{position: 'absolute', left: 60, width: 864, top: 740, textAlign: 'center', fontFamily: T.sans, fontWeight: 800, fontSize: 300, color: T.text,
        transform: `scale(${interpolate(lp, [0, 0.25], [1.6, 1], {extrapolateRight: 'clamp'})})`, opacity: interpolate(lp, [0, 0.1, 0.8, 1], [0, 1, 1, 0])}}>{n}</div>
    </AbsoluteFill>
  );
};

const Stamp: React.FC = () => {
  const frame = useCurrentFrame();
  const p = spring({frame, fps: FPS, config: {damping: 8, stiffness: 160}});
  return (
    <div style={{position: 'absolute', left: 0, right: 156, top: 860, display: 'flex', justifyContent: 'center',
      transform: `scale(${interpolate(p, [0, 1], [2.4, 1])}) rotate(-8deg)`, opacity: Math.min(1, p * 2)}}>
      <div style={{border: `8px solid ${T.red}`, color: T.red, background: 'rgba(9,9,12,0.85)', borderRadius: 18, padding: '10px 34px',
        fontFamily: T.sans, fontWeight: 800, fontSize: 92, letterSpacing: 2}}>100% AI</div>
    </div>
  );
};

const VoiceBy: React.FC = () => {
  const frame = useCurrentFrame();
  const p = spring({frame, fps: FPS, config: {damping: 12, stiffness: 200}});
  return <Img src={staticFile('kit/el/voice-by-itera-nen-toi.png')} style={{position: 'absolute', left: 50, top: 560, width: 330, opacity: p, transform: `translateX(${(1 - p) * -60}px)`}} />;
};

export const Day01: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const playing = vStart.some((s, i) => t >= s && t < s + voices[i].clip.dur);
  const hits = [tHook, ...vStart, tFlip, tReveal];
  const capY = (t >= tAsk && t < tFlip) || t >= tReveal + 0.4 ? 1222 : 1262;

  return (
    <AbsoluteFill>
      <LiveBg accent={playing ? 1 : 0} />
      {t < tEnd && (
        <Camera hits={hits}>
          <HeaderTitle />
          <Cards />
          {voices.map((v, i) => (
            <Sequence key={i} from={sec(vStart[i])} durationInFrames={sec(v.clip.dur)}>
            </Sequence>
          ))}
          <Countdown />
          <Pill />
          {t >= tReveal && <Sequence from={sec(tReveal)}><VoiceBy /></Sequence>}
          {t >= tReveal + 0.9 && <Sequence from={sec(tReveal + 0.9)}><Stamp /></Sequence>}
        </Camera>
      )}

      {/* Nhịp: one listening beat next to the question. */}
      <Sequence from={sec(1.3)} durationInFrames={sec(0.9)}><Mascot pose="lang-nghe" x={770} y={330} size={240} hold={0.9} /></Sequence>

      {t < tEnd && (
        <PunchCaption y={capY} words={CAPTION_WORDS} />
      )}

      {[...vStart.map((s) => s - 0.02), tFlip, tEnd].map((s) => <Flash key={s} at={s} strength={s === tFlip ? 0.8 : 0.25} />)}
      <Sequence from={sec(tEnd)}><EndCard /></Sequence>

      {/* Audio: voices, kit cues, energy SFX. Beat drops out under the samples so they are judged fairly. */}
      {voices.map((v, i) => v.file && <Sequence key={i} from={sec(vStart[i])}><Audio src={staticFile(v.file)} /></Sequence>)}
      <Sequence from={sec(tHook)}><Audio src={staticFile('day01/n1_hook_b.wav')} /></Sequence>
      <Sequence from={sec(tAsk)}><Audio src={staticFile('day01/n2_ask.wav')} /></Sequence>
      <Sequence from={sec(tReveal)}><Audio src={staticFile('day01/n3_reveal_b.wav')} /></Sequence>
      <Audio src={staticFile('fx/beat.wav')} volume={(f) => {
        const s = f / FPS;
        const inSample = vStart.some((v, i) => s >= v - 0.1 && s < v + voices[i].clip.dur + 0.1);
        return s >= tEnd ? 0 : inSample ? 0 : 0.11;
      }} />
      <Fx at={0} name="impact" volume={0.7} />
      <Fx at={0.15} name="whoosh" volume={0.45} />
      {[0, 1, 2, 3].map((i) => <Fx key={i} at={0.45 + i * 0.1} name="pop" volume={0.35} />)}
      {vStart.map((s, i) => <Sfx key={i} at={s - 0.1} name="tick" volume={0.6} />)}
      <Fx at={tAsk - 0.15} name="whoosh" volume={0.45} />
      {[0, 1, 2].map((k) => <Sfx key={k} at={tCount + k * (COUNT / 3)} name="tick" volume={0.8} />)}
      <Fx at={tCount + 0.2} name="riser" volume={0.35} />
      <Fx at={tFlip} name="glitch" volume={0.5} />
      <Fx at={tFlip} name="impact" volume={0.8} />
      <Sfx at={tFlip + 0.2} name="reveal" volume={0.8} />
      <Fx at={tEnd - 0.2} name="whoosh" volume={0.5} />
    </AbsoluteFill>
  );
};
