// Test de fumée : ouvre l'application dans Chromium sans écran, parcourt toutes les machines,
// essaie les outils du Feu et le générateur de bruits, puis signale toute erreur JavaScript.
//   node tools/smoke.mjs [chemin/vers/page.html]   (par défaut : app/index.html)
// Captures d'écran écrites dans tools/out/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

let pw;
try { pw = await import('playwright'); } catch { pw = await import('/opt/node22/lib/node_modules/playwright/index.mjs'); }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const page = path.resolve(process.argv[2] || path.join(root, 'app/index.html'));
const out = path.join(root, 'tools/out');
fs.mkdirSync(out, { recursive: true });

const b = await pw.chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = [];
p.on('pageerror', (e) => errs.push('erreur : ' + e.message));
p.on('console', (m) => { const t = m.text(); if ((m.type() === 'warning' || m.type() === 'error') && !/GPU stall|ERR_CERT|ERR_FILE|ERR_NAME|net::/.test(t)) errs.push(m.type() + ' : ' + t.slice(0, 300)); });
await p.goto(pathToFileURL(page).href + '#lucioles');
await p.waitForTimeout(2500);
console.log('machines chargées :', await p.$$eval('.it', (l) => l.length));
for (let i = 0; i < 31; i++) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(350); }
await p.evaluate(() => { location.hash = '#feu'; });
await p.waitForTimeout(1500);
const name = await p.$eval('.p-title h1', (e) => e.textContent);
console.log('machine affichée :', name);
const box = await (await p.$('#cv')).boundingBox();
const X = (f) => box.x + box.width * f, Y = (f) => box.y + box.height * f;
for (const t of ['souffle', 'sel', 'eau', 'poser', 'observer']) {
  await p.click(`.tl:text-is("${t}")`);
  await p.mouse.move(X(0.45), Y(0.6)); await p.mouse.down(); await p.mouse.move(X(0.55), Y(0.6), { steps: 4 }); await p.mouse.up();
}
await p.waitForTimeout(1000);
await p.screenshot({ path: path.join(out, 'feu.png') });
await p.keyboard.press('n'); await p.waitForTimeout(300);
await p.click('aside.bruits .sb.play'); await p.waitForTimeout(800);
console.log('bruits en lecture :', await p.evaluate(() => window.Bruits && window.Bruits.playing));
await p.screenshot({ path: path.join(out, 'bruits.png') });
console.log(errs.length ? errs.join('\n') : 'aucune erreur');
await b.close();
process.exit(errs.length ? 1 : 0);
