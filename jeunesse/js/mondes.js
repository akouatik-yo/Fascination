/* Fascinations Labo — les sept mondes de la Carte : chacun porte une idée qui voyage d'une machine à l'autre. */
(function () {
  const FJ = (window.FJ = window.FJ || {});
  FJ.MONDES = [
    { id: 'personne', nom: 'Personne ne commande', idee: 'Des milliers d’individus, aucun chef… et pourtant ça s’organise.', couleur: '#7ee8a9', icone: 'oiseau',
      machines: ['boids', 'lucioles', 'fourmis', 'blob', 'mycelium', 'vie'] },
    { id: 'dessine', nom: 'La nature dessine', idee: 'Taches, spirales, flocons : des motifs que personne n’a dessinés.', couleur: '#c9a0ff', icone: 'flocon',
      machines: ['rd', 'spirales', 'cristal', 'sable', 'lave', 'fractal'] },
    { id: 'imprevisible', nom: 'Imprévisible', idee: 'Des lois simples, et pourtant impossible de prévoir la suite.', couleur: '#ff9a5c', icone: 'flamme',
      machines: ['attracteur', 'fluide', 'feu', 'eau', 'foudre'] },
    { id: 'son', nom: 'Voir le son', idee: 'Un son, c’est une vibration. Ici, on la voit.', couleur: '#ff86c8', icone: 'onde',
      machines: ['chladni', 'viz', 'harpe', 'pendules', 'harmono'] },
    { id: 'lumiere', nom: 'Secrets de lumière', idee: 'Bleu du ciel, arc-en-ciel, bulles irisées : d’où viennent les couleurs ?', couleur: '#ffd36e', icone: 'soleil',
      machines: ['ciel', 'bulles', 'meduses', 'kaleido'] },
    { id: 'cerveau', nom: 'Ton cerveau se fait avoir', idee: 'Tes yeux et tes oreilles ne disent pas toujours la vérité.', couleur: '#6fd4ff', icone: 'oeil',
      machines: ['illusions', 'sonillus', 'moire'] },
    { id: 'limites', nom: 'Aux limites du monde', idee: 'Trop petit, trop loin, trop vite : là où le monde devient étrange.', couleur: '#8fa2ff', icone: 'planete',
      machines: ['quantique', 'galaxie', 'tunnel'] },
  ];
  FJ.mondeDe = (id) => FJ.MONDES.find((m) => m.machines.includes(id)) || FJ.MONDES[0];
})();
