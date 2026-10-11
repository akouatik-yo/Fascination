/* Les Pendules — fiche jeunesse */
FJ.fiche('pendules', {
  nom: 'Les Pendules',
  question: 'Pourquoi des pendules lâchés ensemble dessinent-ils des vagues ?',
  outil: 'tourner',
  scenes: {
    vague: { nom: 'La vague de pendules', via: 'scenes/vague de pendules', poids: 3, outil: 'tourner', outils: ['tourner', 'toucher'], actions: 'vague',
      exposes: ['pendules', 'duree', 'vue'],
      // la machine ne replace pas sa caméra si le « point de vue » ne change pas : on passe d'abord par un autre point de vue
      plages: { 'vague/point de vue': 'face', vue: ['biais', 'biais', 'bout'] },
      essaie: 'Glisse le doigt pour tourner autour des pendules, puis regarde-les d’au-dessus : des serpents apparaissent.' },
    arcs: { nom: 'Les arcs qui rebondissent', via: 'scenes/polyrythmie', poids: 2, outil: 'toucher', outils: ['toucher'], actions: 'arcs',
      exposes: ['arcs', 'arcduree', 'allers', 'trainees'],
      plages: { trainees: 0.8 },
      essaie: 'Regarde les points du bord et ceux du centre : lesquels font le plus d’allers-retours ?' },
  },
  outils: {
    tourner: { verbe: 'Tourne', icone: 'tourner', geste: 'trait', aide: 'Glisse le doigt pour tourner autour de la rangée de pendules et la voir de côté ou d’en haut.' },
    toucher: { verbe: 'Touche', icone: 'doigt', geste: 'tap', aide: 'Touche un pendule ou un arc : il s’illumine, et il sonne si le son est allumé.' },
  },
  leviers: {
    pendules: { chemin: 'vague/pendules', nom: 'Nombre de pendules', bouts: ['8', '24'] },
    duree: { chemin: 'vague/duree du cycle', nom: 'Temps pour se réaligner', bouts: ['20 secondes', '70 secondes'], min: 20, max: 70 },
    vue: { chemin: 'vague/point de vue', nom: 'Point de vue', options: { biais: 'De biais', face: 'Dans l’axe', dessus: 'D’en haut', bout: 'De côté' } },
    arcs: { chemin: 'polyrythmie/arcs', nom: 'Nombre d’arcs', bouts: ['6', '32'] },
    arcduree: { chemin: 'polyrythmie/duree du cycle', nom: 'Temps pour se retrouver', bouts: ['30 secondes', '15 minutes'] },
    allers: { chemin: 'polyrythmie/allers retours de l arc interieur', nom: 'Vitesse des points', bouts: ['lents', 'rapides'] },
    trainees: { chemin: 'polyrythmie/trainees', nom: 'Traînées lumineuses' },
  },
  groupesActions: {
    vague: [
      { chemin: 'vague/relacher ensemble', nom: 'Lâche-les !', icone: 'recommencer' },
      { chemin: 'vague/aller a cycle', nom: 'Moitié du cycle', icone: 'lievre' },
    ],
    arcs: [{ chemin: 'polyrythmie/repartir ensemble', nom: 'Repartir ensemble', icone: 'recommencer' }],
  },
  // les curseurs « nombre » et « durée » ne sont pas tirés au hasard : la machine attend des entiers
  partGraines: 0.5,
  graines: [
    { nom: 'Deux rangées, à la moitié du cycle', scene: 'vague', regle: { 'vague/point de vue': 'bout', vue: 'face', 'vague/aller a cycle': true } },
    { nom: 'Trois serpents, au tiers du cycle', scene: 'vague', regle: { 'vague/point de vue': 'bout', vue: 'dessus', 'vague/': true } },
    { nom: 'Quatre serpents, au quart du cycle', scene: 'vague', regle: { 'vague/point de vue': 'bout', vue: 'dessus', 'vague/+': true } },
    { nom: '24 pendules, réalignés en 1 minute', scene: 'vague', regle: { pendules: 24, duree: 60, 'vague/point de vue': 'bout', vue: 'biais' } },
    { nom: 'Vague express : réalignés en 20 secondes', scene: 'vague', regle: { pendules: 15, duree: 20, 'vague/point de vue': 'bout', vue: 'biais' } },
    { nom: '21 arcs qui se retrouvent au bout de 3 minutes', scene: 'arcs', regle: { arcs: 21, arcduree: 180, allers: 60, trainees: true } },
    { nom: '32 arcs qui se retrouvent au bout de 5 minutes', scene: 'arcs', regle: { arcs: 32, arcduree: 300, allers: 80, trainees: true } },
    { nom: '12 arcs qui se retrouvent au bout de 2 minutes', scene: 'arcs', regle: { arcs: 12, arcduree: 120, allers: 40, trainees: true } },
  ],
  recettes: [
    { nom: 'Vue d’en haut', icone: 'oeil', scene: 'vague', regle: { 'vague/point de vue': 'bout', vue: 'dessus' } },
    { nom: '24 pendules', icone: 'onde', scene: 'vague', regle: { pendules: 24 } },
    { nom: 'Vague express (20 s)', icone: 'lievre', scene: 'vague', regle: { duree: 20 } },
    { nom: 'Trois serpents', icone: 'spirale', scene: 'vague', regle: { 'vague/point de vue': 'bout', vue: 'dessus', 'vague/': true } },
    { nom: '32 arcs', icone: 'cible', scene: 'arcs', regle: { arcs: 32 } },
    { nom: 'Arcs pressés', icone: 'lievre', scene: 'arcs', regle: { arcduree: 60, allers: 80 } },
  ],
  pourquoi: {
    etincelle: 'Chaque pendule a son propre rythme, fixé par sa longueur : en se décalant, ils dessinent des vagues.',
    texte: 'Un pendule qui ne part pas de trop haut met toujours le même temps pour faire un aller-retour. Ce temps ne dépend que de sa longueur : plus il est long, plus il est lent. Son poids n’y change rien. Ce temps s’appelle la **période**.\n\nIci, chaque pendule est un peu plus court que son voisin. En une minute, le plus long fait 51 allers-retours, le suivant 52, puis 53… Lâchés ensemble, ils se décalent peu à peu : vagues, serpents, deux rangées. Au bout d’une minute, tous se retrouvent alignés. Dans la machine, les pendules sont parfaits : sans frottement, ils ne s’arrêtent jamais.',
    vraie: 'On raconte que le jeune Galilée, dans la cathédrale de Pise, a regardé un lustre se balancer en comptant les battements de son pouls. Grands ou petits, les balancements duraient le même temps. C’est peut-être une légende, mais Galilée a vraiment étudié les pendules toute sa vie.',
  },
  etsi: [
    { id: 'moitie', scene: 'vague', question: 'Et si on regardait les pendules à la moitié du cycle ?',
      choix: ['Deux rangées opposées', 'Tous alignés', 'Un désordre complet'], bonne: 0,
      prepare: { scene: 'vague', regle: { 'vague/point de vue': 'bout', vue: 'face' }, action: 'vague/aller a cycle' }, regarde: 'Regarde bien les boules…', attente: 4,
      revele: 'Deux rangées ! À la moitié du cycle, chaque pendule a fait un demi-aller-retour de plus que son voisin. Quand l’un est à droite, son voisin est à gauche. Au tiers du cycle, on voit trois serpents ; à la fin, tous se réalignent. Chacun garde simplement sa propre **période**.' },
  ],
  rotation: 'recreer',
});
