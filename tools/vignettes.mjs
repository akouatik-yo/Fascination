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
// les machines lentes à se remplir ou qui attendent un geste : plus de temps, quelques gestes, plusieurs graines (on garde l'image la plus riche)
const PLUS = {
  mycelium: { sec: 14, essais: 3 }, vie: { sec: 8, essais: 4 }, cristal: { sec: 16, essais: 3 },
  fluide: { sec: 4, essais: 3, gestes: 6 }, feu: { sec: 10, essais: 3 }, foudre: { sec: 3, essais: 4, gestes: 2, tap: true },
  harmono: { sec: 12, essais: 3 }, sonillus: { sec: 6, essais: 4 },
};
for (const id of ids) {
  if (only.length && !only.includes(id)) continue;
  const o = PLUS[id] || {};
  let best = '';
  for (let e = 0; e < (o.essais || 1); e++) {
  // une graine fixe par machine et par essai : la vignette ne change pas à chaque génération
  await p.evaluate(async ({ id, seed }) => { await window.FJ_TEST.ouvrir(id, { seed }); }, { id, seed: 424242 + e * 7919 });
  await p.evaluate(() => { const c = document.getElementById('carton'); if (c) c.hidden = true; });
  for (let g = 0; g < (o.gestes || 0); g++) {
    const v = await p.evaluate(() => window.FJ_TEST.S.env.view), H = 800, y = H * (0.35 + 0.3 * Math.random());
    const x0 = v.x0 + (v.x1 - v.x0) * (0.2 + 0.2 * Math.random()), x1 = v.x0 + (v.x1 - v.x0) * (0.6 + 0.2 * Math.random());
    if (o.tap) { await p.mouse.click(x0 + (x1 - x0) / 2, y); await p.waitForTimeout(500); continue; }
    await p.mouse.move(x0, y); await p.mouse.down(); await p.mouse.move(x1, y + 60 * (Math.random() - 0.5), { steps: 12 }); await p.mouse.up();
    await p.waitForTimeout(150);
  }
  await p.waitForTimeout((o.sec || +secArg) * 1000);
  const url = await p.evaluate(() => {
    const S = window.FJ_TEST.S, cv = document.getElementById('cv'), v = S.env.view;
    const k = cv.width / S.env.w, sx = v.x0 * k, sw = (v.x1 - v.x0) * k, sh = cv.height;
    // cadrage 16:10 au centre de la zone visible
    let w = sw, h = (sw * 10) / 16; if (h > sh) { h = sh; w = (sh * 16) / 10; }
    const c = document.createElement('canvas'); c.width = 320; c.height = 200;
    c.getContext('2d').drawImage(cv, sx + (sw - w) / 2, (sh - h) / 2, w, h, 0, 0, 320, 200);
    return c.toDataURL('image/webp', 0.72);
  });
  if (url.length > best.length) best = url;
  }
  V[id] = best;
  console.log(id, Math.round(best.length / 1024) + ' Ko');
}
fs.writeFileSync(FICHIER, '/* Fascinations Labo — vignettes de la carte (générées par tools/vignettes.mjs, ne pas modifier à la main). */\nwindow.FJ = window.FJ || {};\nwindow.FJ.VIGNETTES = ' + JSON.stringify(V) + ';\n');
console.log('écrit : jeunesse/js/vignettes.js (' + Math.round(fs.statSync(FICHIER).size / 1024) + ' Ko)');
await b.close();
