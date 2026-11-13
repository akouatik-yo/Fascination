/* La Danse des abeilles — fiche jeunesse (chapitres de la question « Comment les insectes se parlent-ils ? ») */
FJ.fiche('abeilles', {
  nom: 'La Danse des abeilles',
  question: 'Comment une abeille dit-elle où sont les fleurs ?',
  outil: 'fleurs',
  scenes: {
    fretillante: { nom: 'La danse frétillante', via: 'scenes/la danse fretillante', poids: 3, outil: 'fleurs',
      essaie: 'Touche la carte pour déplacer les fleurs, puis regarde la course de la danseuse tourner.' },
    ronde: { nom: 'La danse en rond', via: 'scenes/la danse en rond', poids: 1, outil: 'fleurs',
      essaie: 'Éloigne les fleurs à plus de cent mètres : la danse en rond devient un huit.' },
    journee: { nom: 'Toute une journée', via: 'scenes/toute une journee', poids: 2, outil: 'observer',
      essaie: 'Les fleurs ne bougent pas, mais le soleil si : regarde la danse tourner avec lui.' },
  },
  outils: {
    fleurs: { verbe: 'Place', icone: 'feuille', geste: 'tap', aide: 'Touche la carte du dehors pour y mettre le champ de fleurs : la danse change d’angle et de durée.' },
    observer: { verbe: 'Regarde', icone: 'loupe', geste: 'tap', aide: 'Touche une abeille pour savoir ce qu’elle fait, ou une cellule pour voir ce qu’elle contient.' },
  },
  leviers: {
    distance: { chemin: 'les fleurs/distance', nom: 'Loin des fleurs', bouts: ['tout près', '5 km'] },
    direction: { chemin: 'les fleurs/direction depuis la ruche', nom: 'Direction des fleurs', bouts: ['nord', 'tout le tour'] },
    heure: { chemin: 'les fleurs/heure', nom: 'Heure de la journée', bouts: ['6 h', '20 h'] },
    temps: { chemin: 'les fleurs/le temps passe', nom: 'Le soleil avance' },
    spk: { chemin: 'la danse/secondes de fretillement par kilometre', nom: 'Frétillement par kilomètre', bouts: ['court', 'long'] },
    trace: { chemin: 'la danse/montrer la trace', nom: 'Montrer la trace' },
    angles: { chemin: 'la danse/montrer les angles', nom: 'Montrer les angles' },
  },
  exposes: ['distance', 'direction', 'angles'],
  plages: { distance: [0.3, 3], direction: [0, 359], heure: [8, 18], angles: true },
  recettes: [
    { nom: 'Fleurs au soleil', icone: 'soleil', scene: 'fretillante', regle: { heure: 13, direction: 180, distance: 1, angles: true } },
    { nom: 'Fleurs juste à côté', icone: 'feuille', scene: 'ronde', regle: { distance: 0.05 } },
    { nom: 'Un long voyage', icone: 'oiseau', scene: 'fretillante', regle: { distance: 4.5, trace: true } },
  ],
  pourquoi: {
    etincelle: 'La danseuse court sur le rayon dans la direction des fleurs par rapport au soleil, et frétille plus longtemps si elles sont loin.',
    petit: 'L’abeille danse en courant vers les fleurs. Plus elle frétille longtemps, plus les fleurs sont loin.',
    texte: 'Dans la ruche, il fait noir et le rayon de cire est vertical. La butineuse qui revient fait des huit : dans la partie droite, elle frétille de l’abdomen. L’angle de cette course avec la verticale est le même que l’angle entre les fleurs et le soleil, dehors. La durée du frétillement dit la distance, environ une seconde par kilomètre (la valeur change d’une colonie à l’autre). Si les fleurs sont tout près, elle danse en rond, sans direction.\n\nLes ouvrières la suivent au contact, sentent l’odeur des fleurs sur elle, puis s’envolent dans la bonne direction, avec une petite erreur. Le zoologiste Karl von Frisch a décodé cette **danse frétillante** ; il a reçu le prix Nobel en 1973.',
    vraie: 'Pour vérifier que les abeilles suivent bien la danse, des chercheurs ont collé un minuscule répondeur radar sur le dos de recrues, en 2005 : elles partaient bien dans la direction dansée, puis cherchaient autour.',
  },
  rotation: 'recreer',
});
