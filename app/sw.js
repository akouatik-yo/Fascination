/* Fascination — service worker : l'application fonctionne hors ligne une fois visitée.
   Changer VERSION à chaque publication pour forcer la mise à jour du cache. */
const VERSION = 'fascination-v14';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './css/fascination.css',
  './js/fk.js', './js/fkgl.js', './js/fk-son.js', './js/shell.js', './js/bruits.js',
  './js/machines/s-lucioles.js', './js/machines/s-murmu.js', './js/machines/s-feu.js', './js/machines/s-eau.js', './js/machines/s-flux.js', './js/machines/s-sable3d.js', './js/machines/s-sable.js', './js/machines/s-foudre.js', './js/machines/s-cristal.js',
  './js/machines/s-motifs.js', './js/machines/s-fractales.js', './js/machines/s-illusions.js', './js/machines/s-vie.js', './js/machines/s-galaxie.js', './js/machines/s-tunnel.js', './js/machines/s-lave.js', './js/machines/s-bulles.js', './js/machines/s-spectre.js', './js/machines/s-harpe.js', './js/machines/s-pendules.js', './js/machines/s-sonillus.js', './js/machines/s-quantique.js', './js/machines/s-abysses.js',
  './js/machines/s-four-corps.js', './js/machines/s-fourmis.js', './js/machines/s-myce.js', './js/machines/s-blob.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// réseau d'abord pour nos fichiers (on voit les mises à jour), cache en secours ; cache d'abord pour les polices
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const font = /fonts\.(googleapis|gstatic)\.com/.test(req.url);
  if (font) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { const cp = res.clone(); caches.open(VERSION).then((c) => c.put(req, cp)); return res; })));
    return;
  }
  if (new URL(req.url).origin !== location.origin) return;
  e.respondWith(fetch(req).then((res) => { const cp = res.clone(); caches.open(VERSION).then((c) => c.put(req, cp)); return res; }).catch(() => caches.match(req)));
});
