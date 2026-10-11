/* Fascinations Labo — génère les vignettes de la Carte : une image réelle de chaque machine, après quelques secondes.
   Sortie : jeunesse/js/vignettes.js (images WebP 320×200 en data URI, environ 10 Ko chacune).
   Usage : node tools/vignettes.mjs [secondes=5] [id…]   (avec des ids : ne refait que celles-là) */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const [, , secArg = '5', ...only] = process.argv;
const FICHIER = path.join(ROOT, 'jeunesse/js/vignettes.js');
let V = {};
try { const t = fs.readFileSync(FICHIER, 'utf8'); const m = t.match(/VIGNETTES = (\{[\s\S]*\});/); if (m) V = JSON.parse(m[1]); } catch (e) { V = {}; }
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
await p.goto('file://' + path.join(ROOT, 'jeunesse/index.html') + '?test#vie');
await p.waitForTimeout(2500);
const ids = await p.evaluate(() => window.FJ.MONDES.flatMap((m) => m.machines));
for (const id of ids) {
  if (only.length && !only.includes(id)) continue;
  // une graine fixe par machine : la vignette ne change pas à chaque génération
  await p.evaluate(async (id) => { await window.FJ_TEST.ouvrir(id, { seed: 424242 }); }, id);
  await p.waitForTimeout(+secArg * 1000);
  const url = await p.evaluate(() => {
    const S = window.FJ_TEST.S, cv = document.getElementById('cv'), v = S.env.view;
    const k = cv.width / S.env.w, sx = v.x0 * k, sw = (v.x1 - v.x0) * k, sh = cv.height;
    // cadrage 16:10 au centre de la zone visible
    let w = sw, h = (sw * 10) / 16; if (h > sh) { h = sh; w = (sh * 16) / 10; }
    const c = document.createElement('canvas'); c.width = 320; c.height = 200;
    c.getContext('2d').drawImage(cv, sx + (sw - w) / 2, (sh - h) / 2, w, h, 0, 0, 320, 200);
    return c.toDataURL('image/webp', 0.72);
  });
  V[id] = url;
  console.log(id, Math.round(url.length / 1024) + ' Ko');
}
fs.writeFileSync(FICHIER, '/* Fascinations Labo — vignettes de la carte (générées par tools/vignettes.mjs, ne pas modifier à la main). */\nwindow.FJ = window.FJ || {};\nwindow.FJ.VIGNETTES = ' + JSON.stringify(V) + ';\n');
console.log('écrit : jeunesse/js/vignettes.js (' + Math.round(fs.statSync(FICHIER).size / 1024) + ' Ko)');
await b.close();
