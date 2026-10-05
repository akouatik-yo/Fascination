/* Fascination — la coquille, en JavaScript natif.
   Reprise fidèle de la version « Design Component » : mêmes volets, mêmes boutons, mêmes raccourcis.
   Les machines (s-*.js) et fk.js sont chargés tels quels ; seul le contrat env/sim compte. */
(function () {
  'use strict';
  const ORDER = ['fourmis', 'mycelium', 'blob', 'meduses', 'lucioles', 'boids', 'feu', 'eau', 'fluide', 'sable', 'foudre', 'cristal', 'rd', 'spirales', 'chladni', 'kaleido', 'harmono', 'attracteur', 'fractal', 'moire', 'galaxie', 'tunnel', 'lave', 'bulles', 'viz', 'harpe'];
  const ACCENT = { 'Vivant': '#79f3b4', 'Éléments': '#ff9c5c', 'Motifs': '#c09aff', 'Cosmos': '#6fd4ff', 'Sons': '#ff8ad8' };
  const ACCENT_L = { 'Vivant': '#0e8a57', 'Éléments': '#c4501a', 'Motifs': '#6f45d4', 'Cosmos': '#137fae', 'Sons': '#c2368f' };
  const accent = (cat) => (S.theme === 'light' ? ACCENT_L[cat] || '#6f45d4' : ACCENT[cat] || '#c09aff');
  const CFG = Object.assign({ startSim: 'lucioles', speed: 1, sound: false, psyche: true, autoplay: 0 }, window.FASC_CONFIG || {});

  const $ = (id) => document.getElementById(id);
  function h(tag, props, ...kids) {
    const e = document.createElement(tag);
    if (props) for (const k in props) {
      const v = props[k];
      if (v == null) continue;
      if (k === 'style') e.style.cssText = v;
      else if (k === 'class') e.className = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (k in e && typeof v !== 'string') e[k] = v;
      else e.setAttribute(k, v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : String(c));
    return e;
  }

  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* rien */ } } };
  const S = { theme: 'dark', themePref: store.get('fasc-theme') || 'auto', decor: store.get('fasc-decor') !== '0', ready: false, id: null, tool: null, sound: false, psy: CFG.psyche !== false, zen: false, paused: false, speed: Number(CFG.speed) > 0 ? Number(CFG.speed) : 1, left: window.innerWidth >= 1200, right: window.innerWidth >= 760, about: false };
  let defs = [], sim = null, env = null, audio = null;
  let raf = 0, last = 0, vt = 0, pend = 0, acc = 0, errId = null;
  let down = false, px = null, py = null;

  const canvas = $('cv'), rail = $('rail'), panel = $('panel');

  /* ───────── démarrage ───────── */
  let tries = 0, seen = -1, stable = 0;
  const wait = setInterval(tryBoot, 40);
  function tryBoot() {
    tries++;
    const list = window.FASC;
    if (!window.FK || !list || !list.length) { if (tries > 200) clearInterval(wait); return; }
    if (list.length !== seen) { seen = list.length; stable = 0; return; }
    if (++stable < 3) return;
    clearInterval(wait);
    const byId = new Map();
    list.forEach((d) => byId.set(d.id, d));
    const rank = (d) => { const i = ORDER.indexOf(d.id); return i < 0 ? 999 : i; };
    defs = [...byId.values()].sort((a, b) => rank(a) - rank(b));
    audio = new window.FK.SoundKit();
    S.ready = true;
    $('loading').hidden = true;
    $('count').textContent = defs.length + ' expériences · cabinet de curiosités animées';
    buildRail();
    let want = (location.hash || '').replace('#', '') || CFG.startSim;
    if (!defs.some((d) => d.id === want)) want = defs.some((d) => d.id === 'lucioles') ? 'lucioles' : defs[0].id;
    select(want);
    raf = requestAnimationFrame(loop);
    if (CFG.sound) toggleSound();
    const secs = Number(CFG.autoplay || 0);
    if (secs > 0) setInterval(shuffle, secs * 1000);
    setInterval(() => { if (S.right && !S.zen && sim && sim.ui) renderControls(); }, 500);
  }

  /* ───────── canevas ───────── */
  function viewRect() {
    const W = env ? env.w : 0;
    const l = S.left && !S.zen ? rail.offsetWidth : 0;
    const r = S.right && !S.zen ? panel.offsetWidth : 0;
    return { x0: l, x1: Math.max(l + 200, W - r) };
  }
  function setupCanvas() {
    const par = canvas.parentElement;
    const r = par.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(300, Math.round(r.width)), hh = Math.max(220, Math.round(r.height));
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(hh * dpr);
    canvas.style.width = w + 'px'; canvas.style.height = hh + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, hh);
    return { ctx, canvas, w, h: hh, dpr, t: 0, audio, get tool() { return S.tool; }, get view() { return viewRect(); }, get paused() { return S.paused; }, get decor() { return S.decor; }, get theme() { return S.theme; } };
  }
  function disposeSim() {
    if (sim && sim.dispose) { try { sim.dispose(); } catch (e) { /* rien */ } }
    sim = null;
  }
  function build() {
    const def = defs.find((d) => d.id === S.id);
    if (!def) return;
    const e = setupCanvas();
    if (!e) { setTimeout(build, 60); return; }
    env = e;
    try { sim = def.make(env); } catch (err) { console.warn('Fascination: make', def.id, err); sim = null; }
    last = 0;
    renderPanel();
  }
  function select(id) {
    const def = defs.find((d) => d.id === id);
    if (!def) return;
    disposeSim();
    const close = window.innerWidth < 800 && S.left && S.id;
    S.id = id;
    S.tool = def.tools && def.tools.length ? def.tools[0].id : null;
    if (close) S.left = false;
    try { history.replaceState(null, '', '#' + id); } catch (e) { /* cadre isolé */ }
    renderChrome();
    renderRail();
    build();
    centerRail();
  }
  let rz = 0;
  function onResize() {
    clearTimeout(rz);
    rz = setTimeout(() => { if (!S.id) return; disposeSim(); build(); }, 220);
  }
  window.addEventListener('resize', onResize);
  window.addEventListener('hashchange', () => {
    const id = (location.hash || '').replace('#', '');
    if (S.ready && id && id !== S.id && defs.some((d) => d.id === id)) select(id);
  });

  function loop(now) {
    raf = requestAnimationFrame(loop);
    const t = now / 1000;
    const dt = last ? Math.min(0.05, t - last) : 0.016;
    last = t;
    canvas.style.filter = S.psy ? 'saturate(1.22) contrast(1.04) hue-rotate(' + (Math.sin(t * 0.11) * 16).toFixed(1) + 'deg)' : 'none';
    if (!sim) return;
    if (S.paused) {
      if (sim.livePaused) { try { sim.frame(vt, 0); } catch (e) { /* rien */ } }
      return;
    }
    const sp = S.speed;
    pend += dt * sp;
    acc += sp;
    let steps = Math.floor(acc);
    acc -= steps;
    if (steps < 1) return;
    if (steps > 4) steps = 4;
    const dtv = Math.min(0.06, Math.max(0.002, pend / steps));
    pend = 0;
    try {
      for (let i = 0; i < steps; i++) { vt += dtv; env.t = vt; sim.frame(vt, dtv); }
    } catch (e) {
      if (errId !== S.id) { errId = S.id; console.warn('Fascination: frame', S.id, e); }
    }
  }

  /* ───────── pointeur ───────── */
  function pt(e) {
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const dx = px == null ? 0 : x - px, dy = py == null ? 0 : y - py;
    px = x; py = y;
    return { x, y, dx, dy, down };
  }
  canvas.addEventListener('pointerdown', (e) => {
    if (!sim) return;
    down = true; px = null; py = null;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* rien */ }
    const p = pt(e); p.down = true;
    if (navigator.vibrate) { try { navigator.vibrate(4); } catch (err) { /* rien */ } }
    if (sim.down) { try { sim.down(p); } catch (err) { console.warn(err); } }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!sim || !sim.move) return;
    const p = pt(e);
    try { sim.move(p); } catch (err) { /* rien */ }
  });
  const up = (e) => {
    down = false;
    if (sim && sim.up) { try { sim.up(pt(e)); } catch (err) { /* rien */ } }
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('pointerleave', up);

  /* ───────── commandes ───────── */
  function toggleSound() {
    S.sound = !S.sound;
    audio.setOn(S.sound);
    renderChrome();
    // les bourdons des expériences sont recréés avec le son
    disposeSim(); build();
  }
  /* thème : choix du visiteur, sinon celui de l'hôte (artefact claude.ai), sinon celui du système */
  const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
  function applyTheme() {
    let t = S.themePref;
    if (t === 'auto') {
      const host = document.documentElement.getAttribute('data-theme');
      t = host === 'light' || host === 'dark' ? host : mq && mq.matches ? 'light' : 'dark';
    }
    const changed = t !== S.theme;
    S.theme = t;
    document.documentElement.setAttribute('data-fasc-theme', t);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'light' ? '#f3eee3' : '#07060c');
    if (changed && S.ready) { buildRail(); renderRail(); renderPanel(); }
    renderChrome();
    if (window.Bruits && window.Bruits.retheme) window.Bruits.retheme();
  }
  function cycleTheme() {
    S.themePref = { auto: 'light', light: 'dark', dark: 'auto' }[S.themePref] || 'auto';
    store.set('fasc-theme', S.themePref);
    applyTheme();
  }
  if (mq && mq.addEventListener) mq.addEventListener('change', applyTheme);
  try { new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); } catch (e) { /* rien */ }
  function toggleDecor() {
    const def = curDef();
    if (!def || !def.decor) return;
    S.decor = !S.decor;
    store.set('fasc-decor', S.decor ? '1' : '0');
    renderSimRow();
  }
  function nudgeSpeed(f) { S.speed = Math.min(2.5, Math.max(0.08, Math.round(S.speed * f * 100) / 100)); renderChrome(); }
  function togglePsy() { S.psy = !S.psy; renderChrome(); }
  function toggleLeft() { S.left = !S.left; renderChrome(); centerRail(); }
  function toggleRight() { S.right = !S.right; renderChrome(); if (S.right) renderPanel(); }
  function togglePause() { S.paused = !S.paused; renderChrome(); renderSimRow(); }
  function toggleZen() { S.zen = !S.zen; renderChrome(); setTimeout(onResize, 30); }
  function restart() { disposeSim(); build(); }
  function clearSim() { if (sim && sim.clear) { try { sim.clear(); } catch (e) { console.warn(e); } } renderControls(); }
  function shuffle() {
    if (!defs.length) return;
    let id = S.id;
    while (id === S.id && defs.length > 1) id = defs[(Math.random() * defs.length) | 0].id;
    select(id);
  }
  function step(d) {
    if (!defs.length) return;
    const i = defs.findIndex((x) => x.id === S.id);
    select(defs[(i + d + defs.length) % defs.length].id);
  }
  // Dans un artefact claude.ai, la capacité « downloads » propose le fichier au visiteur ;
  // ailleurs (ou si elle est indisponible), lien de téléchargement puis image en surimpression.
  let dl = null;
  const inClaude = !!(window.claude && window.claude.use);
  if (inClaude) { try { window.claude.use('downloads').then((d) => { dl = d; }, () => {}); } catch (e) { /* rien */ } }
  function photo() {
    let url;
    try { url = canvas.toDataURL('image/png'); } catch (e) { console.warn(e); return; }
    const name = 'fascination-' + (S.id || 'image') + '.png';
    const show = () => {
      const box = h('div', { class: 'shot', onclick: () => box.remove() },
        h('img', { src: url, alt: 'Photo de la machine ' + (S.id || '') }),
        h('p', null, 'Appui long ou clic droit sur l’image pour l’enregistrer · toucher pour fermer'));
      $('stage').append(box);
    };
    if (dl) {
      canvas.toBlob((blob) => {
        if (!blob) { show(); return; }
        dl.save({ filename: name, data: blob }).catch((e) => { if (!e || (e.code !== 'declined' && e.code !== 'rate_limited')) show(); });
      }, 'image/png');
      return;
    }
    if (!inClaude) { try { const a = document.createElement('a'); a.download = name; a.href = url; a.click(); return; } catch (e) { /* bloqué */ } }
    show();
  }

  $('bLeft').onclick = toggleLeft;
  $('bPrev').onclick = () => step(-1);
  $('bNext').onclick = () => step(1);
  $('bShuffle').onclick = shuffle;
  $('bSound').onclick = toggleSound;
  $('bPsy').onclick = togglePsy;
  $('bPhoto').onclick = photo;
  $('bPause').onclick = togglePause;
  $('bZen').onclick = toggleZen;
  $('bZenOut').onclick = toggleZen;
  $('bRight').onclick = toggleRight;
  $('bNoise').onclick = () => window.Bruits && window.Bruits.toggle();
  $('bTheme').onclick = cycleTheme;
  $('speed').addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) { S.speed = v; S.paused = false; renderChrome(); renderSimRow(); }
  });

  window.addEventListener('keydown', (e) => {
    if (e.target && /input|textarea|select/i.test(e.target.tagName || '')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'arrowright') step(1);
    else if (k === 'arrowleft') step(-1);
    else if (k === ' ') { e.preventDefault(); togglePause(); }
    else if (k === 'h') toggleZen();
    else if (k === 's') toggleSound();
    else if (k === 'n') { if (window.Bruits) window.Bruits.toggle(); }
    else if (k === 'd') toggleDecor();
    else if (k === 't') cycleTheme();
    else if (k === 'r') shuffle();
    else if (k === '[') toggleLeft();
    else if (k === ']') toggleRight();
    else if (k === '+' || k === '=') nudgeSpeed(1.3);
    else if (k === '-') nudgeSpeed(1 / 1.3);
  });

  /* ───────── rendu de l'interface ───────── */
  function paint(btn, on, col) {
    btn.style.background = on ? col + '26' : '';
    btn.style.borderColor = on ? col + 'aa' : '';
    btn.classList.toggle('on', !!on);
  }
  function curDef() { return defs.find((d) => d.id === S.id); }

  function renderChrome() {
    const cur = curDef(), acc = cur ? accent(cur.cat) : '#c09aff';
    $('chrome').hidden = S.zen;
    rail.hidden = S.zen || !S.left;
    panel.hidden = S.zen || !S.right;
    $('bZenOut').hidden = !S.zen;
    const bl = $('bLeft');
    bl.style.background = S.left ? 'var(--chip-hi)' : '';
    bl.style.borderColor = S.left ? 'var(--line-hi)' : '';
    $('bTheme').textContent = { auto: '◐ AUTO', light: '☀ CLAIR', dark: '☾ SOMBRE' }[S.themePref] || '◐ AUTO';
    $('bSound').textContent = S.sound ? 'SON ON' : 'SON OFF';
    paint($('bSound'), S.sound, S.theme === 'light' ? '#c2368f' : '#ff8ad8');
    $('bPsy').textContent = S.psy ? 'PSYCHÉ ON' : 'PSYCHÉ OFF';
    paint($('bPsy'), S.psy, S.theme === 'light' ? '#6f45d4' : '#c09aff');
    $('bPause').textContent = S.paused ? 'REPRENDRE' : 'PAUSE';
    const br = $('bRight');
    br.style.background = S.right ? acc + '22' : '';
    br.style.borderColor = S.right ? acc + '99' : '';
    const sp = $('speed');
    if (document.activeElement !== sp) sp.value = S.speed;
    $('speedOut').textContent = '×' + S.speed.toFixed(2).replace(/0$/, '');
  }

  let railItems = [];
  function buildRail() {
    rail.textContent = '';
    railItems = [];
    const cats = [];
    defs.forEach((d) => { if (!cats.includes(d.cat)) cats.push(d.cat); });
    for (const cat of cats) {
      const g = h('div', { class: 'grp' }, h('div', { class: 'grp-h' }, h('i', { style: 'background:' + accent(cat) }), h('span', null, cat)));
      for (const d of defs.filter((x) => x.cat === cat)) {
        const b = h('button', { class: 'it', onclick: () => select(d.id) },
          h('span', { class: 'g' }, d.glyph || '✷'),
          h('span', { class: 't' }, h('b', null, d.name), h('small', null, d.blurb || '')));
        b._def = d;
        railItems.push(b);
        g.append(b);
      }
      rail.append(g);
    }
    rail.append(h('div', { class: 'keys' },
      h('span', null, '← → CHANGER · R HASARD'),
      h('span', null, 'ESPACE PAUSE · H ZEN · S SON'),
      h('span', null, 'N BRUITS · D DÉCOR · T THÈME'),
      h('span', null, '[ ] VOLETS'),
      h('span', null, '+ / − VITESSE')));
  }
  function renderRail() {
    for (const b of railItems) {
      const on = b._def.id === S.id, acc = accent(b._def.cat);
      b.classList.toggle('on', on);
      b.dataset.on = on ? '1' : '0';
      b.style.borderColor = on ? acc + '99' : '';
      b.firstChild.style.color = on ? acc : '';
    }
  }
  function centerRail() {
    const el = rail.querySelector('[data-on="1"]');
    if (el) rail.scrollTop = Math.max(0, el.offsetTop - rail.clientHeight * 0.5);
  }

  /* panneau de droite */
  let P = null;
  function renderPanel() {
    const cur = curDef();
    if (!cur) return;
    const acc = accent(cur.cat);
    panel.textContent = '';
    P = {};
    panel.append(h('div', { class: 'p-head' },
      h('div', { class: 'p-title' }, h('span', { class: 'g', style: 'color:' + acc }, cur.glyph || '✷'), h('h1', null, cur.name), h('button', { class: 'x', title: 'Fermer le panneau', 'aria-label': 'Fermer le panneau', onclick: toggleRight }, '×')),
      h('div', { class: 'p-blurb', style: 'color:' + acc }, cur.blurb || ''),
      h('div', { class: 'p-intro' }, cur.intro || cur.hint || '')));

    if (cur.tools && cur.tools.length) {
      P.tools = [];
      const grid = h('div', { class: 'tools' });
      P.tdesc = h('div', { class: 'tdesc' });
      for (const t of cur.tools) {
        const b = h('button', { class: 'tl', onclick: () => { S.tool = t.id; if (navigator.vibrate) { try { navigator.vibrate(4); } catch (e) { /* rien */ } } renderTools(); } }, t.label);
        b._t = t;
        P.tools.push(b);
        grid.append(b);
      }
      panel.append(h('div', { class: 'sec' }, h('div', { class: 'kicker' }, 'Outils'), grid, P.tdesc));
      renderTools();
    }

    P.play = h('button', { class: 'sb play', style: 'border-color:' + acc, onclick: togglePause });
    const row = h('div', { class: 'row' }, P.play, h('button', { class: 'sb', title: 'Relancer la machine depuis son état initial', onclick: restart }, 'RECOMMENCER'));
    const sec = h('div', { class: 'sec' }, h('div', { class: 'kicker' }, 'Simulation'), row);
    if (sim && sim.clear) {
      row.append(h('button', { class: 'sb', title: 'Vider entièrement l’écran', onclick: clearSim }, 'VIDER'));
      sec.append(h('div', { class: 'note' }, 'Videz, mettez en pause, construisez votre dispositif… puis lancez la lecture.'));
    }
    if (cur.decor) {
      P.dKnob = h('i'); P.dTrack = h('span', { class: 'tk' }, P.dKnob);
      P.decor = h('button', { class: 'c-tg', title: 'Masquer ou montrer le décor (D)', onclick: toggleDecor }, P.dTrack, h('span', null, 'Décor'));
      sec.append(P.decor, h('div', { class: 'note' }, 'Sans décor, seul le phénomène reste, sur fond noir ou crème selon le thème.'));
    }
    panel.append(sec);
    renderSimRow();

    P.ctl = h('div', { class: 'ctl' });
    P.sig = null;
    panel.append(P.ctl);
    renderControls();

    const body = h('div', { class: 'about-body' });
    for (const lg of cur.legend || []) {
      body.append(h('div', { class: 'lg' }, h('i', { style: 'background:' + lg.color + ';box-shadow:0 0 10px ' + lg.color }),
        h('div', null, h('b', null, lg.name), h('small', { style: 'color:' + lg.color }, lg.role), h('span', null, lg.desc))));
    }
    for (const t of cur.about || []) body.append(h('p', null, t));
    body.append(h('div', { class: 'gestes' }, h('span', { class: 'kicker' }, 'Gestes'), h('span', null, cur.hint || '')));
    body.hidden = !S.about;
    const sign = h('span', null, S.about ? '−' : '+');
    panel.append(h('div', { class: 'about' }, h('button', { onclick: () => { S.about = !S.about; body.hidden = !S.about; sign.textContent = S.about ? '−' : '+'; } }, h('span', null, 'En savoir plus'), sign), body));
    renderChrome();
  }
  function renderTools() {
    if (!P || !P.tools) return;
    const cur = curDef(), acc = accent(cur.cat);
    for (const b of P.tools) {
      const on = b._t.id === S.tool;
      b.style.background = on ? acc + '26' : '';
      b.style.borderColor = on ? acc + 'aa' : '';
      b.style.color = on ? 'var(--fg-strong)' : '';
      if (on) P.tdesc.textContent = b._t.desc || '';
    }
  }
  function renderSimRow() {
    if (!P) return;
    if (P.play) P.play.textContent = S.paused ? '▶ LECTURE' : '❚❚ PAUSE';
    if (P.decor) {
      const cur = curDef();
      P.dTrack.style.background = S.decor ? accent(cur.cat) : '';
      P.dKnob.style.left = S.decor ? '15px' : '2px';
      P.decor.setAttribute('aria-pressed', S.decor ? 'true' : 'false');
    }
  }

  /* commandes propres à la machine (sim.ui) : reconstruites seulement si leur structure change,
     sinon mises à jour sur place, pour ne pas casser un curseur qu'on est en train de tirer */
  function renderControls() {
    if (!P || !P.ctl) return;
    let ui = [];
    if (sim && sim.ui) { try { ui = sim.ui() || []; } catch (e) { ui = []; } }
    const sig = ui.map((c) => c.type + (c.options ? ':' + c.options.map((o) => o.id).join(',') : '') + (c.items ? ':' + c.items.length : '')).join('|');
    const cur = curDef(), acc = cur ? accent(cur.cat) : '#c09aff';
    if (sig !== P.sig) {
      P.sig = sig;
      P.ctl.textContent = '';
      P.items = ui.map((c, i) => makeControl(c, i, acc));
      P.items.forEach((it) => P.ctl.append(it.el));
      P.ctl.hidden = ui.length === 0;
    }
    P.cur = ui;
    ui.forEach((c, i) => P.items[i] && P.items[i].upd(c, acc));
  }
  function makeControl(c, i, acc) {
    const live = () => P.cur[i] || c;
    const fu = () => setTimeout(renderControls, 0);
    switch (c.type) {
      case 'section': { const el = h('div', { class: 'c-sec' }); return { el, upd: (c2) => { el.textContent = c2.label || ''; } }; }
      case 'note': { const el = h('div', { class: 'note' }); return { el, upd: (c2) => { el.textContent = c2.text || c2.label || ''; } }; }
      case 'bar': {
        const dot = h('i'), lab = h('span'), v = h('span', { class: 'v' }), fill = h('div');
        const el = h('div', { class: 'c-bar' }, h('div', { class: 'h' }, h('span', null, dot, lab), v), h('div', { class: 'tr' }, fill));
        return { el, upd: (c2) => {
          dot.style.background = fill.style.background = c2.color || acc;
          lab.textContent = c2.label || '';
          v.textContent = c2.txt || '';
          fill.style.width = (Math.max(0, Math.min(1, c2.value || 0)) * 100).toFixed(1) + '%';
        } };
      }
      case 'slider': {
        const lab = h('span'), v = h('span');
        const inp = h('input', { type: 'range', 'aria-label': c.label || '' });
        inp.addEventListener('input', () => { const x = parseFloat(inp.value); const cc = live(); if (!isNaN(x) && cc.set) { cc.set(x); v.textContent = cc.fmt ? cc.fmt(x) : String(x); fu(); } });
        const el = h('div', { class: 'c-sl' }, h('div', { class: 'h' }, lab, v), inp);
        return { el, upd: (c2) => {
          lab.textContent = c2.label || '';
          inp.min = c2.min; inp.max = c2.max; inp.step = c2.step || 0.01;
          inp.style.accentColor = acc;
          if (document.activeElement !== inp) inp.value = c2.value;
          v.textContent = c2.fmt ? c2.fmt(c2.value) : String(c2.value);
        } };
      }
      case 'toggle': {
        const knob = h('i'), tk = h('span', { class: 'tk' }, knob), lab = h('span');
        const el = h('button', { class: 'c-tg', onclick: () => { const cc = live(); cc.set(!cc.value); fu(); } }, tk, lab);
        return { el, upd: (c2) => {
          lab.textContent = c2.label || '';
          tk.style.background = c2.value ? acc : '';
          knob.style.left = c2.value ? '15px' : '2px';
          el.setAttribute('aria-pressed', c2.value ? 'true' : 'false');
        } };
      }
      case 'choice': {
        const lab = h('span'), opts = h('div', { class: 'opts' });
        const bs = (c.options || []).map((op) => {
          const b = h('button', { onclick: () => { live().set(op.id); fu(); } }, op.label);
          opts.append(b);
          return b;
        });
        const el = h('div', { class: 'c-ch' }, lab, opts);
        return { el, upd: (c2) => {
          lab.textContent = c2.label || '';
          (c2.options || []).forEach((op, j) => {
            const b = bs[j]; if (!b) return;
            const on = op.id === c2.value;
            b.textContent = op.label;
            b.style.background = on ? acc + '26' : '';
            b.style.borderColor = on ? acc + 'aa' : '';
            b.style.color = on ? 'var(--fg-strong)' : '';
          });
        } };
      }
      case 'buttons': {
        const el = h('div', { class: 'c-bt' });
        const bs = (c.items || []).map((it, j) => {
          const b = h('button', { onclick: () => { const cc = live(); const x = cc.items && cc.items[j]; if (x && x.act) x.act(); fu(); } });
          el.append(b);
          return b;
        });
        return { el, upd: (c2) => { (c2.items || []).forEach((it, j) => { if (bs[j]) bs[j].textContent = it.label; }); } };
      }
      default: return { el: h('div'), upd() {} };
    }
  }

  applyTheme();
})();
