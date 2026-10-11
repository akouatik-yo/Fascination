/* Le Kaléidoscope — fiche jeunesse */
FJ.fiche('kaleido', {
  nom: 'Le Kaléidoscope',
  question: 'Comment deux miroirs fabriquent-ils une rosace ?',
  outil: 'tourner',
  // la machine n'a pas de scènes : une seule, sans pastilles, pour porter « Essaie ça » ; le hasard change les miroirs
  scenes: {
    tube: { nom: 'Le kaléidoscope', via: { choix: 'miroirs/disposition', valeur: 'm6' }, outil: 'tourner',
      essaie: 'Fais tourner le tube du doigt autour du centre : les éclats roulent, et l’image ne revient jamais.' },
  },
  outils: {
    tourner: { verbe: 'Tourne', icone: 'tourner', geste: 'trait', aide: 'Glisse le doigt en rond autour du centre pour tourner le tube : les éclats roulent au fond.' },
    secouer: { verbe: 'Secoue', icone: 'secouer', geste: 'tap', aide: 'Touche l’image pour secouer le tube : les éclats sautent et un nouveau dessin apparaît.' },
  },
  leviers: {
    miroirs: { chemin: 'miroirs/disposition', nom: 'Les miroirs',
      options: { m3: '2 miroirs à 60° : 6 images', m4: '2 miroirs à 45° : 8 images', m6: '2 miroirs à 30° : 12 images', m8: '2 miroirs à 22,5° : 16 images',
        t60: '3 miroirs en triangle égal', t45: '3 miroirs : 90°, 45°, 45°', t30: '3 miroirs : 90°, 60°, 30°' } },
    objets: { chemin: 'cellule/objets', nom: 'Dans le tube', options: { eclats: 'Éclats de verre', perles: 'Perles', huile: 'Tube à huile' } },
    couleurs: { chemin: 'cellule/couleurs', nom: 'Couleurs', options: { vitrail: 'Vitrail', ocean: 'Océan', automne: 'Automne', bonbon: 'Bonbons' } },
    nombre: { chemin: 'cellule/nombre', nom: 'Nombre d’objets', bouts: ['quelques-uns', 'plein'] },
    perte: { chemin: 'miroirs/perte par reflet', nom: 'Lumière perdue à chaque reflet', bouts: ['miroirs parfaits', 'miroirs ternes'] },
    loupe: { chemin: 'miroirs/grossissement', nom: 'Loupe', bouts: ['de loin', 'de près'] },
    auto: { chemin: 'cellule/le tube tourne tout seul', nom: 'Le tube tourne tout seul' },
  },
  exposes: ['miroirs', 'objets', 'couleurs', 'nombre'],
  plages: {
    miroirs: ['m3', 'm4', 'm6', 'm6', 'm8', 't60', 't45', 't30'], objets: ['eclats', 'eclats', 'perles', 'huile'],
    couleurs: ['vitrail', 'ocean', 'automne', 'bonbon'], nombre: [25, 70], perte: [0.03, 0.08], loupe: [0.8, 1.5], auto: true,
  },
  partGraines: 0.3,
  graines: [
    { nom: 'Trois miroirs en triangle : le motif remplit tout', regle: { miroirs: 't60', objets: 'eclats', perte: 0.05, loupe: 1 } },
    { nom: 'Deux miroirs à 22,5° : une rosace de 16 images', regle: { miroirs: 'm8', objets: 'eclats', loupe: 1.1 } },
    { nom: 'Miroirs parfaits, qui ne perdent aucune lumière', regle: { miroirs: 't45', perte: 0, loupe: 0.9 } },
  ],
  recettes: [
    { nom: 'Perles d’océan', icone: 'goutte', regle: { objets: 'perles', couleurs: 'ocean', nombre: 50 } },
    { nom: 'Vitrail', icone: 'motif', regle: { miroirs: 'm6', objets: 'eclats', couleurs: 'vitrail', nombre: 60 } },
    { nom: 'Tube à huile d’automne', icone: 'feuille', regle: { objets: 'huile', couleurs: 'automne' } },
    { nom: 'Motif sans fin', icone: 'etincelles', regle: { miroirs: 't30', perte: 0 } },
    { nom: 'Miroirs ternes', icone: 'ombre', regle: { miroirs: 't60', perte: 0.2 } },
    { nom: 'Juste quelques éclats', icone: 'pincee', regle: { objets: 'eclats', nombre: 10, miroirs: 'm4' } },
  ],
  pourquoi: {
    etincelle: 'Chaque miroir copie ce qu’il voit, et l’autre miroir copie la copie : quelques éclats deviennent une rosace.',
    texte: 'Devant un miroir, un objet a un double. Avec deux miroirs en angle, chaque reflet se reflète à son tour dans l’autre miroir, et les copies se rangent en rond. Plus l’angle est petit, plus il y a de copies : à 60°, tu vois 6 images ; à 30°, 12. L’angle doit tomber juste, sinon les reflets ne se raccordent pas. Ce motif qui se répète en tournant est une **symétrie**.\n\nAvec trois miroirs en triangle, les reflets se reflètent sans fin et remplissent tout le cercle. Seuls trois triangles marchent parfaitement. Chaque reflet perd un peu de lumière : les copies lointaines sont plus sombres.',
    vraie: 'En 1816, le physicien écossais David Brewster invente le kaléidoscope en étudiant la lumière. Il fabrique son nom avec trois mots grecs : beau, image, regarder. Le jouet connaît un succès fou, mais des copies se vendent partout, et il n’en tire presque rien.',
  },
  etsi: [
    { id: 'trois', question: 'Et si on ajoutait un troisième miroir, en triangle ?',
      choix: ['Une seule rosace, comme avant', 'Un motif qui remplit tout le cercle', 'Plus rien ne se reflète'], bonne: 1,
      prepare: { scene: 'tube', regle: { miroirs: 't60', perte: 0.05, loupe: 1 } }, attente: 4,
      revele: 'Le motif remplit tout le cercle ! Avec trois miroirs, chaque reflet se reflète dans les deux autres miroirs, puis encore et encore. Les triangles de reflets se collent les uns aux autres comme des carreaux, jusqu’au bord. Un vrai kaléidoscope à trois miroirs fait exactement ça.' },
    { id: 'ternes', question: 'Et si chaque miroir perdait beaucoup de lumière à chaque reflet ?',
      choix: ['Les copies lointaines deviennent sombres', 'Tout devient plus clair', 'Rien ne change'], bonne: 0,
      prepare: { scene: 'tube', regle: { miroirs: 't60', perte: 0.2, loupe: 1 } }, attente: 4,
      revele: 'Les copies lointaines s’assombrissent ! Une copie lointaine a été reflétée plusieurs fois. À chaque reflet, le miroir garde un peu de lumière : avec un vrai miroir, environ 5 à 8 %. Ici, on a exagéré la perte : plus une copie a subi de reflets, plus elle est sombre.' },
  ],
  rotation: 'recreer',
});
