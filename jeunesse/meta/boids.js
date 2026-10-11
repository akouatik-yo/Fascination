/* La Murmuration — fiche jeunesse */
FJ.fiche('boids', {
  nom: 'La Murmuration',
  question: 'Qui commande une nuée de milliers d’oiseaux ?',
  outil: 'faucon',
  scenes: {
    marais: { nom: 'Étourneaux au marais', via: { choix: 'lieu/espece et paysage', valeur: 'marais' }, poids: 3, outil: 'faucon', actions: 'marais',
      essaie: 'Lance le faucon au cœur de la nuée, et regarde la vague sombre qui la traverse.' },
    estran: { nom: 'Bécasseaux à la plage', via: { choix: 'lieu/espece et paysage', valeur: 'estran' }, poids: 2, outil: 'effrayer', actions: 'estran',
      essaie: 'Effraie un bout de la nuée : à chaque virage, les ventres blancs brillent d’un coup.' },
  },
  outils: {
    guider: { verbe: 'Guide', geste: 'trait', aide: 'Glisse le doigt dans le ciel : la nuée suit ton doigt, puis reprend peu à peu sa propre route.' },
    effrayer: { verbe: 'Effraie', aide: 'Touche la nuée, comme si tu tapais dans tes mains : les oiseaux touchés virent, et leurs voisins aussi.' },
    faucon: { verbe: 'Attaque', aide: 'Touche la nuée : le faucon pèlerin pique vers un oiseau proche de ton doigt. Regarde la panique se propager.' },
    nuee: { verbe: 'Lâche', geste: 'trait', aide: 'Touche ou glisse dans le ciel pour lâcher de nouveaux oiseaux : ils rejoignent vite la nuée.' },
  },
  leviers: {
    ensemble: { chemin: 'regles de la nuee/cohesion', nom: 'Rester ensemble', bouts: ['chacun pour soi', 'collés'] },
    direction: { chemin: 'regles de la nuee/alignement', nom: 'Voler dans le même sens', bouts: ['n’importe où', 'tous pareil'] },
    distance: { chemin: 'regles de la nuee/separation', nom: 'Garder ses distances', bouts: ['serrés', 'écartés'] },
    voisins: { chemin: 'regles de la nuee/voisins suivis', nom: 'Voisins regardés', bouts: ['un seul', 'vingt-quatre'] },
    vitesse: { chemin: 'regles de la nuee/vitesse de vol', nom: 'Vitesse de vol', bouts: ['lente', 'rapide'] },
    nombre: { chemin: 'la nuee/nombre d oiseaux', nom: 'Nombre d’oiseaux', bouts: ['aucun', 'neuf mille'] },
    heure: { chemin: 'le soir/heure', nom: 'Heure du soir', bouts: ['fin d’après-midi', 'nuit'] },
    temps: { chemin: 'le soir/le temps passe le soleil se couche', nom: 'Le soleil se couche' },
    faucon: { chemin: 'faucon pelerin/un faucon chasse ici', nom: 'Un faucon chasse ici' },
    rendu: { chemin: 'affichage/rendu', nom: 'Couleurs', options: { reel: 'Vraies couleurs', neon: 'Néon' } },
    trainees: { chemin: 'affichage/trainees de vol', nom: 'Traînées de vol' },
  },
  exposes: ['ensemble', 'direction', 'voisins', 'heure'],
  groupesActions: {
    marais: [
      { chemin: 'faucon pelerin/lancer une attaque', nom: 'Le faucon attaque !', icone: 'faucon' },
      { chemin: 'le soir/au dortoir dans les roseaux', nom: 'Au dortoir !', icone: 'feuille' },
    ],
    estran: [
      { chemin: 'faucon pelerin/lancer une attaque', nom: 'Le faucon attaque !', icone: 'faucon' },
    ],
  },
  plages: {
    ensemble: [0.7, 1.6], direction: [0.75, 1.6], distance: [0.7, 1.4], voisins: [5, 12],
    heure: [0, 0.6], faucon: true, temps: true, trainees: 0.15, rendu: ['reel', 'reel', 'reel', 'reel', 'neon'],
  },
  partGraines: 0.25,
  graines: [
    { nom: 'Le soir tombe sur le marais', scene: 'marais', regle: { heure: 0.72, temps: true, faucon: true } },
    { nom: 'Bécasseaux variables au coucher du soleil', scene: 'estran', regle: { heure: 0.5, temps: true } },
    { nom: 'Un faucon pèlerin rôde au-dessus de la nuée', scene: 'marais', regle: { faucon: true, heure: 0.3 } },
  ],
  recettes: [
    { nom: 'Chacun pour soi', icone: 'secouer', regle: { ensemble: 0, direction: 0 } },
    { nom: 'Serrés comme jamais', icone: 'mains', regle: { ensemble: 2.6, distance: 0.4 } },
    { nom: 'Un seul voisin', icone: 'oeil', regle: { voisins: 1 } },
    { nom: 'Ballet très rapide', icone: 'lievre', regle: { vitesse: 1.5, direction: 1.8 } },
    { nom: 'Traînées de néon', icone: 'etincelles', regle: { rendu: 'neon', trainees: true } },
    { nom: 'Retour au naturel', icone: 'feuille', regle: { ensemble: 1, direction: 1, distance: 1, voisins: 7, vitesse: 1 } },
  ],
  pourquoi: {
    etincelle: 'Personne : chaque oiseau imite seulement ses 6 ou 7 voisins, et de proche en proche, des milliers d’oiseaux bougent ensemble.',
    texte: 'Dans la machine, chaque oiseau suit trois règles simples : ne pas heurter ses voisins, voler dans le même sens qu’eux, rester près d’eux. Comme un vrai étourneau, il ne regarde que 6 ou 7 voisins, jamais toute la nuée. Quand l’un vire, ses voisins virent aussi, puis les voisins des voisins. Une forme d’ensemble naît sans chef ni plan : c’est l’**auto-organisation**.\n\nDans la nature, voler en nuée protège : l’oiseau isolé est une proie facile, alors qu’au cœur de la nuée le faucon a du mal à en viser un seul. Les scientifiques cherchent encore pourquoi les étourneaux dansent si longtemps avant de se poser.',
    vraie: 'Au milieu des années 2000, l’équipe du physicien italien Giorgio Parisi filme des nuées d’étourneaux au-dessus de Rome avec plusieurs caméras à la fois, pour suivre chaque oiseau en 3D. Résultat, publié en 2008 : chacun suit ses 6 ou 7 voisins les plus proches, qu’ils soient près ou loin. Parisi a reçu le prix Nobel de physique en 2021, pour ses travaux sur les systèmes complexes.',
  },
  etsi: [
    { id: 'dortoir', scene: 'marais', question: 'Et si la nuit tombait : où les étourneaux passeraient-ils la nuit ?',
      choix: ['En vol, jusqu’au matin', 'Tous ensemble dans les roseaux', 'Chacun dans un arbre différent'], bonne: 1,
      prepare: { scene: 'marais', regle: { heure: 0.7 }, action: 'le soir/au dortoir dans les roseaux' }, regarde: 'Regarde où plonge la nuée…', attente: 12,
      revele: 'Dans les roseaux, tous ensemble ! La nuée descend en entonnoir et disparaît dans la roselière : c’est le **dortoir**. Serrés par milliers, ils y sont sans doute mieux protégés du froid et des prédateurs. Au matin, ils repartent chercher à manger.' },
  ],
  rotation: 'recreer',
});
