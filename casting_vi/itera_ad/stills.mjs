import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
const browserExecutable = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const composition = await selectComposition({serveUrl, id: 'ItEraAd', browserExecutable});
for (const s of process.argv.slice(2).map(Number)) {
  await renderStill({serveUrl, composition, frame: Math.round(s * 30), output: `out/s_${s}.png`, scale: 0.33, browserExecutable});
}
console.log('done');
