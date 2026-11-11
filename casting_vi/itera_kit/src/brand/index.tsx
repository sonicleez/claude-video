/**
 * ITERA brand system for Remotion, built from ITERA Video Kit v2.
 * Tokens, fonts and reusable pieces shared by every day of the 30-day series.
 */
import React from 'react';
import {
  AbsoluteFill, Audio, Img, Sequence, continueRender, delayRender, interpolate, random as rnd,
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

/* ===================== Energy layer (v2) ===================== */


/** Living graphite background: drifting silver light, wave-terrain lines, dust. Placeholder until bg-loop-studio.mp4 exists. */
export const LiveBg: React.FC<{accent?: number}> = ({accent = 0}) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const lines = 9;
  return (
    <AbsoluteFill style={{background: T.bg, overflow: 'hidden'}}>
      <div style={{position: 'absolute', width: 1300, height: 1300, left: -300 + Math.sin(t * 0.35) * 260, top: -420 + Math.cos(t * 0.27) * 120,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(170,178,196,0.20) 0%, rgba(9,9,12,0) 65%)'}} />
      <div style={{position: 'absolute', width: 1000, height: 1000, right: -380 + Math.cos(t * 0.3) * 200, bottom: 120 + Math.sin(t * 0.4) * 160,
        borderRadius: '50%', background: `radial-gradient(circle, rgba(217,63,63,${0.10 + accent * 0.18}) 0%, rgba(9,9,12,0) 62%)`}} />
      <svg width={W} height={H} style={{position: 'absolute', inset: 0, opacity: 0.35}}>
        {Array.from({length: lines}, (_, k) => {
          const y0 = 1500 + k * 46;
          const pts = Array.from({length: 37}, (_, i) => {
            const x = i * 30;
            const y = y0 + Math.sin(i * 0.35 + t * 1.2 + k * 0.6) * (18 + k * 3) + Math.sin(i * 0.11 - t * 0.7) * 22;
            return `${x},${y}`;
          }).join(' ');
          return <polyline key={k} points={pts} fill="none" stroke={k === 4 ? T.red : '#9AA1B3'} strokeOpacity={k === 4 ? 0.6 : 0.25 - k * 0.015} strokeWidth={k === 4 ? 2 : 1.5} />;
        })}
      </svg>
      {Array.from({length: 40}, (_, i) => {
        const x = rnd(`px${i}`) * W, sp = 12 + rnd(`ps${i}`) * 30;
        const y = (rnd(`py${i}`) * H - t * sp * 3 + H * 4) % H;
        return <div key={i} style={{position: 'absolute', left: x + Math.sin(t + i) * 10, top: y, width: 3, height: 3, borderRadius: 2, background: '#C9CED9', opacity: 0.15 + rnd(`po${i}`) * 0.35}} />;
      })}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.7) 100%)'}} />
      <Grain />
    </AbsoluteFill>
  );
};
const Grain: React.FC = () => {
  const seed = useCurrentFrame() % 6;
  return (
    <AbsoluteFill style={{opacity: 0.07, mixBlendMode: 'overlay'}}>
      <svg width={W} height={H}><filter id={`lg${seed}`}><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} /></filter>
        <rect width="100%" height="100%" filter={`url(#lg${seed})`} /></svg>
    </AbsoluteFill>
  );
};

/** Punch-zoom + shake on beats (seconds). */
export const Camera: React.FC<{hits: number[]; children: React.ReactNode; strength?: number}> = ({hits, children, strength = 1}) => {
  const frame = useCurrentFrame();
  let s = 1, x = 0, y = 0;
  for (const h of hits) {
    const d = frame - sec(h);
    if (d >= 0 && d < 15) {
      const k = Math.exp(-d / 4) * strength;
      s += 0.05 * k; x += (rnd(`cx${h}${frame}`) - 0.5) * 18 * k; y += (rnd(`cy${h}${frame}`) - 0.5) * 18 * k;
    }
  }
  return <AbsoluteFill style={{transform: `translate(${x}px,${y}px) scale(${s * (1 + 0.012 * Math.sin(frame / 50))})`}}>{children}</AbsoluteFill>;
};

/** White flash for cuts. */
export const Flash: React.FC<{at: number; strength?: number}> = ({at, strength = 0.7}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [sec(at) - 1, sec(at), sec(at) + 6], [0, strength, 0], clamp);
  return <AbsoluteFill style={{background: '#F9FAFB', opacity: o, pointerEvents: 'none'}} />;
};

/** Energetic captions: ExtraBold caps, 2–4 words/page, active word on a white chip. */
export const PunchCaption: React.FC<{words: Word[]; y: number; maxWords?: number; size?: number}> = ({words, y, maxWords = 4, size = 70}) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const pages: Word[][] = [];
  let cur: Word[] = [];
  words.forEach((w, i) => {
    cur.push(w);
    const nx = words[i + 1];
    if (/[.,!?]$/.test(w.t) || cur.length >= maxWords || !nx || nx.s - w.e > 0.28) { pages.push(cur); cur = []; }
  });
  const idx = pages.findIndex((p, i) => t >= p[0].s - 0.06 && t < (pages[i + 1] ? Math.min(pages[i + 1][0].s - 0.06, p[p.length - 1].e + 0.6) : p[p.length - 1].e + 0.6));
  if (idx < 0) return null;
  const page = pages[idx];
  const pin = spring({frame: frame - sec(page[0].s - 0.06), fps: FPS, config: {damping: 12, stiffness: 260}});
  return (
    <div style={{position: 'absolute', left: 40, right: 40, top: y, textAlign: 'center', fontFamily: T.sans, fontWeight: 800, fontSize: size,
      lineHeight: 1.18, textTransform: 'uppercase', transform: `scale(${interpolate(pin, [0, 1], [0.75, 1])}) translateY(${(1 - pin) * 20}px)`}}>
      {page.map((w, i) => {
        const on = t >= w.s && t < (page[i + 1] ? page[i + 1].s : w.e + 0.6);
        return <span key={i} style={{display: 'inline-block', margin: '4px 8px', padding: '2px 14px', borderRadius: 12,
          color: on ? '#09090C' : t >= w.s ? T.text : 'rgba(249,250,251,0.55)', background: on ? T.text : 'transparent',
          transform: `scale(${on ? 1.08 : 1}) rotate(${on ? -1.5 : 0}deg)`, WebkitTextStroke: on ? undefined : '10px #09090C', paintOrder: 'stroke fill',
          boxShadow: on ? '0 10px 30px rgba(0,0,0,0.45)' : undefined}}>{w.t.replace(/[.,!?]$/, '')}</span>;
      })}
    </div>
  );
};

/** Crop a rectangle out of a full-frame kit PNG so it can be animated on its own. */
export const Crop: React.FC<{src: string; r: [number, number, number, number]; style?: React.CSSProperties}> = ({src, r, style}) => {
  const [x0, y0, x1, y1] = r;
  return (
    <div style={{position: 'absolute', left: x0, top: y0, width: x1 - x0, height: y1 - y0, overflow: 'hidden', ...style}}>
      <Img src={staticFile(src)} style={{position: 'absolute', left: -x0, top: -y0, width: W, height: H}} />
    </div>
  );
};

export const Fx: React.FC<{at: number; name: string; volume?: number}> = ({at, name, volume = 0.5}) => (
  <Sequence from={Math.max(0, sec(at))} durationInFrames={sec(2)}><Audio src={staticFile(`fx/${name}.wav`)} volume={volume} /></Sequence>
);
