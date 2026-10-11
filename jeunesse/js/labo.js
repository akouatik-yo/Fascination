/* Fascinations Labo — l'application jeunesse (10-14 ans) autour des 32 machines de Fascinations.
   Les moteurs des machines sont ceux de la version adulte, intacts. Ce fichier est le shell :
   - la machine occupe tout l'écran ; l'interface se pose par-dessus et ne la redimensionne jamais ;
   - une machine ne se réinitialise que si on le demande (son, spectacle, tiroirs, rotation… n'y touchent pas) ;
   - au démarrage et à chaque arrivée dans une machine : une scène et des réglages tirés au hasard (fiches FJ.META) ;
   - ‹ revient exactement en arrière ; › propose une autre machine ; « Encore ! » retire la même ;
   - gestes en icônes, tiroirs « Bidouiller » (leviers, recettes, Labo complet) et « Pourquoi ? » (explications, Et si… ?),
     la Carte des sept mondes, le Carnet (photos, moments épinglés, paris). */
(function boot() {
  if (!window.FASC || !window.FK || !window.FJ || !window.FJ.Pilote || !window.FJ.MONDES || !document.getElementById('fj')) return setTimeout(boot, 15);
  const FJ = window.FJ, FK = window.FK;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const fr = (x, d = 0) => Number(x).toFixed(d).replace('.', ',');
  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (k === 'class') e.className = v;
      else if (k === 'style') e.setAttribute('style', v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
    return e;
  }
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* rien */ } } };
  const lireJSON = (k, d) => { try { return JSON.parse(store.get(k) || '') || d; } catch (e) { return d; } };
  const TEST = /[?&]test/.test(location.search);

  const SPEED_UNIT = 0.4; // comme la version adulte : à ×1, le temps des machines avance à 0,4
  const VITESSES = [{ id: 'lent', v: 0.3, icone: 'tortue', nom: 'Ralenti' }, { id: 'normal', v: 1, icone: 'marche', nom: 'Normal' }, { id: 'vite', v: 3, icone: 'lievre', nom: 'Rapide' }];
  const S = {
    id: null, def: null, meta: null, sim: null, env: null, scene: null, outil: null, touche: false, pause: false, vitesse: 1,
    son: false, spectacle: false, tiroir: null, ecran: null, hist: [], hpos: -1, lb: false, ouverture: 0, nom: null,
    vus: new Set(lireJSON('fj-vus', [])), outilsMontres: new Set(), etsiVu: new Set(lireJSON('fj-etsi', [])),
    prefs: Object.assign({ doux: true, calme: false }, lireJSON('fj-prefs', {})), constructions: 0,
  };
  let defs = [], audio = null, sac = null, raf = 0, last = 0, vt = 0, pend = 0, acc = 0, errId = null;
  const canvas = $('cv'), app = $('fj');
  const pilote = FJ.Pilote(() => S.sim);
  const images = (n) => new Promise((ok) => { let k = 0; const f = () => (++k >= n ? ok() : requestAnimationFrame(f)); requestAnimationFrame(f); });

  /* ───────── les fiches ───────── */
  // une machine sans fiche reçoit une fiche minimale tirée de ses propres réglages (rubrique des scènes)
  function ficheAuto(def) {
    const m = { scenes: {}, leviers: {}, exposes: [] };
    return m;
  }
  function scenesDepuisUI() {
    const ui = pilote.ui(); const out = {};
    const s0 = ui.findIndex((c) => c && c.type === 'section' && ['scenes', 'experiences'].includes(FJ.norme(c.label)));
    if (s0 < 0) return out;
    const sec = FJ.norme(ui[s0].label);
    let k = s0 + 1; while (k < ui.length && ui[k].type !== 'section' && ui[k].type !== 'buttons' && ui[k].type !== 'choice') k++;
    const c = ui[k];
    if (c && c.type === 'buttons') for (const it of c.items) { if (/son/i.test(it.label) && /activer/i.test(it.label)) continue; out[FJ.norme(it.label).replace(/ /g, '-')] = { nom: it.label.replace(/^●\s*/, ''), via: sec + '/' + FJ.norme(it.label) }; }
    if (c && c.type === 'choice') for (const o of c.options) out[String(o.id)] = { nom: o.label, via: { choix: sec + '/' + FJ.norme(c.label), valeur: o.id } };
    return out;
  }
  const levier = (cle) => (S.meta.leviers && S.meta.leviers[cle]) || (cle.includes('/') ? { chemin: cle } : null);
  const cheminDe = (cle) => { const l = levier(cle); return l ? l.chemin : null; };
  function regler(regle) {
    for (const k of Object.keys(regle || {})) { const ch = cheminDe(k); if (ch) pilote.set(ch, regle[k]); }
  }

  /* ───────── le canevas ───────── */
  const DPR_STEPS = [2, 1.5, 1.25, 1];
  let dprMap = lireJSON('fj-dpr', {});
  const dprCap = (id) => (id && dprMap[id]) || 2;
  function colonnes() {
    const g = $('colG'), d = $('colD');
    return { g: g ? g.offsetWidth : 0, d: d ? d.offsetWidth : 0 };
  }
  function nouvelEnv(def) {
    const W = Math.max(320, window.innerWidth), H = Math.max(320, window.innerHeight);
    const dpr = Math.min(dprCap(def.id), window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    Object.assign(canvas.style, { width: W + 'px', height: H + 'px', left: '0px', top: '0px' });
    S.lb = false; $('remplir').hidden = true;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const col = colonnes();
    const view = { x0: col.g, x1: Math.max(col.g + 200, W - col.d), y0: 0, y1: H }; // constant pendant la visite
    return { ctx, canvas, w: W, h: H, dpr, t: 0, audio, view, get tool() { return S.outil; }, get paused() { return S.pause; },
      get decor() { return true; }, get theme() { return 'dark'; }, get speed() { return S.vitesse; }, askSound() { if (!S.son) setTimeout(basculerSon, 0); } };
  }
  function detruire() {
    if (S.sim && S.sim.dispose) { try { S.sim.dispose(); } catch (e) { /* rien */ } }
    S.sim = null;
    if (audio && audio.clearWaiting) audio.clearWaiting();
  }
  function construire(def) {
    detruire();
    S.env = nouvelEnv(def);
    S.constructions++;
    try { S.sim = def.make(S.env); } catch (e) { console.warn('FJ : make', def.id, e); S.sim = null; }
    last = 0; S.touche = false; govReset();
  }

  /* ───────── ouvrir une machine ───────── */
  let jeton = 0;
  async function ouvrir(id, opt = {}) {
    const def = defs.find((d) => d.id === id); if (!def) return;
    const mon = ++jeton;
    S.id = id; S.def = def; S.meta = FJ.META[id] || ficheAuto(def); S.pause = false;
    fermerTiroir(); $('pastille').hidden = true;
    construire(def);
    await images(2); if (mon !== jeton) return;
    if (!S.meta._auto && !Object.keys(S.meta.scenes || {}).length) { S.meta.scenes = scenesDepuisUI(); S.meta._auto = true; }
    let t = null;
    if (opt.etat) {
      S.scene = opt.etat.scene;
      if (S.scene && S.meta.scenes[S.scene]) { pilote.scene(S.meta.scenes[S.scene].via); await images(2); }
      pilote.restaurer(opt.etat.inst);
      S.outil = opt.etat.outil || outilDefaut(); S.nom = opt.etat.nom || null;
    } else {
      t = FJ.tirage(S.meta, opt.seed);
      S.scene = t.scene;
      if (S.scene && S.meta.scenes[S.scene]) { pilote.scene(S.meta.scenes[S.scene].via); await images(2); }
      if (mon !== jeton) return;
      regler(t.regle); securite();
      S.outil = t.outil && def.tools.some((x) => x.id === t.outil) ? t.outil : outilDefaut();
      S.nom = t.nom;
    }
    if (mon !== jeton) return;
    S.ouverture = performance.now(); S.touche = false; govReset();
    S.vus.add(id); store.set('fj-vus', JSON.stringify([...S.vus]));
    if (sac) sac.vu(id);
    rendre();
    carton(opt.etat ? null : t);
    amorce();
    if (TEST) window.FJ_TEST.ouvertures++;
  }
  function securite() {
    // flashs adoucis (photosensibilité) : forcés tant que le coin des grands ne dit pas le contraire
    if (S.prefs.doux && S.meta.flashs) pilote.set(S.meta.flashs, true);
  }
  function outilsVisibles() {
    const sc = S.scene && S.meta.scenes ? S.meta.scenes[S.scene] : null;
    const ids = (sc && sc.outils) || S.meta.outilsMontres || null;
    return S.def.tools.filter((t) => !ids || ids.includes(t.id));
  }
  function outilDefaut() {
    const sc = S.scene && S.meta.scenes ? S.meta.scenes[S.scene] : null;
    const pref = (sc && sc.outil) || S.meta.outil;
    const vis = outilsVisibles();
    if (pref && vis.some((t) => t.id === pref)) return pref;
    const nonObs = vis.find((t) => t.id !== 'observer' && t.id !== 'regarder');
    return (nonObs || vis[0] || S.def.tools[0] || {}).id || null;
  }
  function etatCourant() {
    return { scene: S.scene, inst: pilote.instantane(), outil: S.outil, nom: S.nom };
  }
  /* l'historique : ‹ revient exactement en arrière (même scène, mêmes réglages) */
  function memoriser() { if (S.id != null && S.hpos >= 0) S.hist[S.hpos] = { id: S.id, etat: etatCourant() }; }
  function aller(id, opt) {
    memoriser();
    S.hist = S.hist.slice(0, S.hpos + 1); S.hist.push({ id, etat: null }); S.hpos = S.hist.length - 1;
    if (S.hist.length > 60) { S.hist.shift(); S.hpos--; }
    return ouvrir(id, opt);
  }
  function precedent() {
    if (S.hpos <= 0) return;
    memoriser(); S.hpos--;
    const e = S.hist[S.hpos]; ouvrir(e.id, e.etat ? { etat: e.etat } : {});
  }
  function suivant() {
    if (S.hpos < S.hist.length - 1) { memoriser(); S.hpos++; const e = S.hist[S.hpos]; ouvrir(e.id, e.etat ? { etat: e.etat } : {}); return; }
    aller(sac.suivant());
  }
  function encore() { // même machine, nouveau tirage : c'est une demande explicite de recommencer
    memoriser();
    S.hist = S.hist.slice(0, S.hpos + 1); S.hist.push({ id: S.id, etat: null }); S.hpos = S.hist.length - 1;
    ouvrir(S.id);
    son('encore');
  }
  async function changerScene(cle) {
    if (!S.meta.scenes[cle]) return;
    pilote.scene(S.meta.scenes[cle].via); S.scene = cle; S.nom = null;
    await images(2);
    const pl = S.meta.scenes[cle].regle; if (pl) regler(pl);
    securite();
    if (!outilsVisibles().some((t) => t.id === S.outil)) S.outil = outilDefaut();
    S.touche = true;
    rendre(); son('scene');
  }

  /* ───────── la boucle ───────── */
  function boucle(now) {
    raf = requestAnimationFrame(boucle);
    const t = now / 1000, dt = last ? Math.min(0.05, t - last) : 0.016;
    last = t;
    const sim = S.sim;
    if (!sim || S.ecran) return; // la carte et le carnet couvrent l'écran : la machine attend
    govTick(now);
    if (S.pause) { if (sim.livePaused) { try { sim.frame(vt, 0); } catch (e) { /* rien */ } } return; }
    const sp = S.vitesse * SPEED_UNIT;
    try {
      if (S.def.smoothTime) {
        let rem = dt * sp, k = 0;
        while (rem > 1e-5 && k < 4) { const h2 = Math.min(rem, 0.034); vt += h2; S.env.t = vt; sim.frame(vt, h2); rem -= h2; k++; }
      } else {
        pend += dt * sp; acc += sp;
        let steps = Math.floor(acc); acc -= steps;
        if (steps >= 1) {
          if (steps > 4) steps = 4;
          const dtv = Math.min(0.06, Math.max(0.002, pend / steps)); pend = 0;
          for (let i = 0; i < steps; i++) { vt += dtv; S.env.t = vt; sim.frame(vt, dtv); }
        }
      }
    } catch (e) { if (errId !== S.id) { errId = S.id; console.warn('FJ : frame', S.id, e); } }
    pastilleEtSi(now);
  }

  /* régulateur de résolution : seulement tant que l'enfant n'a pas touché à la machine (sinon : pour la prochaine fois) */
  const gov = { t0: 0, ts: [], done: false };
  function govReset() { gov.t0 = performance.now(); gov.ts = []; gov.done = false; }
  function govTick(now) {
    if (gov.done || S.pause || document.hidden) return;
    const age = now - gov.t0;
    if (age < 1200) return;
    gov.ts.push(now);
    if (age < 4200) return;
    gov.done = true;
    const d = []; for (let i = 1; i < gov.ts.length; i++) d.push(gov.ts[i] - gov.ts[i - 1]);
    if (d.length < 10) return;
    d.sort((a, b) => a - b);
    const med = d[d.length >> 1], cur = Math.min(dprCap(S.id), window.devicePixelRatio || 1);
    const next = DPR_STEPS.find((v) => v < cur - 0.01);
    if (med > 26 && next) {
      dprMap[S.id] = next; store.set('fj-dpr', JSON.stringify(dprMap));
      if (!S.touche) ouvrir(S.id, { etat: etatCourant() });
    }
  }

  /* rotation, fenêtre redimensionnée : on ne perd jamais ce qui a été construit */
  let rz = 0;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(redimension, 250); });
  function redimension() {
    if (!S.env) return;
    const W = window.innerWidth, H = window.innerHeight;
    if (Math.abs(W - S.env.w) < 2 && Math.abs(H - S.env.h) < 2) { boiteAuxLettres(false); return; }
    const recreer = !S.touche || (S.meta && S.meta.rotation === 'recreer');
    if (recreer) { ouvrir(S.id, { etat: etatCourant() }); return; }
    boiteAuxLettres(true);
  }
  function boiteAuxLettres(on) {
    const W = window.innerWidth, H = window.innerHeight;
    if (!on) { Object.assign(canvas.style, { width: S.env.w + 'px', height: S.env.h + 'px', left: '0px', top: '0px' }); S.lb = false; $('remplir').hidden = true; return; }
    const s = Math.min(W / S.env.w, H / S.env.h), w = S.env.w * s, hh = S.env.h * s;
    Object.assign(canvas.style, { width: w + 'px', height: hh + 'px', left: (W - w) / 2 + 'px', top: (H - hh) / 2 + 'px' });
    S.lb = true; $('remplir').hidden = false;
  }

  /* ───────── le toucher ───────── */
  let doigt = false, px = null, py = null;
  function pt(e) {
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) * S.env.w) / r.width, y = ((e.clientY - r.top) * S.env.h) / r.height;
    const dx = px == null ? 0 : x - px, dy = py == null ? 0 : y - py;
    px = x; py = y;
    return { x, y, dx, dy, down: doigt };
  }
  canvas.addEventListener('pointerdown', (e) => {
    if (!S.sim) return;
    doigt = true; px = null; py = null; S.touche = true;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* rien */ }
    effacerCarton(); masquerMain();
    const p = pt(e); p.down = true;
    if (S.sim.down) { try { S.sim.down(p); } catch (err) { console.warn(err); } }
  });
  canvas.addEventListener('pointermove', (e) => { if (!S.sim || !S.sim.move) return; const p = pt(e); try { S.sim.move(p); } catch (err) { /* rien */ } });
  const lacher = (e) => { doigt = false; if (S.sim && S.sim.up) { try { S.sim.up(pt(e)); } catch (err) { /* rien */ } } };
  canvas.addEventListener('pointerup', lacher);
  canvas.addEventListener('pointercancel', lacher);

  /* l'amorce : un geste joué tout seul à l'arrivée (une goutte, un éclair) pour arriver en pleine action */
  function amorce() {
    const a = (S.scene && S.meta.scenes[S.scene] && S.meta.scenes[S.scene].amorce) || S.meta.amorce;
    if (!a || !S.sim) return;
    const id = S.id, sim = S.sim;
    setTimeout(() => {
      if (S.id !== id || S.sim !== sim || S.touche) return;
      const v = S.env.view, outilAvant = S.outil;
      if (a.outil) S.outil = a.outil;
      for (const [fx, fy] of a.points || [[0.5, 0.45]]) {
        const p = { x: v.x0 + (v.x1 - v.x0) * fx, y: S.env.h * fy, dx: 0, dy: 0, down: true };
        try { sim.down && sim.down(p); sim.up && sim.up(Object.assign({}, p, { down: false })); } catch (e) { /* rien */ }
      }
      S.outil = outilAvant;
    }, a.delai || 700);
  }

  /* ───────── l'habillage ───────── */
  function rendre() {
    rendreHaut(); rendreGestes(); rendreActions(); rendreDroite();
    if (S.tiroir) rendreTiroir();
    document.documentElement.style.setProperty('--accent', FJ.mondeDe(S.id).couleur);
  }
  function nomMachine() { return (S.meta && S.meta.nom) || S.def.name; }
  function rendreHaut() {
    $('nom').textContent = nomMachine();
    const box = $('scenes'); box.textContent = '';
    const cles = Object.keys(S.meta.scenes || {});
    if (cles.length < 2) { box.hidden = true; return; }
    box.hidden = false;
    for (const k of cles) {
      const sc = S.meta.scenes[k];
      box.append(h('button', { class: 'pil' + (k === S.scene ? ' on' : ''), onclick: () => changerScene(k), 'aria-pressed': k === S.scene ? 'true' : 'false' }, sc.nom || k));
    }
    const on = box.querySelector('.on'); if (on && on.scrollIntoView) { try { on.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) { /* rien */ } }
  }
  function verbe(t) {
    const o = S.meta.outils && S.meta.outils[t.id];
    if (o && o.verbe) return o.verbe;
    return t.label.charAt(0).toUpperCase() + t.label.slice(1);
  }
  function rendreGestes() {
    const box = $('gestes'); box.textContent = '';
    for (const t of outilsVisibles()) {
      const o = (S.meta.outils && S.meta.outils[t.id]) || {};
      box.append(h('button', { class: 'geste' + (t.id === S.outil ? ' on' : ''), title: t.desc || '', 'aria-pressed': t.id === S.outil ? 'true' : 'false',
        onclick: () => choisirOutil(t.id) }, FJ.icone(o.icone || FJ.iconeOutil(t.id)), h('span', null, verbe(t))));
    }
  }
  function choisirOutil(id) {
    S.outil = id; rendreGestes(); son('outil');
    if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) { /* rien */ } }
    const t = S.def.tools.find((x) => x.id === id), o = (S.meta.outils && S.meta.outils[id]) || {};
    if (!S.outilsMontres.has(S.id + '/' + id)) { S.outilsMontres.add(S.id + '/' + id); montrerMain(id); }
    const aide = o.aide || (t && t.desc);
    if (aide) bulle(aide, aide.length > 90);
  }
  function rendreActions() {
    const box = $('actions'); box.textContent = '';
    const sc = S.scene && S.meta.scenes[S.scene];
    let acts = (sc && sc.actions) || S.meta.actions || [];
    if (typeof acts === 'string') acts = (S.meta.groupesActions && S.meta.groupesActions[acts]) || [];
    for (const a of acts) {
      const r = pilote.get(a.chemin); if (!r || r.kind !== 'bouton') continue;
      box.append(h('button', { class: 'action', onclick: () => { const rr = pilote.get(a.chemin); if (rr && rr.it) rr.it.act(); S.touche = true; son('action'); } },
        FJ.icone(a.icone || 'etincelles'), h('span', null, a.nom || r.it.label)));
    }
  }
  function rendreDroite() {
    const b = $('bSon'); b.textContent = ''; b.append(FJ.icone(S.son ? 'sonOn' : 'sonOff'), h('span', null, S.son ? 'Son' : 'Muet'));
    b.setAttribute('aria-pressed', S.son ? 'true' : 'false');
    const p = $('bPause'); p.textContent = ''; p.append(FJ.icone(S.pause ? 'lecture' : 'pause'), h('span', null, S.pause ? 'Reprendre' : 'Pause'));
    for (const id of ['bPourquoi', 'bBidouiller']) $(id).classList.toggle('on', S.tiroir === (id === 'bPourquoi' ? 'pourquoi' : 'bidouiller'));
  }

  /* le carton d'ouverture : le nom, et la question (ou le nom de la graine tirée) ; il s'efface au premier toucher */
  let cartonT = 0;
  function carton(t) {
    const c = $('carton'); c.textContent = '';
    const sc = S.scene && S.meta.scenes[S.scene];
    c.append(h('b', null, nomMachine()));
    if (S.nom) c.append(h('span', { class: 'graine' }, '✦ ' + S.nom));
    else if (sc && sc.nom && Object.keys(S.meta.scenes).length > 1) c.append(h('span', { class: 'graine' }, sc.nom));
    if (S.meta.question) c.append(h('i', null, S.meta.question));
    c.hidden = false; c.classList.remove('part'); void c.offsetWidth; c.classList.add('vient');
    clearTimeout(cartonT); cartonT = setTimeout(effacerCarton, 4200);
  }
  function effacerCarton() { const c = $('carton'); if (c.hidden) return; c.classList.add('part'); clearTimeout(cartonT); cartonT = setTimeout(() => { c.hidden = true; }, 450); }

  /* la main fantôme : elle mime le geste la première fois qu'on choisit un outil */
  let mainT = 0;
  function montrerMain(id) {
    if (S.prefs.calme) return;
    const o = (S.meta.outils && S.meta.outils[id]) || {};
    const geste = o.geste || (['gomme', 'souffle', 'souffler', 'remuer', 'encre', 'mur', 'murs', 'tracer', 'couper', 'guider', 'dessiner', 'sculpter', 'greffer', 'effacer', 'glisser', 'secouer', 'courant', 'gratter', 'verser', 'pluie', 'ecarter', 'tourner'].includes(id) ? 'trait' : 'tap');
    if (id === 'observer' || id === 'regarder') return;
    const m = $('main'); m.textContent = ''; m.append(FJ.icone('main'));
    const v = S.env.view, cx = v.x0 + (v.x1 - v.x0) * 0.55, cy = S.env.h * 0.55;
    const r = canvas.getBoundingClientRect(), k = r.width / S.env.w;
    m.style.left = r.left + cx * k + 'px'; m.style.top = r.top + cy * k + 'px';
    m.className = 'main ' + geste; m.hidden = false;
    clearTimeout(mainT); mainT = setTimeout(masquerMain, 2600);
  }
  function masquerMain() { $('main').hidden = true; }

  let bulleT = 0;
  function bulle(txt, long) {
    const b = $('bulle'); b.textContent = txt; b.hidden = false; b.classList.remove('part'); void b.offsetWidth; b.classList.add('vient');
    clearTimeout(bulleT); bulleT = setTimeout(() => { b.classList.add('part'); setTimeout(() => { b.hidden = true; }, 400); }, long ? 4200 : 2600);
  }

  /* ───────── les tiroirs ───────── */
  function ouvrirTiroir(nom) {
    if (S.tiroir === nom) { fermerTiroir(); return; }
    S.tiroir = nom; $('tiroir').hidden = false; app.classList.add('tiroir-ouvert');
    rendreTiroir(); rendreDroite(); son('tiroir');
  }
  function fermerTiroir() {
    S.tiroir = null; const t = $('tiroir'); if (t) { t.hidden = true; t.textContent = ''; }
    app.classList.remove('tiroir-ouvert'); if (S.def) rendreDroite();
  }
  let laboOuvert = false, ctrlLabo = null, ctrlLeviers = null;
  function rendreTiroir() {
    const t = $('tiroir'); t.textContent = '';
    const tete = h('div', { class: 'tete' }, h('h2', null, S.tiroir === 'pourquoi' ? 'Pourquoi ?' : 'Bidouiller'),
      h('button', { class: 'x', 'aria-label': 'Fermer', onclick: fermerTiroir }, FJ.icone('fermer')));
    t.append(tete);
    const corps = h('div', { class: 'corps' }); t.append(corps);
    if (S.tiroir === 'pourquoi') rendrePourquoi(corps); else rendreBidouiller(corps);
  }

  /* Bidouiller : les leviers parlants, les recettes, la vitesse, puis le Labo (tous les vrais réglages) */
  function exposes() {
    const sc = S.scene && S.meta.scenes[S.scene];
    return (sc && sc.exposes) || S.meta.exposes || [];
  }
  function rendreBidouiller(corps) {
    const lev = exposes().map((k) => ({ k, l: levier(k) })).filter((x) => x.l);
    ctrlLeviers = null;
    if (lev.length) {
      const box = h('div', { class: 'leviers' }); corps.append(box);
      ctrlLeviers = { box, lev, items: [] };
      for (const { k, l } of lev) {
        const it = leverControle(k, l); if (it) { box.append(it.el); ctrlLeviers.items.push(it); }
      }
    }
    const sc = S.scene && S.meta.scenes[S.scene];
    const rec = (S.meta.recettes || []).filter((r) => !r.scene || r.scene === S.scene || (sc && sc.recettesPartout));
    if (rec.length) {
      corps.append(h('h3', null, 'Recettes'));
      const box = h('div', { class: 'recettes' }); corps.append(box);
      for (const r of rec) box.append(h('button', { class: 'recette', onclick: () => recette(r) }, FJ.icone(r.icone || 'etincelles'), h('span', null, r.nom)));
    }
    corps.append(h('h3', null, 'Le temps'));
    const vit = h('div', { class: 'vitesses' }); corps.append(vit);
    for (const v of VITESSES) vit.append(h('button', { class: 'vit' + (Math.abs(S.vitesse - v.v) < 0.01 ? ' on' : ''), onclick: () => { S.vitesse = v.v; rendreTiroir(); son('outil'); } }, FJ.icone(v.icone), h('span', null, v.nom)));
    const outils = h('div', { class: 'rangee' }); corps.append(outils);
    outils.append(h('button', { class: 'bt', onclick: epingler }, FJ.icone('epingle'), h('span', null, 'Épingler ce moment')));
    outils.append(h('button', { class: 'bt', onclick: () => { fermerTiroir(); spectacle(true); } }, FJ.icone('spectacle'), h('span', null, 'Spectacle')));
    outils.append(boutonMaintenu('Tout recommencer', 'recommencer', () => { fermerTiroir(); ouvrir(S.id, { etat: { scene: S.scene, inst: null, outil: S.outil } }); bulle('La machine repart de zéro.'); }));
    // le Labo
    const lab = h('details', { class: 'labo', open: laboOuvert || null, ontoggle: (e) => { laboOuvert = e.target.open; if (laboOuvert) remplirLabo(); } },
      h('summary', null, FJ.icone('labo'), h('span', null, 'Le Labo : tous les vrais réglages')));
    corps.append(lab);
    const zone = h('div', { class: 'zone' }); lab.append(zone);
    ctrlLabo = { zone, sig: '', items: [] };
    if (laboOuvert) remplirLabo();
  }
  function leverControle(k, l) {
    const r = pilote.get(l.chemin);
    if (!r) return null;
    const c = r.c, nom = l.nom || c.label;
    if (r.kind === 'slider') {
      const lo = l.min != null ? l.min : c.min, hi = l.max != null ? l.max : c.max;
      const inp = h('input', { type: 'range', min: lo, max: hi, step: c.step || (hi - lo) / 200, 'aria-label': nom });
      inp.value = c.value;
      inp.addEventListener('input', () => { pilote.set(l.chemin, parseFloat(inp.value)); S.touche = true; });
      const el = h('label', { class: 'levier' }, h('span', { class: 'nom' }, nom), inp,
        h('span', { class: 'bouts' }, h('span', null, (l.bouts && l.bouts[0]) || ''), h('span', null, (l.bouts && l.bouts[1]) || '')));
      return { el, maj() { const rr = pilote.get(l.chemin); if (rr && document.activeElement !== inp) inp.value = rr.c.value; } };
    }
    if (r.kind === 'toggle') {
      const b = h('button', { class: 'bascule', onclick: () => { const rr = pilote.get(l.chemin); pilote.set(l.chemin, !(rr && rr.c.value)); S.touche = true; maj(); } }, h('i'), h('span', null, nom));
      const maj = () => { const rr = pilote.get(l.chemin); b.classList.toggle('on', !!(rr && rr.c.value)); };
      maj();
      return { el: b, maj };
    }
    if (r.kind === 'choice') {
      const box = h('div', { class: 'choix' }, h('span', { class: 'nom' }, nom));
      const opts = h('div', { class: 'opts' }); box.append(opts);
      const noms = l.options || {};
      const bs = (c.options || []).filter((o) => !l.garder || l.garder.includes(o.id)).map((o) => {
        const b = h('button', { onclick: () => { pilote.set(l.chemin, o.id); S.touche = true; maj(); } }, noms[o.id] || o.label);
        b._id = o.id; opts.append(b); return b;
      });
      const maj = () => { const rr = pilote.get(l.chemin); for (const b of bs) b.classList.toggle('on', rr && rr.c.value === b._id); };
      maj();
      return { el: box, maj };
    }
    if (r.kind === 'bouton') {
      return { el: h('button', { class: 'bt', onclick: () => { const rr = pilote.get(l.chemin); if (rr) rr.it.act(); S.touche = true; } }, FJ.icone(l.icone || 'etincelles'), h('span', null, nom)), maj() {} };
    }
    return null;
  }
  async function recette(r) {
    if (r.scene && r.scene !== S.scene && S.meta.scenes[r.scene]) { pilote.scene(S.meta.scenes[r.scene].via); S.scene = r.scene; await images(2); }
    regler(r.regle); securite();
    if (r.outil) S.outil = r.outil;
    if (r.nom) S.nom = r.nom;
    S.touche = true; rendre(); bulle(r.nom); son('recette');
  }
  function boutonMaintenu(txt, ic, act) {
    let t0 = 0, raf2 = 0;
    const anneau = h('i', { class: 'anneau' });
    const b = h('button', { class: 'bt maintenu' }, FJ.icone(ic), h('span', null, txt), anneau);
    const stop = () => { cancelAnimationFrame(raf2); anneau.style.setProperty('--p', 0); b.classList.remove('charge'); };
    const tick = () => { const p = (performance.now() - t0) / 1000; anneau.style.setProperty('--p', Math.min(1, p)); if (p >= 1) { stop(); act(); return; } raf2 = requestAnimationFrame(tick); };
    b.addEventListener('pointerdown', () => { t0 = performance.now(); b.classList.add('charge'); tick(); });
    b.addEventListener('pointerup', stop); b.addEventListener('pointerleave', stop); b.addEventListener('pointercancel', stop);
    b.addEventListener('click', () => { if (!b.classList.contains('charge')) bulle('Garde le doigt appuyé une seconde.'); });
    return b;
  }
  /* le Labo : les contrôles d'origine de la machine, tous, avec leurs vrais noms (rendus comme dans la version adulte) */
  function remplirLabo() {
    if (!ctrlLabo) return;
    const ui = pilote.ui().filter((c) => c && !(c.type === 'buttons' && (c.items || []).some((it) => /activer le son/i.test(it.label))));
    const sig = ui.map((c) => c.type + ':' + (c.label || '') + ':' + (c.type === 'buttons' ? (c.items || []).length : c.type === 'choice' ? (c.options || []).length : '')).join('|');
    if (sig !== ctrlLabo.sig) {
      ctrlLabo.sig = sig; ctrlLabo.zone.textContent = ''; ctrlLabo.items = ui.map((c, i) => controleLabo(c, i));
      for (const it of ctrlLabo.items) ctrlLabo.zone.append(it.el);
    }
    ctrlLabo.cur = ui;
    ui.forEach((c, i) => ctrlLabo.items[i] && ctrlLabo.items[i].maj(c));
  }
  function controleLabo(c, i) {
    const live = () => (ctrlLabo.cur && ctrlLabo.cur[i]) || c;
    const apres = () => { S.touche = true; setTimeout(() => { remplirLabo(); if (ctrlLeviers) ctrlLeviers.items.forEach((x) => x.maj()); rendreActions(); }, 0); };
    switch (c.type) {
      case 'section': { const el = h('h4'); return { el, maj: (c2) => { el.textContent = c2.label || ''; } }; }
      case 'note': { const el = h('p', { class: 'note' }); return { el, maj: (c2) => { el.textContent = c2.text || c2.label || ''; } }; }
      case 'bar': {
        const lab = h('span'), v = h('span', { class: 'v' }), fill = h('i');
        const el = h('div', { class: 'jauge' }, h('div', { class: 'h' }, lab, v), h('div', { class: 'tr' }, fill));
        return { el, maj: (c2) => { lab.textContent = c2.label || ''; v.textContent = c2.txt || ''; fill.style.width = clamp(c2.value || 0, 0, 1) * 100 + '%'; if (c2.color) fill.style.background = c2.color; } };
      }
      case 'slider': {
        const lab = h('span'), v = h('span', { class: 'v' }), inp = h('input', { type: 'range' });
        inp.addEventListener('input', () => { const x = parseFloat(inp.value), cc = live(); if (!isNaN(x) && cc.set) { cc.set(x); v.textContent = cc.fmt ? cc.fmt(x) : String(x); apres(); } });
        const el = h('label', { class: 'curseur' }, h('div', { class: 'h' }, lab, v), inp);
        return { el, maj: (c2) => { lab.textContent = c2.label || ''; inp.min = c2.min; inp.max = c2.max; inp.step = c2.step || 0.01; if (document.activeElement !== inp) inp.value = c2.value; v.textContent = c2.fmt ? c2.fmt(c2.value) : String(c2.value); } };
      }
      case 'toggle': {
        const lab = h('span');
        const el = h('button', { class: 'bascule', onclick: () => { const cc = live(); cc.set(!cc.value); apres(); } }, h('i'), lab);
        return { el, maj: (c2) => { lab.textContent = c2.label || ''; el.classList.toggle('on', !!c2.value); } };
      }
      case 'choice': {
        const lab = h('span', { class: 'nom' }), opts = h('div', { class: 'opts' });
        const bs = (c.options || []).map((op) => { const b = h('button', { onclick: () => { live().set(op.id); apres(); } }, op.label); opts.append(b); return b; });
        const el = h('div', { class: 'choix' }, lab, opts);
        return { el, maj: (c2) => { lab.textContent = c2.label || ''; (c2.options || []).forEach((op, j) => { if (bs[j]) { bs[j].textContent = op.label; bs[j].classList.toggle('on', op.id === c2.value); } }); } };
      }
      case 'buttons': {
        const el = h('div', { class: 'boutons' });
        const bs = (c.items || []).map((it, j) => { const b = h('button', { onclick: () => { const cc = live(); const x = cc.items && cc.items[j]; if (x && x.act) x.act(); apres(); } }); el.append(b); return b; });
        return { el, maj: (c2) => { (c2.items || []).forEach((it, j) => { if (bs[j]) bs[j].textContent = it.label; }); } };
      }
      default: return { el: h('div'), maj() {} };
    }
  }
  setInterval(() => {
    if (S.tiroir === 'bidouiller' && !S.ecran) {
      if (laboOuvert) remplirLabo();
      if (ctrlLeviers) ctrlLeviers.items.forEach((x) => x.maj());
    }
  }, 500);

  /* Pourquoi ? : la question, l'étincelle, le pourquoi, « essaie ça », les Et si… ?, et le texte complet pour les curieux */
  let pariOuvert = null;
  function rendrePourquoi(corps) {
    const m = S.meta, P = m.pourquoi || {};
    const sc = S.scene && m.scenes[S.scene];
    if (m.question) corps.append(h('p', { class: 'question' }, m.question));
    if (P.etincelle) corps.append(h('p', { class: 'etincelle' }, P.etincelle));
    if (sc && sc.essaie) corps.append(h('div', { class: 'essaie' }, h('b', null, 'Essaie ça'), h('span', null, sc.essaie)));
    if (P.texte) corps.append(h('div', { class: 'texte' }, ...String(P.texte).split('\n\n').map((p) => h('p', null, ...texteRiche(p)))));
    const etsi = (m.etsi || []).filter((e) => !e.scene || e.scene === S.scene || !m.scenes[e.scene]);
    if (etsi.length) {
      corps.append(h('h3', null, 'Et si… ?'));
      for (const e of etsi) corps.append(carteEtSi(e));
    }
    if (P.vraie) corps.append(h('div', { class: 'histoire' }, h('b', null, 'Une histoire vraie'), h('p', null, P.vraie)));
    const about = S.def.about || [];
    if (P.curieux || about.length) {
      corps.append(h('details', { class: 'curieux' }, h('summary', null, 'Pour les curieux'),
        ...(P.curieux ? [h('p', null, P.curieux)] : []), ...about.map((p) => h('p', null, p))));
    }
    if (!m.question && !P.texte) corps.append(h('p', { class: 'etincelle' }, S.def.intro || ''));
  }
  // **mot** en gras dans les textes
  function texteRiche(s) { return String(s).split(/(\*\*[^*]+\*\*)/).map((x) => (x.startsWith('**') ? h('b', null, x.slice(2, -2)) : x)); }
  function carteEtSi(e) {
    const cle = S.id + '/' + e.id, fait = S.etsiVu.has(cle);
    const box = h('div', { class: 'etsi' + (fait ? ' fait' : '') });
    box.append(h('p', { class: 'q' }, e.question));
    const zone = h('div', { class: 'z' }); box.append(zone);
    const choisir = (i) => {
      zone.textContent = '';
      zone.append(h('p', { class: 'pari' }, i < 0 ? 'Tu n’as pas d’idée : c’est honnête. Regarde !' : 'Ton pari : ' + e.choix[i]));
      zone.append(h('button', { class: 'bt grand', onclick: async () => { await preparer(e); zone.append(h('p', { class: 'regarde' }, e.regarde || 'Regarde bien la machine…')); setTimeout(() => reveler(i), (e.attente || 4) * 1000); } }, FJ.icone('lecture'), h('span', null, 'Essaie !')));
    };
    const reveler = (i) => {
      const surpris = e.bonne == null ? null : i !== e.bonne;
      const etiquette = i < 0 ? 'Vu !' : surpris === null ? 'Vu !' : surpris ? 'Surpris !' : 'Bien vu !';
      zone.append(h('div', { class: 'revele' }, h('span', { class: 'tampon' + (surpris ? ' surpris' : '') }, etiquette), h('p', null, ...texteRiche(e.revele || ''))));
      if (surpris) zone.append(h('p', { class: 'petit' }, 'Se tromper puis comprendre, c’est exactement ce que font les chercheurs.'));
      S.etsiVu.add(cle); store.set('fj-etsi', JSON.stringify([...S.etsiVu]));
      carnet.ajouter({ type: 'pari', machine: S.id, nom: nomMachine(), question: e.question, pari: i < 0 ? 'Aucune idée' : e.choix[i], etiquette });
      son(surpris ? 'surpris' : 'bienvu');
    };
    const choix = h('div', { class: 'paris' });
    (e.choix || []).forEach((c, i) => choix.append(h('button', { class: 'bt', onclick: () => choisir(i) }, c)));
    choix.append(h('button', { class: 'bt doux', onclick: () => choisir(-1) }, 'Aucune idée !'));
    zone.append(h('p', { class: 'petit' }, 'Fais ton pari :'), choix);
    if (pariOuvert === e.id) { pariOuvert = null; setTimeout(() => box.scrollIntoView({ block: 'start' }), 50); }
    return box;
  }
  async function preparer(e) {
    const p = e.prepare || {};
    if (p.scene && p.scene !== S.scene && S.meta.scenes[p.scene]) { pilote.scene(S.meta.scenes[p.scene].via); S.scene = p.scene; await images(2); }
    if (p.regle) regler(p.regle);
    if (p.outil) S.outil = p.outil;
    if (p.action) { const r = pilote.get(p.action); if (r && r.it) r.it.act(); }
    S.pause = false; S.touche = true;
    rendreHaut(); rendreGestes(); rendreActions(); rendreDroite();
    if (window.innerWidth < 900) fermerTiroir();
  }
  /* la pastille « Et si… ? » : discrète, seulement après un moment de jeu, jamais deux fois la même */
  let pastilleFaite = '';
  function pastilleEtSi(now) {
    if (S.tiroir || S.spectacle || !S.meta.etsi || !S.meta.etsi.length) return;
    if (now - S.ouverture < 40000 || !S.touche) return;
    const k = S.id + ':' + S.scene;
    if (pastilleFaite === k) return;
    const e = S.meta.etsi.find((x) => (!x.scene || x.scene === S.scene) && !S.etsiVu.has(S.id + '/' + x.id));
    pastilleFaite = k;
    if (!e) return;
    const p = $('pastille'); p.textContent = '';
    p.append(h('button', { class: 'ouvre', onclick: () => { p.hidden = true; pariOuvert = e.id; ouvrirTiroir('pourquoi'); } }, h('b', null, 'Et si… ?'), h('span', null, e.question)),
      h('button', { class: 'x', 'aria-label': 'Plus tard', onclick: () => { p.hidden = true; } }, FJ.icone('fermer')));
    p.hidden = false;
  }

  /* ───────── le Carnet ───────── */
  const carnet = (function () {
    let db = null, mem = lireJSON('fj-carnet', []);
    const ouvrirDB = () => new Promise((ok) => {
      try {
        const rq = indexedDB.open('fascinations-labo', 1);
        rq.onupgradeneeded = () => rq.result.createObjectStore('entrees', { keyPath: 'id', autoIncrement: true });
        rq.onsuccess = () => { db = rq.result; ok(true); };
        rq.onerror = () => ok(false);
      } catch (e) { ok(false); }
    });
    const pret = ouvrirDB();
    return {
      async ajouter(e) {
        e.t = Date.now();
        await pret;
        if (db) {
          try { await new Promise((ok, ko) => { const tx = db.transaction('entrees', 'readwrite'); tx.objectStore('entrees').add(e); tx.oncomplete = ok; tx.onerror = ko; }); return; } catch (err) { /* repli */ }
        }
        const sans = Object.assign({}, e); delete sans.img; mem.push(sans); mem = mem.slice(-200); store.set('fj-carnet', JSON.stringify(mem));
      },
      async tout() {
        await pret;
        if (db) {
          try { return await new Promise((ok, ko) => { const rq = db.transaction('entrees').objectStore('entrees').getAll(); rq.onsuccess = () => ok(rq.result || []); rq.onerror = ko; }); } catch (err) { /* repli */ }
        }
        return mem.slice();
      },
      async effacer() {
        await pret; mem = []; store.set('fj-carnet', '[]');
        if (db) { try { db.transaction('entrees', 'readwrite').objectStore('entrees').clear(); } catch (e) { /* rien */ } }
      },
      async retirer(id) { await pret; if (db && id != null) { try { db.transaction('entrees', 'readwrite').objectStore('entrees').delete(id); } catch (e) { /* rien */ } } },
    };
  })();
  function legende() {
    const sc = S.scene && S.meta.scenes[S.scene];
    return { machine: S.id, nom: nomMachine(), scene: S.scene, sceneNom: sc ? sc.nom : '', graine: S.nom || '' };
  }
  function photo() {
    const flash = $('flash'); flash.hidden = false; flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go');
    setTimeout(() => { flash.hidden = true; }, 600);
    son('photo');
    const W = canvas.width, H = canvas.height, k = Math.min(1, 1600 / Math.max(W, H));
    const c2 = document.createElement('canvas'); c2.width = Math.round(W * k); c2.height = Math.round(H * k);
    try { c2.getContext('2d').drawImage(canvas, 0, 0, c2.width, c2.height); } catch (e) { return; }
    const etat = etatCourant();
    c2.toBlob((blob) => {
      carnet.ajouter(Object.assign({ type: 'photo', img: blob, etat }, legende())).then(() => bulle('Photo rangée dans ton carnet.'));
    }, 'image/jpeg', 0.86);
  }
  function epingler() {
    carnet.ajouter(Object.assign({ type: 'epingle', etat: etatCourant() }, legende())).then(() => bulle('Ce moment est épinglé dans ton carnet : tu pourras le refaire.', true));
    son('photo');
  }
  async function ouvrirCarnet() {
    ecran('carnet');
    const box = $('carnet'); box.textContent = '';
    box.append(h('div', { class: 'tete' }, h('h2', null, FJ.icone('carnet'), 'Mon carnet'), h('button', { class: 'x', 'aria-label': 'Fermer', onclick: () => ecran(null) }, FJ.icone('fermer'))));
    const vus = S.vus.size;
    box.append(h('p', { class: 'sous' }, `${vus} machine${vus > 1 ? 's' : ''} découverte${vus > 1 ? 's' : ''} sur ${defs.length}.`));
    const grille = h('div', { class: 'grille' }); box.append(grille);
    const tout = (await carnet.tout()).sort((a, b) => b.t - a.t);
    if (!tout.length) grille.append(h('p', { class: 'vide' }, 'Ton carnet est vide pour l’instant. Prends des photos (bouton Photo), épingle tes réglages préférés (dans Bidouiller), fais des paris « Et si… ? » : tout arrive ici.'));
    for (const e of tout) {
      const quand = new Date(e.t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      const carte = h('div', { class: 'entree ' + e.type });
      if (e.type === 'photo' && e.img) { const url = URL.createObjectURL(e.img); carte.append(h('img', { src: url, alt: 'Photo : ' + e.nom })); }
      if (e.type === 'pari') carte.append(h('div', { class: 'tampon' + (e.etiquette === 'Surpris !' ? ' surpris' : '') }, e.etiquette));
      if (e.type === 'epingle') carte.append(h('div', { class: 'epingle' }, FJ.icone('epingle')));
      carte.append(h('b', null, e.nom || e.machine));
      if (e.type === 'pari') carte.append(h('p', null, e.question), h('p', { class: 'petit' }, 'Mon pari : ' + e.pari));
      else carte.append(h('p', { class: 'petit' }, [e.graine || e.sceneNom, quand].filter(Boolean).join(' · ')));
      const rang = h('div', { class: 'rangee' }); carte.append(rang);
      if (e.etat) rang.append(h('button', { class: 'bt', onclick: () => { ecran(null); aller(e.machine, { etat: e.etat }); } }, FJ.icone('recommencer'), h('span', null, 'Refaire')));
      if (e.type === 'photo' && e.img) rang.append(h('button', { class: 'bt', onclick: () => enregistrer(e) }, FJ.icone('photo'), h('span', null, 'Enregistrer')));
      if (e.id != null) rang.append(h('button', { class: 'bt doux', 'aria-label': 'Retirer', onclick: async () => { await carnet.retirer(e.id); carte.remove(); } }, FJ.icone('fermer')));
      grille.append(carte);
    }
  }
  function enregistrer(e) {
    const nom = 'fascinations-' + (e.machine || 'photo') + '-' + e.t + '.jpg';
    if (window.FJAndroid && window.FJAndroid.enregistrer) {
      const fr2 = new FileReader(); fr2.onload = () => { try { window.FJAndroid.enregistrer(String(fr2.result).split(',')[1], nom); bulle('Photo enregistrée dans la galerie.'); } catch (err) { bulle('Impossible d’enregistrer ici.'); } }; fr2.readAsDataURL(e.img); return;
    }
    try { const a = document.createElement('a'); a.download = nom; a.href = URL.createObjectURL(e.img); a.click(); } catch (err) { bulle('Impossible d’enregistrer ici.'); }
  }

  /* ───────── la Carte ───────── */
  function ouvrirCarte() {
    ecran('carte');
    const box = $('carte'); box.textContent = '';
    const logo = h('div', { class: 'logo', title: 'Appui long : le coin des grands' }, h('b', null, 'Fascinations'), h('span', null, 'labo'));
    appuiLong(logo, ouvrirParents);
    box.append(h('div', { class: 'tete' }, logo, h('p', { class: 'sous' }, `${S.vus.size} / ${defs.length} découvertes`),
      h('button', { class: 'bt', onclick: () => { ecran(null); aller(sac.suivant()); } }, FJ.icone('encore'), h('span', null, 'Au hasard')),
      h('button', { class: 'bt', onclick: () => ouvrirCarnet() }, FJ.icone('carnet'), h('span', null, 'Mon carnet')),
      h('button', { class: 'x', 'aria-label': 'Fermer', onclick: () => ecran(null) }, FJ.icone('fermer'))));
    for (const m of FJ.MONDES) {
      const sec = h('section', { class: 'monde', style: '--c:' + m.couleur });
      sec.append(h('div', { class: 'mh' }, FJ.icone(m.icone), h('div', null, h('h3', null, m.nom), h('p', null, m.idee))));
      const rang = h('div', { class: 'vignettes' }); sec.append(rang);
      for (const id of m.machines) {
        const def = defs.find((d) => d.id === id); if (!def) continue;
        const meta = FJ.META[id] || {};
        const img = (FJ.VIGNETTES && FJ.VIGNETTES[id]) || null;
        const v = h('button', { class: 'vignette' + (S.vus.has(id) ? '' : ' neuve') + (id === S.id ? ' ici' : ''), onclick: () => { ecran(null); if (id !== S.id) aller(id); } },
          img ? h('img', { src: img, alt: '' }) : h('div', { class: 'ph' }, FJ.icone(m.icone)),
          h('b', null, meta.nom || def.name), meta.question ? h('span', null, meta.question) : null);
        rang.append(v);
      }
      box.append(sec);
    }
  }
  function ecran(nom) {
    S.ecran = nom;
    for (const k of ['carte', 'carnet', 'parents']) $(k).hidden = k !== nom;
    app.classList.toggle('ecran-ouvert', !!nom);
    if (nom) { fermerTiroir(); $('pastille').hidden = true; } else last = 0;
  }
  function appuiLong(el, fn) {
    let t = 0;
    el.addEventListener('pointerdown', () => { t = setTimeout(fn, 1600); });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) el.addEventListener(ev, () => clearTimeout(t));
  }

  /* ───────── le coin des grands ───────── */
  function ouvrirParents() {
    ecran('parents');
    const box = $('parents'); box.textContent = '';
    box.append(h('div', { class: 'tete' }, h('h2', null, 'Le coin des grands'), h('button', { class: 'x', 'aria-label': 'Fermer', onclick: () => ecran(null) }, FJ.icone('fermer'))));
    const pref = (k, txt, aide) => {
      const b = h('button', { class: 'bascule' + (S.prefs[k] ? ' on' : ''), onclick: () => { S.prefs[k] = !S.prefs[k]; store.set('fj-prefs', JSON.stringify(S.prefs)); b.classList.toggle('on', S.prefs[k]); app.classList.toggle('calme', S.prefs.calme); } }, h('i'), h('span', null, txt));
      box.append(b, h('p', { class: 'petit' }, aide));
    };
    pref('doux', 'Flashs adoucis', 'Atténue les éclairs et les scintillements rapides (photosensibilité). Recommandé.');
    pref('calme', 'Moins d’animations dans l’interface', 'Pas de main qui montre les gestes, transitions réduites.');
    box.append(h('h3', null, 'Le carnet'), h('button', { class: 'bt', onclick: async () => { if (confirm('Effacer tout le carnet (photos, épingles, paris) ?')) { await carnet.effacer(); bulle('Carnet effacé.'); } } }, FJ.icone('gomme'), h('span', null, 'Effacer le carnet')));
    box.append(h('button', { class: 'bt', onclick: () => { S.vus = new Set(); store.set('fj-vus', '[]'); S.etsiVu = new Set(); store.set('fj-etsi', '[]'); bulle('Découvertes remises à zéro.'); } }, FJ.icone('recommencer'), h('span', null, 'Oublier les découvertes')));
    box.append(h('button', { class: 'bt', onclick: () => { dprMap = {}; store.set('fj-dpr', '{}'); bulle('Résolution maximale rétablie pour toutes les machines.'); } }, FJ.icone('spectacle'), h('span', null, 'Rétablir la pleine résolution')));
    box.append(h('h3', null, 'À propos'), h('p', { class: 'petit' }, 'Fascinations Labo : 32 machines de science à toucher, pour les 10-14 ans (et les autres). Tout fonctionne hors ligne ; rien ne sort de l’appareil. Les simulations sont simplifiées et souvent accélérées : les textes « Pourquoi ? » disent ce qui est vrai, ce qui est simplifié et ce que les scientifiques ne savent pas encore.'));
  }

  /* ───────── le son, la pause, le spectacle ───────── */
  function basculerSon() { S.son = !S.son; audio.setOn(S.son); rendreDroite(); if (S.son) son('outil'); }
  function son(quoi) {
    if (!S.son || !audio || !audio.on) return;
    try {
      if (quoi === 'outil') audio.note(880, 0.06, 'triangle', 0.035);
      else if (quoi === 'tiroir') audio.note(520, 0.09, 'sine', 0.03, 640);
      else if (quoi === 'scene' || quoi === 'recette') { audio.note(660, 0.1, 'triangle', 0.035); setTimeout(() => audio.note(990, 0.12, 'triangle', 0.03), 70); }
      else if (quoi === 'encore') { [523, 659, 784].forEach((f, i) => setTimeout(() => audio.note(f, 0.12, 'triangle', 0.03), i * 60)); }
      else if (quoi === 'photo') audio.noise(0.08, 0.06, 3000, 0.7, 'highpass');
      else if (quoi === 'action') audio.note(330, 0.08, 'square', 0.02);
      else if (quoi === 'surpris') { audio.note(392, 0.18, 'triangle', 0.04, 784); }
      else if (quoi === 'bienvu') { [659, 988].forEach((f, i) => setTimeout(() => audio.note(f, 0.15, 'triangle', 0.035), i * 90)); }
    } catch (e) { /* rien */ }
  }
  function basculerPause() { S.pause = !S.pause; rendreDroite(); }
  function spectacle(on) {
    S.spectacle = on; app.classList.toggle('spectacle', on); $('sortie').hidden = !on;
    if (on) { fermerTiroir(); $('pastille').hidden = true; }
  }

  /* ───────── démarrage ───────── */
  function init() {
    defs = window.FASC.slice();
    const ids = FJ.MONDES.flatMap((m) => m.machines).filter((id) => defs.some((d) => d.id === id));
    for (const d of defs) if (!ids.includes(d.id)) ids.push(d.id);
    audio = new FK.SoundKit();
    sac = FJ.Sac(ids, store);
    app.classList.toggle('calme', S.prefs.calme);
    $('bCarte').append(FJ.icone('carte'), h('span', null, 'Carte'));
    $('bPrec').append(FJ.icone('prec')); $('bSuiv').append(FJ.icone('suiv'));
    $('bPourquoi').append(FJ.icone('pourquoi'), h('span', null, 'Pourquoi ?'));
    $('bBidouiller').append(FJ.icone('bidouiller'), h('span', null, 'Bidouiller'));
    $('bEncore').append(FJ.icone('encore'), h('span', null, 'Encore !'));
    $('bPhoto').append(FJ.icone('photo'), h('span', null, 'Photo'));
    $('remplir').append(FJ.icone('spectacle'), h('span', null, 'Remplir l’écran'));
    $('sortie').append(FJ.icone('fermer'));
    $('bCarte').onclick = ouvrirCarte;
    $('bPrec').onclick = precedent; $('bSuiv').onclick = suivant;
    $('nom').onclick = () => ouvrirTiroir('pourquoi');
    $('bSon').onclick = basculerSon; $('bPause').onclick = basculerPause;
    $('bPourquoi').onclick = () => ouvrirTiroir('pourquoi'); $('bBidouiller').onclick = () => ouvrirTiroir('bidouiller');
    $('bEncore').onclick = encore; $('bPhoto').onclick = photo;
    $('remplir').onclick = () => { if (confirm('Remplir l’écran ? La machine sera recréée avec les mêmes réglages, mais ce que tu as construit sera perdu.')) ouvrir(S.id, { etat: etatCourant() }); };
    $('sortie').onclick = () => spectacle(false);
    $('carton').onclick = effacerCarton;
    window.addEventListener('keydown', (e) => {
      if (e.target && /input|textarea/i.test(e.target.tagName)) return;
      if (e.key === 'ArrowRight') suivant(); else if (e.key === 'ArrowLeft') precedent();
      else if (e.key === ' ') { e.preventDefault(); basculerPause(); }
      else if (e.key === 'Escape') { if (S.ecran) ecran(null); else if (S.tiroir) fermerTiroir(); else if (S.spectacle) spectacle(false); }
    });
    document.addEventListener('visibilitychange', () => { last = 0; });
    $('chargement').hidden = true;
    raf = requestAnimationFrame(boucle);
    const voulu = (location.hash || '').replace('#', '');
    aller(defs.some((d) => d.id === voulu) ? voulu : sac.suivant());
  }
  if (TEST) {
    window.FJ_TEST = { ouvertures: 0, get S() { return S; }, pilote, ouvrir: (id, o) => aller(id, o), encore, precedent, suivant, changerScene, ouvrirTiroir, fermerTiroir, spectacle, basculerSon, photo, epingler, ouvrirCarte, ouvrirCarnet, ecran, carnet, etatCourant, recette, rendre };
  }
  init();
})();
