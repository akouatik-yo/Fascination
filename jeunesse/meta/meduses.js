/* Les Abysses — fiche jeunesse */
FJ.fiche('meduses', {
  nom: 'Les Abysses',
  question: 'Pourquoi tant d’animaux des profondeurs brillent-ils dans le noir ?',
  outil: 'toucher',
  scenes: {
    portraits: { nom: 'Portraits', via: 'scenes/portraits', poids: 3, outil: 'toucher', actions: 'portrait',
      exposes: ['creature', 'lampe', 'lueur', 'halo'],
      plages: { creature: ['atolla', 'periphylla', 'pelagia', 'aequorea', 'beroe', 'praya', 'pyrosoma'], diaporama: true, lampe: false, lueur: [0.35, 0.8], halo: [0.6, 1.3] },
      essaie: 'Effleure la créature du doigt : sa lumière s’allume. Puis éclaire-la avec la lampe.' },
    descente: { nom: 'La descente', via: 'scenes/la descente', poids: 2, outil: 'toucher', actions: 'descente',
      exposes: ['profondeur', 'descendre', 'lampe', 'lueur'],
      // la profondeur coupe la descente automatique, qu'on relance ensuite
      plages: { profondeur: [150, 2200], descendre: true, lampe: false, lueur: [0.35, 0.8], halo: [0.6, 1.2] },
      essaie: 'Laisse-toi descendre, et touche les créatures que tu croises pour voir leur lumière.' },
  },
  outils: {
    observer: { verbe: 'Regarde', icone: 'loupe', geste: 'tap', aide: 'Touche une créature : tu sauras son nom, à quelle profondeur elle vit et comment elle brille.' },
    toucher: { verbe: 'Effleure', icone: 'doigt', geste: 'tap', aide: 'Effleure une créature du doigt : quand on la dérange, elle s’allume. Cette lumière peut effrayer un attaquant.' },
    lampe: { verbe: 'Éclaire', icone: 'torche', geste: 'tap', aide: 'Garde le doigt posé : la lampe du plongeur montre les vraies couleurs, et la lumière vivante se voit moins.' },
    courant: { verbe: 'Remue', icone: 'courant', geste: 'trait', aide: 'Glisse le doigt pour pousser l’eau : les tentacules ondulent et suivent le courant que tu fais.' },
  },
  leviers: {
    creature: { chemin: 'portrait/creature', nom: 'Créature',
      options: { atolla: 'Méduse couronne', periphylla: 'Méduse casquée', pelagia: 'Pélagie', aequorea: 'Méduse cristal', beroe: 'Béroé', praya: 'Siphonophore géant', pyrosoma: 'Pyrosome' } },
    diaporama: { chemin: 'portrait/diaporama une creature toutes les 45 s', nom: 'Une nouvelle créature toutes les 45 s' },
    lampe: { chemin: 'lumiere/lampe du plongeur vraies couleurs', nom: 'Lampe du plongeur' },
    lueur: { chemin: 'lumiere/lueur ambiante', nom: 'Lueur de l’eau', bouts: ['noir total', 'eau éclairée'] },
    halo: { chemin: 'lumiere/halo', nom: 'Halo autour des lumières', bouts: ['aucun', 'fort'] },
    profondeur: { chemin: 'descente/profondeur+', nom: 'Profondeur', bouts: ['surface', '4 500 m'] },
    descendre: { chemin: 'descente/descendre tout seul', nom: 'Descendre tout seul' },
  },
  exposes: ['creature', 'lampe', 'lueur', 'halo'],
  groupesActions: {
    portrait: [
      { chemin: 'portrait/allumer sa lumiere', nom: 'Allume !', icone: 'etincelles' },
      { chemin: 'portrait/suivante', nom: 'Une autre', icone: 'suiv' },
    ],
    descente: [{ chemin: 'descente/remonter a la surface', nom: 'Remonter', icone: 'fusee' }],
  },
  plages: {},
  partGraines: 0.3,
  graines: [
    { nom: 'La méduse couronne sous la lampe du plongeur', scene: 'portraits', regle: { creature: 'atolla', diaporama: false, lampe: true, lueur: 0.5 } },
    { nom: 'La méduse cristal, dont la protéine verte a valu un prix Nobel', scene: 'portraits', regle: { creature: 'aequorea', diaporama: false, lampe: false, lueur: 0.5 } },
    { nom: 'Le pyrosome, « corps de feu »', scene: 'portraits', regle: { creature: 'pyrosoma', diaporama: false, lampe: false, lueur: 0.5 } },
    { nom: 'À 1 500 m, là où le soleil n’arrive plus', scene: 'descente', regle: { profondeur: 1500, descendre: false, lampe: false, lueur: 0.6 } },
  ],
  recettes: [
    { nom: 'Lampe allumée', icone: 'torche', regle: { lampe: true } },
    { nom: 'Noir total', icone: 'ombre', regle: { lampe: false, lueur: 0, halo: 1.4 } },
    { nom: 'La méduse couronne', icone: 'etincelles', scene: 'portraits', regle: { creature: 'atolla', diaporama: false } },
    { nom: 'Le siphonophore géant', icone: 'corde', scene: 'portraits', regle: { creature: 'praya', diaporama: false } },
    { nom: 'Plonger depuis 1 000 m', icone: 'courant', scene: 'descente', regle: { profondeur: 1000, descendre: true } },
  ],
  pourquoi: {
    etincelle: 'Au fond de la mer, la lumière du soleil n’arrive plus : la seule lumière vient des animaux eux-mêmes.',
    texte: 'Plus on descend, plus la lumière du soleil faiblit ; vers 1 000 mètres, il n’en reste rien. Pourtant, les profondeurs scintillent : environ trois animaux sur quatre y fabriquent leur propre lumière, grâce à une réaction chimique. C’est la **bioluminescence**. Elle est presque toujours bleue, car le bleu voyage le plus loin dans l’eau.\n\nCette lumière sert à attirer une proie, à trouver un partenaire, à effrayer un attaquant, ou à se cacher : un ventre éclairé efface la silhouette vue d’en dessous. Beaucoup d’animaux des profondeurs ont des yeux très sensibles. Ici, les créatures sont un peu grossies et plus actives qu’en vrai.',
    vraie: 'En 2012, au large du Japon, la biologiste Edith Widder installe une fausse méduse lumineuse, l’« e-jelly ». Elle imite la roue de lumière bleue de la méduse couronne. Un calmar géant s’en approche : c’est l’une des toutes premières vidéos de cet animal vivant dans les profondeurs.',
  },
  etsi: [
    { id: 'rouge', scene: 'portraits', question: 'Et si on éclairait la méduse couronne avec une lampe, de quelle couleur serait-elle ?',
      choix: ['Bleue', 'Rouge', 'Transparente'], bonne: 1,
      prepare: { scene: 'portraits', regle: { creature: 'atolla', diaporama: false, lampe: true, lueur: 0.5 } }, attente: 5,
      revele: 'Rouge ! La lumière rouge du soleil est absorbée par l’eau dès les premières dizaines de mètres. En profondeur, sans lumière rouge, un animal rouge paraît noir : il est invisible. Seule une lampe révèle sa vraie couleur. Ici, l’eau est un peu éclairée pour qu’on voie les animaux : mets la lueur de l’eau à zéro pour le vrai noir.' },
  ],
  rotation: 'recreer',
});
