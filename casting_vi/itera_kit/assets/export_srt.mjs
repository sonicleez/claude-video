// Export a day's CAPTION_WORDS (same timing as the on-screen captions) to an SRT file.
// Usage: node assets/export_srt.mjs Day01 out/day01.vi.srt [maxChars]
import {buildSync} from 'esbuild';
import {writeFileSync, mkdtempSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import os from 'node:os';
const [day, dst, maxArg] = process.argv.slice(2);
const maxc = Number(maxArg || 34);
const out = path.join(mkdtempSync(path.join(os.tmpdir(), 'srt-')), 'day.cjs');
buildSync({entryPoints: [`src/days/${day}.tsx`], bundle: true, platform: 'node', format: 'cjs', outfile: out, jsx: 'automatic', logLevel: 'error'});
const words = createRequire(import.meta.url)(out).CAPTION_WORDS;
const ts = (t) => { const ms = Math.round(t * 1000); const h = Math.floor(ms / 3.6e6), m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
const cues = []; let cur = [];
words.forEach((w, i) => {
  cur.push(w); const text = cur.map((x) => x.t).join(' '); const nx = words[i + 1];
  if (!nx || text.length >= maxc || /[.,!?]$/.test(w.t) || nx.s - w.e > 0.45) { cues.push([cur[0].s, w.e + 0.2, text]); cur = []; }
});
const srt = cues.map(([s, e, t], i) => `${i + 1}\n${ts(s)} --> ${ts(Math.min(e, cues[i + 1] ? cues[i + 1][0] - 0.02 : e))}\n${t}\n`).join('\n');
writeFileSync(dst, srt);
console.log(`${cues.length} cues -> ${dst}`);
