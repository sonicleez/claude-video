/**
 * "Reel" template — cinematic chapter rhythm modelled on the user's reference (AVIS promo), in 9:16:
 * each chapter (~3.5–4 s) = grey "before" footage + prompt bar typing + cursor click → mosaic reveal to colour,
 * the voice plays (that is ITERA's "after"), big stacked title lands. Counter, corner marks, brand bug; red end card.
 * Props from assets/make_reel.py.
 */
import React from 'react';
import {AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, random, spring, staticFile, useCurrentFrame} from 'remotion';
import {useAudioData, visualizeAudio} from '@remotion/media-utils';
import {FPS, Fx, T, Word, sec} from './brand';

export type Chapter = {prompt: string; button: string; title: string[]; accent: string; voiceDur: number; words: Word[]; style?: string};
export type Hook = {lines: string[]; voiceDur: number; words: Word[]};
export type ReelProps = {id: string; tag: string; hook?: Hook; chapters: Chapter[]; endLines: [string, string]; endVoiceDur?: number; skin?: string};

const PRE = 1.15;     // signature before-beat (type, click, generate) — used ONCE, on the first chapter
const QUICK_PRE = 0.3; // every other chapter cuts straight in
/** The typed-prompt beat is the series signature and appears once. Later chapters each get a different treatment. */
export const styleOf = (ch: Chapter, k: number): string =>
  ch.style ?? (k === 0 ? 'prompt' : /^\d[\d.,]*%?$/.test(ch.title[0] ?? '') ? 'count' : ['wipe', 'kinetic', 'slam'][(k - 1) % 3]);
const preOf = (ch: Chapter, k: number) => (styleOf(ch, k) === 'prompt' ? PRE : QUICK_PRE);
const TAIL = 0.45;
const END = 1.7;
const END_VOICE_AT = 0.45; // end-card tagline read aloud once the logo has landed
const endDur = (p: ReelProps) => (p.endVoiceDur ? Math.max(END, END_VOICE_AT + p.endVoiceDur + 0.7) : END);
export const reelTimeline = (p: ReelProps) => {
  const hookDur = p.hook ? Math.max(1.6, p.hook.voiceDur + 0.3) : 0;
  let c = hookDur;
  const starts = p.chapters.map((ch, k) => { const s = c; c += preOf(ch, k) + ch.voiceDur + TAIL; return s; });
  return {starts, hookDur, tEnd: c, total: c + endDur(p)};
};
export const reelDuration = (p: ReelProps) => Math.max(30, sec(reelTimeline(p).total));
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const COLS = 6, ROWS = 10;

const Corners: React.FC = () => (
  <>
    {[[44, 44, 1, 1], [1036, 44, -1, 1], [44, 1876, 1, -1], [1036, 1876, -1, -1]].map(([x, y, sx, sy], i) => (
      <div key={i} style={{position: 'absolute', left: x, top: y}}>
        <div style={{position: 'absolute', left: sx > 0 ? 0 : -44, top: sy > 0 ? 0 : -3, width: 44, height: 3, background: 'rgba(249,250,251,0.6)'}} />
        <div style={{position: 'absolute', left: sx > 0 ? 0 : -3, top: sy > 0 ? 0 : -44, width: 3, height: 44, background: 'rgba(249,250,251,0.6)'}} />
      </div>
    ))}
  </>
);

const Wave: React.FC<{src: string; local: number}> = ({src, local}) => {
  const audio = useAudioData(staticFile(src));
  const N = 54;
  const spec = audio && local >= 0 ? visualizeAudio({fps: FPS, frame: local, audioData: audio, numberOfSamples: 64}) : null;
  return (
    <div style={{position: 'absolute', left: 64, top: 1296, width: 856, height: 80, display: 'flex', alignItems: 'center', gap: 6}}>
      {Array.from({length: N}, (_, i) => {
        const h = spec ? Math.min(1, 0.1 + spec[(i * 2) % 44] * 18) : 0.1;
        return <div key={i} style={{flex: 1, height: 80 * h, borderRadius: 4, background: i < N * 0.5 ? T.red : '#E7E9EE', opacity: 0.95}} />;
      })}
    </div>
  );
};


/* ---------- "pop" skin (user 2026-11-13: bolder viewfinder, waveform, type and frame) ---------- */
export const SkinCtx = React.createContext<string>('classic');
const BEAT = 60 / 86;
/** Camera viewfinder HUD: rounded inset frame, thick breathing brackets, blinking REC, running timecode, focus box that locks on. */
const Hud: React.FC<{t0: number; k?: number; n?: number; focus?: boolean}> = ({t0, k, n, focus = true}) => {
  const frame = useCurrentFrame(); const t = frame / FPS; const g = t0 + t;
  const breathe = 6 * Math.pow(Math.abs(Math.cos((Math.PI * g) / BEAT)), 6);
  const lock = spring({frame, fps: FPS, config: {damping: 13, stiffness: 160}});
  const tc = `00:00:${String(Math.floor(g)).padStart(2, '0')}:${String(Math.floor((g % 1) * 30)).padStart(2, '0')}`;
  const L = 78, TH = 9;
  const fs = 300 * interpolate(lock, [0, 1], [1.5, 1]);
  return (
    <>
      <div style={{position: 'absolute', inset: 30, borderRadius: 56, border: '3px solid rgba(255,255,255,0.22)', boxShadow: 'inset 0 0 120px rgba(0,0,0,0.45)'}} />
      {[[60, 60, 1, 1], [1020, 60, -1, 1], [60, 1860, 1, -1], [1020, 1860, -1, -1]].map(([x, y, sx, sy], i) => {
        const X = x + sx * breathe, Y = y + sy * breathe;
        return (
          <div key={i} style={{position: 'absolute', left: X, top: Y}}>
            <div style={{position: 'absolute', left: sx > 0 ? 0 : -L, top: sy > 0 ? 0 : -TH, width: L, height: TH, borderRadius: TH, background: '#fff', boxShadow: '0 0 18px rgba(0,0,0,0.5)'}} />
            <div style={{position: 'absolute', left: sx > 0 ? 0 : -TH, top: sy > 0 ? 0 : -L, width: TH, height: L, borderRadius: TH, background: '#fff', boxShadow: '0 0 18px rgba(0,0,0,0.5)'}} />
          </div>
        );
      })}
      <div style={{position: 'absolute', left: 84, top: 236, display: 'flex', alignItems: 'center', gap: 16, padding: '10px 22px', borderRadius: 40, background: 'rgba(9,9,12,0.55)', backdropFilter: 'blur(10px)'}}>
        <div style={{width: 24, height: 24, borderRadius: 12, background: T.red, opacity: Math.floor(g * 2) % 2 ? 0.25 : 1, boxShadow: `0 0 16px ${T.red}`}} />
        <span style={{fontFamily: T.mono, fontWeight: 700, fontSize: 30, color: '#fff', letterSpacing: 3}}>REC</span>
        <span style={{fontFamily: T.sans, fontWeight: 800, fontSize: 30, color: '#fff', letterSpacing: 3, marginLeft: 8}}>ITERA</span>
      </div>
      <div style={{position: 'absolute', right: 84, top: 236, display: 'flex', alignItems: 'center', gap: 14, padding: '10px 22px', borderRadius: 40, background: 'rgba(9,9,12,0.55)', backdropFilter: 'blur(10px)',
        fontFamily: T.mono, fontSize: 28, color: '#fff', letterSpacing: 2}}>
        {tc}{k !== undefined && n ? <span style={{marginLeft: 6, padding: '2px 12px', borderRadius: 14, background: '#fff', color: '#09090C', fontWeight: 700}}>{k + 1}/{n}</span> : null}
      </div>
      {/* focus box: snaps onto the subject, then holds */}
      {focus && <div style={{position: 'absolute', left: 540 - fs / 2, top: 600 - fs / 2, width: fs, height: fs, opacity: interpolate(t, [0, 0.15, 1.2, 1.6], [0, 0.9, 0.9, 0.35], clamp)}}>
        {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([a, b], i) => (
          <div key={i} style={{position: 'absolute', left: a ? undefined : 0, right: a ? 0 : undefined, top: b ? undefined : 0, bottom: b ? 0 : undefined, width: 46, height: 46,
            borderLeft: a ? 'none' : '5px solid #FFD54A', borderRight: a ? '5px solid #FFD54A' : 'none', borderTop: b ? 'none' : '5px solid #FFD54A', borderBottom: b ? '5px solid #FFD54A' : 'none'}} />
        ))}
        <div style={{position: 'absolute', left: fs / 2 - 14, top: fs / 2 - 2, width: 28, height: 4, background: '#FFD54A'}} />
        <div style={{position: 'absolute', left: fs / 2 - 2, top: fs / 2 - 14, width: 4, height: 28, background: '#FFD54A'}} />
      </div>}
    </>
  );
};
/** Mirrored live waveform in a glass pill, with a pulsing mic disc. */
const MirrorWave: React.FC<{src: string; local: number}> = ({src, local}) => {
  const audio = useAudioData(staticFile(src));
  const N = 34;
  const spec = audio && local >= 0 ? visualizeAudio({fps: FPS, frame: local, audioData: audio, numberOfSamples: 64}) : null;
  const level = spec ? Math.min(1, spec.slice(0, 16).reduce((a, b) => a + b, 0) * 3) : 0;
  return (
    <div style={{position: 'absolute', left: 64, top: 1300, width: 856, height: 124, borderRadius: 62, background: 'rgba(12,13,17,0.6)', border: '2px solid rgba(255,255,255,0.18)',
      backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', padding: '0 34px 0 18px', gap: 22, boxShadow: '0 20px 50px rgba(0,0,0,0.45)'}}>
      <div style={{width: 88, height: 88, borderRadius: 44, background: T.red, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        boxShadow: `0 0 0 ${6 + level * 18}px rgba(217,63,63,0.28)`, transform: `scale(${1 + level * 0.08})`}}>
        <svg width="44" height="44" viewBox="0 0 24 24" fill="#fff"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11z" /></svg>
      </div>
      <div style={{flex: 1, height: 96, display: 'flex', alignItems: 'center', gap: 7}}>
        {Array.from({length: N}, (_, i) => {
          const c = Math.abs(i - (N - 1) / 2) / ((N - 1) / 2);
          const v = spec ? spec[Math.floor(c * 30)] : 0;
          const h = Math.min(1, 0.08 + v * 22 * (1.1 - c * 0.5));
          return <div key={i} style={{flex: 1, height: 96 * h, borderRadius: 8, background: 'linear-gradient(180deg, #FFFFFF 0%, #FFC2C2 50%, #FFFFFF 100%)', opacity: 0.5 + h * 0.5}} />;
        })}
      </div>
    </div>
  );
};
/** Speaker tag chip (accent) for the pop skin. */
const SpeakerChip: React.FC<{text: string; p: number}> = ({text, p}) => (
  <div style={{position: 'absolute', left: 64, top: 862, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 26px 12px', borderRadius: 34, background: T.red,
    fontFamily: T.sans, fontWeight: 800, fontSize: 40, color: '#fff', letterSpacing: 2, textTransform: 'uppercase', boxShadow: '0 10px 30px rgba(217,63,63,0.45)',
    transformOrigin: '0% 50%', transform: `scale(${interpolate(p, [0, 1], [0.4, 1])}) rotate(${(1 - p) * -10}deg)`, opacity: Math.min(1, p * 2)}}>
    <div style={{width: 14, height: 14, borderRadius: 7, background: '#fff'}} />{text}
  </div>
);
/** Title: line 1 white with a hard 3D shadow, line 2 as a tilted white sticker. */
const PopTitleLine: React.FC<{line: string; i: number; tp: number; slam: boolean}> = ({line, i, tp, slam}) => {
  const sticker = i === 1;
  return (
    <div style={{position: 'absolute', left: sticker ? 56 : 60, top: 955 + i * 150, fontFamily: T.sans, fontWeight: 800, fontSize: 138, lineHeight: 1, letterSpacing: -3, whiteSpace: 'nowrap',
      transformOrigin: '0% 60%', opacity: Math.min(1, tp * 2),
      transform: `scale(${interpolate(tp, [0, 1], [slam ? 2.6 : 1.6, 1])}) rotate(${sticker ? -3 + (1 - tp) * 10 : (1 - tp) * -6}deg) translateY(${(1 - tp) * 30}px)`,
      ...(sticker
        ? {color: '#09090C', background: '#fff', padding: '8px 26px 18px', borderRadius: 20, boxShadow: '10px 12px 0 rgba(9,9,12,0.85)'}
        : {color: '#fff', textShadow: '0 6px 0 #09090C, 5px 11px 0 rgba(217,63,63,0.95), 0 20px 40px rgba(0,0,0,0.5)'})}}>{line}</div>
  );
};
/** Karaoke caption: spoken words pop in, the active word sits on a red chip. */
const PopCaption: React.FC<{words: Word[]; lt: number; frame: number; pre: number; top?: number}> = ({words, lt, frame, pre, top = 1446}) => (
  <div style={{position: 'absolute', left: 64, width: 880, top, fontFamily: T.sans, fontWeight: 800, fontSize: 54, lineHeight: 1.3, color: '#fff',
    textShadow: '0 3px 0 #09090C, 0 4px 16px rgba(0,0,0,0.9)'}}>
    {words.map((w, i) => {
      const on = lt >= w.s && lt < (words[i + 1] ? words[i + 1].s : w.e + 0.5);
      const wp = spring({frame: frame - sec(pre + w.s), fps: FPS, config: {damping: 11, stiffness: 260, mass: 0.5}});
      return <span key={i} style={{display: 'inline-block', marginRight: 10, padding: '0 10px 4px', borderRadius: 12, opacity: lt >= w.s ? 1 : 0.32,
        background: on ? T.red : 'transparent', textShadow: on ? 'none' : undefined, transform: `scale(${on ? interpolate(wp, [0, 1], [1.25, 1.06]) : 1}) rotate(${on ? -2 : 0}deg)`}}>{w.t}</span>;
    })}
  </div>
);

const ChapterView: React.FC<{ch: Chapter; k: number; n: number; id: string; frames: number; style: string; pre: number; t0?: number}> = ({ch, k, n, id, frames, style, pre, t0 = 0}) => {
  const frame = useCurrentFrame();
  const skin = React.useContext(SkinCtx); const pop = skin.startsWith('pop'); const clean = skin === 'pop-clean';
  const t = frame / FPS;
  const isPrompt = style === 'prompt';
  const R = pre - 0.05;                       // reveal moment
  const rev = interpolate(t, [R, R + 0.4], [0, 1], clamp);
  const zoom = interpolate(frame, [0, frames], [1.14, 1.02], clamp) + (t >= R ? (style === 'slam' ? 0.22 : 0.05) * Math.exp(-(t - R) * 5) : 0);
  const typed = Math.floor(interpolate(t, [0.08, 0.6], [0, ch.prompt.length], clamp));
  const clickT = 0.82;
  const cur = interpolate(t, [0.3, clickT], [0, 1], {...clamp, easing: (x) => 1 - Math.pow(1 - x, 3)});
  const pressed = t >= clickT && t < clickT + 0.14;
  const generating = t >= clickT + 0.05 && t < R;
  const barOut = interpolate(t, [R, R + 0.25], [0, 1], clamp);
  const barIn = spring({frame: frame - 2, fps: FPS, config: {damping: 14, stiffness: 180}});
  const titleP = (i: number) => spring({frame: frame - sec(R + 0.08 + i * 0.1), fps: FPS, config: {damping: 9, stiffness: 170, mass: 0.7}});
  // Mosaic mask: tiles that still show the grey "before" layer.
  const rects = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const th = (random(`m${k}-${r}-${c}`) * 0.7 + (r / ROWS) * 0.3);
    if (rev < th) rects.push(`<rect x='${c * 180}' y='${r * 192}' width='181' height='193' fill='white'/>`);
  }
  const mask = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1080 1920' preserveAspectRatio='none'>${rects.join('')}</svg>")`;
  const video = (filter: string) => (
    <OffthreadVideo src={staticFile(`shorts/${id}/f${k}.mp4`)} muted style={{position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})`, filter}} />
  );
  return (
    <AbsoluteFill style={{background: T.bg}}>
      {video('saturate(1.15) contrast(1.08) brightness(0.92)')}
      {rev < 1 && (
        <AbsoluteFill style={(isPrompt ? {WebkitMaskImage: mask, maskImage: mask, WebkitMaskSize: '100% 100%', maskSize: '100% 100%'} : style === 'wipe' ? {clipPath: `inset(0 0 0 ${rev * 100}%)`} : style === 'count' ? {opacity: 1 - rev} : {display: 'none'}) as any}>
          {video('grayscale(1) contrast(1.05) brightness(0.55)')}
          <AbsoluteFill style={{background: 'rgba(20,24,34,0.35)'}} />
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(9,9,12,0.55) 0%, rgba(9,9,12,0) 22%, rgba(9,9,12,0) 48%, rgba(9,9,12,0.88) 100%)'}} />
      <AbsoluteFill style={{background: '#F9FAFB', opacity: interpolate(t, [R - 0.03, R, R + 0.22], [0, 0.75, 0], clamp)}} />
      {t < 0.2 && <AbsoluteFill style={{background: '#09090C', opacity: interpolate(t, [0, 0.2], [0.9, 0], clamp)}} />}
      {pop ? <Hud t0={t0} k={k} n={n} focus={!clean} /> : <><Corners />
      <div style={{position: 'absolute', right: 70, top: 250, fontFamily: T.mono, fontSize: 30, color: T.text, letterSpacing: 2}}>
        {String(k + 1).padStart(2, '0')} <span style={{color: T.sub}}>/ {String(n).padStart(2, '0')}</span>
      </div>
      <div style={{position: 'absolute', left: 70, top: 250, fontFamily: T.sans, fontWeight: 800, fontSize: 34, color: T.text, letterSpacing: 2}}>ITERA</div></>}

      {/* Before beat: prompt bar, typing, cursor click */}
      {style === 'wipe' && rev > 0 && rev < 1 && <div style={{position: 'absolute', left: `${rev * 100}%`, top: 0, bottom: 0, width: 8, background: T.red, boxShadow: `0 0 40px ${T.red}`}} />}
      {isPrompt && barOut < 1 && (
        <div style={{position: 'absolute', left: 64, top: 1240, width: 856, height: 116, borderRadius: 30, background: 'rgba(20,21,26,0.92)',
          border: '2px solid rgba(249,250,251,0.16)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', padding: '0 18px 0 34px',
          transform: `translateY(${(1 - barIn) * 80 + barOut * 60}px) scale(${1 - barOut * 0.06})`, opacity: barIn * (1 - barOut)}}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill={T.text}><path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" /></svg>
          <div style={{marginLeft: 22, fontFamily: T.sans, fontWeight: 600, fontSize: 40, color: T.text, whiteSpace: 'nowrap', flex: 1, overflow: 'hidden'}}>
            {ch.prompt.slice(0, typed)}<span style={{opacity: Math.floor(frame / 7) % 2 && t < 1 ? 1 : 0, color: T.red}}>|</span>
          </div>
          <div style={{height: 80, padding: '0 34px', borderRadius: 22, background: T.ctaRed, color: '#fff', fontFamily: T.sans, fontWeight: 700, fontSize: 36,
            display: 'flex', alignItems: 'center', transform: `scale(${pressed ? 0.92 : 1})`, boxShadow: generating ? `0 0 ${30 + 20 * Math.sin(frame)}px ${T.red}` : 'none'}}>
            {generating ? 'Đang tạo…' : ch.button}
          </div>
        </div>
      )}
      {isPrompt && t >= 0.28 && barOut < 1 && (
        <svg width="64" height="64" viewBox="0 0 24 24" style={{position: 'absolute', left: interpolate(cur, [0, 1], [470, 800]), top: interpolate(cur, [0, 1], [1500, 1300]), opacity: 1 - barOut,
          transform: `scale(${pressed ? 0.85 : 1})`, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.6))'}}>
          <path d="M4 2l15 9-6.5 1.5L16 20l-3 1.3-3.4-7.4L5 18z" fill="#fff" stroke="#09090C" strokeWidth="1.2" />
        </svg>
      )}
      {isPrompt && t >= clickT && t < clickT + 0.4 && (() => { const r = 20 + (t - clickT) * 300; return (
        <div style={{position: 'absolute', left: 812 - r, top: 1306 - r, width: r * 2, height: r * 2, borderRadius: '50%', border: '5px solid #fff', opacity: 1 - (t - clickT) * 2.5}} />
      ); })()}

      {/* After beat: stacked title, accent, live waveform, clean caption */}
      {t >= R && (
        <>
          {pop ? (ch.accent ? <SpeakerChip text={ch.accent} p={titleP(0)} /> : null) : <div style={{position: 'absolute', left: 64, top: 930, fontFamily: T.sans, fontWeight: 600, fontStyle: 'italic', fontSize: 50, color: T.red,
            opacity: Math.min(1, titleP(0) * 2), transform: `translateX(${(1 - titleP(0)) * -40}px)`}}>{ch.accent}</div>}
          {style === 'kinetic' && (() => {
            // Kinetic type: the spoken words themselves land big, one at a time; the title sits small above.
            const lt = t - pre; const idx = ch.words.reduce((a, w, i) => (lt >= w.s ? i : a), -1);
            if (idx < 0) return null;
            const w = ch.words[idx]; const wp = spring({frame: frame - sec(pre + w.s), fps: FPS, config: {damping: 10, stiffness: 240, mass: 0.6}});
            return (
              <>
                <div style={{position: 'absolute', left: 64, top: 996, fontFamily: T.sans, fontWeight: 800, fontSize: 60, color: T.sub, letterSpacing: -1}}>{ch.title.join(' ')}</div>
                <div style={{position: 'absolute', left: 60, top: 1080, fontFamily: T.sans, fontWeight: 800, fontSize: 170, lineHeight: 1, letterSpacing: -5, whiteSpace: 'nowrap', color: idx % 2 ? '#09090C' : T.text,
                  background: idx % 2 ? T.text : 'transparent', padding: idx % 2 ? '0 20px 12px' : 0, borderRadius: 14, transformOrigin: '0% 60%',
                  transform: `scale(${interpolate(wp, [0, 1], [1.5, 1])}) rotate(${idx % 2 ? -2 : 0}deg)`, textShadow: idx % 2 ? 'none' : '0 10px 40px rgba(0,0,0,0.6)'}}>{w.t.replace(/[.,!?…]+$/, '').toUpperCase()}</div>
              </>
            );
          })()}
          {style !== 'kinetic' && ch.title.slice(0, 2).map((line0, i) => {
            const tp = titleP(i);
            const num = style === 'count' && i === 0 ? line0.match(/^(\d[\d.,]*)(%?)$/) : null;
            const line = num ? `${Math.round(Number(num[1].replace(/[.,]/g, '')) * interpolate(t, [R, R + 0.7], [0, 1], clamp))}${num[2]}` : line0;
            if (pop) return <PopTitleLine key={i} line={line} i={i} tp={tp} slam={style === 'slam'} />;
            return (
              <div key={i} style={{position: 'absolute', left: 60, top: 990 + i * 138, fontFamily: T.sans, fontWeight: 800, fontSize: 142, lineHeight: 1, letterSpacing: -4, whiteSpace: 'nowrap',
                transformOrigin: '0% 60%', transform: `scale(${interpolate(tp, [0, 1], [style === 'slam' ? 2.8 : 1.5, 1])}) rotate(${style === 'slam' ? (1 - tp) * (i ? 8 : -8) : 0}deg) translateY(${(1 - tp) * 30}px)`, opacity: Math.min(1, tp * 2), fontVariantNumeric: 'tabular-nums'}}>
                <div style={{position: 'absolute', left: 0, top: 0, color: 'transparent', WebkitTextStroke: '2px rgba(249,250,251,0.35)', transform: `translateY(${10 * tp}px) translateX(${6 * tp}px)`}}>{line}</div>
                <div style={{position: 'relative', color: T.text, textShadow: '0 10px 40px rgba(0,0,0,0.55)'}}>{line}</div>
              </div>
            );
          })}
          {style === 'count' && <div style={{position: 'absolute', left: 64, top: 1276, height: 10, borderRadius: 5, background: T.red, width: 856 * interpolate(t, [R, R + 0.7], [0, 1], clamp)}} />}
          {style !== 'count' && !clean && (pop ? <MirrorWave src={`shorts/${id}/v${k}.wav`} local={frame - sec(pre)} /> : <Wave src={`shorts/${id}/v${k}.wav`} local={frame - sec(pre)} />)}
          {pop && !clean && style !== 'kinetic' && <PopCaption words={ch.words} lt={t - pre} frame={frame} pre={pre} />}
          {!pop && style !== 'kinetic' && <div style={{position: 'absolute', left: 64, width: 856, top: 1388, fontFamily: T.sans, fontWeight: 700, fontSize: 54, lineHeight: 1.25, color: T.text,
            textShadow: '0 2px 12px rgba(0,0,0,0.9)'}}>
            {ch.words.map((w, i) => { const on = t - pre >= w.s && t - pre < (ch.words[i + 1] ? ch.words[i + 1].s : w.e + 0.5); return <span key={i} style={{opacity: t - pre >= w.s ? 1 : 0.38, marginRight: 8, padding: '0 8px', borderRadius: 10, display: 'inline-block', background: on ? T.text : 'transparent', color: on ? '#09090C' : T.text, textShadow: on ? 'none' : undefined}}>{w.t}</span>; })}
          </div>}
        </>
      )}
    </AbsoluteFill>
  );
};

/** Opening hook: the claim is fully readable on frame 0 (no fade-in), over moving footage, with the narrator line. */
const HookView: React.FC<{hook: Hook; id: string; frames: number}> = ({hook, id, frames}) => {
  const frame = useCurrentFrame();
  const skin = React.useContext(SkinCtx); const pop = skin.startsWith('pop'); const clean = skin === 'pop-clean';
  const zoom = interpolate(frame, [0, frames], [1.2, 1.05], clamp);
  return (
    <AbsoluteFill style={{background: T.bg}}>
      <OffthreadVideo src={staticFile(`shorts/${id}/fh.mp4`)} muted style={{position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})`, filter: 'saturate(1.15) contrast(1.1) brightness(0.75)'}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(9,9,12,0.6) 0%, rgba(9,9,12,0.15) 35%, rgba(9,9,12,0.8) 100%)'}} />
      {pop ? <Hud t0={0} focus={!clean} /> : <><Corners />
      <div style={{position: 'absolute', left: 70, top: 250, fontFamily: T.sans, fontWeight: 800, fontSize: 34, color: T.text, letterSpacing: 2}}>ITERA</div></>}
      {hook.lines.slice(0, 3).map((line, i) => {
        const tp = i === 0 ? 1 : spring({frame: frame - i * 9, fps: FPS, config: {damping: 9, stiffness: 180, mass: 0.7}});
        const punch = i === 0 ? 1 + 0.08 * Math.exp(-frame / 3) : interpolate(tp, [0, 1], [1.6, 1]);
        const last = i === Math.min(hook.lines.length, 3) - 1;
        return <div key={i} style={{position: 'absolute', left: 60, top: 640 + i * 196, fontFamily: T.sans, fontWeight: 800, fontSize: 164, lineHeight: 1, letterSpacing: -5, whiteSpace: 'nowrap',
          color: last ? '#09090C' : T.text, background: last ? T.text : 'transparent', padding: last ? '6px 22px 14px' : 0, borderRadius: 14, marginLeft: last ? -4 : 0,
          transformOrigin: '0% 50%', transform: `scale(${punch}) rotate(${last ? -2 : 0}deg)`, opacity: Math.min(1, tp * 2), textShadow: last ? 'none' : '0 10px 40px rgba(0,0,0,0.6)'}}>{line}</div>;
      })}
      {clean ? null : pop ? <PopCaption words={hook.words} lt={frame / FPS - 0.1} frame={frame} pre={0.1} top={1392} /> : <div style={{position: 'absolute', left: 64, width: 900, top: 1392, fontFamily: T.sans, fontWeight: 600, fontSize: 46, lineHeight: 1.2, color: T.text, textShadow: '0 2px 12px rgba(0,0,0,0.9)'}}>
        {hook.words.map((w, i) => <span key={i} style={{opacity: frame / FPS - 0.1 >= w.s ? 1 : 0.38, marginRight: 12, display: 'inline-block'}}>{w.t}</span>)}
      </div>}
    </AbsoluteFill>
  );
};

const EndCard: React.FC<{lines: [string, string]}> = ({lines}) => {
  const frame = useCurrentFrame();
  const r = interpolate(frame, [0, 10], [0, 2300], {...clamp, easing: (x) => x * x});
  const p = spring({frame: frame - 8, fps: FPS, config: {damping: 12, stiffness: 150}});
  const p2 = spring({frame: frame - 16, fps: FPS, config: {damping: 10, stiffness: 160}});
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 540 - r, top: 960 - r, width: r * 2, height: r * 2, borderRadius: '50%', background: T.ctaRed}} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', opacity: Math.min(1, p * 1.5)}}>
        <div style={{fontFamily: T.sans, fontWeight: 800, fontSize: 200, color: '#fff', letterSpacing: 4, transform: `scale(${interpolate(p, [0, 1], [1.3, 1])})`}}>ITERA</div>
        <div style={{fontFamily: T.sans, fontWeight: 600, fontStyle: 'italic', fontSize: 58, color: 'rgba(255,255,255,0.85)', marginTop: 40}}>{lines[0]}</div>
        <div style={{fontFamily: T.sans, fontWeight: 800, fontSize: 110, color: '#fff', marginTop: 6, transform: `scale(${interpolate(p2, [0, 1], [1.5, 1])})`, opacity: Math.min(1, p2 * 2)}}>{lines[1]}</div>
        <div style={{fontFamily: T.mono, fontSize: 36, color: 'rgba(255,255,255,0.85)', marginTop: 60, letterSpacing: 2}}>itera102.space</div>
        <div style={{fontFamily: T.mono, fontSize: 26, color: 'rgba(255,255,255,0.7)', marginTop: 22, letterSpacing: 2}}>GIỌNG AI · LÀM BẰNG ITERA</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Reel: React.FC<ReelProps> = (p) => {
  const {starts, tEnd, hookDur, total} = reelTimeline(p);
  const voiceAt = (x: number) => p.chapters.some((ch, k) => x >= starts[k] + preOf(ch, k) - 0.1 && x < starts[k] + preOf(ch, k) + ch.voiceDur + 0.1) || x < hookDur || (!!p.endVoiceDur && x >= tEnd + END_VOICE_AT - 0.1);
  return (
    <SkinCtx.Provider value={p.skin ?? 'classic'}><AbsoluteFill style={{background: T.bg}}>
      {p.hook && <Sequence durationInFrames={sec(hookDur)}><HookView hook={p.hook} id={p.id} frames={sec(hookDur)} /></Sequence>}
      {p.hook && <Sequence from={3}><Audio src={staticFile(`shorts/${p.id}/vh.wav`)} /></Sequence>}
      {p.hook && <Fx at={0} name="impact" volume={0.8} />}
      {p.chapters.map((ch, k) => {
        const frames = sec(preOf(ch, k) + ch.voiceDur + TAIL);
        return <Sequence key={k} from={sec(starts[k])} durationInFrames={frames}><ChapterView ch={ch} k={k} n={p.chapters.length} id={p.id} frames={frames} style={styleOf(ch, k)} pre={preOf(ch, k)} t0={starts[k]} /></Sequence>;
      })}
      <Sequence from={sec(tEnd)}><EndCard lines={p.endLines} /></Sequence>
      {p.endVoiceDur && <Sequence from={sec(tEnd + END_VOICE_AT)}><Audio src={staticFile(`shorts/${p.id}/ve.wav`)} /></Sequence>}

      <Audio src={staticFile('fx/bed86.wav')} volume={(f) => { const x = f / FPS; return x >= total - 0.3 ? 0 : voiceAt(x) ? 0.16 : 0.42; }} />
      {p.chapters.map((ch, k) => (
        <React.Fragment key={k}>
          <Sequence from={sec(starts[k] + preOf(ch, k))}><Audio src={staticFile(`shorts/${p.id}/v${k}.wav`)} /></Sequence>
          <Fx at={starts[k]} name="whoosh" volume={0.35} />
          {styleOf(ch, k) === 'prompt' && Array.from({length: 5}, (_, i) => <Fx key={i} at={starts[k] + 0.1 + i * 0.1} name="pop" volume={0.12} />)}
          {styleOf(ch, k) === 'prompt' && <Fx at={starts[k] + 0.82} name="pop" volume={0.6} />}
          <Fx at={starts[k] + preOf(ch, k) - 0.05} name={styleOf(ch, k) === 'wipe' ? 'glitch' : 'impact'} volume={styleOf(ch, k) === 'slam' ? 0.9 : 0.7} />
        </React.Fragment>
      ))}
      <Fx at={tEnd - 0.1} name="whoosh" volume={0.6} />
      <Fx at={tEnd + 0.25} name="impact" volume={0.7} />
    </AbsoluteFill></SkinCtx.Provider>
  );
};
