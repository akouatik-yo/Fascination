/* Fascinations Labo — test de contrat des fiches jeunesse (jeunesse/meta/*.js) contre les vraies machines.
   Pour chaque machine et chaque scène de la fiche : la scène s'ouvre, chaque levier exposé, action, recette, graine,
   plage de hasard et préparation « Et si » désigne un réglage qui existe (chemin « rubrique/libellé »), avec des valeurs
   dans les bornes. Vérifie aussi les longueurs des textes (charte) et qu'aucune erreur ne survient.
   Usage : node tools/test-fiches.mjs [id…]      (sans argument : toutes les machines) */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const only = process.argv.slice(2);
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
let cur = '';
const errs = [];
p.on('pageerror', (e) => errs.push(`[${cur}] ${e.message}`));
p.on('console', (m) => { if (m.type() === 'error') errs.push(`[${cur}] console : ${m.text().slice(0, 200)}`); });
await p.goto('file://' + path.join(ROOT, 'jeunesse/index.html') + '?test#vie');
await p.waitForTimeout(3000);
const ids = await p.evaluate(() => Object.keys(window.FJ.META));
let total = 0;
for (const id of ids) {
  if (only.length && !only.includes(id)) continue;
  cur = id;
  const res = await p.evaluate(async (id) => {
    const T = window.FJ_TEST, FJ = window.FJ, M = FJ.META[id], pb = [];
    const wait = (n) => new Promise((ok) => { let k = 0; const f = () => (++k >= n ? ok() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    const mots = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;
    const lev = (k) => (M.leviers && M.leviers[k]) || (k.includes('/') ? { chemin: k } : null);
    const verif = (ou, k, val) => {
      const l = lev(k);
      if (!l) { pb.push(`${ou} : levier « ${k} » inconnu (ni dans leviers, ni chemin)`); return; }
      const r = T.pilote.get(l.chemin);
      if (!r) { pb.push(`${ou} : chemin introuvable « ${l.chemin} »`); return; }
      if (val === undefined) return;
      const c = r.c;
      if (r.kind === 'slider') {
        const vs = Array.isArray(val) && val.length === 2 && typeof val[0] === 'number' ? val : [val];
        for (const v of vs) if (typeof v !== 'number' || v < c.min - 1e-9 || v > c.max + 1e-9) pb.push(`${ou} : « ${k} » = ${v} hors bornes [${c.min}, ${c.max}]`);
      } else if (r.kind === 'choice') {
        const vs = Array.isArray(val) ? val : [val];
        for (const v of vs) if (!(c.options || []).some((o) => o.id === v)) pb.push(`${ou} : « ${k} » = ${JSON.stringify(v)} n'est pas une option (${(c.options || []).map((o) => JSON.stringify(o.id)).join(', ')})`);
      } else if (r.kind === 'toggle') {
        if (!(typeof val === 'boolean' || (typeof val === 'number' && val > 0 && val < 1))) pb.push(`${ou} : « ${k} » attend vrai/faux (ou une probabilité)`);
      }
    };
    await T.ouvrir(id, { seed: 1 });
    await wait(3);
    const scenes = Object.keys(M.scenes || {});
    const outils = new Set(T.S.def.tools.map((t) => t.id));
    for (const o of Object.keys(M.outils || {})) if (!outils.has(o)) pb.push(`outils : « ${o} » n'existe pas dans la machine`);
    if (M.essaie && mots(M.essaie) > 22) pb.push(`« essaie » trop long (${mots(M.essaie)} mots)`);
    if (M.outil && !outils.has(M.outil)) pb.push(`outil par défaut « ${M.outil} » inconnu`);
    // textes
    if (M.question && mots(M.question) > 12) pb.push(`question trop longue (${mots(M.question)} mots > 12)`);
    if (M.pourquoi && M.pourquoi.etincelle && mots(M.pourquoi.etincelle) > 25) pb.push(`étincelle trop longue (${mots(M.pourquoi.etincelle)} mots > 25)`);
    if (M.pourquoi && M.pourquoi.texte && mots(M.pourquoi.texte) > 130) pb.push(`texte « pourquoi » trop long (${mots(M.pourquoi.texte)} mots > 130)`);
    const parScene = scenes.length ? scenes : [null];
    for (const s of parScene) {
      const sc = s ? M.scenes[s] : {};
      if (s) {
        await T.changerScene(s); await wait(3);
        if (T.S.scene !== s) pb.push(`scène « ${s} » : non appliquée`);
        if (sc.essaie && mots(sc.essaie) > 22) pb.push(`scène « ${s} » : « essaie » trop long (${mots(sc.essaie)} mots)`);
        for (const o of sc.outils || []) if (!outils.has(o)) pb.push(`scène « ${s} » : outil « ${o} » inconnu`);
        if (sc.outil && !outils.has(sc.outil)) pb.push(`scène « ${s} » : outil « ${sc.outil} » inconnu`);
      }
      const ou = s ? `scène « ${s} »` : 'machine';
      for (const k of sc.exposes || M.exposes || []) verif(ou + ' / exposé', k);
      for (const [k, v] of Object.entries(Object.assign({}, M.plages || {}, sc.plages || {}))) verif(ou + ' / plage', k, v);
      for (const [k, v] of Object.entries(sc.regle || {})) verif(ou + ' / règle de scène', k, v);
      for (const a of (typeof sc.actions === 'string' ? (M.groupesActions || {})[sc.actions] || [] : sc.actions || M.actions || [])) { const r = T.pilote.get(a.chemin); if (!r || r.kind !== 'bouton') pb.push(`${ou} / action : bouton introuvable « ${a.chemin} »`); }
      for (const r of (M.recettes || []).filter((r) => !r.scene || r.scene === s)) for (const [k, v] of Object.entries(r.regle || {})) verif(`${ou} / recette « ${r.nom} »`, k, v);
      for (const g of (M.graines || []).filter((g) => !g.scene || g.scene === s)) for (const [k, v] of Object.entries(g.regle || {})) verif(`${ou} / graine « ${g.nom} »`, k, v);
      for (const e of (M.etsi || []).filter((e) => (e.prepare && e.prepare.scene ? e.prepare.scene : e.scene || null) === s || (!e.scene && !(e.prepare && e.prepare.scene) && s === parScene[0]))) {
        for (const [k, v] of Object.entries((e.prepare && e.prepare.regle) || {})) verif(`${ou} / Et si « ${e.id} »`, k, v);
        if (e.prepare && e.prepare.action) { const r = T.pilote.get(e.prepare.action); if (!r) pb.push(`${ou} / Et si « ${e.id} » : action introuvable`); }
        if (!e.question || !Array.isArray(e.choix) || !e.revele) pb.push(`Et si « ${e.id} » : il faut question, choix et revele`);
      }
    }
    for (const r of M.recettes || []) if (r.scene && !M.scenes[r.scene]) pb.push(`recette « ${r.nom} » : scène « ${r.scene} » inconnue`);
    for (const g of M.graines || []) if (g.scene && !M.scenes[g.scene]) pb.push(`graine « ${g.nom} » : scène « ${g.scene} » inconnue`);
    for (const e of M.etsi || []) { const sc = (e.prepare && e.prepare.scene) || e.scene; if (sc && !M.scenes[sc]) pb.push(`Et si « ${e.id} » : scène « ${sc} » inconnue`); }
    // quelques tirages au hasard : aucune erreur, et la scène tirée existe
    for (let k = 0; k < 4; k++) { const t = FJ.tirage(M, 100 + k); if (t.scene && !M.scenes[t.scene]) pb.push('tirage : scène inconnue ' + t.scene); }
    return pb;
  }, id);
  total += res.length;
  console.log(res.length ? `✗ ${id}\n   - ${res.join('\n   - ')}` : `✓ ${id}`);
}
if (errs.length) console.log('Erreurs JavaScript :\n' + errs.join('\n'));
console.log(total + errs.length ? `${total} problème(s), ${errs.length} erreur(s)` : 'tout est conforme');
await b.close();
process.exit(total + errs.length ? 1 : 0);
