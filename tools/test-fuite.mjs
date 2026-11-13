// Test de fuite du shell (demande du CEO, 13/11) : rappels requestAnimationFrame en attente, tas JS, et i/s par fenêtres de 5 s
// (et non en moyenne cumulée : une capture d'écran en rendu logiciel bloque l'affichage plusieurs secondes et fausse une moyenne cumulée).
// Usage : node tools/test-fuite.mjs <machine> [jeunesse/index.html]
// Attendu : « pend » reste à 2 (la boucle du shell et le compteur du test), le tas ne grandit pas, les i/s ne baissent pas d'une fenêtre à l'autre.
import { createRequire } from 'node:module';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const [id, page = 'jeunesse/index.html'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
await p.addInitScript(() => {
  window.__img = 0; window.__pend = new Set(); window.__max = 0;
  const raf = window.requestAnimationFrame.bind(window), caf = window.cancelAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => { const h = raf((t) => { window.__pend.delete(h); cb(t); }); window.__pend.add(h); window.__max = Math.max(window.__max, window.__pend.size); return h; };
  window.cancelAnimationFrame = (h) => { window.__pend.delete(h); caf(h); };
  const f = () => { window.__img++; requestAnimationFrame(f); }; requestAnimationFrame(f);
  localStorage.setItem('fj-profils', JSON.stringify([{ id: 'z', avatar: 1, age: 16, niveau: 4 }])); localStorage.setItem('fj-profil-actif', 'z');
});
await p.goto('file://' + path.join(ROOT, page) + '?test#' + id);
await p.waitForFunction(() => window.FJ_TEST && window.FJ_TEST.S.sim, null, { timeout: 60000 });
const fen = async (s) => { const n0 = await p.evaluate(() => window.__img), t0 = Date.now(); await p.waitForTimeout(s * 1000); const n = await p.evaluate(() => window.__img); return +((n - n0) / ((Date.now() - t0) / 1000)).toFixed(1); };
const etat = () => p.evaluate(() => ({ pend: window.__pend.size, max: window.__max, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null, ouv: FJ_TEST.ouvertures }));
console.log('début', await p.evaluate(() => FJ_TEST.S.scene), await fen(5), 'i/s', JSON.stringify(await etat()));
console.log('5-10 s', await fen(5), 'i/s');
console.log('10-15 s', await fen(5), 'i/s');
// 30 changements de scène et de chapitre
const scenes = await p.evaluate(() => Object.keys(FJ_TEST.S.meta.scenes || {}));
for (let i = 0; i < 30; i++) await p.evaluate((k) => FJ_TEST.changerScene(k), scenes[i % scenes.length]);
await p.waitForTimeout(1500);
console.log('après 30 changements de scène', JSON.stringify(await etat()));
for (let i = 0; i < 6; i++) await p.evaluate((k) => FJ_TEST.ouvrir(k), ['ciel', 'bulles', 'feu', 'lucioles', 'eau', id][i]);
await p.waitForTimeout(3000);
console.log('après 6 ouvertures de machines', JSON.stringify(await etat()));
for (let i = 0; i < 4; i++) console.log('fenêtre finale', i, await fen(5), 'i/s', await p.evaluate(() => FJ_TEST.S.scene));
await p.evaluate((k) => FJ_TEST.changerScene(k), scenes[0]); await p.waitForTimeout(1000);
console.log('retour scène', scenes[0], await fen(5), 'i/s');
await b.close();
