import React from 'react';
import {
  AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile,
  useCurrentFrame, useVideoConfig, Easing, random,
} from 'remotion';
import {useAudioData, visualizeAudio} from '@remotion/media-utils';
import {continueRender, delayRender} from 'remotion';
import WORDS from './words.json';

const fontFamily = 'BVP';
if (typeof window !== 'undefined') {
  const h = delayRender('local fonts');
  Promise.all([500, 700, 800, 900].map((w) => {
    const ff = new FontFace('BVP', `url(${staticFile(`fonts/BeVietnamPro-${w}.ttf`)})`, {weight: String(w)});
    return ff.load().then((l) => (document as any).fonts.add(l));
  })).then(() => continueRender(h));
}

export const FPS = 30;
export const DURATION = Math.round(27.6 * FPS);
const f = (s: number) => Math.round(s * FPS);

const C = {
  bg: '#07070D', lime: '#C8FF2E', violet: '#7C5CFF', pink: '#FF4D8D',
  red: '#FF3B3B', white: '#FFFFFF', dim: 'rgba(255,255,255,0.55)',
};

// Scene boundaries (seconds), aligned to word timestamps of the voiceover.
const S = {hook: 0, problem: 4.1, demo: 11.85, feats: 18.8, cta: 23.05, end: 27.6};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const usePop = (start: number, cfg = {damping: 11, stiffness: 180, mass: 0.6}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - f(start), fps, config: cfg});
};

/* ---------- Background: drifting blobs + grain + vignette ---------- */
const Background: React.FC<{tint: string}> = ({tint}) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const blob = (x: number, y: number, r: number, col: string, sp: number, ph: number) => (
    <div style={{
      position: 'absolute', width: r, height: r, borderRadius: '50%', background: col, filter: 'blur(140px)',
      opacity: 0.55, left: x + Math.sin(t * sp + ph) * 120, top: y + Math.cos(t * sp * 0.8 + ph) * 160,
    }} />
  );
  return (
    <AbsoluteFill style={{background: C.bg, overflow: 'hidden'}}>
      {blob(-200, 100, 800, tint, 0.5, 0)}
      {blob(500, 1100, 900, C.violet, 0.4, 2)}
      {blob(300, 500, 500, '#1B1B3A', 0.7, 4)}
      <AbsoluteFill style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
        backgroundSize: '90px 90px', transform: `translateY(${(frame * 1.2) % 90}px)`,
      }} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.75) 100%)'}} />
    </AbsoluteFill>
  );
};

const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  const seed = frame % 8;
  return (
    <AbsoluteFill style={{opacity: 0.09, mixBlendMode: 'overlay', pointerEvents: 'none'}}>
      <svg width="1080" height="1920">
        <filter id={`n${seed}`}><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={seed} /></filter>
        <rect width="100%" height="100%" filter={`url(#n${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};

/* ---------- Camera: punch-in zooms + shake on impacts ---------- */
const PUNCHES = [0, 2.38, 6.3, 11.85, 15.98, 18.88, 19.8, 20.6, 21.4, 23.39];
const Camera: React.FC<{children: React.ReactNode}> = ({children}) => {
  const frame = useCurrentFrame();
  let scale = 1, sx = 0, sy = 0;
  for (const p of PUNCHES) {
    const d = frame - f(p);
    if (d >= 0 && d < 14) {
      const k = Math.exp(-d / 4);
      scale += 0.06 * k;
      sx += (random(`x${p}${frame}`) - 0.5) * 22 * k;
      sy += (random(`y${p}${frame}`) - 0.5) * 22 * k;
    }
  }
  const drift = 1 + 0.02 * Math.sin(frame / 60);
  return <AbsoluteFill style={{transform: `translate(${sx}px,${sy}px) scale(${scale * drift})`}}>{children}</AbsoluteFill>;
};

/* ---------- Flash transition ---------- */
const Flash: React.FC<{at: number; color?: string}> = ({at, color = '#fff'}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [f(at) - 2, f(at), f(at) + 7], [0, 0.85, 0], clamp);
  return <AbsoluteFill style={{background: color, opacity: o, pointerEvents: 'none'}} />;
};

/* ---------- Text helpers ---------- */
const Big: React.FC<{start: number; children: React.ReactNode; size?: number; color?: string; y: number; rot?: number; stroke?: boolean}> =
({start, children, size = 150, color = C.white, y, rot = 0, stroke}) => {
  const p = usePop(start);
  const frame = useCurrentFrame();
  if (frame < f(start)) return null;
  return (
    <div style={{
      position: 'absolute', top: y, left: 0, right: 0, textAlign: 'center', fontFamily, fontWeight: 900,
      fontSize: size, lineHeight: 1, color: stroke ? 'transparent' : color, letterSpacing: -4,
      WebkitTextStroke: stroke ? `4px ${color}` : undefined,
      transform: `scale(${interpolate(p, [0, 1], [1.8, 1])}) rotate(${rot * (1 - p) * 3 + rot}deg)`,
      opacity: interpolate(p, [0, 0.3], [0, 1], clamp),
      textShadow: stroke ? undefined : `0 12px 50px rgba(0,0,0,0.6)`,
    }}>{children}</div>
  );
};

/* ---------- Audio-reactive voice orb ---------- */
const VoiceOrb: React.FC<{size: number; y: number}> = ({size, y}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const audio = useAudioData(staticFile('voice.mp3'));
  let bars = new Array(48).fill(0);
  if (audio) bars = visualizeAudio({fps, frame, audioData: audio, numberOfSamples: 64}).slice(0, 48);
  const level = bars.reduce((a, b) => a + b, 0) / bars.length;
  const s = 1 + Math.min(level * 6, 0.35);
  return (
    <div style={{position: 'absolute', top: y - size / 2, left: 540 - size / 2, width: size, height: size}}>
      {bars.map((b, i) => {
        const ang = (i / bars.length) * Math.PI * 2;
        const len = 30 + Math.min(b * 900, 220);
        return <div key={i} style={{
          position: 'absolute', left: size / 2 - 5, top: size / 2 - 5, width: 10, height: len, borderRadius: 6,
          background: i % 2 ? C.lime : C.violet, transformOrigin: '5px 5px',
          transform: `rotate(${(ang * 180) / Math.PI + 180}deg) translateY(${size * 0.36}px)`, opacity: 0.9,
        }} />;
      })}
      <div style={{
        position: 'absolute', inset: size * 0.2, borderRadius: '50%', transform: `scale(${s})`,
        background: `radial-gradient(circle at 35% 30%, #fff 0%, ${C.lime} 18%, ${C.violet} 60%, #2a1a6b 100%)`,
        boxShadow: `0 0 ${80 + level * 900}px ${C.violet}, 0 0 ${40 + level * 600}px ${C.lime}`,
      }} />
    </div>
  );
};

/* ---------- Scene 1: Hook ---------- */
const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const g = frame >= f(2.38) && frame < f(2.38) + 8;
  const gl = g ? (random(`g${frame}`) - 0.5) * 40 : 0;
  return (
    <AbsoluteFill>
      <VoiceOrb size={600} y={820} />
      {frame < f(1.2) && <Big start={0} y={260} size={190} color={C.lime} rot={-3}>KHOAN<br />LƯỚT!</Big>}
      {frame >= f(1.2) && (
        <>
          <Big start={1.24} y={250} size={92} color={C.white}>Giọng bạn đang nghe…</Big>
          <div style={{position: 'absolute', top: 1220, left: 0, right: 0, transform: `translateX(${gl}px)`}}>
            {frame >= f(2.38) && (
              <div style={{position: 'relative'}}>
                {g && <div style={{position: 'absolute', inset: 0, transform: 'translate(8px,0)', opacity: 0.8}}>
                  <Big start={2.38} y={0} size={128} color={C.pink}>KHÔNG PHẢI<br />NGƯỜI THẬT</Big></div>}
                <Big start={2.38} y={0} size={128} color={C.lime}>KHÔNG PHẢI<br />NGƯỜI THẬT</Big>
              </div>
            )}
          </div>
        </>
      )}
      {frame >= f(3.0) && (
        <div style={{
          position: 'absolute', top: 360, left: 0, right: 0, textAlign: 'center', fontFamily, fontWeight: 700, fontSize: 40,
          color: C.dim, letterSpacing: 6, opacity: interpolate(frame, [f(3.0), f(3.3)], [0, 1], clamp),
        }}>100% GIỌNG AI · AN NHIÊN</div>
      )}
    </AbsoluteFill>
  );
};

/* ---------- Scene 2: Problem ---------- */
const Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS + S.problem;
  const mins = interpolate(t, [4.9, 6.5], [0, 120], {...clamp, easing: Easing.in(Easing.cubic)});
  const hh = Math.floor(mins / 60), mm = Math.floor(mins % 60);
  const takes = Math.max(1, Math.min(7, Math.floor(interpolate(t, [9.68, 11.0], [1, 7.99], clamp))));
  const red = interpolate(t, [6.3, 6.6], [0, 1], clamp);
  const pains: [number, string][] = [[7.24, 'Phòng ồn'], [8.56, 'Nói vấp'], [9.68, `Thu lại lần ${takes}`]];
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: 200, left: 0, right: 0, textAlign: 'center', fontFamily, fontWeight: 700, fontSize: 46, color: C.dim, letterSpacing: 8}}>
        THU ÂM 1 VIDEO
      </div>
      <div style={{
        position: 'absolute', top: 280, left: 0, right: 0, textAlign: 'center', fontFamily, fontWeight: 900, fontSize: 260,
        letterSpacing: -8, color: red > 0.5 ? C.red : C.white, fontVariantNumeric: 'tabular-nums',
        textShadow: red > 0.5 ? `0 0 80px rgba(255,59,59,0.6)` : 'none',
        transform: `scale(${1 + 0.12 * red * Math.exp(-(t - 6.3) * 4)})`,
      }}>{hh}:{String(mm).padStart(2, '0')}</div>
      <div style={{position: 'absolute', top: 560, left: 0, right: 0, textAlign: 'center', fontFamily, fontWeight: 800, fontSize: 64, color: C.red, opacity: red}}>
        = 2 TIẾNG
      </div>
      {pains.map(([s, label], i) => {
        if (t < s) return null;
        const p = spring({frame: frame - f(s - S.problem), fps: FPS, config: {damping: 12, stiffness: 200}});
        const strike = interpolate(t, [s + 0.35, s + 0.6], [0, 100], clamp);
        return (
          <div key={i} style={{
            position: 'absolute', top: 760 + i * 170, left: 140, right: 140, height: 140, borderRadius: 32,
            background: 'rgba(255,59,59,0.12)', border: `3px solid ${C.red}`, display: 'flex', alignItems: 'center', gap: 32,
            padding: '0 44px', transform: `translateX(${interpolate(p, [0, 1], [i % 2 ? 700 : -700, 0])}px) rotate(${(i - 1) * 1.5}deg)`,
          }}>
            <div style={{width: 76, height: 76, borderRadius: 38, background: C.red, color: '#fff', fontFamily, fontWeight: 900, fontSize: 56, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>✕</div>
            <div style={{position: 'relative', fontFamily, fontWeight: 800, fontSize: 68, color: '#fff'}}>
              {label}
              <div style={{position: 'absolute', left: 0, top: '52%', height: 8, width: `${strike}%`, background: C.red, borderRadius: 4}} />
            </div>
          </div>
        );
      })}
      {t > 10.66 && <Big start={10.66 - S.problem} y={1300} size={110} color={C.white} rot={4}>MUỐN XỈU!</Big>}
    </AbsoluteFill>
  );
};

/* ---------- Scene 3: Product demo in a phone ---------- */
const SCRIPT_TXT = 'Bình giữ nhiệt này nè. Bỏ đá từ sáng tới chiều, mở ra vẫn còn nguyên…';
const Demo: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS + S.demo;
  const enter = spring({frame, fps: FPS, config: {damping: 14, stiffness: 120}});
  const typed = Math.floor(interpolate(t, [12.4, 13.9], [0, SCRIPT_TXT.length], clamp));
  const voiceSel = t >= 14.08;
  const pressed = t >= 14.82 && t < 15.0;
  const prog = interpolate(t, [15.0, 16.2], [0, 100], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const done = t >= 16.25;
  const srt = ['00:00,1 → Bình giữ nhiệt này nè.', '00:01,4 → Bỏ đá từ sáng tới chiều,', '00:03,2 → mở ra vẫn còn nguyên…'];
  const cursorBlink = Math.floor(frame / 8) % 2 === 0;
  const bars = new Array(34).fill(0).map((_, i) => 0.25 + 0.75 * Math.abs(Math.sin(i * 1.7 + (done ? frame / 4 : 0))) * (done ? 1 : 0.25));
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: 120, left: 0, right: 0, textAlign: 'center', fontFamily, fontWeight: 900, fontSize: 84, color: C.white, letterSpacing: -2}}>
        Giờ thì <span style={{color: C.lime}}>3 bước</span>
      </div>
      <div style={{
        position: 'absolute', left: 150, top: 300, width: 780, height: 1180, borderRadius: 80, background: '#0F0F1A',
        border: '14px solid #22222F', boxShadow: `0 60px 160px rgba(124,92,255,0.45)`, overflow: 'hidden',
        transform: `translateY(${interpolate(enter, [0, 1], [1400, 0])}px) rotate(${interpolate(enter, [0, 1], [12, 0])}deg)`,
        fontFamily, color: '#fff',
      }}>
        <div style={{display: 'flex', alignItems: 'center', gap: 16, padding: '56px 48px 24px'}}>
          <div style={{width: 54, height: 54, borderRadius: 16, background: `linear-gradient(135deg, ${C.lime}, ${C.violet})`}} />
          <div style={{fontWeight: 900, fontSize: 44, letterSpacing: 2}}>ITERA</div>
          <div style={{marginLeft: 'auto', fontSize: 26, color: C.dim}}>Text to Speech</div>
        </div>
        <Step n={1} on={t >= 12.4} label="Dán kịch bản" />
        <div style={{margin: '16px 48px 0', height: 230, borderRadius: 28, background: '#191927', padding: 28, fontSize: 34, lineHeight: 1.4, fontWeight: 500, border: `2px solid ${t >= 12.4 && !voiceSel ? C.lime : '#2A2A3C'}`}}>
          {SCRIPT_TXT.slice(0, typed)}{t >= 12.4 && t < 14.08 && cursorBlink ? <span style={{color: C.lime}}>|</span> : null}
        </div>
        <Step n={2} on={voiceSel} label="Chọn giọng" />
        <div style={{margin: '16px 48px 0', display: 'flex', gap: 18}}>
          {['An Nhiên', 'Trâm', 'Cẩm Hồng'].map((v, i) => {
            const sel = voiceSel && i === 0;
            return <div key={v} style={{
              flex: 1, height: 96, borderRadius: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800,
              background: sel ? C.lime : '#191927', color: sel ? '#000' : C.dim, transform: `scale(${sel ? 1 + 0.08 * Math.exp(-(t - 14.08) * 6) : 1})`,
            }}>{v}</div>;
          })}
        </div>
        <Step n={3} on={t >= 14.82} label="Bấm tạo" />
        <div style={{
          margin: '16px 48px 0', height: 120, borderRadius: 60, position: 'relative', overflow: 'hidden',
          background: done ? '#1E3A12' : `linear-gradient(90deg, ${C.violet}, ${C.pink})`, transform: `scale(${pressed ? 0.94 : 1})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 42, fontWeight: 900,
        }}>
          {!done && t >= 15.0 && <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${prog}%`, background: 'rgba(255,255,255,0.25)'}} />}
          <span style={{position: 'relative', color: done ? C.lime : '#fff'}}>{done ? '✓ Xong!' : t >= 15.0 ? `Đang tạo… ${Math.round(prog)}%` : 'Tạo giọng'}</span>
        </div>
        <div style={{margin: '40px 48px 0', height: 120, display: 'flex', alignItems: 'center', gap: 8, opacity: t >= 15.0 ? 1 : 0.25}}>
          {bars.map((b, i) => <div key={i} style={{flex: 1, height: `${b * 100}%`, borderRadius: 6, background: done ? C.lime : '#3A3A55'}} />)}
        </div>
        <div style={{margin: '24px 48px 0', fontFamily: 'monospace', fontSize: 26, color: C.dim}}>
          {srt.map((l, i) => t >= 17.48 + i * 0.25 ? <div key={i} style={{marginBottom: 8}}><span style={{color: C.lime}}>SRT</span> {l}</div> : null)}
        </div>
      </div>
      {done && <Badge start={16.3 - S.demo} />}
      {t >= 14.82 && t < 15.3 && <Tap x={540} y={1208} t={t - 14.82} />}
      {t >= 14.08 && t < 14.5 && <Tap x={315} y={1000} t={t - 14.08} />}
    </AbsoluteFill>
  );
};
const Step: React.FC<{n: number; on: boolean; label: string}> = ({n, on, label}) => (
  <div style={{margin: '36px 48px 0', display: 'flex', alignItems: 'center', gap: 16, fontSize: 30, fontWeight: 800, color: on ? '#fff' : C.dim}}>
    <div style={{width: 48, height: 48, borderRadius: 24, background: on ? C.lime : '#2A2A3C', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900}}>{n}</div>
    {label}
  </div>
);
const Tap: React.FC<{x: number; y: number; t: number}> = ({x, y, t}) => {
  const r = 30 + t * 260;
  return <div style={{position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: '50%', border: `6px solid ${C.lime}`, opacity: 1 - t * 2.2}} />;
};
const Badge: React.FC<{start: number}> = ({start}) => {
  const p = usePop(start);
  return (
    <div style={{
      position: 'absolute', top: 1400, left: 0, right: 0, display: 'flex', justifyContent: 'center',
      transform: `scale(${interpolate(p, [0, 1], [0.3, 1])}) rotate(-3deg)`, opacity: interpolate(p, [0, 0.2], [0, 1], clamp),
    }}>
      <div style={{background: C.lime, color: '#000', fontFamily, fontWeight: 900, fontSize: 66, padding: '22px 48px', borderRadius: 26, boxShadow: `0 20px 80px rgba(200,255,46,0.5)`}}>
        &lt; 1 PHÚT · CÓ PHỤ ĐỀ
      </div>
    </div>
  );
};

/* ---------- Scene 4: Features stack ---------- */
const Feats: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS + S.feats;
  const items: [number, string, string][] = [[18.88, 'LỒNG TIẾNG', C.violet], [19.8, 'CLONE GIỌNG', C.pink], [20.6, 'ĐỔI GIỌNG', '#2EC5FF']];
  const merge = interpolate(t, [21.3, 21.6], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  return (
    <AbsoluteFill>
      {items.map(([s, label, col], i) => {
        if (t < s) return null;
        const p = spring({frame: frame - f(s - S.feats), fps: FPS, config: {damping: 10, stiffness: 160}});
        const baseY = 330 + i * 250;
        return (
          <div key={i} style={{
            position: 'absolute', left: 110, right: 110, top: interpolate(merge, [0, 1], [baseY, 760]), height: 200, borderRadius: 40,
            background: col, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily, fontWeight: 900, fontSize: 104,
            color: '#fff', letterSpacing: -3, boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
            transform: `scale(${interpolate(p, [0, 1], [2.2, 1]) * (1 - merge * 0.6)}) rotate(${(i - 1) * -3}deg)`,
            opacity: interpolate(p, [0, 0.25], [0, 1], clamp) * (1 - merge),
          }}>{label}</div>
        );
      })}
      {t >= 21.4 && (
        <>
          <Big start={21.4 - S.feats} y={560} size={110} color={C.dim}>TẤT CẢ TRONG</Big>
          <Big start={21.55 - S.feats} y={700} size={240} color={C.lime}>1 TÀI</Big>
          <Big start={21.7 - S.feats} y={930} size={240} color={C.lime}>KHOẢN</Big>
        </>
      )}
    </AbsoluteFill>
  );
};

/* ---------- Scene 5: CTA ---------- */
const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS + S.cta;
  const p = usePop(23.39 - S.cta, {damping: 9, stiffness: 140, mass: 0.7});
  const shine = interpolate((t - 23.8) % 1.6, [0, 0.6], [-300, 1100], clamp);
  const bob = Math.sin(t * 7) * 14;
  const pulse = 1 + 0.04 * Math.sin(t * 9);
  return (
    <AbsoluteFill>
      <Big start={0.1} y={300} size={84} color={C.white}>Thử ngay tại</Big>
      <div style={{
        position: 'absolute', left: 90, right: 90, top: 440, height: 260, borderRadius: 130, background: C.lime, overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: `scale(${interpolate(p, [0, 1], [0.2, 1]) * pulse}) rotate(${interpolate(p, [0, 1], [-14, -2])}deg)`,
        boxShadow: '0 40px 140px rgba(200,255,46,0.45)',
      }}>
        <div style={{fontFamily, fontWeight: 900, fontSize: 112, color: '#000', letterSpacing: -3}}>itera102.space</div>
        <div style={{position: 'absolute', top: -100, bottom: -100, width: 120, left: shine, background: 'rgba(255,255,255,0.55)', transform: 'rotate(20deg)'}} />
      </div>
      {t >= 23.39 && (
        <div style={{position: 'absolute', top: 820 + bob, left: 0, right: 0, textAlign: 'center', fontFamily, fontWeight: 900, fontSize: 96, color: C.white}}>
          ↑ LINK Ở BIO ↑
        </div>
      )}
      {t >= 25.27 && <Big start={25.27 - S.cta} y={1000} size={74} color={C.dim}>Thử liền đi nè!</Big>}
    </AbsoluteFill>
  );
};

/* ---------- Karaoke captions (word-level from STT) ---------- */
type W = {t: string; s: number; e: number; k: string};
const PAGES: W[][] = (() => {
  const ws = (WORDS as W[]).filter((w) => w.k === 'word');
  const pages: W[][] = [];
  let cur: W[] = [];
  ws.forEach((w, i) => {
    cur.push(w);
    const end = /[.,!?…]$/.test(w.t) || cur.length >= 3 || (ws[i + 1] && ws[i + 1].s - w.e > 0.35);
    if (end) { pages.push(cur); cur = []; }
  });
  if (cur.length) pages.push(cur);
  return pages;
})();
const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const idx = PAGES.findIndex((p, i) => t >= p[0].s - 0.05 && t < (PAGES[i + 1] ? PAGES[i + 1][0].s - 0.05 : p[p.length - 1].e + 0.4));
  if (idx < 0) return null;
  const page = PAGES[idx];
  const pin = spring({frame: frame - f(page[0].s - 0.05), fps: FPS, config: {damping: 13, stiffness: 260}});
  return (
    <div style={{
      position: 'absolute', top: 1640, left: 60, right: 60, textAlign: 'center', fontFamily, fontWeight: 900, fontSize: 76,
      lineHeight: 1.1, transform: `scale(${interpolate(pin, [0, 1], [0.7, 1])})`, textTransform: 'uppercase',
    }}>
      {page.map((w, i) => {
        const active = t >= w.s && t < (page[i + 1] ? page[i + 1].s : w.e + 0.4);
        const said = t >= w.s;
        return <span key={i} style={{
          display: 'inline-block', margin: '0 12px', color: active ? '#000' : said ? '#fff' : 'rgba(255,255,255,0.5)',
          background: active ? C.lime : 'transparent', padding: '2px 14px', borderRadius: 14,
          transform: `scale(${active ? 1.08 : 1}) rotate(${active ? -2 : 0}deg)`,
          WebkitTextStroke: active ? undefined : '3px #000', paintOrder: 'stroke fill',
          textShadow: active ? 'none' : '0 6px 0 rgba(0,0,0,0.6)',
        }}>{w.t.replace(/[.,!?…]$/, '')}</span>;
      })}
    </div>
  );
};

/* ---------- Progress bar + brand bug ---------- */
const Chrome: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      <div style={{position: 'absolute', top: 0, left: 0, height: 10, width: `${(frame / DURATION) * 100}%`, background: C.lime}} />
      <div style={{position: 'absolute', top: 48, left: 48, display: 'flex', alignItems: 'center', gap: 12, fontFamily, fontWeight: 800, fontSize: 30, color: '#fff', opacity: 0.85}}>
        <div style={{width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg, ${C.lime}, ${C.violet})`}} />
        Voice by ITERA
      </div>
    </>
  );
};

/* ---------- SFX timeline ---------- */
const SFX: [number, string, number][] = [
  [0, 'impact', 0.9], [1.2, 'whoosh', 0.5], [2.38, 'glitch', 0.6], [2.38, 'impact', 0.6],
  [3.9, 'whoosh', 0.6], [6.3, 'impact', 0.7], [7.24, 'pop', 0.5], [8.56, 'pop', 0.5], [9.68, 'pop', 0.5],
  [11.6, 'whoosh', 0.7],
  ...Array.from({length: 12}, (_, i) => [12.45 + i * 0.12, 'click', 0.25] as [number, string, number]),
  [14.08, 'click', 0.7], [14.82, 'click', 0.8], [15.0, 'riser', 0.35], [16.25, 'ding', 0.6],
  [18.6, 'whoosh', 0.6], [18.88, 'impact', 0.5], [19.8, 'impact', 0.5], [20.6, 'impact', 0.5], [21.4, 'riser', 0.3], [21.55, 'impact', 0.8],
  [22.85, 'whoosh', 0.7], [23.39, 'impact', 0.9], [23.42, 'ding', 0.5], [24.79, 'pop', 0.5],
];

export const Ad: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const tint = t < S.problem ? C.lime : t < S.demo ? C.red : t < S.feats ? C.violet : t < S.cta ? C.pink : C.lime;
  const scene = (from: number, to: number, el: React.ReactNode) => (
    <Sequence from={f(from)} durationInFrames={f(to) - f(from)}>{el}</Sequence>
  );
  return (
    <AbsoluteFill style={{background: C.bg}}>
      <Background tint={tint} />
      <Camera>
        {scene(S.hook, S.problem, <Hook />)}
        {scene(S.problem, S.demo, <Problem />)}
        {scene(S.demo, S.feats, <Demo />)}
        {scene(S.feats, S.cta, <Feats />)}
        {scene(S.cta, S.end, <Cta />)}
      </Camera>
      <Captions />
      <Chrome />
      {[S.problem, S.demo, S.feats, S.cta].map((s) => <Flash key={s} at={s} />)}
      <Grain />
      <Audio src={staticFile('voice.mp3')} volume={1} />
      <Audio src={staticFile('beat.wav')} volume={(fr) => (fr < f(0.6) ? 0 : 0.16)} />
      {SFX.map(([s, name, v], i) => (
        <Sequence key={i} from={f(s)} durationInFrames={f(2)}><Audio src={staticFile(`${name}.wav`)} volume={v} /></Sequence>
      ))}
    </AbsoluteFill>
  );
};
