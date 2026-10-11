/* Fascinations — inventaire des réglages de chaque machine, scène par scène.
   Ouvre dist/fascination.html sans lancer le shell adulte, fabrique chaque machine sur un canevas à part,
   parcourt ses scènes (boutons de la rubrique « Scènes » ou équivalente, ou le choix « Lieu » de la Murmuration)
   et relève chaque contrôle de ui() : chemin « rubrique/libellé » normalisé, type, bornes, options.
   Sortie : tools/out/ui.json (référence pour écrire les fiches jeunesse, et pour le test de contrat).
   Usage : node tools/inventaire-ui.mjs [id…] */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const only = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.addInitScript(() => { window.FASC_CONFIG = { startSim: '-aucune-', psyche: false }; });
await p.goto('file://' + path.join(ROOT, 'dist/fascination.html'));
await p.waitForTimeout(1500);
const ids = await p.evaluate(() => window.FASC.map((d) => d.id));
const out = [];
for (const id of ids) {
  if (only.length && !only.includes(id)) continue;
  const r = await p.evaluate(async (id) => {
    const norme = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const def = window.FASC.find((d) => d.id === id);
    const cv = document.createElement('canvas'); const W = 1280, H = 800; cv.width = W; cv.height = H;
    const env = { ctx: cv.getContext('2d'), canvas: cv, w: W, h: H, dpr: 1, t: 0, audio: new window.FK.SoundKit(), tool: def.tools && def.tools.length ? def.tools[0].id : null,
      view: { x0: 0, x1: W }, paused: false, decor: true, theme: 'dark', speed: 1, askSound() {} };
    const wait = (n) => new Promise((ok) => { let k = 0; const f = () => (++k >= n ? ok() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    let sim;
    try { sim = def.make(env); } catch (e) { return { id, error: String(e) }; }
    const run = async (n) => { for (let i = 0; i < n; i++) { try { sim.frame(i * 0.03, 0.03); } catch (e) { /* rien */ } } await wait(2); };
    const lire = () => {
      const ui = sim.ui ? sim.ui() : []; const res = []; let sec = '';
      const seen = new Map();
      const put = (o) => { let k = o.path; while (seen.has(k)) k += '+'; seen.set(k, 1); o.path = k; res.push(o); };
      for (const c of ui) {
        if (c.type === 'section') { sec = norme(c.label); continue; }
        if (c.type === 'note') continue;
        if (c.type === 'buttons') { for (const it of c.items || []) put({ path: sec + '/' + norme(it.label), type: 'bouton', label: it.label, section: sec }); continue; }
        const o = { path: sec + '/' + norme(c.label), type: c.type, label: c.label, section: sec };
        if (c.type === 'slider') Object.assign(o, { min: c.min, max: c.max, step: c.step, value: c.value, fmt: c.fmt ? String(c.fmt(c.value)) : null });
        if (c.type === 'toggle') o.value = !!c.value;
        if (c.type === 'choice') Object.assign(o, { value: c.value, options: (c.options || []).map((x) => ({ id: x.id, label: x.label })) });
        if (c.type === 'bar') Object.assign(o, { value: c.value });
        put(o);
      }
      return res;
    };
    await run(3);
    const first = lire();
    // les scènes : boutons de la première rubrique (« Scènes », « Expériences »…), sinon un choix de lieu
    const uiNow = sim.ui ? sim.ui() : [];
    let scenes = [];
    // la rubrique des scènes n'est pas toujours la première (Lucioles, Feu, Eau) ; elle porte des boutons ou un choix
    const s0 = uiNow.findIndex((c) => c.type === 'section' && ['scenes', 'experiences'].includes(norme(c.label)));
    const secLab = s0 >= 0 ? norme(uiNow[s0].label) : '';
    if (s0 >= 0) {
      let k = s0 + 1;
      while (k < uiNow.length && uiNow[k].type !== 'section' && uiNow[k].type !== 'buttons' && uiNow[k].type !== 'choice') k++;
      const c = uiNow[k];
      if (c && c.type === 'buttons') scenes = c.items.map((it) => ({ kind: 'bouton', path: secLab + '/' + norme(it.label), label: it.label }));
      else if (c && c.type === 'choice') scenes = c.options.map((o) => ({ kind: 'choix', path: secLab + '/' + norme(c.label), valeur: o.id, label: o.label }));
    } else {
      const ch = first.find((c) => c.type === 'choice' && /lieu|paysage|scene/.test(c.path));
      if (ch) scenes = ch.options.map((o) => ({ kind: 'choix', path: ch.path, valeur: o.id, label: o.label }));
    }
    const states = [];
    if (!scenes.length) states.push({ scene: null, controls: first });
    for (const sc of scenes) {
      const ui = sim.ui(); let sec = '';
      for (const c of ui) {
        if (c.type === 'section') { sec = norme(c.label); continue; }
        if (sc.kind === 'bouton' && c.type === 'buttons') { const it = c.items.find((x) => sec + '/' + norme(x.label) === sc.path); if (it) { try { it.act(); } catch (e) { /* rien */ } break; } }
        if (sc.kind === 'choix' && c.type === 'choice' && sec + '/' + norme(c.label) === sc.path) { try { c.set(sc.valeur); } catch (e) { /* rien */ } break; }
      }
      await run(4);
      states.push({ scene: sc, controls: lire() });
    }
    try { sim.dispose && sim.dispose(); } catch (e) { /* rien */ }
    return { id, name: def.name, cat: def.cat, smoothTime: !!def.smoothTime, decor: !!def.decor,
      tools: (def.tools || []).map((t) => ({ id: t.id, label: t.label, desc: t.desc || '' })), scenes, states };
  }, id);
  out.push(r);
  console.log(id, r.error || `${r.scenes.length} scènes, ${r.states.reduce((s, x) => s + x.controls.length, 0)} contrôles`);
}
fs.mkdirSync(path.join(ROOT, 'tools/out'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'tools/out/ui.json'), JSON.stringify(out, null, 1));
console.log(errs.length ? errs.join('\n') : 'aucune erreur');
await b.close();
