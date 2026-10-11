/* Fascinations Labo — tests du shell jeunesse (sans écran).
   1. Aucune réinitialisation involontaire : son, spectacle, tiroirs, Labo, pause, carte, carnet ne recréent pas la machine.
   2. Rotation : après un toucher, la machine est gardée (mise à l'échelle) ; sans toucher, elle est recréée avec la même scène.
   3. Historique : ‹ revient à la machine précédente avec la même scène et les mêmes réglages.
   4. Le sac : pas de répétition parmi les dernières machines.
   5. Contextes WebGL : faire défiler beaucoup de machines ne fait pas fuir de contextes.
   Usage : node tools/test-jeunesse.mjs [page]   (par défaut jeunesse/index.html) */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const page = process.argv[2] || path.join(ROOT, 'jeunesse/index.html');
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true });
const p = await ctx.newPage();
const errs = [], warns = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => { const t = m.text(); if (/too many active webgl contexts/i.test(t)) warns.push(t); if (m.type() === 'error') errs.push(t.slice(0, 200)); });
await p.goto('file://' + page + '?test#sable');
await p.waitForTimeout(3500);
let ok = 0, ko = 0;
const verif = (nom, cond, info) => { if (cond) { ok++; console.log('✓ ' + nom); } else { ko++; console.log('✗ ' + nom + (info ? ' — ' + JSON.stringify(info) : '')); } };
const T = (js) => p.evaluate(js);

// 1. pas de réinitialisation
await T(async () => { await window.FJ_TEST.ouvrir('sable', { seed: 3 }); });
await p.waitForTimeout(1500);
await p.mouse.click(640, 420); // un toucher : l'enfant a joué
const avant = await T(() => ({ n: window.FJ_TEST.S.constructions, scene: window.FJ_TEST.S.scene }));
await T(async () => {
  const F = window.FJ_TEST; window.__sim = F.S.sim;
  F.basculerSon(); F.basculerSon(); F.spectacle(true); F.spectacle(false);
  F.ouvrirTiroir('bidouiller'); const d = document.querySelector('details.labo'); if (d) { d.open = true; d.dispatchEvent(new Event('toggle')); }
  F.ouvrirTiroir('pourquoi'); F.fermerTiroir(); F.ouvrirCarte(); F.ecran(null); await F.ouvrirCarnet(); F.ecran(null);
  document.getElementById('bPause').click(); document.getElementById('bPause').click();
});
await p.waitForTimeout(1200);
const apres = await T(() => ({ n: window.FJ_TEST.S.constructions, meme: window.__sim === window.FJ_TEST.S.sim, scene: window.FJ_TEST.S.scene }));
verif('son, spectacle, tiroirs, Labo, carte, carnet, pause : aucune reconstruction', apres.n === avant.n && apres.meme && apres.scene === avant.scene, { avant, apres });

// 2. rotation après un toucher : gardée et mise à l'échelle
await p.setViewportSize({ width: 800, height: 1280 });
await p.waitForTimeout(1500);
const rot = await T(() => ({ n: window.FJ_TEST.S.constructions, meme: window.__sim === window.FJ_TEST.S.sim, lb: window.FJ_TEST.S.lb, remplir: !document.getElementById('remplir').hidden }));
verif('rotation après un toucher : la machine est gardée (boîte aux lettres)', rot.n === avant.n && rot.meme && rot.lb && rot.remplir, rot);
await p.setViewportSize({ width: 1280, height: 800 });
await p.waitForTimeout(1500);
const retour = await T(() => ({ n: window.FJ_TEST.S.constructions, lb: window.FJ_TEST.S.lb }));
verif('retour à la taille d’origine : plus de boîte aux lettres, toujours aucune reconstruction', retour.n === avant.n && !retour.lb, retour);
// rotation sans toucher : recréée, même scène
await T(async () => { await window.FJ_TEST.ouvrir('cristal', { seed: 5 }); });
await p.waitForTimeout(1500);
const c0 = await T(() => ({ n: window.FJ_TEST.S.constructions, scene: window.FJ_TEST.S.scene }));
await p.setViewportSize({ width: 800, height: 1280 });
await p.waitForTimeout(2500);
const c1 = await T(() => ({ n: window.FJ_TEST.S.constructions, scene: window.FJ_TEST.S.scene, w: window.FJ_TEST.S.env.w }));
verif('rotation sans toucher : recréée à la nouvelle taille, même scène', c1.n > c0.n && c1.scene === c0.scene && c1.w === 800, { c0, c1 });
await p.setViewportSize({ width: 1280, height: 800 });
await p.waitForTimeout(2000);

// 3. historique
const h = await T(async () => {
  const F = window.FJ_TEST, wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await F.ouvrir('feu', { seed: 11 }); await wait(500);
  const cles = Object.keys(F.S.meta.scenes); const sc = cles[cles.length - 1];
  await F.changerScene(sc); await wait(300);
  F.pilote.set('physique/vent', 0.42); const inst = F.pilote.valeur('physique/vent');
  F.suivant(); await wait(1500);
  const autre = F.S.id;
  F.precedent(); await wait(1800);
  return { autre, id: F.S.id, scene: F.S.scene, voulu: sc, vent: F.pilote.valeur('physique/vent'), inst };
});
verif('‹ revient à la machine précédente, même scène, mêmes réglages', h.id === 'feu' && h.autre !== 'feu' && h.scene === h.voulu && Math.abs(h.vent - h.inst) < 1e-6, h);

// 4. le sac
const sac = await T(() => {
  const ids = window.FJ.MONDES.flatMap((m) => m.machines); const mem = new Map();
  const st = { get: (k) => mem.get(k) || null, set: (k, v) => mem.set(k, v) };
  const s = window.FJ.Sac(ids, st); const seq = [];
  for (let i = 0; i < 64; i++) { const id = s.suivant(); seq.push(id); s.vu(id); }
  let rep = 0; for (let i = 0; i < seq.length; i++) if (seq.slice(Math.max(0, i - 6), i).includes(seq[i])) rep++;
  return { rep, distincts: new Set(seq).size };
});
verif('le sac : aucune répétition dans les 6 dernières, toutes les machines passent', sac.rep === 0 && sac.distincts === 32, sac);

// 5. contextes WebGL
const n = await T(async () => {
  const F = window.FJ_TEST, wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const ids = window.FJ.MONDES.flatMap((m) => m.machines);
  for (let k = 0; k < 40; k++) { await F.ouvrir(ids[k % ids.length]); await wait(120); }
  return F.S.constructions;
});
await p.waitForTimeout(1000);
verif('40 machines à la suite : pas d’avertissement « too many active WebGL contexts »', warns.length === 0, { constructions: n, avertissements: warns.length });
verif('aucune erreur JavaScript', errs.length === 0, errs.slice(0, 5));
console.log(`${ok} réussi(s), ${ko} échec(s)`);
await b.close();
process.exit(ko ? 1 : 0);
