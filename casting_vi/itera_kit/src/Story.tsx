/**
 * "Story" template — a tender text story read aloud (user 2026-11-17): cream paper, the title in soft red, each line fades
 * in as it is read (current line dark, read lines softer), slow breathing zoom, then an illustrated end card saying the
 * voice is AI (ITERA). Props from assets/make_story.py.
 */
import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {FPS, T, sec} from './brand';

export type StoryLine = {text: string; display?: string[]; voiceDur: number; gap?: number; gapBefore?: number};
export type StoryProps = {id: string; title: string; titleDur: number; lines: StoryLine[]; endDur: number; music?: string};
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const INK = '#3A2E2A', RED = '#D9534F', PAPER = '#F6EEE3';
export const storyTimeline = (p: StoryProps) => {
  let c = 0.8; const tTitle = c; c += p.titleDur + 0.9;
  const starts = p.lines.map((l) => { c += l.gapBefore ?? 0; const s = c; c += l.voiceDur + (l.gap ?? 0.7); return s; });
  const tEnd = c + 0.6; return {tTitle, starts, tEnd, total: tEnd + Math.max(5.5, p.endDur + 2.2)};
};
export const storyDuration = (p: StoryProps) => sec(storyTimeline(p).total);

const Paper: React.FC = () => {
  const f = useCurrentFrame();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='540' height='960'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' seed='${Math.floor(f / 4) % 6}'/><feColorMatrix values='0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`;
  return (
    <AbsoluteFill style={{background: `radial-gradient(120% 90% at 50% 40%, #FBF6EE 0%, ${PAPER} 55%, #E9DCCB 100%)`}}>
      <AbsoluteFill style={{backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`, backgroundSize: '540px 960px', opacity: 0.18, mixBlendMode: 'multiply'}} />
    </AbsoluteFill>
  );
};
/** Thin hand-drawn style divider with a small heart. */
const Divider: React.FC<{y: number; p: number}> = ({y, p}) => (
  <svg width="1080" height="60" viewBox="0 0 1080 60" style={{position: 'absolute', left: 0, top: y, opacity: p}}>
    <path d="M140 32 C 300 18, 420 44, 510 30" stroke="#8C6E5D" strokeWidth="2.5" fill="none" strokeDasharray="420" strokeDashoffset={420 * (1 - p)} />
    <path d="M570 30 C 660 44, 780 18, 940 32" stroke="#8C6E5D" strokeWidth="2.5" fill="none" strokeDasharray="420" strokeDashoffset={420 * (1 - p)} />
    <path d="M540 44 C 520 30, 512 20, 524 13 C 532 9, 538 14, 540 19 C 542 14, 548 9, 556 13 C 568 20, 560 30, 540 44 Z" fill="none" stroke={RED} strokeWidth="2.5" />
  </svg>
);

const Reading: React.FC<{p: StoryProps}> = ({p}) => {
  const f = useCurrentFrame(); const t = f / FPS;
  const {tTitle, starts, tEnd} = storyTimeline(p);
  const fs = 43, lh = 66, top = 500;
  const tops: number[] = []; let yy = top; p.lines.forEach((l) => { tops.push(yy); yy += lh * (l.display?.length ?? 1); });
  const zoom = interpolate(t, [0, tEnd], [1.0, 1.04], clamp);
  return (
    <AbsoluteFill style={{transform: `scale(${zoom})`}}>
      <Divider y={250} p={interpolate(t, [0.1, 1.2], [0, 1], clamp)} />
      <div style={{position: 'absolute', left: 60, right: 60, top: 330, textAlign: 'center', fontFamily: T.sans, fontWeight: 800, fontSize: 60, lineHeight: 1.25, color: RED, letterSpacing: 1,
        opacity: interpolate(t, [tTitle - 0.5, tTitle + 0.3], [0, 1], clamp), transform: `translateY(${interpolate(t, [tTitle - 0.5, tTitle + 0.3], [16, 0], clamp)}px)`}}>{p.title}</div>
      {p.lines.map((l, i) => {
        const s = starts[i]; const next = starts[i + 1] ?? tEnd;
        const appear = interpolate(t, [s - 0.35, s + 0.25], [0, 1], clamp);
        const done = interpolate(t, [next - 0.2, next + 0.4], [0, 1], clamp);
        const op = appear * (1 - 0.42 * done);
        return (
          <div key={i} style={{position: 'absolute', left: 40, right: 40, top: tops[i], textAlign: 'center', whiteSpace: 'nowrap', fontFamily: T.sans, fontWeight: done < 1 && t >= s - 0.2 ? 500 : 400, fontSize: fs,
            lineHeight: `${lh}px`, color: INK, opacity: op, filter: `blur(${(1 - appear) * 6}px)`, transform: `translateY(${(1 - appear) * 14}px)`}}>
            {(l.display ?? [l.text]).map((d, j) => <div key={j}>{d.split('♥').map((part, q, arr) => <React.Fragment key={q}>{part}{q < arr.length - 1 && <span style={{color: RED}}>♥</span>}</React.Fragment>)}</div>)}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** Illustrated end card: two hearts held by sound waves, "this voice is AI", ITERA. */
export const EndIllustration: React.FC<{t: number}> = ({t}) => {
  const a = (d: number) => interpolate(t, [d, d + 0.9], [0, 1], {...clamp, easing: (x) => 1 - Math.pow(1 - x, 3)});
  const pulse = 1 + 0.03 * Math.sin(t * 2.4);
  return (
    <AbsoluteFill>
      <Paper />
      <AbsoluteFill style={{background: 'radial-gradient(50% 30% at 50% 38%, rgba(217,83,79,0.16) 0%, rgba(217,83,79,0) 100%)'}} />
      <svg width="1080" height="1100" viewBox="0 0 1080 1100" style={{position: 'absolute', left: 0, top: 160}}>
        {[0, 1, 2, 3].map((k) => {
          const r = 200 + k * 70 + ((t * 40) % 70); const o = Math.max(0, 0.35 - k * 0.08) * a(0.2);
          return <circle key={k} cx="540" cy="560" r={r} fill="none" stroke={RED} strokeWidth="2.5" opacity={o} />;
        })}
        <g transform={`translate(540 560) scale(${pulse * a(0.1)}) translate(-540 -560)`}>
          <path d="M470 640 C 380 575, 350 520, 380 475 C 405 440, 450 445, 470 480 C 490 445, 535 440, 560 475 C 590 520, 560 575, 470 640 Z" fill="#F2B8A8" stroke={RED} strokeWidth="5" />
          <path d="M610 680 C 520 615, 490 560, 520 515 C 545 480, 590 485, 610 520 C 630 485, 675 480, 700 515 C 730 560, 700 615, 610 680 Z" fill={RED} opacity="0.92" />
          {/* small sound bars inside the big heart */}
          {[-36, -18, 0, 18, 36].map((dx, i) => {
            const h = 18 + 22 * Math.abs(Math.sin(t * 3 + i * 1.3));
            return <rect key={i} x={606 + dx} y={590 - h / 2} width="9" height={h} rx="4.5" fill="#FFF6EE" />;
          })}
        </g>
      </svg>
      <div style={{position: 'absolute', left: 60, right: 60, top: 1140, textAlign: 'center', fontFamily: T.sans, color: INK}}>
        <div style={{fontSize: 40, fontWeight: 400, opacity: a(0.6), letterSpacing: 1}}>Giọng đọc bạn vừa nghe</div>
        <div style={{fontSize: 86, fontWeight: 800, color: RED, marginTop: 10, opacity: a(1.0), transform: `translateY(${(1 - a(1.0)) * 20}px)`}}>là giọng AI</div>
        <div style={{fontSize: 40, fontWeight: 500, marginTop: 26, opacity: a(1.5)}}>được tạo bằng</div>
        <div style={{display: 'inline-flex', alignItems: 'center', gap: 16, marginTop: 18, opacity: a(1.9)}}>
          <div style={{width: 20, height: 20, borderRadius: 10, background: T.red}} />
          <span style={{fontWeight: 800, fontSize: 76, letterSpacing: 8, color: INK}}>ITERA</span>
        </div>
        <div style={{fontFamily: T.mono, fontSize: 32, marginTop: 30, color: '#8C6E5D', letterSpacing: 2, opacity: a(2.3)}}>itera102.space</div>
      </div>
    </AbsoluteFill>
  );
};

export const Story: React.FC<StoryProps> = (p) => {
  const f = useCurrentFrame(); const t = f / FPS;
  const {tTitle, starts, tEnd, total} = storyTimeline(p);
  const endIn = interpolate(t, [tEnd - 0.2, tEnd + 1.0], [0, 1], clamp);
  const voiceAt = (x: number) => (x >= tTitle - 0.1 && x < tTitle + p.titleDur + 0.2) || p.lines.some((l, i) => x >= starts[i] - 0.1 && x < starts[i] + l.voiceDur + 0.2) || (x >= tEnd + 1.4 && x < tEnd + 1.6 + p.endDur);
  return (
    <AbsoluteFill style={{background: PAPER}}>
      <Paper />
      <AbsoluteFill style={{opacity: 1 - endIn}}><Reading p={p} /></AbsoluteFill>
      {t >= tEnd - 0.2 && <AbsoluteFill style={{opacity: endIn}}><EndIllustration t={t - tEnd} /></AbsoluteFill>}
      <AbsoluteFill style={{background: '#000', opacity: interpolate(t, [0, 0.5, total - 0.8, total], [1, 0, 0, 1], clamp)}} />
      {p.music && <Audio src={staticFile(p.music)} volume={(fr) => { const x = fr / FPS; return interpolate(x, [0, 1.5, total - 2, total], [0, 1, 1, 0], clamp) * (voiceAt(x) ? 0.16 : 0.32); }} />}
      <Sequence from={sec(tTitle)}><Audio src={staticFile(`story/${p.id}/vt.wav`)} /></Sequence>
      {p.lines.map((l, i) => <Sequence key={i} from={sec(starts[i])}><Audio src={staticFile(`story/${p.id}/v${i}.wav`)} /></Sequence>)}
      <Sequence from={sec(tEnd + 1.5)}><Audio src={staticFile(`story/${p.id}/ve.wav`)} /></Sequence>
    </AbsoluteFill>
  );
};
