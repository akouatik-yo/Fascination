// Assemble l'application en un seul fichier HTML (CSS et JS en ligne).
//   node tools/build.mjs
// Produit :
//   dist/fascination.html  page autonome complète (s'ouvre hors ligne, à part les polices Google)
//   dist/artifact.html     même contenu, sans <html>/<head>/<body>, pour un artefact claude.ai
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = path.join(root, 'app');
const dist = path.join(root, 'dist');
const read = (p) => fs.readFileSync(path.join(app, p), 'utf8');
const between = (s, tag) => {
  const a = s.indexOf(`<!--build:${tag}-->`), b = s.indexOf(`<!--/build:${tag}-->`);
  if (a < 0 || b < 0) throw new Error('balise de build manquante : ' + tag);
  return s.slice(a + tag.length + 13, b);
};

const index = read('index.html');
const css = [...between(index, 'css').matchAll(/href="([^"]+)"/g)].map((m) => read(m[1])).join('\n');
const body = between(index, 'body').trim();
const files = [...between(index, 'js').matchAll(/src="([^"]+)"/g)].map((m) => m[1]);
// chaque script doit être syntaxiquement valide : une erreur ici casserait toute l'application
for (const f of files) { try { new Function(read(f)); } catch (e) { console.error(`Erreur de syntaxe dans app/${f} : ${e.message}`); process.exit(1); } }
const js = files.map((f) => `/* ═════ ${f} ═════ */\n${read(f)}`).join('\n;\n').replace(/<\/script/gi, '<\\/script');
const fonts = '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap">';
const head = `<title>Fascinations</title>\n${fonts}\n<style>\n${css}\n</style>`;
const script = `<script>\n${js}\n</script>`;

fs.mkdirSync(dist, { recursive: true });
fs.writeFileSync(path.join(dist, 'artifact.html'), `${head}\n${body}\n${script}\n`);
fs.writeFileSync(path.join(dist, 'fascination.html'),
  `<!DOCTYPE html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="theme-color" content="#07060c">\n${head}\n</head>\n<body>\n${body}\n${script}\n</body>\n</html>\n`);
const kb = (f) => (fs.statSync(path.join(dist, f)).size / 1024).toFixed(0) + ' Ko';
console.log(`${files.length} scripts assemblés → dist/fascination.html (${kb('fascination.html')}), dist/artifact.html (${kb('artifact.html')})`);
