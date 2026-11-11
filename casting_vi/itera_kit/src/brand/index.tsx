/**
 * ITERA brand system for Remotion, built from ITERA Video Kit v2.
 * Tokens, fonts and reusable pieces shared by every day of the 30-day series.
 */
import React from 'react';
import {
  AbsoluteFill, Audio, Img, Sequence, continueRender, delayRender, interpolate,
  spring, staticFile, useCurrentFrame, useVideoConfig,
} from 'remotion';

export const FPS = 30;
export const W = 1080;
export const H = 1920;
export const sec = (s: number) => Math.round(s * FPS);

// Colours and type scale from the kit README.
export const T = {
  bg: '#09090C', surface: '#14151A', text: '#F9FAFB', sub: '#969DB0',
  red: '#D93F3F', ctaRed: '#B92F32', line: 'rgba(249,250,251,0.10)',
  sans: 'ITERA Sans', mono: 'ITERA Mono',
  hook: {size: 104, weight: 800}, cta: {size: 44, weight: 700},
  caption: {size: 52, weight: 600}, label: {size: 26, weight: 500},
  safe: {x0: 64, x1: 920, y0: 240, y1: 1480},
};

// Load kit fonts once (Be Vietnam Pro + JetBrains Mono, SIL OFL).
if (typeof window !== 'undefined' && !(window as any).__iteraFonts) {
  (window as any).__iteraFonts = true;
  const h = delayRender('ITERA fonts');
  const faces: [string, string, string][] = [
    [T.sans, 'BeVietnamPro-Regular.ttf', '400'], [T.sans, 'BeVietnamPro-Medium.ttf', '500'],
    [T.sans, 'BeVietnamPro-SemiBold.ttf', '600'], [T.sans, 'BeVietnamPro-Bold.ttf', '700'],
    [T.sans, 'BeVietnamPro-ExtraBold.ttf', '800'], [T.mono, 'JetBrainsMono.ttf', '100 900'],
  ];
  Promise.all(faces.map(([fam, file, weight]) =>
    new FontFace(fam, `url(${staticFile(`kit/fonts/${file}`)})`, {weight}).load().then((f) => (document as any).fonts.add(f)),
  )).then(() => continueRender(h));
}

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** Graphite background: near-black with a faint top glow and film grain. */
export const BrandBg: React.FC = () => {
  const frame = useCurrentFrame();
  const seed = frame % 6;
  return (
    <AbsoluteFill style={{background: T.bg}}>
      <AbsoluteFill style={{background: 'radial-gradient(120% 60% at 50% 0%, #1A1B22 0%, rgba(9,9,12,0) 60%)'}} />
      <AbsoluteFill style={{opacity: 0.06, mixBlendMode: 'overlay'}}>
        <svg width={W} height={H}>
          <filter id={`g${seed}`}><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} /></filter>
          <rect width="100%" height="100%" filter={`url(#g${seed})`} />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** A full-frame kit PNG layer with a soft fade-in. */
export const KitLayer: React.FC<{src: string; fadeIn?: number; style?: React.CSSProperties}> = ({src, fadeIn = 6, style}) => {
  const frame = useCurrentFrame();
  return <Img src={staticFile(src)} style={{position: 'absolute', inset: 0, width: W, height: H, opacity: interpolate(frame, [0, fadeIn], [0, 1], clamp), ...style}} />;
};

/** Element placed by its top-left corner (kit PNGs include ~14-22px padding). */
export const El: React.FC<{src: string; x: number; y: number; w?: number; pop?: boolean; delay?: number}> = ({src, x, y, w, pop = true, delay = 0}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = pop ? spring({frame: frame - delay, fps, config: {damping: 14, stiffness: 180}}) : 1;
  return <Img src={staticFile(src)} style={{position: 'absolute', left: x, top: y, width: w, opacity: interpolate(p, [0, 0.4], [0, 1], clamp), transform: `translateY(${(1 - p) * 24}px)`}} />;
};

/** Nhịp mascot beat (0.4–0.8s per the kit's editing formula). */
export const Mascot: React.FC<{pose: 'chao' | 'lang-nghe' | 'chi-vao-ui'; x: number; y: number; size?: number; hold: number}> = ({pose, x, y, size = 300, hold}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const inP = spring({frame, fps, config: {damping: 12, stiffness: 200}});
  const out = interpolate(frame, [sec(hold) - 6, sec(hold)], [1, 0], clamp);
  const file = {chao: 'Nhip-01-chao', 'lang-nghe': 'Nhip-02-lang-nghe', 'chi-vao-ui': 'Nhip-03-chi-vao-ui'}[pose];
  return <Img src={staticFile(`kit/mascot/${file}.png`)} style={{position: 'absolute', left: x, top: y, width: size, transform: `scale(${0.6 + 0.4 * inP}) translateY(${(1 - inP) * 60}px)`, opacity: Math.min(inP * 2, 1) * out}} />;
};

export type Word = {t: string; s: number; e: number};

/** Kit caption: SemiBold 52px on the caption backing, current word white, rest sub-grey. */
export const Caption: React.FC<{words: Word[]; y?: number; maxWords?: number; width?: number; height?: number; fontSize?: number}> =
({words, y = 1240, maxWords = 6, width = 900, height = 174, fontSize = T.caption.size}) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const pages: Word[][] = [];
  let cur: Word[] = [];
  words.forEach((w, i) => {
    cur.push(w);
    if (/[.,!?]$/.test(w.t) || cur.length >= maxWords || i === words.length - 1 || (words[i + 1] && words[i + 1].s - w.e > 0.28)) { pages.push(cur); cur = []; }
  });
  const page = pages.find((p, i) => t >= p[0].s - 0.1 && t < (pages[i + 1] ? pages[i + 1][0].s - 0.1 : p[p.length - 1].e + 0.5));
  if (!page) return null;
  return (
    <div style={{position: 'absolute', left: (W - width) / 2, top: y, width, height}}>
      <Img src={staticFile('kit/el/09-caption-backing.png')} style={{position: 'absolute', inset: 0, width, height}} />
      <div style={{position: 'absolute', inset: `${height * 0.13}px 40px`, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        fontFamily: T.sans, fontWeight: T.caption.weight, fontSize, lineHeight: 1.15, flexWrap: 'wrap'}}>
        {page.map((w, i) => (
          <span key={i} style={{margin: '0 8px', color: t >= w.s ? T.text : T.sub}}>{w.t}</span>
        ))}
      </div>
    </div>
  );
};

/** Red playhead sweeping across a waveform row (red = currently playing). */
export const Playhead: React.FC<{x0: number; x1: number; y: number; h?: number; dur: number}> = ({x0, x1, y, h = 70, dur}) => {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [0, sec(dur)], [x0, x1], clamp);
  return (
    <div style={{position: 'absolute', left: x - 3, top: y - h / 2, width: 6, height: h}}>
      <div style={{position: 'absolute', inset: 0, borderRadius: 3, background: T.red, boxShadow: `0 0 18px ${T.red}`}} />
      <div style={{position: 'absolute', left: -5, top: -8, width: 16, height: 16, borderRadius: 8, background: T.red}} />
    </div>
  );
};

/** Mono label (timecode / tags), JetBrains Mono 500. */
export const Label: React.FC<{children: React.ReactNode; x: number; y: number; color?: string; size?: number; align?: 'left' | 'center'}> = ({children, x, y, color = T.sub, size = T.label.size, align = 'left'}) => (
  <div style={{position: 'absolute', left: align === 'center' ? 0 : x, right: align === 'center' ? 0 : undefined, top: y, textAlign: align,
    fontFamily: T.mono, fontWeight: 500, fontSize: size, letterSpacing: 2, color}}>{children}</div>
);

/** Kit end card E: art + layout ("Giọng này làm bằng ITERA." + URL) with sonic signature. */
export const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const z = interpolate(frame, [0, sec(3)], [1.04, 1], clamp);
  return (
    <AbsoluteFill>
      <Img src={staticFile('kit/end/art.jpg')} style={{position: 'absolute', inset: 0, width: W, height: H, transform: `scale(${z})`}} />
      <KitLayer src="kit/end/layout.png" fadeIn={8} />
      <Sequence from={2}><Audio src={staticFile('kit/sfx/03-sonic-signature.wav')} volume={0.8} /></Sequence>
    </AbsoluteFill>
  );
};

export const Sfx: React.FC<{at: number; name: 'tick' | 'reveal' | 'signature'; volume?: number}> = ({at, name, volume = 0.6}) => {
  const file = {tick: '01-marker-tick', reveal: '02-reveal', signature: '03-sonic-signature'}[name];
  return <Sequence from={sec(at)} durationInFrames={sec(1.5)}><Audio src={staticFile(`kit/sfx/${file}.wav`)} volume={volume} /></Sequence>;
};
