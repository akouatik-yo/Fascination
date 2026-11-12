/* FKR — test de la bibliothèque commune de rendu (app/js/fkrendu.js) dans Chromium sans écran (WebGL logiciel).
   Ouvre chaque scène du banc d'essai (tools/demo-rendu.html), vérifie qu'aucun nuanceur n'échoue, que l'image n'est
   ni noire ni brûlée, et vérifie quelques couleurs physiques en JS (corps noir, raies, eau).
   Usage : node tools/test-rendu.mjs [scène,…] [--tons=film] [--sortie=dossier]
   Captures : tools/out/rendu/<scène>.png (ou le dossier demandé). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const scenes = (args.find((a) => !a.startsWith('--')) || 'nebuleuse,lucioles,spectres,traits,matiere').split(',');
const OUT = opt.sortie ? path.resolve(opt.sortie) : path.join(ROOT, 'tools/out/rendu');
fs.mkdirSync(OUT, { recursive: true });
let echecs = 0;
const ok = (c, m) => { console.log((c ? '  ok  ' : '  ÉCHEC ') + m); if (!c) echecs++; };

const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +(opt.l || 1280), height: +(opt.h || 800) } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });

// 1. couleurs physiques (JS)
await p.goto('file://' + path.join(ROOT, 'tools/demo-rendu.html') + '?dpr=1&t=3#spectres');
await p.waitForFunction(() => window.DEMO && window.DEMO.images > 0, null, { timeout: 120000 }).catch(() => {});
const phys = await p.evaluate(() => {
  const C = window.FKR.couleur, r = (a) => a.map((v) => +v.toFixed(3));
  return { T1900: r(C.corpsNoir(1900)), T6500: r(C.corpsNoir(6500)), T10000: r(C.corpsNoir(10000)), Ha: r(C.raie(656.28)), OIII: r(C.raie(500.68)), Na: r(C.raie(589)),
    eau10: r(C.eau(10).rgb), eau10Y: +C.eau(10).Y.toFixed(3), ciel: r(C.rayleigh()), luciole: r(C.bande('luciole')), css: C.css([1, 0.5, 0.2]), ecl1500: Math.round(C.eclatCorpsNoir(1500)) };
});
console.log('couleurs physiques :', JSON.stringify(phys));
console.log('couleurs physiques');
ok(phys.T6500.every((v) => v > 0.93), '6 500 K est presque blanc (D65)');
ok(phys.T1900[0] === 1 && phys.T1900[1] < 0.35 && phys.T1900[2] < 0.02, '1 900 K (bougie) est orangé');
ok(phys.T10000[2] === 1 && phys.T10000[0] < 0.75, '10 000 K est bleuté');
ok(phys.Ha[0] === 1 && phys.Ha[1] < 0.1, 'Hα est rouge');
ok(phys.OIII[1] > 0.6 && phys.OIII[2] > 0.3 && phys.OIII[0] < 0.2, '[O III] est turquoise');
ok(phys.Na[0] === 1 && phys.Na[1] > 0.2 && phys.Na[1] < 0.45 && phys.Na[2] < 0.02, 'le sodium (589 nm) est orange-jaune');
ok(phys.eau10[0] < 0.2 && phys.eau10[2] === 1, 'sous 10 m d\'eau, le rouge a disparu');
ok(phys.ciel[2] === 1 && phys.ciel[0] < 0.7, 'la diffusion Rayleigh donne un ciel bleu');
ok(phys.luciole[1] === 1 && phys.luciole[0] > 0.4 && phys.luciole[2] < 0.1, 'la luciole est jaune-vert');
ok(phys.ecl1500 > 2500 && phys.ecl1500 < 3300, '1 500 K brille ≈ 2 900 fois plus que 1 000 K');

// 2. les scènes
for (const sc of scenes) {
  console.log('scène ' + sc);
  errs.length = 0;
  // la scène est aussi dans la requête : changer seulement l'ancre ne rechargerait pas la page
  const q = new URLSearchParams({ dpr: '1', t: opt.t || '8', s: sc }); if (opt.tons) q.set('tons', opt.tons);
  await p.goto('file://' + path.join(ROOT, 'tools/demo-rendu.html') + '?' + q + '#' + sc);
  await p.waitForFunction(() => window.DEMO && (window.DEMO.images >= 2 || window.DEMO.erreurs.length), null, { timeout: 240000 }).catch(() => {});
  const st = await p.evaluate(() => {
    const D = window.DEMO, c = document.getElementById('cv');
    const g = document.createElement('canvas'); g.width = 160; g.height = 100; const x = g.getContext('2d'); x.drawImage(c, 0, 0, 160, 100);
    const d = x.getImageData(0, 0, 160, 100).data; let s = 0, nz = 0, sat = 0;
    for (let i = 0; i < d.length; i += 4) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; s += l; if (l > 12) nz++; if (l > 250) sat++; }
    const n = d.length / 4;
    return { images: D.images, erreurs: D.erreurs, moyenne: +(s / n).toFixed(1), allumes: +(nz / n).toFixed(3), brules: +(sat / n).toFixed(4) };
  });
  ok(!st.erreurs.length && !errs.length, 'aucune erreur ' + (st.erreurs.concat(errs).join(' | ') || ''));
  ok(st.images >= 2, st.images + ' images rendues');
  ok(st.moyenne > 3 && st.allumes > 0.02, `l'image n'est pas noire (moyenne ${st.moyenne}, ${Math.round(st.allumes * 100)} % de pixels allumés)`);
  ok(st.brules < 0.08, `l'image n'est pas brûlée (${(st.brules * 100).toFixed(2)} % de blancs purs)`);
  await p.evaluate(() => { for (const e of document.querySelectorAll('nav, #info')) e.style.display = 'none'; });
  await p.screenshot({ path: path.join(OUT, sc + (opt.tons ? '-' + opt.tons : '') + '.png') });
}
await b.close();
console.log(echecs ? `${echecs} échec(s)` : 'tout est bon');
process.exit(echecs ? 1 : 0);
