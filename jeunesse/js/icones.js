/* Fascinations Labo — les icônes : traits arrondis sur une grille de 24, une seule couleur (currentColor).
   FJ.icone(nom) renvoie un <svg>. Les outils des machines y sont reliés par FJ.iconeOutil(id). */
(function () {
  const FJ = (window.FJ = window.FJ || {});
  const P = {
    carte: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
    prec: '<path d="M15 5l-7 7 7 7"/>',
    suiv: '<path d="M9 5l7 7-7 7"/>',
    sonOn: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
    sonOff: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    lecture: '<path d="M7 4l13 8-13 8z"/>',
    photo: '<path d="M3 8h4l2-3h6l2 3h4v11H3z"/><circle cx="12" cy="13" r="3.5"/>',
    pourquoi: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.6 2.6 0 1 1 3.7 2.4c-.8.4-1.2 1-1.2 1.8v.6"/><path d="M12 17.2v.1"/>',
    bidouiller: '<path d="M5 4v6M5 14v6M12 4v2M12 10v10M19 4v10M19 18v2"/><circle cx="5" cy="12" r="2"/><circle cx="12" cy="8" r="2"/><circle cx="19" cy="16" r="2"/>',
    encore: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01"/>',
    spectacle: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    fermer: '<path d="M6 6l12 12M18 6L6 18"/>',
    labo: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M7.5 15h9"/>',
    recommencer: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/>',
    epingle: '<path d="M9 4h6l-1 6 3 3H7l3-3z"/><path d="M12 13v7"/>',
    carnet: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11M9 8h6"/>',
    tortue: '<path d="M4 15c0-4 3.5-7 8-7s8 3 8 7z"/><path d="M20 13h2M6 15l-1 3M18 15l1 3M9 9l1.5 6M15 9l-1.5 6"/>',
    lievre: '<path d="M5 18c0-4 3-7 7-7h3l4 4-2 3z"/><path d="M14 11l-1-6M16.5 11.5l1-6"/><path d="M8 18l-1 2"/>',
    marche: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    main: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11.5V4a1.5 1.5 0 0 1 3 0v8M14 11V5.5a1.5 1.5 0 0 1 3 0V14c0 4-2.5 7-6 7-2.5 0-4-1.5-5.5-4L4 13.5a1.5 1.5 0 0 1 2.5-1.6L8 14"/>',
    // les gestes
    oeil: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    gomme: '<path d="M4 15l9-9 7 7-7 7H8z"/><path d="M8.5 10.5l7 7M8 20h12"/>',
    tourner: '<path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M20 4v5h-5"/>',
    doigt: '<path d="M9 13V4.5a1.5 1.5 0 0 1 3 0V11l5.2 1.1A2 2 0 0 1 19 14l-.8 5a2 2 0 0 1-2 1.7H11a2 2 0 0 1-1.6-.8L5.6 15a1.5 1.5 0 0 1 2.2-2z"/>',
    vent: '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/>',
    secouer: '<path d="M3 12l3-4 3 8 3-8 3 8 3-8 3 4"/>',
    pincee: '<path d="M7 4h10l-1.5 5h-7z"/><path d="M8 13h.01M12 12h.01M16 13h.01M10 16h.01M14 16h.01M12 19h.01"/>',
    goutte: '<path d="M12 3s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12z"/>',
    graines: '<ellipse cx="8" cy="9" rx="2.5" ry="3.5" transform="rotate(-25 8 9)"/><ellipse cx="16" cy="9" rx="2.5" ry="3.5" transform="rotate(25 16 9)"/><ellipse cx="12" cy="16.5" rx="2.5" ry="3.5"/>',
    spirale: '<path d="M12 12a1.5 1.5 0 1 1 1.5-1.5A3.5 3.5 0 1 1 9 14a5.5 5.5 0 1 1 9-5 7.5 7.5 0 1 1-12.5 6"/>',
    pousse: '<path d="M12 21v-9"/><path d="M12 12c0-4 3-7 8-7 0 4-3 7-8 7z"/><path d="M12 14C12 10.5 9.5 8 5 8c0 3.5 2.5 6 7 6z"/>',
    ciseaux: '<circle cx="6" cy="7" r="3"/><circle cx="6" cy="17" r="3"/><path d="M8.5 8.5L20 18M8.5 15.5L20 6"/>',
    lampe: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z"/>',
    torche: '<path d="M4 15l6-6 5 5-6 6z"/><path d="M15 4l5 5M13 6l5 5M17 3l1-1M21 7l1-1"/>',
    etincelles: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><path d="M12 9l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/>',
    oiseau: '<path d="M2 9c4 0 6 2 7 5 2-4 6-7 13-7-4 2-6 5-7 9-3 3-8 3-11 0"/>',
    bloc: '<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M4 14.5h16M10 9v5.5M14 14.5V20"/><path d="M7 9l2-4h6l2 4"/>',
    nuage: '<path d="M7 17h10a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.7 1.5A3.3 3.3 0 0 0 7 17z"/>',
    pluie: '<path d="M7 13h10a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.7 1.5A3.3 3.3 0 0 0 7 13z"/><path d="M8 16l-1 3M12 16l-1 3M16 16l-1 3"/>',
    insecte: '<ellipse cx="12" cy="14" rx="3.5" ry="5"/><path d="M12 9V7M10 6l-2-2M14 6l2-2M8.5 12L4 10M8.5 15L4 17M15.5 12L20 10M15.5 15L20 17"/>',
    pinceau: '<path d="M14 4l6 6-8 8-6-6z"/><path d="M6 12c-2 2-3 5-3 8 3 0 6-1 8-3"/>',
    crayon: '<path d="M4 20l1-5L16 4l4 4L9 19z"/><path d="M14 6l4 4"/>',
    verser: '<path d="M4 6h9l-1 9H5z"/><path d="M13 9l4 1-1 3M8 18c0 2 1 3 1 3M11 18c0 2 1 3 1 3"/><path d="M15 20h6"/>',
    eclair: '<path d="M13 2L5 13h6l-2 9 9-12h-6z"/>',
    paratonnerre: '<path d="M12 3v18M9 21h6M12 3l-2 3M12 3l2 3"/><path d="M17 6l-2 4h3l-2 4"/>',
    soleil: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>',
    flamme: '<path d="M12 22a7 7 0 0 0 7-7c0-5-5-6-4-12-4 2-7 6-7 10a3 3 0 0 1-2-3c-1 1.5-1 3-1 5a7 7 0 0 0 7 7z"/>',
    flocon: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7"/><path d="M9 4l3 2 3-2M9 20l3-2 3 2"/>',
    onde: '<path d="M2 12c2-6 4-6 6 0s4 6 6 0 4-6 6 0 2 3 2 3"/>',
    zoomPlus: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21M10.5 7.5v6M7.5 10.5h6"/>',
    zoomMoins: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21M7.5 10.5h6"/>',
    planete: '<circle cx="12" cy="12" r="5"/><path d="M3.5 15.5c-1.5 2 0 3.5 4 2.5S17 14.5 19.5 11s1-5.5-3-3.5"/>',
    fusee: '<path d="M12 2c3 2 5 6 5 11l-2 3H9l-2-3c0-5 2-9 5-11z"/><circle cx="12" cy="9" r="1.8"/><path d="M9 16l-3 4M15 16l3 4M12 17v4"/>',
    bulle: '<circle cx="12" cy="12" r="8"/><path d="M8 9a4 4 0 0 1 4-3"/>',
    eclate: '<path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3"/>',
    ecarter: '<path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/>',
    corde: '<path d="M6 3v18M18 3v18"/><path d="M6 12c3-3 9 3 12 0"/>',
    lancer: '<circle cx="6" cy="18" r="2"/><path d="M8 16L19 5M13 5h6v6"/>',
    courant: '<path d="M3 8h13l-3-3M21 16H8l3 3"/>',
    feuille: '<path d="M5 19c0-9 6-15 15-15 0 9-6 15-15 15z"/><path d="M5 19L14 10"/>',
    rateau: '<path d="M12 21V9M5 9h14M6 9v4M10 9v4M14 9v4M18 9v4"/>',
    amibe: '<path d="M6 12c-3-2 0-7 3-5 1-4 7-4 7 0 4-1 6 4 3 6 3 3-1 7-4 5-2 3-7 2-7-1-3 0-5-3-2-5z"/>',
    motif: '<circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="7" r="2.5"/><circle cx="7" cy="17" r="2.5"/><circle cx="17" cy="17" r="2.5"/><circle cx="12" cy="12" r="2.5"/>',
    mur: '<path d="M3 5h18v14H3z"/><path d="M3 10h18M3 15h18M9 5v5M15 10v5M9 15v4"/>',
    mains: '<path d="M4 12l3-3M5 16l4-4M9 20l4-4M20 12l-3-3M19 16l-4-4"/><path d="M12 3v5"/>',
    pierre: '<path d="M4 17l2-7 6-4 6 3 2 8z"/>',
    cible: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 12h.01"/>',
    loupe: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    ombre: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>',
  };
  // l'outil d'une machine → son icône (les fiches peuvent préciser)
  const OUTIL = {
    observer: 'oeil', regarder: 'oeil', reveler: 'oeil', gomme: 'gomme', effacer: 'gomme', tourner: 'tourner',
    toucher: 'doigt', doigt: 'doigt', exciter: 'doigt', manipuler: 'doigt', glisser: 'doigt', guider: 'doigt',
    souffle: 'vent', souffler: 'vent', secouer: 'secouer', perturber: 'secouer', sel: 'pincee', chimie: 'pincee',
    eau: 'goutte', goutte: 'goutte', arroser: 'goutte', nourrir: 'graines', nourriture: 'graines', avoine: 'graines',
    remuer: 'spirale', semer: 'pousse', germe: 'flocon', couper: 'ciseaux', cicatrice: 'ciseaux', signal: 'lampe',
    torche: 'torche', lampe: 'lampe', lumiere: 'soleil', lacher: 'etincelles', nuee: 'oiseau', effrayer: 'mains',
    faucon: 'oiseau', poser: 'bloc', pierre: 'pierre', obstacle: 'bloc', mur: 'mur', murs: 'mur', pluie: 'pluie',
    mouche: 'insecte', encre: 'pinceau', verser: 'verser', eclair: 'eclair', paratonnerre: 'paratonnerre',
    soleil: 'soleil', chaleur: 'flamme', chauffer: 'flamme', froid: 'flocon', refroidir: 'flocon', greffer: 'pinceau',
    motif: 'motif', dessiner: 'crayon', sculpter: 'crayon', tracer: 'crayon', frequence: 'onde', plonger: 'zoomPlus',
    reculer: 'zoomMoins', astre: 'planete', piloter: 'fusee', accelerer: 'fusee', eclater: 'eclate', ecarter: 'ecarter',
    pincer: 'corde', flageolet: 'corde', etouffer: 'main', lancer: 'lancer', courant: 'courant', feuille: 'feuille',
    gratter: 'rateau', ombrer: 'ombre', physarum: 'amibe', lycogala: 'amibe', stemonitis: 'amibe',
  };
  FJ.ICONES = P;
  FJ.icone = (nom, cls) => {
    const d = P[nom] || P.cible;
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
    s.setAttribute('class', 'ic' + (cls ? ' ' + cls : ''));
    s.innerHTML = d;
    return s;
  };
  FJ.iconeOutil = (id) => OUTIL[id] || 'doigt';
})();
