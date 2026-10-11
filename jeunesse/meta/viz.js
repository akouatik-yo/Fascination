/* Le Spectre — fiche jeunesse
   Le spectrogramme n'est pas proposé : il lui faut le son (la machine ne crée son analyseur qu'à sa construction,
   et le son est coupé par défaut ; l'activer ensuite ne le réveille pas), et sa source « Micro » ne doit jamais
   tomber au hasard. Quand le shell reconstruira la machine à l'activation du son, on pourra ajouter :
   spectro: { nom: 'Le son en images', via: 'scenes/spectrogramme', poids: 0, regle: { source: 'oiseaux' }, … }
   avec un levier « source » limité à garder: ['oiseaux', 'baleine', 'voix', 'musique'] (jamais 'micro'). */
FJ.fiche('viz', {
  nom: 'Le Spectre',
  question: 'À quoi ressemble un son ?',
  outil: 'toucher',
  scenes: {
    liss: { nom: 'Deux sons qui dansent', via: 'scenes/lissajous', poids: 3, outil: 'toucher',
      exposes: ['intervalle', 'desaccord', 'remanence'],
      plages: { intervalle: ['0', '1', '1', '2', '2', '3', '4', '5', '6', '7'], desaccord: [-5, 5], remanence: [0.6, 0.92] },
      essaie: 'Glisse le doigt lentement vers la droite, puis reviens au milieu : la figure tourne, puis s’arrête.' },
    timbre: { nom: 'La forme du son', via: 'scenes/timbre', poids: 2, outil: 'toucher',
      exposes: ['instrument', 'raideur', 'attaque'],
      plages: { instrument: ['flute', 'clarinette', 'hautbois', 'violon', 'trompette', 'orgue', 'cloche'] },
      essaie: 'Tire les barres vers le haut ou vers le bas, et regarde la vague du son changer.' },
  },
  outils: {
    toucher: { verbe: 'Glisse', icone: 'onde', geste: 'trait', aide: 'Glisse de gauche à droite pour désaccorder les deux sons, ou tire les barres pour changer la forme du son.' },
  },
  leviers: {
    intervalle: { chemin: 'lissajous/intervalle', nom: 'Les deux sons vibrent…',
      options: { 0: '1 pour 1 (unisson)', 1: '1 pour 2 (octave)', 2: '2 pour 3 (quinte)', 3: '3 pour 4 (quarte)', 4: '4 pour 5 (tierce)',
        5: '5 pour 6 (petite tierce)', 6: '3 pour 5 (sixte)', 7: '8 pour 9 (un ton)', 8: '15 pour 16 (demi-ton)', 9: '32 pour 45 (triton)' } },
    desaccord: { chemin: 'lissajous/desaccord', nom: 'Désaccord', bouts: ['← tourne dans un sens', 'dans l’autre →'] },
    remanence: { chemin: 'lissajous/remanence', nom: 'Traînée lumineuse', bouts: ['courte', 'longue'] },
    instrument: { chemin: 'timbre/instrument', nom: 'Instrument',
      options: { sinus: 'Son pur (diapason)', flute: 'Flûte', clarinette: 'Clarinette', hautbois: 'Hautbois', violon: 'Violon', trompette: 'Trompette', orgue: 'Orgue', cloche: 'Cloche' } },
    raideur: { chemin: 'timbre/inharmonicite raideur piano', nom: 'Corde raide (comme au piano)', bouts: ['souple', 'très raide'] },
    attaque: { chemin: 'timbre/attaque', nom: 'Façon de jouer', options: { tenu: 'Souffler ou frotter', pince: 'Pincer ou frapper' } },
  },
  partGraines: 0.3,
  graines: [
    { nom: 'L’octave : un son deux fois plus rapide que l’autre', scene: 'liss', regle: { intervalle: '1', desaccord: 1.2, remanence: 0.85 } },
    { nom: 'La quinte, presque juste', scene: 'liss', regle: { intervalle: '2', desaccord: 2, remanence: 0.85 } },
    { nom: 'La cloche, aux harmoniques en désordre', scene: 'timbre', regle: { instrument: 'cloche' } },
    { nom: 'La clarinette, surtout les barres impaires', scene: 'timbre', regle: { instrument: 'clarinette' } },
  ],
  recettes: [
    { nom: 'Unisson qui tourne', icone: 'cible', scene: 'liss', regle: { intervalle: '0', desaccord: 4, remanence: 0.9 } },
    { nom: 'Demi-ton', icone: 'motif', scene: 'liss', regle: { intervalle: '8', desaccord: 0.5, remanence: 0.7 } },
    { nom: 'Longue traînée', icone: 'etincelles', scene: 'liss', regle: { remanence: 0.96 } },
    { nom: 'Flûte', icone: 'onde', scene: 'timbre', regle: { instrument: 'flute' } },
    { nom: 'Trompette', icone: 'onde', scene: 'timbre', regle: { instrument: 'trompette' } },
    { nom: 'Corde très raide', icone: 'corde', scene: 'timbre', regle: { instrument: 'violon', raideur: 0.003 } },
  ],
  pourquoi: {
    etincelle: 'Un son, c’est de l’air qui vibre : la machine dessine ces vibrations au lieu de te les faire entendre.',
    texte: 'Un son, c’est de l’air qui vibre, des centaines de fois par seconde. Plus il vibre vite, plus le son est aigu.\n\nDans les figures, un son pur pousse le point de gauche à droite, un autre de haut en bas. Si leurs vitesses sont dans un rapport simple, comme 2 pour 3, la courbe se referme sur elle-même. Une note d’instrument n’est jamais pure : elle empile des vibrations 2, 3, 4 fois plus rapides, ses **harmoniques**. Chaque barre en règle une. Leur dosage donne la forme du son et sa couleur : c’est pour ça qu’une flûte et une trompette ne sonnent pas pareil.',
    vraie: 'En 1857, le physicien français Jules Lissajous colle de petits miroirs sur deux diapasons. Un rayon de lumière rebondit sur l’un, puis sur l’autre, et dessine ces courbes sur un écran. On pouvait ainsi voir si deux diapasons étaient bien accordés.',
  },
  etsi: [
    { id: 'juste', scene: 'liss', question: 'Et si on accordait parfaitement les deux sons, que ferait la figure ?',
      choix: ['Elle s’arrête de tourner', 'Elle tourne plus vite', 'Elle disparaît'], bonne: 0,
      prepare: { scene: 'liss', regle: { intervalle: '2', remanence: 0.85 }, action: 'lissajous/accorder juste' }, attente: 5,
      revele: 'Elle s’immobilise ! Accordés juste, les deux sons repassent toujours au même endroit ensemble. Un tout petit désaccord fait glisser l’un par rapport à l’autre : la figure tourne. C’est le **battement**. Les musiciens l’entendent comme un « wa-wa » lent, et s’en servent pour accorder leurs instruments.' },
    { id: 'pur', scene: 'timbre', question: 'Et si on ne gardait que la première barre, à quoi ressemblerait la vague du son ?',
      choix: ['Une vague toute lisse', 'Des dents de scie', 'Une ligne plate'], bonne: 0,
      prepare: { scene: 'timbre', regle: { instrument: 'sinus' } }, regarde: 'Regarde la vague, en haut de l’écran…', attente: 4,
      revele: 'Une vague toute lisse : c’est un son pur, comme celui d’un diapason. Chaque barre ajoute une vibration plus rapide, une **harmonique**. En s’additionnant, elles rendent la vague bosselée. Ce mélange fait qu’une flûte et une trompette ne sonnent pas pareil, même sur la même note.' },
  ],
  rotation: 'recreer',
});
