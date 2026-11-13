/* Rendu — preuve avant/après d'une machine (DA de Fausta : tablette paysage, à 3 s et à 30 s, avec les images par seconde).
   Ouvre la machine dans l'application Labo (jeunesse/index.html), avec la même graine, dans deux racines :
   « avant » (une copie du dépôt à la référence, par défaut /home/user/fasc-avant) et « après » (ce dépôt).
   Usage : node tools/avant-apres.mjs <id> [scène] [--avant=chemin] [--secondes=3,30] [--sortie=docs/rendu] [--graine=4242]
   Prépare « avant » une fois : git worktree add /home/user/fasc-avant <référence> --detach
   Sortie : <sortie>/<id>[-scène]-avant-apres.jpg (planche 2 × 2) ; les i/s sont mesurés en simulation (Chromium, SwiftShader, sans GPU). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? '1']; }));
const [id, scene = ''] = args.filter((a) => !a.startsWith('--'));
if (!id) { console.log('usage : node tools/avant-apres.mjs <id> [scène] [--avant=chemin] [--secondes=3,30]'); process.exit(1); }
const AVANT = path.resolve(opt.avant || '/home/user/fasc-avant');
const SECS = (opt.secondes || '3,30').split(',').map(Number);
const OUT = path.resolve(ROOT, opt.sortie || 'docs/rendu');
const graine = +(opt.graine || 4242);
fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
async function serie(racine) {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
  await p.addInitScript(() => {
    // compteur d'images (requestAnimationFrame) pour mesurer les i/s
    window.__img = 0; const f = () => { window.__img++; requestAnimationFrame(f); }; requestAnimationFrame(f);
  });
  await p.goto('file://' + path.join(racine, 'jeunesse/index.html') + '?test');
  await p.waitForTimeout(2500);
  const info = await p.evaluate(async ({ id, scene, graine }) => {
    const T = window.FJ_TEST; await T.ouvrir(id, { seed: graine });
    if (scene) { try { await T.changerScene(scene); } catch (e) { return { err: String(e) }; } }
    return { scene: T.S.scene, nom: T.S.nom };
  }, { id, scene, graine });
  const t0 = Date.now(), n0 = await p.evaluate(() => window.__img);
  const shots = [];
  for (const s of SECS) {
    const attente = t0 + s * 1000 - Date.now();
    if (attente > 0) await p.waitForTimeout(attente);
    await p.evaluate(() => { for (const k of ['carton', 'bulle']) { const c = document.getElementById(k); if (c) c.hidden = true; } });
    const n = await p.evaluate(() => window.__img), ips = (n - n0) / ((Date.now() - t0) / 1000);
    shots.push({ s, ips: +ips.toFixed(1), png: (await p.screenshot({ type: 'jpeg', quality: 80, timeout: 180000 })).toString('base64') });
  }
  await p.close();
  return { info, shots, errs };
}
const av = fs.existsSync(path.join(AVANT, 'jeunesse/index.html')) ? await serie(AVANT) : null;
if (!av) console.log('pas de racine « avant » : ' + AVANT + ' (git worktree add ' + AVANT + ' <référence> --detach)');
const ap = await serie(ROOT);
const cellule = (r, k, titre) => r ? `<div class="c"><img src="data:image/jpeg;base64,${r.shots[k].png}"><span>${titre} · ${r.shots[k].s} s · ${r.shots[k].ips} i/s simulés</span></div>` : '<div class="c vide">—</div>';
const q = await b.newPage({ viewport: { width: 1284, height: 820 * SECS.length / 2 + 40 } });
await q.setContent(`<style>body{margin:0;background:#000;font:12px monospace;color:#ddd}.g{display:grid;grid-template-columns:640px 640px;gap:4px}
.c{position:relative;width:640px;height:400px}.c img{width:640px;height:400px;display:block}.c span{position:absolute;left:6px;bottom:4px;background:#000b;padding:2px 5px}
h1{font:600 13px system-ui;margin:6px 8px}</style><h1>${id}${scene ? ' · ' + scene : ''} · avant / après · tablette paysage 1280 × 800 · simulé (Chromium, SwiftShader, sans GPU)</h1>
<div class="g">${SECS.map((s, k) => cellule(av, k, 'avant') + cellule(ap, k, 'après')).join('')}</div>`);
const nom = `${id}${scene ? '-' + scene : ''}-avant-apres.jpg`;
await q.screenshot({ path: path.join(OUT, nom), type: 'jpeg', quality: 82, fullPage: true });
await b.close();
console.log(JSON.stringify({ planche: path.relative(ROOT, path.join(OUT, nom)), avant: av && { scene: av.info.scene, ips: av.shots.map((x) => x.ips), erreurs: av.errs }, apres: { scene: ap.info.scene, ips: ap.shots.map((x) => x.ips), erreurs: ap.errs } }));
