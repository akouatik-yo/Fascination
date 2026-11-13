/* Fascinations Labo — les grandes questions et leurs mondes (refonte du 13/11/2026, docs/REFONTE-PEDAGOGIQUE.md).
   Une question = un chemin de chapitres ; un chapitre = une machine et une de ses scènes [machine, scène].
   Les chapitres vont du plus simple au plus profond : le niveau en ouvre 2 (Je découvre), 4 (J'aime comprendre), ou tous.
   Une question sans liste explicite prend toutes les scènes de sa machine, dans l'ordre de la fiche. */
(function () {
  const FJ = (window.FJ = window.FJ || {});
  FJ.QUESTIONS = [
    // le vivant s'organise
    { id: 'insectes', q: 'Comment les insectes se parlent-ils ?', icone: 'insecte', chapitres: [['lucioles', 'nuit'], ['lucioles', 'vallee'], ['abeilles', 'fretillante'], ['fourmis', 'decouverte'], ['abeilles', 'ronde'], ['fourmis', 'pont'], ['lucioles', 'mangrove'], ['abeilles', 'journee'], ['lucioles', 'dialogues'], ['fourmis', 'societes']] },
    { id: 'nuee', q: 'Qui commande une nuée de milliers d’oiseaux ?', machines: ['boids'] },
    { id: 'reseaux', q: 'Comment le vivant tisse-t-il des réseaux sans cerveau ?', icone: 'amibe', chapitres: [['blob', 'reseau'], ['mycelium', 'combat'], ['blob', 'cercle'], ['mycelium', 'ronds'], ['blob', 'labyrinthe'], ['mycelium', 'reseau'], ['blob', 'duel']] },
    { id: 'abysses', q: 'Pourquoi tant d’animaux des profondeurs brillent-ils ?', machines: ['meduses'] },
    { id: 'vie', q: 'Comment des règles simples font-elles naître des formes qui bougent ?', machines: ['vie'] },
    // la Terre et le ciel
    { id: 'lave', q: 'Que se passe-t-il quand on chauffe par en dessous ?', icone: 'flamme', chapitres: [['lave', 'lampe'], ['lave', 'volcan'], ['lave', 'benard'], ['lave', 'coupe'], ['lave', 'pointchaud'], ['lave', 'soleil']] },
    { id: 'ciel', q: 'Pourquoi le ciel est-il bleu, et le couchant rouge ?', machines: ['ciel'] },
    { id: 'foudre', q: 'Pourquoi un éclair fait-il des zigzags ?', icone: 'eclair', chapitres: [['foudre', 'orage'], ['foudre', 'lich'], ['foudre', 'plasma']] },
    { id: 'eau', q: 'Pourquoi des filets de lumière dansent-ils au fond de l’eau ?', machines: ['eau'] },
    { id: 'sable', q: 'Comment le vent fabrique-t-il une dune ?', machines: ['sable'] },
    // la matière dessine
    { id: 'feu', q: 'Pourquoi une flamme est-elle pointue ?', machines: ['feu'] },
    { id: 'cristal', q: 'Pourquoi un flocon a-t-il six branches ?', machines: ['cristal'] },
    { id: 'bulles', q: 'D’où viennent les couleurs d’une bulle de savon ?', machines: ['bulles'] },
    { id: 'fluide', q: 'Pourquoi l’eau fait-elle des tourbillons derrière un rocher ?', machines: ['fluide'] },
    { id: 'motifs', q: 'Comment des motifs se dessinent-ils tout seuls ?', icone: 'motif', chapitres: [['rd', 'galerie'], ['spirales', 'bz'], ['rd', 'pelages'], ['spirales', 'coeur'], ['spirales', 'amibes'], ['rd', 'atlas'], ['rd', 'labo'], ['spirales', 'couleurs']] },
    // le son et les rythmes
    { id: 'son', q: 'À quoi ressemble un son ?', icone: 'onde', chapitres: [['harpe', 'harpe'], ['chladni', 'plaque'], ['viz', 'liss'], ['harpe', 'mono'], ['chladni', 'eau'], ['viz', 'timbre'], ['chladni', 'tube'], ['harpe', 'eolienne']] },
    { id: 'pendule', q: 'Que fait un pendule ?', icone: 'spirale', chapitres: [['pendules', 'vague'], ['harmono', 'harmono'], ['pendules', 'arcs'], ['harmono', 'spiro']] },
    // ton cerveau
    { id: 'illusions', q: 'Pourquoi ton cerveau voit-il ce qui n’est pas là ?', machines: ['illusions'] },
    { id: 'sonillus', q: 'Un son peut-il monter sans jamais aller plus haut ?', machines: ['sonillus'] },
    { id: 'moire', q: 'D’où viennent ces grandes bandes que personne n’a dessinées ?', machines: ['moire'] },
    // aux limites
    { id: 'galaxie', q: 'Pourquoi les galaxies dessinent-elles des spirales ?', icone: 'planete', chapitres: [['galaxie', 'spirale'], ['galaxie', 'collision'], ['galaxie', 'trounoir'], ['tunnel', 'relat'], ['tunnel', 'worm']] },
    { id: 'quantique', q: 'Pourquoi des particules lancées une à une dessinent-elles des bandes ?', machines: ['quantique'] },
    { id: 'chaos', q: 'Pourquoi ne peut-on pas prévoir la météo du mois prochain ?', machines: ['attracteur'] },
    { id: 'fractales', q: 'Une forme peut-elle avoir des détails sans fin ?', icone: 'motif', chapitres: [['fractal', 'mandelbrot'], ['fractal', 'julia'], ['kaleido', 'tube'], ['fractal', 'flammes'], ['fractal', 'courbes']] },
  ];
  FJ.MONDES = [
    { id: 'vivant', nom: 'Le vivant s’organise', idee: 'Des milliers d’individus, aucun chef… et pourtant ça s’organise.', couleur: '#7ee8a9', icone: 'oiseau', questions: ['insectes', 'nuee', 'reseaux', 'abysses', 'vie'] },
    { id: 'terre', nom: 'La Terre et le ciel', idee: 'Le feu de la Terre, la foudre, l’eau, le vent : la planète en mouvement.', couleur: '#ff9a5c', icone: 'eclair', questions: ['lave', 'ciel', 'foudre', 'eau', 'sable'] },
    { id: 'matiere', nom: 'La matière dessine', idee: 'Flammes, flocons, bulles, tourbillons : des formes que personne n’a dessinées.', couleur: '#c9a0ff', icone: 'flocon', questions: ['feu', 'cristal', 'bulles', 'fluide', 'motifs'] },
    { id: 'son', nom: 'Sons et rythmes', idee: 'Un son, c’est une vibration. Ici, on la voit.', couleur: '#ff86c8', icone: 'onde', questions: ['son', 'pendule'] },
    { id: 'cerveau', nom: 'Ton cerveau se fait avoir', idee: 'Tes yeux et tes oreilles ne disent pas toujours la vérité.', couleur: '#6fd4ff', icone: 'oeil', questions: ['illusions', 'sonillus', 'moire'] },
    { id: 'limites', nom: 'Aux limites du monde', idee: 'Trop petit, trop loin, trop vite, trop compliqué : là où le monde devient étrange.', couleur: '#8fa2ff', icone: 'planete', questions: ['galaxie', 'quantique', 'chaos', 'fractales'] },
  ];
  // une question sans liste explicite : toutes les scènes de ses machines (les fiches sont chargées après ce fichier)
  FJ.chapitresDe = (q) => {
    if (!q) return [];
    // un chapitre n'existe que si sa machine et sa fiche sont chargées (une machine en cours de rendu peut manquer)
    const charge = (m) => FJ.META[m] && (!window.FASC || window.FASC.some((d) => d.id === m));
    if (q.chapitres) return q.chapitres.filter(([m, s]) => charge(m) && (!s || !FJ.META[m].scenes || FJ.META[m].scenes[s]));
    const out = [];
    for (const m of q.machines || []) {
      const sc = (FJ.META[m] && FJ.META[m].scenes) || {};
      const ks = Object.keys(sc);
      if (ks.length) for (const k of ks) out.push([m, k]); else out.push([m, null]);
    }
    return out;
  };
  FJ.questionDe = (m, s) => FJ.QUESTIONS.find((q) => FJ.chapitresDe(q).some(([mm, ss]) => mm === m && (s == null || ss === s || ss == null)))
    || FJ.QUESTIONS.find((q) => FJ.chapitresDe(q).some(([mm]) => mm === m)) || null;
  FJ.mondeDeQuestion = (qid) => FJ.MONDES.find((w) => w.questions.includes(qid)) || FJ.MONDES[0];
  // compatibilité : les machines de chaque monde (le sac, la couleur d'accent)
  for (const w of FJ.MONDES) Object.defineProperty(w, 'machines', { get() { const ms = []; for (const qid of w.questions) for (const [m] of FJ.chapitresDe(FJ.QUESTIONS.find((q) => q.id === qid))) if (!ms.includes(m)) ms.push(m); return ms; } });
  FJ.mondeDe = (id) => FJ.MONDES.find((m) => m.machines.includes(id)) || FJ.MONDES[0];
})();
