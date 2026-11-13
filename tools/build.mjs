// Assemble l'application en un seul fichier HTML (CSS et JS en ligne).
//   node tools/build.mjs            → l'application unique (jeunesse/index.html), de 5 ans à l'âge adulte
//   node tools/build.mjs ancienne   → l'ancienne version adulte (app/index.html), pour comparaison
// Produit :
//   dist/fascination.html  page autonome complète (s'ouvre hors ligne, à part les polices Google)
//   dist/artifact.html     même contenu, sans <html>/<head>/<body>, pour un artefact claude.ai
//   dist/jeunesse.html, dist/jeunesse-artifact.html : la version jeunesse (polices intégrées, entièrement hors ligne)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const cible = process.argv[2] || 'adulte';
const between = (s, tag) => {
  const a = s.indexOf(`<!--build:${tag}-->`), b = s.indexOf(`<!--/build:${tag}-->`);
  if (a < 0 || b < 0) throw new Error('balise de build manquante : ' + tag);
  return s.slice(a + tag.length + 13, b);
};

function assembler({ dir, titre, polices, sortie, artefact, theme }) {
  const base = path.join(root, dir);
  const read = (p) => fs.readFileSync(path.join(base, p), 'utf8');
  const index = read('index.html');
  // les feuilles de style ; les url(…woff2) relatives sont intégrées en data URI (aucun accès réseau)
  const css = [...between(index, 'css').matchAll(/href="([^"]+)"/g)].map((m) => {
    const f = m[1], dirCss = path.dirname(path.join(base, f));
    return read(f).replace(/url\(([^)]+\.woff2)\)/g, (all, u) => {
      const fichier = path.join(dirCss, u.replace(/['"]/g, ''));
      if (!fs.existsSync(fichier)) return all;
      return `url(data:font/woff2;base64,${fs.readFileSync(fichier).toString('base64')})`;
    });
  }).join('\n');
  const body = between(index, 'body').trim();
  const files = [...between(index, 'js').matchAll(/src="([^"]+)"/g)].map((m) => m[1]);
  // chaque script doit être syntaxiquement valide : une erreur ici casserait toute l'application
  for (const f of files) { try { new Function(read(f)); } catch (e) { console.error(`Erreur de syntaxe dans ${path.join(dir, f)} : ${e.message}`); process.exit(1); } }
  const js = files.map((f) => `/* ═════ ${f} ═════ */\n${read(f)}`).join('\n;\n').replace(/<\/script/gi, '<\\/script');
  const head = `<title>${titre}</title>\n${polices}\n<style>\n${css}\n</style>`;
  const script = `<script>\n${js}\n</script>`;
  fs.mkdirSync(dist, { recursive: true });
  fs.writeFileSync(path.join(dist, artefact), `${head}\n${body}\n${script}\n`);
  fs.writeFileSync(path.join(dist, sortie),
    `<!DOCTYPE html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover${dir === 'jeunesse' ? ', user-scalable=no' : ''}">\n<meta name="theme-color" content="${theme}">\n${head}\n</head>\n<body>\n${body}\n${script}\n</body>\n</html>\n`);
  const kb = (f) => (fs.statSync(path.join(dist, f)).size / 1024).toFixed(0) + ' Ko';
  console.log(`${files.length} scripts assemblés → dist/${sortie} (${kb(sortie)}), dist/${artefact} (${kb(artefact)})`);
}

// branche app-unique (13/11/2026) : une seule application. L'ancienne version adulte (app/index.html) n'est plus assemblée ;
// dist/fascination.html est le shell unique (jeunesse/), et dist/jeunesse.html en est une copie pour les anciens liens.
if (cible === 'adulte' || cible === 'jeunesse' || cible === 'tout') {
  assembler({ dir: 'jeunesse', titre: 'Fascinations', sortie: 'fascination.html', artefact: 'artifact.html', theme: '#05050a', polices: '' });
  fs.copyFileSync(path.join(dist, 'fascination.html'), path.join(dist, 'jeunesse.html'));
  fs.copyFileSync(path.join(dist, 'artifact.html'), path.join(dist, 'jeunesse-artifact.html'));
}
if (cible === 'ancienne') {
  // l'ancienne version adulte, gardée pour comparaison tant que la fusion n'est pas validée
  assembler({ dir: 'app', titre: 'Fascinations (ancienne version)', sortie: 'ancienne-adulte.html', artefact: 'ancienne-adulte-artifact.html', theme: '#07060c',
    polices: '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap">' });
}
