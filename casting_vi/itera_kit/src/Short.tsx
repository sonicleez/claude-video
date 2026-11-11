/**
 * Data-driven ITERA Short (18–30 s). One composition for tips, lists and voice comparisons:
 * hook title → up to 3 cards revealed one by one (text or live voice sample) → CTA pill → end card.
 * Props come from assets/make_short.py (out/<id>.props.json). Needs no private kit files (endKit=false).
 */
import React from 'react';
import {AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, random, spring, staticFile, useCurrentFrame} from 'remotion';
import {useAudioData, visualizeAudio} from '@remotion/media-utils';
import {Camera, EndCard, FPS, Flash, Fx, LiveBg, PunchCaption, T, Word, sec} from './brand';

export type Seg = {kind: 'hook' | 'item' | 'cta'; dur: number; words: Word[]; title?: string; sub?: string; sample?: boolean; footage?: string};
export type ShortProps = {id: string; tag: string; index: string; hook: string[]; segs: Seg[]; pill?: string; endKit: boolean};

const GAP = 0.18;
const START = 0.3;
const END_HOLD = 2.2;
export const timeline = (p: ShortProps) => {
  let c = START;
  const starts = p.segs.map((s) => { const st = c; c += s.dur + GAP; return st; });
  const tEnd = c + 0.12;
  return {starts, tEnd, total: tEnd + END_HOLD};
};
export const shortDuration = (p: ShortProps) => Math.max(30, sec(timeline(p).total));

const CARD_H = 176, CARD_GAP = 18, TOP0 = 660, X0 = 64, CW = 856;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const Wave: React.FC<{src: string; local: number; dur: number; active: boolean; k: number}> = ({src, local, dur, active, k}) => {
  const frame = useCurrentFrame();
  const audio = useAudioData(staticFile(src));
  const N = 48, width = 690;
  const spec = active && audio && local >= 0 ? visualizeAudio({fps: FPS, frame: local, audioData: audio, numberOfSamples: 64}) : null;
  const prog = active ? Math.min(1, local / sec(dur)) : 0;
  return (
    <div style={{position: 'absolute', left: 118, top: 92, width, height: 64}}>
      {Array.from({length: N}, (_, i) => {
        const base = 0.25 + 0.75 * Math.abs(Math.sin(i * 1.37 + k)) * (0.4 + 0.6 * random(`w${k}${i}`));
        const h = spec ? Math.min(1, 0.18 + spec[(i * 3) % 40] * 16) : base * (0.55 + 0.12 * Math.sin(frame / 9 + i * 0.6));
        const played = active && i / N < prog;
        return <div key={i} style={{position: 'absolute', left: (i * width) / N, top: 32 - 32 * h, width: (width / N) * 0.5, height: 64 * h, borderRadius: 3,
          background: played ? T.red : active ? '#8A90A2' : '#5D6273', boxShadow: played ? `0 0 10px ${T.red}` : undefined}} />;
      })}
    </div>
  );
};

const Card: React.FC<{j: number; k: number; seg: Seg; st: number; id: string}> = ({j, k, seg, st, id}) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const revealed = t >= st;
  const active = revealed && t < st + seg.dur + GAP;
  const inP = spring({frame: frame - sec(0.5 + j * 0.1), fps: FPS, config: {damping: 11, stiffness: 170}});
  const revP = spring({frame: frame - sec(st), fps: FPS, config: {damping: 10, stiffness: 200}});
  const scale = interpolate(inP, [0, 1], [0.5, 1]) * (active ? 1 + 0.05 * revP : 1);
  return (
    <div style={{position: 'absolute', left: X0, top: TOP0 + j * (CARD_H + CARD_GAP), width: CW, height: CARD_H, borderRadius: 24,
      background: active ? 'rgba(30,21,25,0.92)' : 'rgba(20,21,26,0.86)', backdropFilter: 'blur(14px)', border: `2px solid ${active ? T.red : 'rgba(249,250,251,0.12)'}`,
      transform: `scale(${scale}) translateY(${(1 - inP) * 100}px)`, opacity: Math.min(1, inP * 1.5) * (active ? 1 : revealed ? 0.72 : 0.55),
      boxShadow: active ? '0 0 46px rgba(217,63,63,0.4)' : undefined}}>
      <div style={{position: 'absolute', left: 30, top: 28, fontFamily: T.mono, fontWeight: 500, fontSize: 34, color: active ? T.red : T.sub}}>{String(j + 1).padStart(2, '0')}</div>
      {!revealed ? (
        <>
          <div style={{position: 'absolute', left: 118, top: 38, width: 420, height: 30, borderRadius: 8, background: 'rgba(249,250,251,0.10)'}} />
          <div style={{position: 'absolute', left: 118, top: 100, width: 600, height: 22, borderRadius: 6, background: 'rgba(249,250,251,0.06)'}} />
        </>
      ) : (
        <div style={{transform: `translateY(${(1 - revP) * 26}px)`, opacity: Math.min(1, revP * 2)}}>
          <div style={{position: 'absolute', left: 118, top: 22, right: 20, fontFamily: T.sans, fontWeight: 800, fontSize: 54, color: T.text, whiteSpace: 'nowrap'}}>{seg.title}</div>
          {seg.sample
            ? <Wave src={`shorts/${id}/s${k}.wav`} local={frame - sec(st)} dur={seg.dur} active={active} k={k} />
            : <div style={{position: 'absolute', left: 118, top: 100, right: 20, fontFamily: T.sans, fontWeight: 500, fontSize: 35, color: T.sub, whiteSpace: 'nowrap'}}>{seg.sub}</div>}
        </div>
      )}
    </div>
  );
};

/** Stock footage as a graded, slowly zooming backdrop: graphite look so brand text and the one red accent stay on top. */
const Footage: React.FC<{src: string; frames: number}> = ({src, frames}) => {
  const frame = useCurrentFrame();
  const z = interpolate(frame, [0, frames], [1.12, 1.0], clamp);
  const inP = interpolate(frame, [0, 5], [0, 1], clamp);
  return (
    <AbsoluteFill style={{opacity: inP}}>
      <OffthreadVideo src={staticFile(src)} muted style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z})`,
        filter: 'grayscale(0.75) contrast(1.12) brightness(0.8)'}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(9,9,12,0.82) 0%, rgba(9,9,12,0.28) 30%, rgba(9,9,12,0.38) 62%, rgba(9,9,12,0.9) 100%)'}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.6) 100%)'}} />
      {[[40, 40, 1, 1], [1040, 40, -1, 1], [40, 1880, 1, -1], [1040, 1880, -1, -1]].map(([x, y, sx, sy], i) => (
        <div key={i} style={{position: 'absolute', left: x, top: y, width: 0, height: 0}}>
          <div style={{position: 'absolute', left: sx > 0 ? 0 : -46, top: sy > 0 ? 0 : -3, width: 46, height: 3, background: 'rgba(249,250,251,0.45)'}} />
          <div style={{position: 'absolute', left: sx > 0 ? 0 : -3, top: sy > 0 ? 0 : -46, width: 3, height: 46, background: 'rgba(249,250,251,0.45)'}} />
        </div>
      ))}
    </AbsoluteFill>
  );
};

const CodeEnd: React.FC = () => {
  const frame = useCurrentFrame();
  const p = spring({frame, fps: FPS, config: {damping: 12, stiffness: 160}});
  return (
    <AbsoluteFill style={{background: T.bg, alignItems: 'center', justifyContent: 'center'}}>
      <div style={{fontFamily: T.mono, fontSize: 26, letterSpacing: 6, color: T.sub, marginBottom: 30}}>PHÒNG THU CHO GIỌNG VIỆT</div>
      <div style={{fontFamily: T.sans, fontWeight: 800, fontSize: 190, color: T.text, transform: `scale(${interpolate(p, [0, 1], [1.4, 1])})`}}>ITERA</div>
      <div style={{fontFamily: T.sans, fontWeight: 600, fontSize: 54, color: T.text, marginTop: 60, opacity: p}}>Giọng này làm bằng ITERA.</div>
      <div style={{fontFamily: T.mono, fontSize: 38, color: T.sub, marginTop: 26, opacity: p}}>itera102.space</div>
      <div style={{display: 'flex', gap: 6, marginTop: 50, height: 50, alignItems: 'center'}}>
        {Array.from({length: 28}, (_, i) => <div key={i} style={{width: 6, borderRadius: 3, background: i === 13 ? T.red : '#5D6273', height: 10 + 36 * Math.abs(Math.sin(i * 0.9 + frame / 6))}} />)}
      </div>
    </AbsoluteFill>
  );
};

export const Short: React.FC<ShortProps> = (p) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const {starts, tEnd} = timeline(p);
  const items = p.segs.map((s, k) => ({s, k})).filter((x) => x.s.kind === 'item').slice(0, 3);
  const ctaK = p.segs.findIndex((s) => s.kind === 'cta');
  const words: Word[] = p.segs.flatMap((s, k) => s.words.map((w) => ({...w, s: w.s + starts[k], e: w.e + starts[k]})));
  const sampleAt = (x: number) => p.segs.some((s, k) => s.sample && x >= starts[k] - 0.1 && x < starts[k] + s.dur + 0.1);
  const head = spring({frame, fps: FPS, config: {damping: 14, stiffness: 160}});
  const pillP = ctaK >= 0 ? spring({frame: frame - sec(starts[ctaK]), fps: FPS, config: {damping: 12, stiffness: 200}}) : 0;

  return (
    <AbsoluteFill>
      <LiveBg accent={sampleAt(t) ? 1 : 0} />
      {p.segs.map((sg, k) => {
        if (!sg.footage) return null;
        const nx = p.segs.findIndex((x, i) => i > k && x.footage);
        const end = nx >= 0 ? starts[nx] : tEnd;
        const from = k === 0 ? 0 : sec(starts[k]);
        return <Sequence key={`f${k}`} from={from} durationInFrames={Math.max(1, sec(end) - from)}><Footage src={sg.footage} frames={sec(end) - from} /></Sequence>;
      })}
      {t < tEnd && (
        <Camera hits={starts}>
          <div style={{position: 'absolute', left: X0, top: 250, width: CW, display: 'flex', alignItems: 'baseline', gap: 18, opacity: head, transform: `translateY(${(1 - head) * -60}px)`}}>
            <div style={{fontFamily: T.sans, fontWeight: 800, fontSize: 40, color: T.text, letterSpacing: 1}}>ITERA</div>
            <div style={{fontFamily: T.mono, fontSize: 24, color: T.sub, letterSpacing: 3}}>{p.tag}</div>
            <div style={{marginLeft: 'auto', fontFamily: T.mono, fontSize: 24, color: T.sub}}>{p.index}</div>
          </div>
          <div style={{position: 'absolute', left: X0, top: 309, height: 2, width: CW * head, background: 'rgba(249,250,251,0.25)'}} />
          {p.hook.slice(0, 2).map((line, i) => {
            const lp = spring({frame: frame - sec(0.1 + i * 0.22), fps: FPS, config: {damping: i ? 9 : 13, stiffness: 160, mass: 0.8}});
            return <div key={i} style={{position: 'absolute', left: X0, top: 334 + i * 110, fontFamily: T.sans, fontWeight: 800, fontSize: 100, lineHeight: 1.08,
              color: T.text, letterSpacing: -2, whiteSpace: 'nowrap', opacity: Math.min(1, lp * 2), transformOrigin: '10% 50%',
              transform: i ? `scale(${interpolate(lp, [0, 1], [1.7, 1])}) rotate(${(1 - lp) * -4}deg)` : `translateX(${(1 - lp) * -500}px) skewX(${(1 - lp) * -12}deg)`}}>{line}</div>;
          })}
          {items.map(({s, k}, j) => <Card key={k} j={j} k={k} seg={s} st={starts[k]} id={p.id} />)}
          {p.pill && ctaK >= 0 && t >= starts[ctaK] && (
            <div style={{position: 'absolute', left: X0, top: 1250, height: 84, padding: '0 34px', borderRadius: 18, background: T.surface,
              border: '2px solid rgba(249,250,251,0.2)', display: 'flex', alignItems: 'center', gap: 20, fontFamily: T.sans, fontWeight: 700, fontSize: 38, color: T.text,
              transform: `translateY(${(1 - pillP) * 60}px) scale(${(0.9 + 0.1 * pillP) * (1 + 0.025 * Math.sin(t * 7))})`, opacity: pillP,
              boxShadow: `0 0 ${18 + 12 * Math.sin(t * 7)}px rgba(249,250,251,0.18)`}}>
              {p.pill}
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={T.sub} strokeWidth="2"><path d="M4 5h16v11H9l-5 4z" /></svg>
            </div>
          )}
        </Camera>
      )}
      {t < tEnd && <PunchCaption y={1372} size={64} words={words} />}
      {items.map(({k}) => <Flash key={k} at={starts[k] - 0.02} strength={p.segs[k].footage ? 0.45 : 0.2} />)}
      <Flash at={tEnd} strength={0.5} />
      <Sequence from={sec(tEnd)}>{p.endKit ? <EndCard /> : <CodeEnd />}</Sequence>

      {p.segs.map((_, k) => <Sequence key={k} from={sec(starts[k])}><Audio src={staticFile(`shorts/${p.id}/s${k}.wav`)} /></Sequence>)}
      <Audio src={staticFile('fx/beat.wav')} volume={(f) => { const x = f / FPS; return x >= tEnd || sampleAt(x) ? 0 : 0.1; }} />
      <Fx at={0} name="impact" volume={0.7} />
      <Fx at={0.12} name="whoosh" volume={0.45} />
      {items.map(({k}, j) => <Fx key={`a${k}`} at={0.5 + j * 0.1} name="pop" volume={0.3} />)}
      {items.map(({k}) => <Fx key={`b${k}`} at={starts[k] - 0.05} name="pop" volume={0.55} />)}
      {ctaK >= 0 && <Fx at={starts[ctaK] - 0.1} name="whoosh" volume={0.45} />}
      <Fx at={tEnd - 0.15} name="whoosh" volume={0.5} />
      {!p.endKit && <Fx at={tEnd + 0.05} name="impact" volume={0.5} />}
    </AbsoluteFill>
  );
};
