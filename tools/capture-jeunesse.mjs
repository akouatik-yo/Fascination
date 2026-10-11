/* Fascinations Labo — planche-contact de tirages au hasard d'une machine (pour vérifier que les plages sont « toujours belles »).
   Usage : node tools/capture-jeunesse.mjs <id> [n=6] [scène] [secondes=3]
   Sortie : tools/out/captures/<id>.png (planche) ; affiche les tirages (scène, graine, réglages).
   Avec une scène : tous les tirages sont faits dans cette scène.
   Rendu logiciel (SwiftShader) : les machines lourdes y sont lentes ; l'image montre néanmoins l'état après quelques secondes. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const [, , id, nArg = '6', sceneArg = '', secArg = '3'] = process.argv;
if (!id) { console.log('usage : node tools/capture-jeunesse.mjs <id> [n] [scène] [secondes]'); process.exit(1); }
const n = +nArg, attente = +secArg * 1000;
const OUT = path.join(ROOT, 'tools/out/captures'); fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file://' + path.join(ROOT, 'jeunesse/index.html') + '?test#' + id);
await p.waitForTimeout(2500);
const shots = [];
for (let k = 0; k < n; k++) {
  const info = await p.evaluate(async ({ id, k, sc }) => {
    const T = window.FJ_TEST, M = window.FJ.META[id];
    // une scène imposée : on tire au hasard dans cette scène seulement (ses plages et ses graines), comme le ferait l'application
    if (sc && M) window.FJ.META[id] = Object.assign({}, M, { scenes: { [sc]: M.scenes[sc] }, graines: (M.graines || []).filter((g) => g.scene === sc) });
    try { await T.ouvrir(id, { seed: 7000 + k * 13 }); } finally { if (M) window.FJ.META[id] = M; }
    const S = T.S; return { scene: S.scene, nom: S.nom, regle: window.FJ.tirage(sc && M ? Object.assign({}, M, { scenes: { [sc]: M.scenes[sc] }, graines: (M.graines || []).filter((g) => g.scene === sc) }) : M, 7000 + k * 13).regle };
  }, { id, k, sc: sceneArg });
  await p.evaluate(() => { const c = document.getElementById('carton'); if (c) c.hidden = true; });
  await p.waitForTimeout(attente);
  const f = path.join(OUT, `${id}-${k}.png`);
  await p.screenshot({ path: f, timeout: 180000 });
  shots.push({ f, info });
  console.log(k, JSON.stringify(info));
}
const imgs = shots.map((s) => 'data:image/png;base64,' + fs.readFileSync(s.f).toString('base64'));
const q = await b.newPage({ viewport: { width: 1284, height: 404 * Math.ceil(shots.length / 2) } });
await q.setContent(`<body style="margin:0;background:#000;display:grid;grid-template-columns:642px 642px">${imgs.map((s, i) => `<div style="width:640px;height:400px;position:relative;border:1px solid #222"><img src="${s}" style="width:640px;height:400px"><span style="position:absolute;left:6px;bottom:4px;color:#fff;background:#000a;font:12px monospace;padding:2px 4px">${i} · ${shots[i].info.scene || ''} ${shots[i].info.nom ? '· ' + shots[i].info.nom : ''}</span></div>`).join('')}</body>`);
await q.screenshot({ path: path.join(OUT, `${id}.png`) });
for (const s of shots) fs.unlinkSync(s.f);
console.log('planche : tools/out/captures/' + id + '.png');
console.log(errs.length ? errs.join('\n') : 'aucune erreur');
await b.close();
