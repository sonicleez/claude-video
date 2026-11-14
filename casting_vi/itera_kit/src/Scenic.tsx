/**
 * "Scenic" template — calm, cinematic travel-poem short (user 2026-11-14: clouds, mountains, sea; gentle Ân voice;
 * new frame/background/type; no waveform, no captions). Props from assets/make_scenic.py.
 * Each scene: moving footage (video, or a photo panned Ken-Burns style) with a warm grade, film grain, vignette,
 * a soft light leak on entry; one big word whose letters resolve from blur, a giant outlined echo of the word drifting
 * behind it, and a short poetic line. Thin inset frame, ITERA bug top-left, story-style progress bars, scene label.
 */
import React from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame} from 'remotion';
import {FPS, T, sec} from './brand';

export type Scene = {word: string; line: string; label: string; media: string; kind: 'video' | 'image'; voiceDur: number; ambient?: string; dur?: number};
export type ScenicProps = {id: string; scenes: Scene[]; end: Scene & {words: string[]}};

const LEAD = 0.9, TAIL = 0.9, XF = 0.7, MIN = 4.6;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const sceneDur = (s: Scene) => Math.max(MIN, LEAD + s.voiceDur + TAIL);
export const scenicTimeline = (p: ScenicProps) => {
  let c = 0;
  const starts = p.scenes.map((s) => { const st = c; c += sceneDur(s) - XF; return st; });
  const endStart = c; const endDur = Math.max(5, LEAD + p.end.voiceDur + 1.8);
  return {starts, endStart, endDur, total: endStart + endDur};
};
export const scenicDuration = (p: ScenicProps) => sec(scenicTimeline(p).total);

const Grain: React.FC = () => {
  const f = useCurrentFrame();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='540' height='960'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='${f % 12}'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`;
  return <AbsoluteFill style={{backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`, backgroundSize: '540px 960px', opacity: 0.09, mixBlendMode: 'overlay'}} />;
};

/** Moving picture: video with a slow pull-back, or a photo panned across its width. */
const Media: React.FC<{s: Scene; id: string; frames: number}> = ({s, id, frames}) => {
  const f = useCurrentFrame(); const p = f / frames;
  const grade = 'saturate(1.12) contrast(1.06) brightness(0.96) sepia(0.06)';
  if (s.kind === 'image') {
    // 4:3 photo at full height is 2560 px wide: drift right-to-left across it with a gentle push-in.
    const z = interpolate(p, [0, 1], [1.04, 1.12]);
    return <Img src={staticFile(`scenic/${id}/${s.media}`)} style={{position: 'absolute', height: 1920, left: interpolate(p, [0, 1], [-200, -1180]), top: 0, transform: `scale(${z})`, transformOrigin: '50% 60%', filter: grade}} />;
  }
  return <OffthreadVideo src={staticFile(`scenic/${id}/${s.media}`)} muted style={{position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${interpolate(p, [0, 1], [1.12, 1.02])})`, filter: grade}} />;
};

/** Big word: letters resolve from blur one by one; a giant outlined echo drifts behind; a thin rule and a soft line follow. */
const Words: React.FC<{word: string; line: string; at: number; frames: number; top?: number}> = ({word, line, at, frames, top = 820}) => {
  const f = useCurrentFrame(); const t = f / FPS;
  const letters = [...word];
  const out = interpolate(f, [frames - sec(0.6), frames], [1, 0], clamp);
  const rule = interpolate(t, [at + 0.5, at + 1.2], [0, 1], {...clamp, easing: (x) => 1 - Math.pow(1 - x, 3)});
  return (
    <AbsoluteFill style={{opacity: out}}>
      <div style={{position: 'absolute', top: top - 150, left: 0, whiteSpace: 'nowrap', fontFamily: T.sans, fontWeight: 800, fontSize: 400, letterSpacing: 12, color: 'transparent',
        WebkitTextStroke: '2px rgba(255,255,255,0.42)', transform: `translateX(${interpolate(f, [0, frames], [120, -260])}px)`, opacity: interpolate(t, [at - 0.3, at + 0.6], [0, 1], clamp)}}>{word}</div>
      <div style={{position: 'absolute', top, left: 84, display: 'flex', fontFamily: T.sans, fontWeight: 700, fontSize: 176, letterSpacing: 26, color: '#fff', textShadow: '0 12px 50px rgba(0,0,0,0.45)'}}>
        {letters.map((ch, i) => {
          const lp = at === 0 ? 1 : interpolate(t, [at + i * 0.09, at + i * 0.09 + 0.55], [0, 1], {...clamp, easing: (x) => 1 - Math.pow(1 - x, 3)});
          return <span key={i} style={{display: 'inline-block', opacity: lp, filter: `blur(${(1 - lp) * 14}px)`, transform: `translateY(${(1 - lp) * 46}px)`, whiteSpace: 'pre'}}>{ch}</span>;
        })}
      </div>
      <div style={{position: 'absolute', top: top + 222, left: 90, width: 150 * rule, height: 3, background: '#fff', borderRadius: 2}} />
      <div style={{position: 'absolute', top: top + 250, left: 90, fontFamily: T.sans, fontWeight: 400, fontStyle: 'italic', fontSize: 52, color: 'rgba(255,255,255,0.95)', letterSpacing: 1,
        opacity: interpolate(t, [at + 0.8, at + 1.4], [0, 1], clamp), transform: `translateY(${interpolate(t, [at + 0.8, at + 1.4], [18, 0], clamp)}px)`, textShadow: '0 4px 20px rgba(0,0,0,0.6)'}}>{line}</div>
    </AbsoluteFill>
  );
};

const SceneView: React.FC<{s: Scene; id: string; frames: number; first?: boolean}> = ({s, id, frames, first}) => {
  const f = useCurrentFrame(); const t = f / FPS;
  const fin = first ? 1 : interpolate(f, [0, sec(XF)], [0, 1], clamp);
  const leak = interpolate(t, [0, 0.5, 1.6], [0, 0.45, 0], clamp);
  return (
    <AbsoluteFill style={{opacity: fin, filter: `blur(${(1 - fin) * 10}px)`}}>
      <Media s={s} id={id} frames={frames} />
      <AbsoluteFill style={{background: 'radial-gradient(130% 80% at 50% 40%, rgba(0,0,0,0) 45%, rgba(5,6,10,0.55) 100%)'}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(5,6,10,0.35) 0%, rgba(5,6,10,0) 18%, rgba(5,6,10,0) 38%, rgba(5,6,10,0.45) 62%, rgba(5,6,10,0.15) 100%)'}} />
      <AbsoluteFill style={{background: `radial-gradient(60% 45% at ${interpolate(t, [0, 1.6], [10, 90], clamp)}% 20%, rgba(255,190,120,${leak}) 0%, rgba(255,140,80,0) 70%)`, mixBlendMode: 'screen'}} />
      <Words word={s.word} line={s.line} at={first ? 0 : LEAD - 0.2} frames={frames} />
    </AbsoluteFill>
  );
};

/** Thin inset frame, ITERA bug top-left, story progress bars, scene label bottom-left. */
const Chrome: React.FC<{p: ScenicProps}> = ({p}) => {
  const f = useCurrentFrame(); const g = f / FPS;
  const {starts, endStart} = scenicTimeline(p);
  const n = p.scenes.length; const cur = Math.max(0, starts.filter((s) => g >= s).length - 1);
  const s = g >= endStart ? p.end : p.scenes[cur];
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', inset: 44, borderRadius: 34, border: '2px solid rgba(255,255,255,0.5)'}} />
      <div style={{position: 'absolute', left: 84, top: 92, display: 'flex', alignItems: 'center', gap: 12}}>
        <div style={{width: 16, height: 16, borderRadius: 8, background: T.red, boxShadow: `0 0 14px ${T.red}`}} />
        <span style={{fontFamily: T.sans, fontWeight: 800, fontSize: 44, color: '#fff', letterSpacing: 5}}>ITERA</span>
      </div>
      <div style={{position: 'absolute', left: 84, right: 84, top: 172, display: 'flex', gap: 10}}>
        {[...p.scenes.map((_, k) => [starts[k], starts[k] + sceneDur(p.scenes[k]) - XF]), [endStart, endStart + scenicTimeline(p).endDur]].map(([a, b], k) => (
          <div key={k} style={{flex: 1, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.3)', overflow: 'hidden'}}>
            <div style={{height: '100%', width: `${interpolate(g, [a, b], [0, 100], clamp)}%`, background: '#fff'}} />
          </div>
        ))}
      </div>
      <div style={{position: 'absolute', right: 84, top: 102, fontFamily: T.mono, fontSize: 28, color: 'rgba(255,255,255,0.85)', letterSpacing: 3}}>
        {g >= endStart ? '— ∞' : `${String(cur + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`}
      </div>
      <div style={{position: 'absolute', left: 90, bottom: 96, fontFamily: T.mono, fontSize: 26, color: 'rgba(255,255,255,0.8)', letterSpacing: 6}}>{s.label}</div>
      <div style={{position: 'absolute', right: 90, bottom: 96, fontFamily: T.mono, fontSize: 22, color: 'rgba(255,255,255,0.6)', letterSpacing: 3}}>GIỌNG KỂ AI · ITERA</div>
    </AbsoluteFill>
  );
};

const EndView: React.FC<{e: ScenicProps['end']; id: string; frames: number}> = ({e, id, frames}) => {
  const f = useCurrentFrame(); const t = f / FPS;
  const fin = interpolate(f, [0, sec(XF)], [0, 1], clamp);
  const out = interpolate(f, [frames - sec(0.8), frames], [1, 0], clamp);
  return (
    <AbsoluteFill style={{opacity: fin * out, filter: `blur(${(1 - fin) * 10}px)`}}>
      <Media s={e} id={id} frames={frames} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(5,6,10,0.4) 0%, rgba(5,6,10,0.15) 35%, rgba(5,6,10,0.65) 100%)'}} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6}}>
        {e.words.map((w, i) => {
          const p = spring({frame: f - sec(0.5 + i * 0.45), fps: FPS, config: {damping: 20, stiffness: 90}});
          return <div key={i} style={{fontFamily: T.sans, fontWeight: 700, fontSize: 150, letterSpacing: 30, color: '#fff', opacity: p, filter: `blur(${(1 - p) * 12}px)`,
            transform: `translateY(${(1 - p) * 40}px)`, textShadow: '0 12px 50px rgba(0,0,0,0.5)', marginLeft: 30}}>{w}</div>;
        })}
        <div style={{marginTop: 40, fontFamily: T.sans, fontStyle: 'italic', fontSize: 54, color: 'rgba(255,255,255,0.95)', opacity: interpolate(t, [2.0, 2.8], [0, 1], clamp)}}>{e.line}</div>
        <div style={{marginTop: 70, fontFamily: T.mono, fontSize: 32, color: 'rgba(255,255,255,0.85)', letterSpacing: 3, opacity: interpolate(t, [2.6, 3.3], [0, 1], clamp)}}>itera102.space</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Scenic: React.FC<ScenicProps> = (p) => {
  const {starts, endStart, endDur, total} = scenicTimeline(p);
  const voiceAt = (x: number) => [...p.scenes.map((s, k) => [starts[k] + LEAD, starts[k] + LEAD + s.voiceDur]), [endStart + LEAD, endStart + LEAD + p.end.voiceDur]].some(([a, b]) => x >= a - 0.2 && x < b + 0.3);
  return (
    <AbsoluteFill style={{background: '#05060A'}}>
      {p.scenes.map((s, k) => (
        <Sequence key={k} from={sec(starts[k])} durationInFrames={sec(sceneDur(s))}><SceneView s={s} id={p.id} frames={sec(sceneDur(s))} first={k === 0} /></Sequence>
      ))}
      <Sequence from={sec(endStart)} durationInFrames={sec(endDur)}><EndView e={p.end} id={p.id} frames={sec(endDur)} /></Sequence>
      <Grain />
      <Chrome p={p} />
      <Audio src={staticFile('fx/ambient.wav')} volume={(fr) => { const x = fr / FPS; const fade = interpolate(x, [0, 1, total - 1.5, total], [0, 1, 1, 0], clamp); return fade * (voiceAt(x) ? 0.22 : 0.5); }} />
      {p.scenes.map((s, k) => (
        <React.Fragment key={k}>
          <Sequence from={sec(starts[k] + LEAD)}><Audio src={staticFile(`scenic/${p.id}/v${k}.wav`)} /></Sequence>
          {s.ambient && <Sequence from={sec(starts[k])} durationInFrames={sec(sceneDur(s))}><Audio src={staticFile(`scenic/${p.id}/${s.ambient}`)} volume={(fr) => 0.55 * interpolate(fr, [0, 15, sec(sceneDur(s)) - 20, sec(sceneDur(s))], [0, 1, 1, 0], clamp)} /></Sequence>}
        </React.Fragment>
      ))}
      <Sequence from={sec(endStart + LEAD)}><Audio src={staticFile(`scenic/${p.id}/ve.wav`)} /></Sequence>
    </AbsoluteFill>
  );
};
