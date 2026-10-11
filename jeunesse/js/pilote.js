/* Fascinations Labo — le pilote : parler aux machines uniquement par leurs réglages (ui()).
   Une machine ne connaît pas d'identifiants : chaque contrôle est désigné par « rubrique/libellé », normalisés
   (sans accents ni ponctuation). Les listes changent selon la scène : on ré-indexe après chaque action.
   Aussi : le hasard à graine (mulberry32), le sac de machines, le tirage d'une scène et de ses réglages. */
(function () {
  const FJ = (window.FJ = window.FJ || {});
  FJ.META = FJ.META || {};
  FJ.fiche = (id, f) => { FJ.META[id] = f; };

  const norme = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  /* index : chemin → { kind, c (le contrôle), it (le bouton) } */
  function indexer(ui) {
    const idx = new Map(); let sec = '';
    const put = (k, o) => { while (idx.has(k)) k += '+'; idx.set(k, o); };
    for (const c of ui || []) {
      if (!c) continue;
      if (c.type === 'section') { sec = norme(c.label); continue; }
      if (c.type === 'note') continue;
      if (c.type === 'buttons') { for (const it of c.items || []) put(sec + '/' + norme(it.label), { kind: 'bouton', c, it }); continue; }
      if (c.label) put(sec + '/' + norme(c.label), { kind: c.type, c });
    }
    return idx;
  }
  // un chemin peut être donné sans rubrique (« /vent ») : on accepte alors n'importe quelle rubrique
  function trouver(idx, chemin) {
    if (!chemin) return null;
    const k = chemin.includes('/') ? chemin : '/' + chemin;
    if (idx.has(k)) return idx.get(k);
    if (k.startsWith('/')) { for (const [kk, v] of idx) if (kk.endsWith(k)) return v; }
    return null;
  }

  function Pilote(getSim) {
    const ui = () => { const s = getSim(); try { return s && s.ui ? s.ui() : []; } catch (e) { return []; } };
    const P = {
      ui, indexer: () => indexer(ui()),
      get(chemin) { return trouver(indexer(ui()), chemin); },
      // une scène : un bouton de la rubrique des scènes, ou la valeur d'un choix
      scene(via) {
        if (!via) return false;
        const idx = indexer(ui());
        if (typeof via === 'string') { const r = trouver(idx, via); if (r && r.kind === 'bouton') { r.it.act(); return true; } return false; }
        const r = trouver(idx, via.choix);
        if (r && r.kind === 'choice') { if (r.c.value !== via.valeur) r.c.set(via.valeur); return true; }
        return false;
      },
      // régler un contrôle par son chemin ; renvoie la valeur effectivement posée
      set(chemin, val) {
        const r = trouver(indexer(ui()), chemin);
        if (!r) return undefined;
        const c = r.c;
        try {
          if (r.kind === 'slider') { let v = clamp(Number(val), c.min, c.max); if (c.step > 0) v = clamp(+(c.min + Math.round((v - c.min) / c.step) * c.step).toFixed(6), c.min, c.max); c.set(v); return v; }   // arrondi au pas : 24 arcs, pas 24,6
          if (r.kind === 'toggle') { const v = !!val; if (!!c.value !== v) c.set(v); return v; }
          if (r.kind === 'choice') { const o = (c.options || []).find((x) => x.id === val || norme(x.label) === norme(val)); if (o && c.value !== o.id) c.set(o.id); return o ? o.id : undefined; }
          if (r.kind === 'bouton') { r.it.act(); return true; }
        } catch (e) { console.warn('FJ : réglage', chemin, e); }
        return undefined;
      },
      valeur(chemin) { const r = trouver(indexer(ui()), chemin); return r ? r.c.value : undefined; },
      // instantané : toutes les valeurs lisibles (curseurs, interrupteurs, choix) ; la scène est tenue à part
      instantane() {
        const o = {};
        for (const [k, r] of indexer(ui())) {
          if (r.kind === 'slider' || r.kind === 'toggle' || r.kind === 'choice') o[k] = r.c.value;
        }
        return o;
      },
      restaurer(inst, sauf) {
        if (!inst) return;
        for (const k of Object.keys(inst)) {
          if (sauf && sauf.test(k)) continue;
          const r = trouver(indexer(ui()), k);
          if (!r) continue;
          try {
            if (r.kind === 'slider' && r.c.value !== inst[k]) r.c.set(inst[k]);
            else if (r.kind === 'toggle' && !!r.c.value !== !!inst[k]) r.c.set(!!inst[k]);
            else if (r.kind === 'choice' && r.c.value !== inst[k]) r.c.set(inst[k]);
          } catch (e) { /* rien */ }
        }
      },
    };
    return P;
  }

  /* ───────── le hasard ───────── */
  function rng(seed) {
    let a = seed >>> 0;
    const f = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    f.seed = seed;
    return f;
  }
  const graine = () => (Math.random() * 4294967296) >>> 0;
  function pondere(R, poids) { // { cle: poids } → une clé
    const ks = Object.keys(poids).filter((k) => poids[k] > 0); let s = 0; for (const k of ks) s += poids[k];
    let u = R() * s; for (const k of ks) { u -= poids[k]; if (u <= 0) return k; } return ks[ks.length - 1];
  }
  // tirer une valeur dans une plage : [a, b] (curseur), true/false/0.5 (interrupteur), [x, y, z] de chaînes (choix)
  function tirerValeur(R, plage) {
    if (Array.isArray(plage)) {
      if (plage.length === 2 && typeof plage[0] === 'number' && typeof plage[1] === 'number') return plage[0] + R() * (plage[1] - plage[0]);
      return plage[Math.floor(R() * plage.length)];
    }
    if (typeof plage === 'number' && plage > 0 && plage < 1) return R() < plage;
    return plage;
  }
  /* le tirage d'une machine : une scène (pondérée), parfois une graine remarquable, sinon des réglages dans les plages */
  function tirage(meta, seed) {
    const R = rng(seed == null ? graine() : seed), t = { seed: R.seed, scene: null, regle: {}, nom: null, outil: null };
    const scenes = meta.scenes || {}, cles = Object.keys(scenes);
    if (cles.length) { const poids = {}; for (const k of cles) poids[k] = scenes[k].poids == null ? 1 : scenes[k].poids; t.scene = pondere(R, poids); }
    const sc = (t.scene && scenes[t.scene]) || {};
    const graines = (meta.graines || []).filter((g) => !g.scene || !cles.length || g.scene === t.scene);
    if (graines.length && R() < (meta.partGraines == null ? 0.3 : meta.partGraines)) {
      const g = graines[Math.floor(R() * graines.length)];
      Object.assign(t.regle, g.regle || {}); t.nom = g.nom || null; if (g.outil) t.outil = g.outil;
    } else {
      const plages = Object.assign({}, meta.plages || {}, sc.plages || {});
      for (const nom of Object.keys(plages)) t.regle[nom] = tirerValeur(R, plages[nom]);
    }
    t.outil = t.outil || sc.outil || meta.outil || null;
    return t;
  }
  /* le sac : les 32 machines mélangées, sans retomber sur les dernières vues */
  function Sac(ids, store) {
    let recents = [];
    try { recents = JSON.parse(store.get('fj-recents') || '[]'); } catch (e) { recents = []; }
    let file = [];
    const melanger = () => { file = ids.slice(); for (let i = file.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [file[i], file[j]] = [file[j], file[i]]; } };
    return {
      suivant() {
        for (let k = 0; k < 3 * ids.length; k++) {
          if (!file.length) melanger();
          const id = file.shift();
          if (!recents.includes(id) || k > ids.length) return id;
        }
        return ids[Math.floor(Math.random() * ids.length)];
      },
      vu(id) { recents = [id].concat(recents.filter((x) => x !== id)).slice(0, Math.min(8, Math.floor(ids.length / 3))); store.set('fj-recents', JSON.stringify(recents)); },
    };
  }

  Object.assign(FJ, { norme, indexer, trouver, Pilote, rng, graine, tirage, Sac, tirerValeur });
})();
