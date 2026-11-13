/* Fascination — FKR, la bibliothèque commune de rendu (« la cabine de projection »)
   Le langage visuel du Feu, mis en commun pour toutes les machines :
   1. FKR.couleur : des couleurs calculées depuis la physique (spectre → table CIE 1931 → sRGB linéaire) :
      corps noir (loi de Planck), raies et bandes d'émission, mélanges de raies, absorption de l'eau, diffusion Rayleigh, étoiles.
   2. FKR.palette : des dégradés tirés de ces couleurs (températures, profondeurs, nébuleuses, aurores…), et des rampes OkLab.
   3. FKR.GLSL / FKR.glsl() : des morceaux de GLSL ES 3.00 (bruits, couleur, tons, lumière, formes, finition),
      compatibles avec FKGL.HEAD (aucun nom en commun avec hash12, vnoise, fbm).
   4. FKR.cabine(env, réglages) : un tampon HDR linéaire où l'on dépose de la lumière (lueurs, traînées, traits, étoiles,
      passes plein écran ou calques 2D), un halo en pyramide (filtre dual, Bjørge 2015), l'éclairage du décor par ses propres
      lumières, puis le tirage : exposition, courbe filmique (Lottes 2016) avec passage au blanc, saturation dans OkLab,
      vignetage naturel en cos⁴, grain et tramage. Le résultat est copié dans env.ctx, comme le fait le Feu.
   5. FKR.cabine2D(env) : le même contrat, en canvas 2D, quand WebGL2 manque ; FKR.cabineOuRepli(env) choisit.
   Toutes les couleurs passées aux fonctions de rendu sont en sRGB LINÉAIRE (pas de gamma), sauf mention « css ».
   Mode d'emploi et langage visuel : docs/RENDU-COMMUN.md. */
(function () {
  'use strict';
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ═══════════════ 1. Couleurs physiques ═══════════════ */

  // fonctions colorimétriques CIE 1931 (observateur 2°), table officielle tous les 10 nm de 380 à 780 nm,
  // interpolée par Catmull-Rom (les approximations analytiques se trompent aux extrémités : 391 nm y devenait cyan)
  const CIE = [
    [0.001368, 0.000039, 0.00645], [0.004243, 0.00012, 0.02005], [0.01431, 0.000396, 0.06785], [0.04351, 0.00121, 0.2074], [0.13438, 0.004, 0.6456],
    [0.2839, 0.0116, 1.3856], [0.34828, 0.023, 1.74706], [0.3362, 0.038, 1.77211], [0.2908, 0.06, 1.6692], [0.19536, 0.09098, 1.28764],
    [0.09564, 0.13902, 0.81295], [0.03201, 0.20802, 0.46518], [0.0049, 0.323, 0.272], [0.0093, 0.503, 0.1582], [0.06327, 0.71, 0.07825],
    [0.1655, 0.862, 0.04216], [0.2904, 0.954, 0.0203], [0.43345, 0.99495, 0.00875], [0.5945, 0.995, 0.0039], [0.7621, 0.952, 0.0021],
    [0.9163, 0.87, 0.00165], [1.0263, 0.757, 0.0011], [1.0622, 0.631, 0.0008], [1.0026, 0.503, 0.00034], [0.85445, 0.381, 0.00019],
    [0.6424, 0.265, 0.00005], [0.4479, 0.175, 0.00002], [0.2835, 0.107, 0], [0.1649, 0.061, 0], [0.0874, 0.032, 0],
    [0.04677, 0.017, 0], [0.0227, 0.00821, 0], [0.011359, 0.004102, 0], [0.00579, 0.002091, 0], [0.002899, 0.001047, 0],
    [0.00144, 0.00052, 0], [0.00069, 0.000249, 0], [0.000332, 0.00012, 0], [0.000166, 0.00006, 0], [0.000083, 0.00003, 0], [0.000042, 0.000015, 0]];
  function cmf(l) {
    if (l < 380 || l > 780) return [0, 0, 0];
    const x = (l - 380) / 10, i = Math.min(39, Math.floor(x)), f = x - i, g = (k) => CIE[clamp(k, 0, 40)];
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2), f2 = f * f, f3 = f2 * f;
    return [0, 1, 2].map((c) => Math.max(0, 0.5 * (2 * p1[c] + (p2[c] - p0[c]) * f + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * f2 + (3 * p1[c] - p0[c] - 3 * p2[c] + p3[c]) * f3)));
  }
  // XYZ → sRGB linéaire (primaires Rec. 709, blanc D65)
  const xyz2rgb = (X, Y, Z) => [3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.204 * Y + 1.057 * Z];
  const luminance = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

  // OkLab (Björn Ottosson, 2020) : un espace où les distances suivent la perception ; sert au gamut et aux rampes
  function oklab(c) {
    const l = Math.cbrt(0.4122214708 * c[0] + 0.5363325363 * c[1] + 0.0514459929 * c[2]);
    const m = Math.cbrt(0.2119034982 * c[0] + 0.6806995451 * c[1] + 0.1073969566 * c[2]);
    const s = Math.cbrt(0.0883024619 * c[0] + 0.2817188376 * c[1] + 0.6299787005 * c[2]);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
  }
  function deOklab(L) {
    const l = (L[0] + 0.3963377774 * L[1] + 0.2158037573 * L[2]) ** 3, m = (L[0] - 0.1055613458 * L[1] - 0.0638541728 * L[2]) ** 3, s = (L[0] - 0.0894841775 * L[1] - 1.291485548 * L[2]) ** 3;
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  }
  // une couleur hors du gamut sRGB (une raie pure, par exemple) : on réduit sa saturation dans OkLab,
  // à teinte et clarté constantes, jusqu'à ce qu'elle soit affichable ; puis on la normalise (max = 1)
  function affichable(rgb) {
    const mx0 = Math.max(rgb[0], rgb[1], rgb[2]);
    if (!(mx0 > 0)) return [0, 0, 0];
    let c = rgb.map((v) => v / mx0);
    // aux extrémités du spectre, les réponses des cônes approchées par OkLab peuvent devenir négatives :
    // on ajoute juste assez de blanc pour qu'elles ne le soient plus (les lignes de la matrice font 1)
    const lmsMin = Math.min(0.4122214708 * c[0] + 0.5363325363 * c[1] + 0.0514459929 * c[2], 0.2119034982 * c[0] + 0.6806995451 * c[1] + 0.1073969566 * c[2], 0.0883024619 * c[0] + 0.2817188376 * c[1] + 0.6299787005 * c[2]);
    if (lmsMin < 0) c = c.map((v) => v - lmsMin * 1.0001);
    if (Math.min(c[0], c[1], c[2]) < 0) {
      const lab = oklab(c);
      let lo = 0, hi = 1;
      for (let i = 0; i < 24; i++) {
        const k = (lo + hi) / 2, t = deOklab([lab[0], lab[1] * k, lab[2] * k]);
        if (Math.min(t[0], t[1], t[2]) >= 0) lo = k; else hi = k;
      }
      c = deOklab([lab[0], lab[1] * lo, lab[2] * lo]).map((v) => Math.max(0, v));
    }
    const mx = Math.max(c[0], c[1], c[2]) || 1;
    return c.map((v) => v / mx);
  }
  // un spectre quelconque, fn(λ en nm) → puissance relative, intégré de 380 à 780 nm
  // renvoie { rgb (affichable, max = 1), Y (luminance relative), brut (sRGB linéaire non borné) }
  function spectre(fn, pas = 1) {
    let X = 0, Y = 0, Z = 0;
    for (let l = 380; l <= 780; l += pas) { const p = fn(l); if (!p) continue; const c = cmf(l); X += p * c[0]; Y += p * c[1]; Z += p * c[2]; }
    const brut = xyz2rgb(X * pas, Y * pas, Z * pas);
    return { rgb: affichable(brut), Y: Y * pas, brut };
  }
  // loi de Planck : luminance énergétique spectrale (unités arbitraires), λ en nm, T en kelvins
  const planckL = (l, T) => { const m = l * 1e-9; return 1 / (Math.pow(m, 5) * (Math.exp(0.0143877735 / (m * T)) - 1)) * 1e-30; };
  const memo = (f) => { const M = new Map(); return (k) => { let v = M.get(k); if (v === undefined) { v = f(k); M.set(k, v); } return v; }; };
  // couleur d'un corps noir (max = 1), exacte (intégration Planck × CIE) ; 6 500 K ≈ blanc D65
  const corpsNoir = memo((T) => spectre((l) => planckL(l, T), 2).rgb);
  // luminance d'un corps noir relative à celle d'un corps noir à 1 000 K (×2 900 à 1 500 K, ×170 000 à 2 000 K)
  const Y1000 = spectre((l) => planckL(l, 1000), 2).Y;
  const eclatCorpsNoir = memo((T) => spectre((l) => planckL(l, T), 2).Y / Y1000);

  // raies d'émission utiles (nm, dans l'air) ; les rapports d'intensité sont ceux des nébuleuses et des lampes
  const RAIES = {
    Ha: 656.28, Hb: 486.13, Hg: 434.05, Hd: 410.17,               // série de Balmer de l'hydrogène
    HeI: 587.56, HeI2: 667.82, HeI3: 501.57, HeI4: 447.15,        // hélium
    OIII: 500.68, OIII2: 495.89, OI: 557.73, OI2: 630.03, OI3: 636.38, // oxygène (raies « interdites » des nébuleuses et des aurores)
    NII: 658.35, NII2: 654.8, N2p: 427.81, N2p2: 391.44,          // azote, et ion N₂⁺ (bas des aurores)
    SII: 671.65, SII2: 673.08,                                    // soufre
    NaD2: 588.995, NaD1: 589.592,                                 // sodium (doublet D)
    Hg1: 404.66, Hg2: 435.83, Hg3: 546.07, Hg4: 576.96, Hg5: 579.07, // mercure
    Li: 670.78, K: 766.49, Ca: 422.67, Sr: 460.73, Ba: 553.55, Cu: 521.82,
  };
  // mélanges de raies : [[λ nm, intensité énergétique relative], …]
  const MELANGES = {
    // hydrogène ionisé (régions H II), décrément de Balmer « cas B » à 10 000 K : Hα/Hβ = 2,86 ; Hγ/Hβ = 0,47 ; Hδ/Hβ = 0,26
    hydrogene: [[656.28, 2.86], [486.13, 1], [434.05, 0.47], [410.17, 0.26]],
    // [O III] : le rapport 5007/4959 vaut 3 (physique atomique) ; le turquoise des nébuleuses planétaires
    oxygene3: [[500.68, 3], [495.89, 1]],
    // [N II] 6584/6548 ≈ 3 ; [S II] doublet ≈ 1:1
    azote2: [[658.35, 3], [654.8, 1]],
    soufre2: [[671.65, 1], [673.08, 1]],
    sodium: [[588.995, 2], [589.592, 1]],
    // lampe à vapeur de mercure basse pression (raies visibles, intensités approchées)
    mercure: [[404.66, 0.35], [435.83, 1], [546.07, 0.9], [576.96, 0.18], [579.07, 0.2]],
    // néon (enseignes) : surtout des raies orange et rouges (intensités approchées)
    neon: [[540.06, 0.08], [585.25, 1], [588.19, 0.4], [594.48, 0.45], [597.55, 0.2], [603.0, 0.25], [607.43, 0.35], [609.62, 0.45], [614.31, 0.6], [616.36, 0.3], [621.73, 0.25], [626.65, 0.45], [633.44, 0.6], [638.3, 0.65], [640.22, 0.9], [650.65, 0.45], [659.9, 0.3], [667.83, 0.3], [692.95, 0.6], [703.24, 0.7]],
    // aurores : vert de l'oxygène atomique (100–200 km), rouge au-dessus, bleu-violet de N₂⁺ en bas
    aurore_verte: [[557.73, 1]],
    aurore_rouge: [[630.03, 3], [636.38, 1]],
    aurore_bleue: [[427.81, 1], [391.44, 1.6]],
    // éclair : le canal (≈ 30 000 K) émet surtout les raies de l'azote ionisé, plus Hα (intensités approchées, d'après Orville 1968)
    eclair: [[463.05, 0.6], [500.15, 0.7], [500.52, 0.9], [567.6, 0.7], [568.0, 0.8], [594.17, 0.4], [656.28, 0.9], [444.7, 0.4], [399.5, 0.5]],
  };
  // bandes larges (bioluminescence) : pic et largeur à mi-hauteur en nm (valeurs typiques, arrondies)
  const BANDES = {
    luciole: [562, 70],        // luciférase de Photinus pyralis (jaune-vert)
    luciole_verte: [552, 65],  // lucioles du genre Photuris
    ver_rouge: [622, 70],      // « ver de chemin de fer » (Phrixothrix), rare luciférase rouge
    mer: [475, 75],            // dinoflagellés (Lingulodinium, Noctiluca) : le bleu des vagues la nuit
    aequorine: [469, 75],      // méduse Aequorea victoria
    gfp: [509, 30],            // protéine fluorescente verte de la même méduse
    champignon: [525, 75],     // Mycena, Armillaria, Omphalotus : le « bois pourri qui brille »
    lanterne: [470, 50],       // photophores des poissons-lanternes (Myctophidae)
    dragon_rouge: [705, 35],   // poisson-dragon Malacosteus : un projecteur rouge, invisible pour ses proies
    phosphore: [527, 70],      // luminophore P31 (ZnS:Cu) des oscilloscopes : le vert des traces (≈)
  };
  const gaussSpec = (pic, fwhm) => { const s = fwhm / 2.3548; return (l) => Math.exp(-0.5 * ((l - pic) / s) ** 2); };
  // une raie isolée (largeur de quelques dixièmes de nm : on l'élargit à 1 nm pour l'intégration)
  const raie = memo((nm) => spectre(gaussSpec(nm, 1.2), 0.2).rgb);
  function melange(liste) {
    const fs = liste.map(([nm, w]) => [gaussSpec(nm, 1.2), w]);
    return spectre((l) => { let s = 0; for (const [f, w] of fs) s += f(l) * w; return s; }, 0.2);
  }
  const bande = (pic, fwhm) => spectre(gaussSpec(pic, fwhm), 1).rgb;

  // absorption de l'eau pure (m⁻¹) : Pope et Fry 1997 (380–700 nm), Smith et Baker 1981 au-delà
  const EAU = [[380, 0.01137], [400, 0.00663], [420, 0.00454], [440, 0.00635], [460, 0.00979], [480, 0.0127], [500, 0.0204], [520, 0.0409], [540, 0.0474], [560, 0.0619], [580, 0.0896], [590, 0.1351], [600, 0.2224], [620, 0.2755], [640, 0.3108], [660, 0.41], [680, 0.465], [700, 0.624], [720, 1.169], [740, 2.38], [760, 2.55], [780, 2.36]];
  function absEau(l) {
    for (let i = 1; i < EAU.length; i++) if (l <= EAU[i][0]) { const [a, va] = EAU[i - 1], [b, vb] = EAU[i]; return va + (vb - va) * (l - a) / (b - a); }
    return EAU[EAU.length - 1][1];
  }
  // lumière du jour (≈ 6 500 K) après d mètres d'eau pure : couleur (max = 1) et part de lumière qui reste (Y)
  const Y6500 = spectre((l) => planckL(l, 6500), 2).Y;
  const eau = memo((d) => { const s = spectre((l) => planckL(l, 6500) * Math.exp(-absEau(l) * d), 2); return { rgb: s.rgb, Y: s.Y / Y6500 }; });
  // ciel bleu : lumière du Soleil (5 772 K) diffusée par les molécules (Rayleigh, ∝ λ⁻⁴)
  const rayleigh = memo(() => spectre((l) => planckL(l, 5772) * Math.pow(550 / l, 4), 2).rgb);
  // étoiles : température effective typique de chaque classe spectrale
  const CLASSES = { O: 38000, B: 18000, A: 8800, F: 6800, G: 5700, K: 4500, M: 3300 };
  const etoile = (c) => corpsNoir(typeof c === 'number' ? c : CLASSES[c] || 5700);
  // l'échelle commune du son (DA) : une fréquence devient une couleur du spectre, graves rouges, aigus violets ;
  // 55 Hz (la grave) → 700 nm, 3 520 Hz (six octaves plus haut) → 400 nm ; la même dans toutes les machines du son.
  // C'EST UNE CONVENTION : aucun lien physique entre la hauteur d'un son et une couleur ; le dire à l'écran
  // (« couleurs choisies pour repérer les notes »).
  const son = (hz) => raie(Math.round(700 - 300 * clamp(Math.log2(Math.max(1, hz) / 55) / 6, 0, 1)));

  // conversions utiles pour l'interface : linéaire ↔ sRGB et code css
  const versSrgb = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
  const versLin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const css = (c) => '#' + c.map((v) => Math.round(clamp(versSrgb(Math.max(0, v)), 0, 1) * 255).toString(16).padStart(2, '0')).join('');
  const deCss = (h) => { h = h.replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); return [0, 2, 4].map((i) => versLin(parseInt(h.slice(i, i + 2), 16) / 255)); };

  const couleur = {
    cmf, xyz2rgb, luminance, oklab, deOklab, affichable, spectre, planck: planckL,
    corpsNoir, eclatCorpsNoir, raie, melange: (l) => melange(typeof l === 'string' ? MELANGES[l] : l),
    bande: (pic, fwhm) => (typeof pic === 'string' ? bande(BANDES[pic][0], BANDES[pic][1]) : bande(pic, fwhm)),
    eau, absEau, rayleigh, etoile, son, versSrgb, versLin, css, deCss,
    RAIES, MELANGES, BANDES, CLASSES,
  };

  /* ═══════════════ 2. Palettes ═══════════════ */
  // une palette est une fonction t ∈ [0, 1] → [r, g, b] linéaire ; FKR.cabine(…).lut(palette) en fait une texture

  // rampe d'ancres css, interpolée dans OkLab (pas de gris boueux entre deux teintes) ; ancres : ['#hex', …] ou [[t, '#hex'], …]
  function rampe(ancres) {
    const A = ancres.map((a, i) => (Array.isArray(a) ? [a[0], oklab(deCss(a[1]))] : [i / (ancres.length - 1), oklab(deCss(a))]));
    return (t) => {
      t = clamp(t, 0, 1);
      let i = 1; while (i < A.length - 1 && t > A[i][0]) i++;
      const [t0, a] = A[i - 1], [t1, b] = A[i], f = clamp((t - t0) / Math.max(1e-6, t1 - t0), 0, 1);
      return deOklab([lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)]).map((v) => Math.max(0, v));
    };
  }
  // cartes de couleurs perceptivement uniformes, pour les grandeurs sans couleur propre (concentration, densité, énergie, itération) :
  // viridis, magma, inferno, cividis, twilight (matplotlib : van der Walt et Smith, Nuñez et al., Bechtold), mako et rocket (seaborn, Waskom) ;
  // 33 ancres sRGB, interpolées dans OkLab (écart < 0,006 avec les tables d'origine, invisible)
  const CARTES = {'viridis':'440154470d6048186a482374472d7b4537814240863e49893b528b375b8d33638d2f6b8e2c728e297a8e26828e23898e21918c1f988b1fa08822a78528ae8032b67a3fbc734ec36b5ec96270cf5784d44b98d83eaddc30c2df23d8e219ece51bfde725','magma':'0000040303120a0822130d341d114729115a36106b440f7651127c5d177f6a1c81762181832681902a819c2e7faa337db73779c43c75d0416fdc4869e75263ef5d5ef56b5cf9795dfc8961fd9869fea772feb67cfec488fed395fde2a3fcf0b2fcfdbf','inferno':'0000040403120b0724150b37210c4a2f0a5b3d09654a0c6b57106e64156e71196e7d1e6d8a226a972766a32c61b0315bbc3754c73e4cd24644db503be45a31eb6628f1731df68013f98e09fb9d07fcac11fbbc21f9cb35f5db4cf2ea69f3f68afcffa4','cividis':'00224e00285b002e6a0533711a386f273e6e32436d3b496c434e6c4b546c535a6d5a5f6e61656f686a716f70737676767d7c788482798c8878938e789b9476a39a74aba072b4a76fbcae6cc4b468cdbb63d5c25edec958e7d150f0d846f9e03afee838','twilight':'e2d9e2d7d7ddc4ced4acc2cc95b5c781a6c37297c16887be6276ba5f64b55e51ad5d3da1592a8f511b7745135c3811452f14363a113a4a13425f174a741e4f872750983550a64550b25652bb6958c27c63c89073cca389d1b6a3d8c7bedfd4d6e2d9e2','mako':'0b04051409101c101c2416282b1c3531214237284f3b2e5d3e356b403c794143873f4c923b5698385f9c36699f3572a1357ba33484a5348da73496a9359fab37a8ac3cb1ad42b9ad4bc2ad57cbad6ad2ad82d8b099ddb6aee3c0c0e9ccd0efd9def5e5','rocket':'03051a0d0a21180f2924143230173a3c1a42481c48541e4e611f536e1f577b1f59891e5b971c5ba4195bb21758bf1654cb1b4fd62449df2f44e73d3fec4c3ef05c42f26b49f47a54f58860f5966cf6a37af6b089f6bc99f7c9aaf8d4bcf9e0cdfaebdd'};
  const carteCache = {};
  function carte(nom) {
    if (carteCache[nom]) return carteCache[nom];
    const h = CARTES[nom]; if (!h) throw new Error('FKR : carte inconnue ' + nom);
    const A = []; for (let i = 0; i < h.length; i += 6) A.push(oklab(deCss(h.slice(i, i + 6))));
    const n = A.length - 1;
    return (carteCache[nom] = (t) => {
      const x = clamp(t, 0, 1) * n, i = Math.min(n - 1, Math.floor(x)), f = x - i, a = A[i], b = A[i + 1];
      return deOklab([lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)]).map((v) => Math.max(0, v));
    });
  }
  const palette = {
    rampe, carte, CARTES: Object.keys(CARTES),
    // corps noir de T0 à T1 ; eclat : exposant de compression de la luminance (0 : couleur seule ; le Feu prend 0,4)
    corpsNoir(T0 = 800, T1 = 6500, eclat = 0.4) {
      const Yr = eclatCorpsNoir(T1);
      return (t) => { const T = T0 * Math.pow(T1 / T0, t), c = corpsNoir(Math.round(T)), k = eclat ? Math.pow(eclatCorpsNoir(Math.round(T)) / Yr, eclat) : 1; return c.map((v) => v * k); };
    },
    // étoiles, des naines rouges (t = 0) aux géantes bleues (t = 1)
    etoiles: () => (t) => corpsNoir(Math.round(2800 * Math.pow(38000 / 2800, t))),
    // lumière du jour à travers t × profMax mètres d'eau pure (avec son affaiblissement)
    eau(profMax = 60) { return (t) => { const e = eau(Math.round(t * profMax * 4) / 4); return e.rgb.map((v) => v * e.Y); }; },
    // nébuleuse en émission : t = excitation (0 : bords, [S II] et [N II] rouges ; 0,5 : hydrogène rose ; 1 : cœur, [O III] turquoise)
    // rougi : la poussière sur le trajet affaiblit le bleu ; on observe souvent Hα/Hβ ≈ 4 au lieu de 2,86 (0 : sans poussière)
    nebuleuse(rougi = 1) {
      const H = MELANGES.hydrogene.map(([l, w]) => [l, w * Math.pow(l / 656.28, 1.12 * rougi)]);
      const s = melange([...MELANGES.soufre2, ...MELANGES.azote2.map(([l, w]) => [l, w * 0.8]), ...H.map(([l, w]) => [l, w * 0.6])]).rgb;
      const h = melange(H).rgb, o = melange([...MELANGES.oxygene3, ...H.map(([l, w]) => [l, w * 0.25])]).rgb;
      return (t) => (t < 0.5 ? s.map((v, i) => lerp(v, h[i], t * 2)) : h.map((v, i) => lerp(v, o[i], t * 2 - 1)));
    },
    // aurore : t = altitude (0 : 90 km, bord bleu-violet ; 0,35 : vert ; 1 : 300 km, rouge)
    aurore() {
      const b = melange([...MELANGES.aurore_bleue, [557.73, 0.6]]).rgb, v = raie(557.73), r = melange(MELANGES.aurore_rouge).rgb;
      return (t) => (t < 0.35 ? b.map((x, i) => lerp(x, v[i], t / 0.35)) : v.map((x, i) => lerp(x, r[i], clamp((t - 0.35) / 0.65, 0, 1) ** 1.5)));
    },
  };

  /* ═══════════════ 3. Morceaux de GLSL ═══════════════ */
  const G = {};
  G.tete = `#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
in vec2 vUv;
`;
  G.couleur = `
// ── couleur ── (sRGB linéaire partout ; versSrgb seulement à la toute fin)
float luminance(vec3 c){ return dot(c, vec3(.2126, .7152, .0722)); }
vec3 versLineaire(vec3 s){ return mix(s / 12.92, pow((s + .055) / 1.055, vec3(2.4)), step(.04045, s)); }
vec3 versSrgb(vec3 c){ c = max(c, 0.); return mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(.0031308, c)); }
float racine3(float x){ return sign(x) * pow(abs(x), 1. / 3.); }
vec3 oklab(vec3 c){
  float l = racine3(.4122214708 * c.r + .5363325363 * c.g + .0514459929 * c.b);
  float m = racine3(.2119034982 * c.r + .6806995451 * c.g + .1073969566 * c.b);
  float s = racine3(.0883024619 * c.r + .2817188376 * c.g + .6299787005 * c.b);
  return vec3(.2104542553 * l + .7936177850 * m - .0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .8086757660 * s);
}
vec3 deOklab(vec3 L){
  float l = L.x + .3963377774 * L.y + .2158037573 * L.z, m = L.x - .1055613458 * L.y - .0638541728 * L.z, s = L.x - .0894841775 * L.y - 1.2914855480 * L.z;
  l = l * l * l; m = m * m * m; s = s * s * s;
  return vec3(4.0767416621 * l - 3.3077115913 * m + .2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s, -.0041960863 * l - .7034186147 * m + 1.7076147010 * s);
}
// saturation à teinte et clarté constantes (OkLab) : s > 1 avive, s < 1 pâlit
vec3 saturer(vec3 c, float s){ vec3 L = oklab(c); L.yz *= s; return max(deOklab(L), 0.); }
// corps noir (max = 1), 800 à 40 000 K ; ajusté sur Planck × table CIE 1931, écart < 0,8 %
vec3 corpsNoir(float T){
  float x = log(clamp(T, 800., 40000.) / 1000.);
  if (T < 6500.){
    float g = ((((-.0405229 * x + .16378) * x - .284294) * x + .398321) * x + .169233) * x + .0130177;
    float b = ((((-.0554655 * x + .145398) * x + .193766) * x - .314536) * x + .205082) * x - .0722239;
    return vec3(1., clamp(g, 0., 1.), clamp(b, 0., 1.));
  }
  float r = ((((-.068054 * x + 1.06657) * x - 6.72876) * x + 21.4602) * x - 34.8627) * x + 23.6724;
  float g = ((((-.0225702 * x + .365996) * x - 2.40735) * x + 8.08919) * x - 14.0498) * x + 10.7211;
  return vec3(clamp(r, 0., 1.), clamp(g, 0., 1.), 1.);
}
// luminance d'un corps noir relative à 1 000 K (écart < 3 %) : ×2 900 à 1 500 K, ×170 000 à 2 000 K
float eclatCorpsNoir(float T){ float x = log(clamp(T, 500., 40000.) / 1000.); return exp(((((.0287477 * x - .426402) * x + 2.82469) * x - 10.6083) * x + 23.5465) * x - .00348732); }
// réponse de l'œil standard à une longueur d'onde (nm), en sRGB linéaire NON borné (à intégrer, puis seulement borner) ;
// approximation de Wyman, Sloan et Shirley (2013), juste entre 420 et 680 nm (pour les raies isolées, préférer FKR.couleur.raie en JS)
vec3 cmfRGB(float l){
  vec3 t1 = (l - vec3(599.8, 442., 501.1)) / mix(vec3(31., 26.7, 26.2), vec3(37.9, 16., 20.4), step(l, vec3(599.8, 442., 501.1)));
  vec2 t2 = (l - vec2(568.8, 530.9)) / mix(vec2(40.5, 31.1), vec2(46.9, 16.3), step(l, vec2(568.8, 530.9)));
  vec2 t3 = (l - vec2(437., 459.)) / mix(vec2(36., 13.8), vec2(11.8, 26.), step(l, vec2(437., 459.)));
  vec3 e1 = exp(-.5 * t1 * t1); vec2 e2 = exp(-.5 * t2 * t2), e3 = exp(-.5 * t3 * t3);
  float X = 1.056 * e1.x + .362 * e1.y - .065 * e1.z, Y = .821 * e2.x + .286 * e2.y, Z = 1.217 * e3.x + .681 * e3.y;
  return mat3(3.2406, -.9689, .0557, -1.5372, 1.8758, -.204, -.4986, .0415, 1.057) * vec3(X, Y, Z);
}
// couleur affichable d'une raie pure (max = 1) : on ajoute juste assez de blanc pour rentrer dans le gamut
vec3 couleurRaie(float l){ vec3 c = cmfRGB(l); c -= min(0., min(c.r, min(c.g, c.b))); return c / max(1e-6, max(c.r, max(c.g, c.b))); }
// lame mince (bulle de savon, flaque d'huile) : couleur réfléchie sous lumière blanche ; e = épaisseur (nm), n = indice, ct = cos de l'angle dans la lame
// deux ondes réfléchies interfèrent : R(λ) = 2R₀(1 − cos 4πne·cosθ/λ). Une lame très fine est noire (la « tache noire » avant l'éclatement).
vec3 filmMince(float e, float n, float ct){
  float R0 = (n - 1.) * (n - 1.) / ((n + 1.) * (n + 1.)), ph = 12.566371 * n * e * ct;
  vec3 s = vec3(0.); float w = 0.;
  for (int i = 0; i < 16; i++){
    float l = 400. + float(i) * 20., m = l * 1e-3;
    vec3 c = cmfRGB(l) / (m * m * m * m * m * (exp(2213.5 / l) - 1.));   // éclairé par un corps noir à 6 500 K (≈ lumière du jour)
    s += c * (1. - cos(ph / l)); w += c.g;
  }
  return max(s * 2. * R0 / w, 0.);
}
// lumière du jour après d mètres d'eau pure (exponentielles effectives par canal, ajustées sur Pope et Fry 1997)
vec3 eauTransmission(float d){ return exp(-d * vec3(.483, .0514, .0068)); }
`;
  G.bruit = `
// ── bruits ── (hachage entier PCG, Jarzynski et Olano 2020 : robuste même loin de l'origine)
uint pcgU(uint v){ uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
float alea(vec2 p){ uvec2 u = floatBitsToUint(p); return float(pcgU(u.x ^ pcgU(u.y))) * (1. / 4294967296.); }
float alea3(vec3 p){ uvec3 u = floatBitsToUint(p); return float(pcgU(u.x ^ pcgU(u.y ^ pcgU(u.z)))) * (1. / 4294967296.); }
vec2 alea2(vec2 p){ uvec2 u = floatBitsToUint(p); uint a = pcgU(u.x ^ pcgU(u.y)); return vec2(float(a), float(pcgU(a))) * (1. / 4294967296.); }
// bruit de gradient entrelacé (Jimenez 2014) : idéal pour le tramage
float ign(vec2 px){ return fract(52.9829189 * fract(dot(px, vec2(.06711056, .00583715)))); }
vec2 grad2(vec2 i){ return alea2(i) * 2. - 1.; }
// bruit de valeur [0, 1]
float bruitV(vec2 p){ vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  return mix(mix(alea(i), alea(i + vec2(1, 0)), u.x), mix(alea(i + vec2(0, 1)), alea(i + 1.), u.x), u.y); }
// bruit de gradient (Perlin), ≈ [−1, 1], et sa version avec dérivées analytiques (valeur, ∂x, ∂y)
vec3 bruitGd(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * f * (f * (f * 6. - 15.) + 10.), du = 30. * f * f * (f * (f - 2.) + 1.);
  vec2 ga = grad2(i), gb = grad2(i + vec2(1, 0)), gc = grad2(i + vec2(0, 1)), gd = grad2(i + 1.);
  float va = dot(ga, f), vb = dot(gb, f - vec2(1, 0)), vc = dot(gc, f - vec2(0, 1)), vd = dot(gd, f - 1.);
  float k = va - vb - vc + vd;
  float v = va + u.x * (vb - va) + u.y * (vc - va) + u.x * u.y * k;
  vec2 d = ga + u.x * (gb - ga) + u.y * (gc - ga) + u.x * u.y * (ga - gb - gc + gd) + du * (u.yx * k + vec2(vb, vc) - va);
  return vec3(v, d) * 1.4;
}
float bruitG(vec2 p){ return bruitGd(p).x; }
// bruit de gradient en 3D (la 3e dimension sert souvent de temps), ≈ [−1, 1]
float bruitG3(vec3 p){
  vec3 i = floor(p), f = fract(p), u = f * f * f * (f * (f * 6. - 15.) + 10.);
  float n[8];
  for (int k = 0; k < 8; k++){
    vec3 o = vec3(float(k & 1), float((k >> 1) & 1), float((k >> 2) & 1));
    vec3 g = vec3(alea3(i + o), alea3(i + o + 19.19), alea3(i + o + 47.47)) * 2. - 1.;
    n[k] = dot(g, f - o);
  }
  return 1.2 * mix(mix(mix(n[0], n[1], u.x), mix(n[2], n[3], u.x), u.y), mix(mix(n[4], n[5], u.x), mix(n[6], n[7], u.x), u.y), u.z);
}
const mat2 ROT_FBM = mat2(.8, .6, -.6, .8);
// mouvement brownien fractionnaire : n octaves (1 à 8), ≈ [−1, 1]
float fbmG(vec2 p, int n){ float s = 0., a = .5, t = 0.; for (int i = 0; i < 8; i++){ if (i >= n) break; s += a * bruitG(p); t += a; p = ROT_FBM * p * 2.03 + 11.7; a *= .5; } return s / t; }
float fbmG3(vec3 p, int n){ float s = 0., a = .5, t = 0.; for (int i = 0; i < 8; i++){ if (i >= n) break; s += a * bruitG3(p); t += a; p = vec3(ROT_FBM * p.xy, p.z) * 2.03 + 11.7; a *= .5; } return s / t; }
// multifractal « en arêtes » [0, 1] : filaments, veines, éclairs, bords de nébuleuses
float strie(vec2 p, int n){ float s = 0., a = .5, w = 1., t = 0.; for (int i = 0; i < 8; i++){ if (i >= n) break; float r = 1. - abs(bruitG(p)); r *= r * w; s += a * r; t += a; w = clamp(r * 2., 0., 1.); p = ROT_FBM * p * 2.07 + 5.3; a *= .5; } return s / t; }
// bruit à rotationnel (curl) : un champ de vitesses sans divergence, pour faire tourbillonner sans entasser
vec2 boucle(vec2 p, int n){ vec2 v = vec2(0.); float a = 1.; for (int i = 0; i < 6; i++){ if (i >= n) break; vec3 g = bruitGd(p); v += a * vec2(g.z, -g.y); p = ROT_FBM * p * 2.03 + 7.1; a *= .5; } return v; }
// cellules de Voronoï : (distance au germe le plus proche, au second) ; F2 − F1 dessine les bords
vec2 voronoi(vec2 p){ vec2 i = floor(p), f = fract(p); float d1 = 8., d2 = 8.;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){ vec2 g = vec2(x, y), r = g + alea2(i + g) - f; float d = dot(r, r); if (d < d1){ d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
  return sqrt(vec2(d1, d2)); }
// Voronoï dont les germes tournent lentement (t en secondes) : base des réseaux mouvants
vec2 voronoiT(vec2 p, float t){ vec2 i = floor(p), f = fract(p); float d1 = 8., d2 = 8.;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){ vec2 g = vec2(x, y), h = alea2(i + g), r = g + .5 + .38 * sin(t * (.6 + .5 * h) + 6.2831853 * h) - f; float d = dot(r, r); if (d < d1){ d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
  return sqrt(vec2(d1, d2)); }
// caustiques procédurales (sans simulation de surface) : un réseau de lignes vives qui ondule, deux échelles superposées ;
// renvoie l'éclairement relatif du fond, de l'ordre de 1 en moyenne (multiplier par la lumière du soleil)
float caustique(vec2 p, float t){
  vec2 a = voronoiT(p, t), b = voronoiT(p * 1.7 + 3.1, t * 1.3 + 5.);
  float la = pow(clamp(1. - (a.y - a.x) * 2.4, 0., 1.), 6.), lb = pow(clamp(1. - (b.y - b.x) * 2.6, 0., 1.), 6.);
  return .45 + 1.6 * la + .9 * lb + 1.8 * la * lb;
}
// déformation de domaine (Quilez) : des volutes organiques à partir d'un fbm
vec2 gauchir(vec2 p, float k, int n){ return p + k * vec2(fbmG(p + vec2(1.7, 9.2), n), fbmG(p + vec2(8.3, 2.8), n)); }
`;
  G.tons = `
// ── tons ── (HDR linéaire → affichage linéaire [0, 1])
// ACES ajusté (Narkowicz 2015), celui du Feu : par canal, les lumières chaudes jaunissent puis blanchissent
vec3 tonACES(vec3 x){ x = max(x, 0.); return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
// courbe filmique (Lottes 2016) : k = (contraste, épaule, b, c), calculés par la cabine
float courbeFilm(float x, vec4 k){ x = max(x, 0.); return pow(x, k.x) / (pow(x, k.x * k.y) * k.z + k.w); }
// appliquée au canal le plus fort (teinte conservée) ; les très fortes lumières pâlissent vers le blanc,
// comme une pellicule ou un capteur saturés : b = (log2 du début, 1 / nombre de diaphragmes jusqu'au blanc complet)
vec3 tonFilm(vec3 c, vec4 k, vec2 b){
  c = max(c, 0.); float pic = max(c.r, max(c.g, c.b));
  if (pic < 1e-7) return vec3(0.);
  float p = clamp(courbeFilm(pic, k), 0., 1.);
  float w = clamp((log2(pic) - b.x) * b.y, 0., 1.);
  return p * mix(c / pic, vec3(1.), w * w);
}
// étirement asinh (Lupton et al. 2004) : la méthode des images couleur du Sloan Digital Sky Survey ;
// garde la couleur des cœurs brillants (galaxies, nébuleuses). q : adoucissement, e : étirement
vec3 tonLupton(vec3 c, float q, float e){
  c = max(c, 0.); float I = (c.r + c.g + c.b) / 3.;
  if (I < 1e-7) return vec3(0.);
  vec3 o = c * (asinh(q * I / e) / q) / I;
  float m = max(o.r, max(o.g, o.b));
  return m > 1. ? o / m : o;
}
// AgX (Troy Sobotka) dans sa version minimale de Benjamin Wrensch (2023, licence MIT) : les lumières saturées
// très fortes blanchissent sans virer de teinte. Sortie : affichage linéaire.
vec3 tonAgX(vec3 v){
  const mat3 M = mat3(.842479062253094, .0423282422610123, .0423756549057051, .0784335999999992, .878468636469772, .0784336, .0792237451477643, .0791661274605434, .879142973793104);
  const mat3 Mi = mat3(1.19687900512017, -.0528968517574562, -.0529716355144438, -.0980208811401368, 1.15190312990417, -.0980434501171241, -.0990297440797205, -.0989611768448433, 1.15107367264116);
  v = clamp(log2(max(M * v, vec3(1e-10))), -12.47393, 4.026069);
  v = (v + 12.47393) / 16.5;
  vec3 v2 = v * v, v4 = v2 * v2;
  v = 15.5 * v4 * v2 - 40.14 * v4 * v + 31.96 * v4 - 6.868 * v2 * v + .4298 * v2 + .1191 * v - .00232;
  return pow(max(Mi * v, vec3(0.)), vec3(2.2));
}
// Reinhard étendu, sur la luminance (w : blanc)
vec3 tonReinhard(vec3 c, float w){ float l = luminance(c); float m = l * (1. + l / (w * w)) / (1. + l); return clamp(c * (m / max(l, 1e-7)), 0., 1.); }
`;
  G.lumiere = `
// ── lumière ──
float gauss(float d, float s){ return exp(-.5 * d * d / (s * s)); }
// halo lorentzien : 1/(1 + (d/r)²), la lumière qui « bave » autour d'une source dans un milieu diffusant
float halo(float d, float r){ return 1. / (1. + d * d / (r * r)); }
// profil de Moffat (1969) : celui des étoiles photographiées, un cœur et de longues ailes
float moffat(float d, float a, float b){ return pow(1. + d * d / (a * a), -b); }
float schlick(float ct, float f0){ return f0 + (1. - f0) * pow(1. - clamp(ct, 0., 1.), 5.); }
// Fresnel exact d'un dioptre (lumière non polarisée) : ci = cos de l'angle d'incidence, eta = n₂/n₁ (eau vue de l'air : 1,333).
// L'eau renvoie 2 % de la lumière vue d'en haut (on voit le fond), et devient un miroir en vue rasante.
float fresnelDielectrique(float ci, float eta){
  ci = clamp(ci, 0., 1.); float st2 = (1. - ci * ci) / (eta * eta);
  if (st2 >= 1.) return 1.;                       // réflexion totale (vue depuis l'eau)
  float ct = sqrt(1. - st2), rs = (ci - eta * ct) / (ci + eta * ct), rp = (eta * ci - ct) / (eta * ci + ct);
  return .5 * (rs * rs + rp * rp);
}
// caustiques d'une surface d'eau de relief h, au fond à la profondeur d (mêmes unités que le relief) : le soleil vertical est
// réfracté selon la pente ; là où la surface est bombée (laplacien négatif), les rayons se resserrent et le fond s'éclaire.
// Éclairement relatif = 1 / |det J| ≈ 1 / |1 + d (1 − 1/n) ∇²h| (Jacobien de la projection ; borné aux plis)
float caustiqueJacobien(float laplacien, float d, float n){ return 1. / max(abs(1. + d * (1. - 1. / n) * laplacien), .06); }
// fonctions de phase : Henyey-Greenstein (g > 0 : diffusion vers l'avant, poussières, gouttes, plancton) et Rayleigh (molécules)
float phaseHG(float ct, float g){ float g2 = g * g; return (1. - g2) / (12.566371 * pow(1. + g2 - 2. * g * ct, 1.5)); }
float phaseRayleigh(float ct){ return .0596831 * (1. + ct * ct); }
vec3 beer(vec3 sigma, float d){ return exp(-sigma * d); }
// éclairage « enveloppant » : la lumière passe un peu derrière le terminateur (gélatine, cire, peau, blob)
float enveloppe(float ndl, float w){ return max(0., (ndl + w) / (1. + w)); }
vec3 brouillard(vec3 c, vec3 f, float d, float k){ return mix(f, c, exp(-d * k)); }
// normale d'un champ de hauteur (texture .r), pour éclairer un relief 2D
vec3 normaleHauteur(sampler2D h, vec2 uv, vec2 tx, float k){
  float l = texture(h, uv - vec2(tx.x, 0.)).r, r = texture(h, uv + vec2(tx.x, 0.)).r, b = texture(h, uv - vec2(0., tx.y)).r, t = texture(h, uv + vec2(0., tx.y)).r;
  return normalize(vec3((l - r) * k, (b - t) * k, 1.));
}
`;
  G.formes = `
// ── formes (distances signées) ──
float sdCercle(vec2 p, float r){ return length(p) - r; }
float sdBoite(vec2 p, vec2 b){ vec2 d = abs(p) - b; return length(max(d, 0.)) + min(max(d.x, d.y), 0.); }
float sdSegment(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h); }
float sminP(float a, float b, float k){ float h = clamp(.5 + .5 * (b - a) / k, 0., 1.); return mix(b, a, h) - k * h * (1. - h); }
mat2 rot2(float a){ float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
`;
  G.finition = `
// ── finition ──
// vignetage naturel d'un objectif : l'éclairement tombe comme cos⁴θ loin de l'axe (k : force)
float vignetage(vec2 uv, float aspect, float k){ vec2 d = (uv - .5) * vec2(aspect, 1.) / length(vec2(aspect, 1.) * .5); float r2 = dot(d, d) * k * k; return 1. / ((1. + r2) * (1. + r2)); }
// tramage triangulaire : supprime les bandes dans les dégradés sombres (à appliquer après versSrgb)
vec3 tramer(vec3 s, vec2 px, float t){ return s + (ign(px + t * 59.) + ign(px.yx + 13.7 + t * 83.) - 1.) / 255.; }
`;
  G.matiere = `
// ── matière ── : donner du corps à un champ 2D (un relief h), éclairé comme une vraie surface vue de face.
// Micro-facettes GGX (Trowbridge-Reitz), Fresnel de Schlick, diffus enveloppant, reflet d'un ciel en dégradé,
// translucidité de Beer-Lambert. Repère : x à droite, y en haut, z vers l'œil.
float ggxD(float ndh, float rug){ float a = rug * rug, a2 = a * a, d = ndh * ndh * (a2 - 1.) + 1.; return a2 / (3.1415927 * d * d); }
float smithG(float ndv, float ndl, float rug){ float k = (rug + 1.) * (rug + 1.) * .125; return ndv / (ndv * (1. - k) + k) * ndl / (ndl * (1. - k) + k); }
// normale d'un relief donné par trois hauteurs : au point, un pas à droite, un pas en haut (pas en unités du relief)
vec3 normaleDe(float h, float hx, float hy, float pas){ return normalize(vec3(h - hx, h - hy, pas)); }
// n : normale ; l : vers la lumière ; alb : albédo ; rug : rugosité, de 0,05 (vernis) à 1 (mat) ;
// f0 : réflectance de face (eau .02, verre et gel .04, métal : sa couleur) ; L : la lumière ; ciel : (haut, bas) pour les reflets
vec3 surface(vec3 n, vec3 l, vec3 alb, float rug, vec3 f0, vec3 L, vec3 cielH, vec3 cielB){
  rug = clamp(rug, .05, 1.);
  vec3 v = vec3(0., 0., 1.), h = normalize(l + v);
  float ndl = max(dot(n, l), 0.), ndv = max(n.z, 1e-3), ndh = max(dot(n, h), 0.), vdh = max(dot(v, h), 0.);
  vec3 F = f0 + (1. - f0) * pow(1. - vdh, 5.);
  vec3 spec = ggxD(ndh, rug) * smithG(ndv, ndl, rug) * F / max(4. * ndv, 1e-3);
  vec3 diff = alb * enveloppe(dot(n, l), .25) * (1. - F);
  vec3 r = reflect(-v, n);
  vec3 Fe = f0 + (1. - f0) * pow(1. - ndv, 5.) / (1. + 4. * rug);
  vec3 cielR = mix(mix(cielB, cielH, r.y * .5 + .5), (cielH + cielB) * .5, rug);  // une surface mate voit un ciel moyen
  return (diff + spec) * L + cielR * Fe + alb * (cielH + cielB) * .25 * (1. - Fe);
}
// translucidité : ce qui reste d'une lumière blanche après une épaisseur d de matière d'absorption sigma (par canal)
vec3 traverse(vec3 sigma, float d){ return exp(-sigma * max(d, 0.)); }
`;
  const ORDRE = ['couleur', 'bruit', 'tons', 'lumiere', 'formes', 'matiere', 'finition'];
  const DEPS = { tons: ['couleur'], finition: ['bruit'], matiere: ['lumiere'], lumiere: [], couleur: [], bruit: [], formes: [] };
  // FKR.glsl('bruit', 'tons') → les morceaux demandés et leurs dépendances, dans le bon ordre (sans la tête)
  function glsl(...noms) {
    const S = new Set();
    const ajout = (n) => { if (!G[n] || S.has(n)) return; (DEPS[n] || []).forEach(ajout); S.add(n); };
    (noms.length ? noms : ORDRE).forEach(ajout);
    return ORDRE.filter((n) => S.has(n)).map((n) => G[n]).join('\n');
  }
  // un nuanceur de fragment complet : tête + morceaux + corps
  const fs = (noms, corps) => G.tete + (noms && noms.length ? glsl(...noms) : '') + '\n' + corps;

  /* ═══════════════ 4. La cabine (WebGL2) ═══════════════ */
  // les fonds de la DA : le noir comme écrin, légèrement teinté
  const FONDS = { defaut: '#05060A', eau: '#04080C', cosmos: '#07050A' };
  // réglages par défaut : ceux de la DA commune (Fausta, 13/11 à 0 h 22, 059035f) ; chaque machine peut les ajuster
  const DEFAUTS = {
    echelle: 1,              // fraction de la résolution de travail
    plafond: 1.25,           // densité de pixels maximale du tampon HDR (tablette modeste ; ces images douces n'y perdent rien)
    fond: deCss(FONDS.defaut), // le vide : #05060A, jamais #000
    expo: 1,                 // exposition (× la lumière)
    tons: 'agx',             // 'agx' (DA), 'film' (Lottes, teinte conservée), 'aces' (celui du Feu), 'lupton' (astronomie), 'reinhard'
    courbe: { contraste: 1.25, epaule: 0.97, milieu: 0.18, sortie: 0.2, max: 24 },
    blanc: 2,                // tons 'film' : les lumières plus fortes que ceci commencent à pâlir vers le blanc (blanc complet à courbe.max)
    lupton: { q: 8, etirement: 0.5 },
    saturation: 1.12,        // dans OkLab, après la courbe : étire la chroma sans toucher la teinte, comme un tirage photo ;
                             // la même partout, plafonnée à 1,12 (Kurt, 13/11) ; jamais sur les Illusions ni le Moiré
    contraste: 1,            // autour du gris moyen, en espace d'affichage
    teinte: [1, 1, 1],       // balance des blancs (× la lumière, avant la courbe)
    releve: [0, 0, 0],       // relevé des noirs (ajouté avant la courbe)
    halo: 0.06,              // force du halo (DA : 0,04 à 0,08 ; « le bloom révèle les sources »)
    rayon: 0.72,             // étendue du halo : 0 serré, 1 très large
    seuil: 1, genou: 0.5,    // seul ce qui dépasse le blanc diffuse (DA) ; 0 : tout bave un peu (physique, comme le Feu)
    niveaux: 5,              // étages de la pyramide du halo, depuis la demi-résolution (DA : 5)
    eclairage: 0,            // les lumières éclairent la scène (calque ou cible « scène ») ; 0 : non
    ambiant: [1, 1, 1],      // éclairage de base de la scène
    vignetage: 0.39,         // cos⁴ : coins assombris d'environ 25 % (DA)
    grain: 0.05,             // grain animé : ±2,5 % dans les tons moyens (DA : 2 à 3 %)
    grainNoir: 0.25,         // part du grain dans les noirs
    remanence: 0,            // phosphore : part de la trace gardée d'une image à l'autre (DA : 0,90 à 0,97), voir R.phosphore()
    gain2D: 4,               // calque 2D des lumières : un blanc pur y vaut cette luminance
  };
  const TONS = { film: 0, aces: 1, lupton: 2, reinhard: 3, agx: 4 };
  const SAT_MAX = 1.12;       // plafond de la saturation au tirage (Kurt, 13/11)
  function courbeLottes(o) {
    const a = o.contraste, d = o.epaule, mi = o.milieu, mo = o.sortie, hm = o.max, P = Math.pow, ad = a * d;
    const b = (-P(mi, a) + P(hm, a) * mo) / ((P(hm, ad) - P(mi, ad)) * mo);
    const c = (P(hm, ad) * P(mi, a) - P(hm, a) * P(mi, ad) * mo) / ((P(hm, ad) - P(mi, ad)) * mo);
    return [a, d, b, c];
  }

  const FS_BAS = fs(['couleur'], `
uniform sampler2D uSrc, uSrc2; uniform vec2 uTx; uniform float uGain2, uPremier, uSeuil, uGenou;
out vec4 o;
vec3 lire(vec2 uv){ vec3 c = texture(uSrc, uv).rgb; if (uGain2 > 0.) c += versLineaire(texture(uSrc2, uv).rgb) * uGain2;
  return clamp(c, 0., 6e4) * step(0., c.r + c.g + c.b);   // ni NaN ni infini dans le halo
}
void main(){
  vec3 c0 = lire(vUv), c1 = lire(vUv - uTx), c2 = lire(vUv + uTx), c3 = lire(vUv + vec2(uTx.x, -uTx.y)), c4 = lire(vUv + vec2(-uTx.x, uTx.y));
  vec3 c;
  if (uPremier > .5){
    // moyenne de Karis : un point minuscule et très brillant ne fait pas clignoter le halo
    float w0 = 4. / (1. + luminance(c0)), w1 = 1. / (1. + luminance(c1)), w2 = 1. / (1. + luminance(c2)), w3 = 1. / (1. + luminance(c3)), w4 = 1. / (1. + luminance(c4));
    c = (c0 * w0 + c1 * w1 + c2 * w2 + c3 * w3 + c4 * w4) / (w0 + w1 + w2 + w3 + w4);
    // seuil doux sur le canal le plus fort (une lumière bleue vive dépasse le seuil même si sa luminance est faible)
    if (uSeuil > 0.){ float l = max(c.r, max(c.g, c.b)), s = clamp(l - uSeuil + uGenou, 0., 2. * uGenou); s = s * s / (4. * uGenou + 1e-5); c *= max(s, l - uSeuil) / max(l, 1e-5); }
  } else c = (c0 * 4. + c1 + c2 + c3 + c4) * .125;
  o = vec4(max(c, 0.), 1.);
}`);
  const FS_COPIE = fs([], `
uniform sampler2D uT; uniform float uK; out vec4 o;
void main(){ o = vec4(texture(uT, vUv).rgb * uK, 1.); }`);
  const FS_HAUT = fs([], `
uniform sampler2D uPetit, uCourant; uniform vec2 uTx; uniform float uRayon;
out vec4 o;
void main(){
  vec2 h = uTx * .5;
  vec3 s = texture(uPetit, vUv + vec2(-2. * h.x, 0.)).rgb + texture(uPetit, vUv + vec2(2. * h.x, 0.)).rgb + texture(uPetit, vUv + vec2(0., -2. * h.y)).rgb + texture(uPetit, vUv + vec2(0., 2. * h.y)).rgb;
  s += 2. * (texture(uPetit, vUv + h).rgb + texture(uPetit, vUv - h).rgb + texture(uPetit, vUv + vec2(h.x, -h.y)).rgb + texture(uPetit, vUv + vec2(-h.x, h.y)).rgb);
  o = vec4(texture(uCourant, vUv).rgb + uRayon * s / 12., 1.);
}`);
  const FS_TIRAGE = fs(['couleur', 'bruit', 'tons', 'finition'], `
uniform sampler2D uLum, uLum2, uScene, uHalo, uIllum;
uniform float uGain2, uScMode, uForce, uNH, uNI, uEcl, uExpo, uTon, uSat, uVig, uGrain, uGrainN, uTemps, uAspect, uCon;
uniform vec3 uFond, uAmb, uTeinte, uReleve; uniform vec4 uCourbe; uniform vec2 uLup, uBlanc;
out vec4 o;
void main(){
  vec3 lum = texture(uLum, vUv).rgb;
  if (uGain2 > 0.) lum += versLineaire(texture(uLum2, vUv).rgb) * uGain2;
  vec3 col = uFond;
  if (uScMode > .5){
    vec3 alb = texture(uScene, vUv).rgb;
    if (uScMode > 1.5) alb = versLineaire(alb);
    col = alb * (uAmb + uEcl * texture(uIllum, vUv).rgb * uNI);
  }
  col += lum + uForce * uNH * texture(uHalo, vUv).rgb;
  col = col * uTeinte * uExpo + uReleve;
  vec3 t;
  if (uTon > 3.5) t = tonAgX(col);
  else if (uTon < .5) t = tonFilm(col, uCourbe, uBlanc);
  else if (uTon < 1.5) t = tonACES(col);
  else if (uTon < 2.5) t = tonLupton(col, uLup.x, uLup.y);
  else t = tonReinhard(col, exp2(uBlanc.x + 1. / uBlanc.y));
  if (abs(uSat - 1.) > .001) t = saturer(t, uSat);
  t *= vignetage(vUv, uAspect, uVig);
  vec3 s = versSrgb(clamp(t, 0., 1.));
  if (abs(uCon - 1.) > .001) s = clamp((s - .5) * uCon + .5, 0., 1.);   // contraste autour du gris moyen, en espace d'affichage
  vec2 px = gl_FragCoord.xy;
  // grain argentique animé : surtout dans les tons moyens, un peu dans les noirs
  if (uGrain > 0.){ float l = dot(s, vec3(.2126, .7152, .0722)); s += (alea(px + fract(uTemps * 7.31) * 517.) - .5) * uGrain * (4. * l * (1. - l) + uGrainN * (1. - l)); }
  o = vec4(tramer(s, px, fract(uTemps)), 1.);
}`);
  // lueurs : chaque instance est un segment arrondi (un point si ses deux bouts se confondent) au profil doux
  const VS_LUEUR = `#version 300 es
precision highp float; precision highp int;
layout(location = 0) in vec2 aCoin;
layout(location = 1) in vec4 aSeg;    // x0, y0, x1, y1 (px css, origine en haut à gauche)
layout(location = 2) in vec4 aCol;    // rayon (px css), r, g, b (linéaire)
layout(location = 3) in float aDrap;  // 1 : bout de départ arrondi, 2 : bout d'arrivée arrondi, 4 : pointes de diffraction
uniform vec2 uRes; uniform float uE, uEP, uMode, uForme, uBeta, uGain, uPx;
out vec2 vLoc; out float vLong; out vec3 vCol; flat out int vDrap;
void main(){
  vec2 A = aSeg.xy, B = aSeg.zw; float R = max(aCol.x, .7 * uPx);
  vec2 d = B - A; float L = length(d);
  vec2 ax = L > 1e-4 ? d / L : vec2(1., 0.), nr = vec2(-ax.y, ax.x);
  int dr = int(aDrap + .5);
  float e = (dr & 4) != 0 && uForme > 1.5 ? uEP : uE, Lr = L / R;
  float x0 = (dr & 1) != 0 ? -e : 0., x1 = (dr & 2) != 0 ? Lr + e : Lr;
  float lx = mix(x0, x1, aCoin.x * .5 + .5), ly = aCoin.y * e;
  vec2 p = A + (ax * lx + nr * ly) * R;
  gl_Position = vec4(p.x / uRes.x * 2. - 1., 1. - p.y / uRes.y * 2., 0., 1.);
  vLoc = vec2(lx, ly); vLong = Lr; vDrap = dr;
  float n = 1.;
  if (uMode < .5) n = uForme < .5 ? 1. / (6.2831853 * R * R + 2.5066283 * R * L) : (uBeta - 1.) / (3.1415927 * R * R);
  vCol = aCol.yzw * n * uGain;
}`;
  const FS_LUEUR = `#version 300 es
precision highp float; precision highp int;
in vec2 vLoc; in float vLong; in vec3 vCol; flat in int vDrap;
uniform float uE, uEP, uForme, uBeta, uPointes, uAngle;
out vec4 o;
void main(){
  float t = clamp(vLoc.x, 0., vLong);
  vec2 q = vec2(vLoc.x - t, vLoc.y);
  float d2 = dot(q, q), e2 = uE * uE, k;
  // le profil est ramené à zéro au bord du quadrilatère : pas d'arête visible, même très exposé
  if (uForme < .5) k = max(0., exp(-.5 * d2) - exp(-.5 * e2)) / (1. - exp(-.5 * e2));
  else {
    float kb = pow(1. + e2, -uBeta);
    k = max(0., pow(1. + d2, -uBeta) - kb) / (1. - kb);
    if (uForme > 1.5 && (vDrap & 4) != 0){
      // pointes de diffraction : la lumière contourne les bras qui tiennent le miroir secondaire du télescope
      vec2 r = rot2(uAngle) * q;
      float a = abs(r.x), b = abs(r.y), m = max(a, b);
      float sp = exp(-b * 5.) / (1. + a * a * .08) + exp(-a * 5.) / (1. + b * b * .08);
      k += uPointes * sp * (1. - smoothstep(uEP * .55, uEP, m)) * .15;
    }
  }
  o = vec4(vCol * k, 0.);
}`.replace('void main(){', G.formes + '\nvoid main(){');

  function cabine(env, reglages) {
    const W = env.w, H = env.h;
    const opt = Object.assign({}, DEFAUTS, reglages || {});
    opt.courbe = Object.assign({}, DEFAUTS.courbe, (reglages && reglages.courbe) || {});
    opt.lupton = Object.assign({}, DEFAUTS.lupton, (reglages && reglages.lupton) || {});
    const propre = !opt.K;
    const cs = Math.min(env.dpr || 1, opt.plafond) * opt.echelle;
    const K = opt.K || window.FKGL.GLKit(Math.max(2, Math.round(W * cs)), Math.max(2, Math.round(H * cs)));
    const gl = K.gl, cw = K.canvas.width, ch = K.canvas.height;
    const sx = cw / W;
    const pg = { bas: K.program(FS_BAS), haut: K.program(FS_HAUT), tirage: K.program(FS_TIRAGE), lueur: K.program(FS_LUEUR, VS_LUEUR), copie: K.program(FS_COPIE) };
    const lum = K.target(cw, ch);
    let sceneGL = null, trace = null;
    // la pyramide du halo : de la demi-résolution jusqu'à quelques pixels
    const bas = [], haut = [];
    let n = Math.max(1, opt.niveaux | 0);
    while (n > 1 && Math.min(cw, ch) >> n < 4) n--;
    for (let i = 0; i < n; i++) { const w = Math.max(1, cw >> (i + 1)), h = Math.max(1, ch >> (i + 1)); bas.push(K.target(w, h)); haut.push(i < n - 1 ? K.target(w, h) : null); }
    // une texture noire pour les entrées inutilisées
    const noir = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, noir);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    // les lueurs : un quadrilatère partagé, des instances
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const qb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, qb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ib);
    gl.bufferData(gl.ARRAY_BUFFER, 4096 * 36, gl.DYNAMIC_DRAW);
    for (const [loc, nb, off] of [[1, 4, 0], [2, 4, 16], [3, 1, 32]]) { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, nb, gl.FLOAT, false, 36, off); gl.vertexAttribDivisor(loc, 1); }
    gl.bindVertexArray(null);
    let perdu = false, temps = 0;
    K.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); perdu = true; });

    // calques 2D (pont pour les machines en canvas 2D) : 'scene' (ce qu'on voit, éclairé) et 'lumiere' (ce qui brille)
    const calques = {};
    function calque(nom, o) {
      if (calques[nom]) return calques[nom];
      const e = (o && o.echelle) || 1, fixe = !!(o && o.fixe);
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(cw * e)); c.height = Math.max(1, Math.round(ch * e));
      const g = c.getContext('2d');
      g.setTransform(c.width / W, 0, 0, c.height / H, 0, 0);
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const C = {
        c, g, tex, w: W, h: H, actif: true, sale: true, fixe,
        // calque fixe : envoyé à la carte graphique seulement après marquer() (ou vider())
        marquer() { C.sale = true; return C; },
        // efface le calque : la scène en noir (ou une couleur css), les lumières en noir opaque
        vider(css) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.fillStyle = css || '#000'; g.fillRect(0, 0, c.width, c.height); g.restore(); C.sale = true; return C; },
        envoyer() {
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
          C.sale = false;
        },
      };
      C.vider();
      calques[nom] = C;
      return C;
    }

    // un lot de lueurs, réutilisable d'une image à l'autre
    function lot(o) {
      o = Object.assign({ forme: 'gauss', mode: 'eclat', gain: 1, beta: 3, pointes: 1, angle: 0.7854 }, o || {});
      let cap = 256, nb = 0, D = new Float32Array(cap * 9);
      const pousser = (x0, y0, x1, y1, r, cr, cg, cb, f) => {
        if (nb >= cap) { cap *= 2; const N = new Float32Array(cap * 9); N.set(D); D = N; }
        const k = nb * 9;
        D[k] = x0; D[k + 1] = y0; D[k + 2] = x1; D[k + 3] = y1; D[k + 4] = r; D[k + 5] = cr; D[k + 6] = cg; D[k + 7] = cb; D[k + 8] = f;
        nb++;
      };
      const L = {
        opt: o,
        get n() { return nb; },
        vider() { nb = 0; return L; },
        // un point lumineux : rayon (px css ; σ en gauss, α en Moffat), couleur linéaire ; pointes : seulement pour la forme 'etoile'
        point(x, y, r, cr, cg, cb, pointes) { pousser(x, y, x, y, r, cr, cg, cb, 3 | (pointes ? 4 : 0)); return L; },
        // une traînée : le chemin parcouru pendant la pose (vx, vy en px css)
        trainee(x, y, vx, vy, r, cr, cg, cb) { pousser(x - vx, y - vy, x, y, r, cr, cg, cb, 3); return L; },
        // un segment ; bouts : 0 francs, 1 départ arrondi, 2 arrivée arrondie, 3 les deux
        segment(x0, y0, x1, y1, r, cr, cg, cb, bouts = 3) { pousser(x0, y0, x1, y1, r, cr, cg, cb, bouts); return L; },
        // une ligne brisée continue (pts = [x0, y0, x1, y1, …]) : segments jointifs sans recouvrement, bouts arrondis
        ligne(pts, r, cr, cg, cb, fermee) {
          const m = pts.length >> 1;
          for (let i = 0; i < m - 1; i++) pousser(pts[2 * i], pts[2 * i + 1], pts[2 * i + 2], pts[2 * i + 3], r, cr, cg, cb, fermee ? 0 : (i === 0 ? 1 : 0) | (i === m - 2 ? 2 : 0));
          if (fermee && m > 2) pousser(pts[2 * m - 2], pts[2 * m - 1], pts[0], pts[1], r, cr, cg, cb, 0);
          return L;
        },
        // dessine le lot (par addition) dans la lumière de la cabine, ou dans une autre cible
        dessiner(cible) {
          if (!nb || perdu) return L;
          const T = cible || lum;
          gl.bindFramebuffer(gl.FRAMEBUFFER, T.fb); gl.viewport(0, 0, T.w, T.h);
          gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
          const F = { gauss: 0, moffat: 1, etoile: 2 }[o.forme] || 0;
          const kb = Math.pow(1e-3, -1 / o.beta) - 1;
          pg.lueur.use().f('uRes', W, H).f('uE', F ? Math.sqrt(Math.max(kb, 1)) : 3.5).f('uEP', 16).f('uMode', o.mode === 'flux' ? 0 : 1).f('uForme', F)
            .f('uBeta', o.beta).f('uGain', o.gain).f('uPx', W / T.w).f('uPointes', o.pointes).f('uAngle', o.angle);
          gl.bindVertexArray(vao);
          gl.bindBuffer(gl.ARRAY_BUFFER, ib);
          gl.bufferData(gl.ARRAY_BUFFER, D.subarray(0, nb * 9), gl.DYNAMIC_DRAW);
          gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, nb);
          gl.bindVertexArray(null);
          gl.disable(gl.BLEND);
          return L;
        },
      };
      return L;
    }

    const R = {
      K, gl, W, H, cw, ch, sx, opt, niveaux: n,
      get perdu() { return perdu || gl.isContextLost(); },
      cibles: { lum, bas, haut },
      // la cible « scène » en WebGL (albédo linéaire, éclairé au tirage par l'ambiant et les lumières)
      scene() { if (!sceneGL) sceneGL = K.target(cw, ch); return sceneGL; },
      calque, lot,
      // une palette en texture (n × 1, flottante) ; à lire avec texture(uLut, vec2(t, .5))
      lut(fn, nb = 256) { const d = new Float32Array(nb * 4); for (let i = 0; i < nb; i++) { const c = fn(i / (nb - 1)); d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 1; } return K.texture(nb, 1, 'h', gl.LINEAR, d); },
      // un programme plein écran de la machine, dessiné dans une cible (par défaut : la lumière, par addition si ajout)
      passe(P, cible, ajout) {
        if (perdu) return R;
        if (ajout) { gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); }
        K.run(P, cible || lum);
        if (ajout) gl.disable(gl.BLEND);
        return R;
      },
      regler(o) {
        for (const k in o) {
          if (k === 'courbe' || k === 'lupton') Object.assign(opt[k], o[k]);
          else opt[k] = o[k];
        }
        return R;
      },
      // une cible de phosphore : ce qu'on y dessine persiste et s'éteint lentement (remanence par image à 60 i/s) ;
      // elle s'ajoute à la lumière au tirage. Pour les traits mathématiques (harmonographe, attracteur, oscilloscope).
      phosphore() { if (!trace) trace = K.target(cw, ch); return trace; },
      // début d'image : la lumière repart de zéro (et la scène WebGL du fond, si elle existe) ; le phosphore décroît
      debut(dt) {
        if (perdu) return R;
        K.clear(lum);
        if (sceneGL) K.clear(sceneGL);
        if (trace) {
          const k = opt.remanence > 0 ? Math.pow(clamp(opt.remanence, 0, 0.9999), (dt || 1 / 60) * 60) : 0;
          if (k <= 0) K.clear(trace);
          else { gl.enable(gl.BLEND); gl.blendFunc(gl.ZERO, gl.CONSTANT_COLOR); gl.blendColor(k, k, k, 1); pg.copie.use().t('uT', noir).f('uK', 0); K.run(pg.copie, trace); gl.disable(gl.BLEND); }
        }
        return R;
      },
      // fin d'image : halo, tirage, copie dans env.ctx
      fin(dt) {
        temps += dt || 1 / 60;
        if (R.perdu) return R;
        const c2 = calques.lumiere && calques.lumiere.actif ? calques.lumiere : null;
        const cS = calques.scene && calques.scene.actif ? calques.scene : null;
        if (c2 && (!c2.fixe || c2.sale)) c2.envoyer();
        if (cS && (!cS.fixe || cS.sale)) cS.envoyer();
        const g2 = c2 ? opt.gain2D : 0;
        if (trace) { gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); pg.copie.use().t('uT', trace).f('uK', 1); K.run(pg.copie, lum); gl.disable(gl.BLEND); }
        // la pyramide descend…
        for (let i = 0; i < n; i++) {
          const src = i === 0 ? lum : bas[i - 1];
          pg.bas.use().t('uSrc', src).t('uSrc2', c2 && i === 0 ? c2.tex : noir).f('uTx', 1 / src.w, 1 / src.h)
            .f('uGain2', i === 0 ? g2 : 0).f('uPremier', i === 0 ? 1 : 0).f('uSeuil', opt.seuil).f('uGenou', Math.max(1e-3, opt.genou));
          K.run(pg.bas, bas[i]);
        }
        // … puis remonte en accumulant les flous de plus en plus larges
        for (let i = n - 2; i >= 0; i--) {
          const petit = i === n - 2 ? bas[n - 1] : haut[i + 1];
          pg.haut.use().t('uPetit', petit).t('uCourant', bas[i]).f('uTx', 1 / petit.w, 1 / petit.h).f('uRayon', opt.rayon);
          K.run(pg.haut, haut[i]);
        }
        const somme = (m) => { let s = 0; for (let i = 0; i < m; i++) s += Math.pow(opt.rayon, i); return s; };
        const halo = n > 1 ? haut[0] : bas[0];
        const ji = Math.min(2, n - 1), illum = ji < n - 1 ? haut[ji] : bas[n - 1];
        const scMode = cS ? 2 : sceneGL ? 1 : 0;
        const k = courbeLottes(opt.courbe);
        pg.tirage.use().t('uLum', lum).t('uLum2', c2 ? c2.tex : noir).t('uScene', cS ? cS.tex : sceneGL || noir).t('uHalo', halo).t('uIllum', illum)
          .f('uGain2', g2).f('uScMode', scMode).f('uForce', opt.halo).f('uNH', 1 / somme(n)).f('uNI', 1 / somme(n - ji)).f('uEcl', opt.eclairage)
          .f('uExpo', opt.expo).f('uTon', TONS[opt.tons] != null ? TONS[opt.tons] : 0).f('uBlanc', Math.log2(opt.blanc), 1 / Math.max(0.1, Math.log2(opt.courbe.max / opt.blanc))).f('uSat', Math.min(SAT_MAX, opt.saturation))
          .f('uVig', opt.vignetage).f('uGrain', opt.grain).f('uTemps', temps % 1000).f('uAspect', W / H)
          .f('uFond', opt.fond[0], opt.fond[1], opt.fond[2]).f('uAmb', opt.ambiant[0], opt.ambiant[1], opt.ambiant[2])
          .f('uCon', opt.contraste).f('uGrainN', opt.grainNoir).f('uTeinte', opt.teinte[0], opt.teinte[1], opt.teinte[2]).f('uReleve', opt.releve[0], opt.releve[1], opt.releve[2])
          .f('uCourbe', k[0], k[1], k[2], k[3]).f('uLup', opt.lupton.q, opt.lupton.etirement);
        K.run(pg.tirage, null);
        if (env.ctx && opt.copie !== false) {
          const ctx = env.ctx;
          ctx.save(); ctx.globalCompositeOperation = 'copy'; ctx.globalAlpha = 1;
          ctx.drawImage(K.canvas, 0, 0, W, H);
          ctx.restore();
        }
        return R;
      },
      detruire() { if (propre) K.lose(); },
    };
    return R;
  }

  /* ═══════════════ 4 bis. FKGL.cabine : la cabine de rendu A, portée à l'identique ═══════════════ */
  // Mêmes nuanceurs et mêmes réglages que app/js/fkcabine.js (rendu A, 79f63a2) : une machine qui l'utilise peut charger
  // fkrendu.js à la place sans rien changer. Usage : const cab = FKGL.cabine(K, { levels: 6 }) ; on dessine dans cab.scene ;
  // cab.finish({ expo, bloom, thr, knee, radius, clampV, sat, con, vig, grain, grainBlack, tone: 'agx'|'aces', ink, tint, paper, lift, glowSrc, src, out }).
  function cabineK(K, opt) {
    const HEAD = window.FKGL.HEAD;
    const FS_DOWN = HEAD + `
uniform sampler2D uT; uniform vec2 uPx; uniform float uThr, uKnee, uFirst, uClampV;
out vec4 o;
vec3 pre(vec3 c){
  c = min(c, vec3(uClampV));
  if (uFirst < .5) return c;
  float br = max(c.r, max(c.g, c.b));
  float soft = clamp(br - uThr + uKnee, 0., 2. * uKnee); soft = soft * soft / (4. * uKnee + 1e-5);
  return c * max(soft, br - uThr) / max(br, 1e-5);
}
void main(){
  vec3 s = pre(texture(uT, vUv).rgb) * 4.;
  s += pre(texture(uT, vUv - uPx).rgb) + pre(texture(uT, vUv + uPx).rgb);
  s += pre(texture(uT, vUv + vec2(uPx.x, -uPx.y)).rgb) + pre(texture(uT, vUv - vec2(uPx.x, -uPx.y)).rgb);
  o = vec4(s * .125, 1.);
}`;
    const FS_UP = HEAD + `
uniform sampler2D uT, uD; uniform vec2 uPx; uniform float uScat;
out vec4 o;
void main(){
  vec3 s = texture(uT, vUv + vec2(-2. * uPx.x, 0.)).rgb + texture(uT, vUv + vec2(2. * uPx.x, 0.)).rgb
         + texture(uT, vUv + vec2(0., 2. * uPx.y)).rgb + texture(uT, vUv + vec2(0., -2. * uPx.y)).rgb;
  s += 2. * (texture(uT, vUv + uPx).rgb + texture(uT, vUv - uPx).rgb + texture(uT, vUv + vec2(uPx.x, -uPx.y)).rgb + texture(uT, vUv - vec2(uPx.x, -uPx.y)).rgb);
  o = vec4(mix(texture(uD, vUv).rgb, s / 12., uScat), 1.);
}`;
    const FS_FIN = HEAD + `
uniform sampler2D uS, uB; uniform vec2 uRes; uniform float uExpo, uBloom, uSat, uCon, uVig, uGrain, uTime, uTone, uInk, uBlack;
uniform vec3 uTint, uPaper, uLift;
out vec4 o;
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
// AgX minimal (Benjamin Wrensch, 2023) : les couleurs saturées très lumineuses blanchissent sans virer de teinte
vec3 agx(vec3 v){
  const mat3 M = mat3(.842479062253094, .0423282422610123, .0423756549057051, .0784335999999992, .878468636469772, .0784336, .0792237451477643, .0791661274605434, .879142973793104);
  const mat3 Mi = mat3(1.19687900512017, -.0528968517574562, -.0529716355144438, -.0980208811401368, 1.15190312990417, -.0980434501171241, -.0990297440797205, -.0989611768448433, 1.15107367264116);
  v = clamp(log2(max(M * v, vec3(1e-10))), -12.47393, 4.026069);
  v = (v + 12.47393) / 16.5;
  vec3 v2 = v * v, v4 = v2 * v2;
  v = 15.5 * v4 * v2 - 40.14 * v4 * v + 31.96 * v4 - 6.868 * v2 * v + .4298 * v2 + .1191 * v - .00232;
  return pow(max(Mi * v, vec3(0.)), vec3(2.2));
}
float tpdf(vec2 p){ return hash12(p) + hash12(p + 17.31) - 1.; }
void main(){
  vec3 c = texture(uS, vUv).rgb;
  c += texture(uB, vUv).rgb * uBloom;
  c = c * uTint * uExpo + uLift;
  vec2 d = (vUv - .5) * vec2(uRes.x / uRes.y, 1.);
  float r2 = dot(d, d) * uVig;
  c *= 1. / ((1. + r2) * (1. + r2));
  float l = dot(c, vec3(.2126, .7152, .0722));
  c = max(mix(vec3(l), c, uSat), 0.);
  vec3 t = uTone > .5 ? agx(c) : aces(c);
  t = pow(t, vec3(1. / 2.2));
  t = clamp((t - .5) * uCon + .5, 0., 1.);
  float lum = dot(t, vec3(.2126, .7152, .0722));
  if (uInk > .5){
    float a = clamp(max(t.r, max(t.g, t.b)) * 1.3, 0., 1.);
    vec3 ink = clamp(mix(vec3(lum), t, 1.45) * .92 - .04, 0., 1.);
    t = mix(uPaper, ink, a);
  }
  vec2 px = vUv * uRes;
  float gm = 4. * lum * (1. - lum) + uBlack * (1. - lum);
  t += (hash12(px + fract(uTime * 7.31) * 113.) - .5) * uGrain * gm;
  t += tpdf(px + fract(uTime * 3.17) * 71.) / 255.;
  o = vec4(t, 1.);
}`;
    opt = opt || {};
    const gl = K.gl;
    const W = opt.w || K.canvas.width, H = opt.h || K.canvas.height;
    const pd = K.program(FS_DOWN), pu = K.program(FS_UP), pf = K.program(FS_FIN);
    const scene = K.target(W, H, 'h', gl.LINEAR);
    const levels = [];
    let w = W, h = H;
    const nl = opt.levels || 6;
    for (let i = 0; i < nl; i++) {
      w = Math.max(2, w >> 1); h = Math.max(2, h >> 1);
      levels.push({ d: K.target(w, h, 'h', gl.LINEAR), u: K.target(w, h, 'h', gl.LINEAR) });
      if (w <= 4 || h <= 4) break;
    }
    const C = {
      scene, levels, W, H, t: 0,
      glow(src, o) {
        o = o || {};
        let s2 = src || scene;
        for (let i = 0; i < levels.length; i++) {
          const L = levels[i];
          pd.use().t('uT', s2).f('uPx', 1 / s2.w, 1 / s2.h).f('uThr', o.thr != null ? o.thr : 1).f('uKnee', o.knee != null ? o.knee : 0.5)
            .f('uFirst', i === 0 ? 1 : 0).f('uClampV', o.clampV || 64);
          K.run(pd, L.d);
          s2 = L.d;
        }
        let u = levels[levels.length - 1].d;
        for (let i = levels.length - 2; i >= 0; i--) {
          const L = levels[i];
          pu.use().t('uT', u).t('uD', L.d).f('uPx', 0.5 / L.d.w, 0.5 / L.d.h).f('uScat', o.radius != null ? o.radius : 0.72);
          K.run(pu, L.u);
          u = L.u;
        }
        return u;
      },
      finish(o) {
        o = o || {};
        C.t += 1 / 60;
        const b = (o.bloom == null ? 0.7 : o.bloom) > 0 ? C.glow(o.glowSrc, o) : levels[0].d;
        const tint = o.tint || [1, 1, 1], paper = o.paper || [0.9, 0.87, 0.8], lift = o.lift || [0, 0, 0];
        pf.use().t('uS', o.src || scene).t('uB', b).f('uRes', K.canvas.width, K.canvas.height)
          .f('uExpo', o.expo == null ? 1 : o.expo).f('uBloom', o.bloom == null ? 0.7 : o.bloom)
          .f('uSat', o.sat == null ? 1 : o.sat).f('uCon', o.con == null ? 1 : o.con).f('uVig', o.vig == null ? 0.35 : o.vig)
          .f('uGrain', o.grain == null ? 0.035 : o.grain).f('uBlack', o.grainBlack == null ? 0.25 : o.grainBlack).f('uTime', C.t)
          .f('uTone', o.tone === 'agx' ? 1 : 0).f('uInk', o.ink ? 1 : 0)
          .f('uTint', tint[0], tint[1], tint[2]).f('uPaper', paper[0], paper[1], paper[2]).f('uLift', lift[0], lift[1], lift[2]);
        K.run(pf, o.out || null);
      },
    };
    return C;
  }
  if (window.FKGL && !window.FKGL.cabine) window.FKGL.cabine = cabineK;

  /* ═══════════════ 5. Repli en canvas 2D ═══════════════ */
  // même contrat (debut, calque, lot, fin, regler, detruire), sans tirage filmique : le halo est un flou du calque des lumières
  function cabine2D(env, reglages) {
    const W = env.w, H = env.h, ctx = env.ctx;
    const opt = Object.assign({}, DEFAUTS, reglages || {});
    const dpr = Math.min(env.dpr || 1, opt.plafond);
    const mk = (e) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(W * dpr * e)); c.height = Math.max(1, Math.round(H * dpr * e)); const g = c.getContext('2d'); g.setTransform(c.width / W, 0, 0, c.height / H, 0, 0); return { c, g }; };
    const calques = {}, flou = mk(0.25);
    const css = (r, g, b, a) => `rgba(${Math.round(clamp(versSrgb(r), 0, 1) * 255)},${Math.round(clamp(versSrgb(g), 0, 1) * 255)},${Math.round(clamp(versSrgb(b), 0, 1) * 255)},${a})`;
    function calque(nom) {
      if (calques[nom]) return calques[nom];
      const L = mk(1);
      const C = { c: L.c, g: L.g, w: W, h: H, actif: true, vider(f) { L.g.save(); L.g.setTransform(1, 0, 0, 1, 0, 0); L.g.fillStyle = f || '#000'; L.g.fillRect(0, 0, L.c.width, L.c.height); L.g.restore(); return C; }, envoyer() {} };
      C.vider();
      calques[nom] = C; return C;
    }
    function lot(o) {
      o = Object.assign({ gain: 1 }, o || {});
      let items = [];
      const L = {
        opt: o, get n() { return items.length; },
        vider() { items = []; return L; },
        point(x, y, r, cr, cg, cb) { items.push([x, y, x, y, r, cr, cg, cb]); return L; },
        trainee(x, y, vx, vy, r, cr, cg, cb) { items.push([x - vx, y - vy, x, y, r, cr, cg, cb]); return L; },
        segment(x0, y0, x1, y1, r, cr, cg, cb) { items.push([x0, y0, x1, y1, r, cr, cg, cb]); return L; },
        ligne(pts, r, cr, cg, cb) { for (let i = 0; i + 3 < pts.length; i += 2) items.push([pts[i], pts[i + 1], pts[i + 2], pts[i + 3], r, cr, cg, cb]); return L; },
        dessiner() {
          const g = calque('lumiere').g;
          g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
          for (const [x0, y0, x1, y1, r, cr, cg, cb] of items) {
            const k = o.gain / opt.gain2D;
            if (x0 === x1 && y0 === y1) {
              const gr = g.createRadialGradient(x0, y0, 0, x0, y0, r * 3);
              gr.addColorStop(0, css(cr * k, cg * k, cb * k, 1)); gr.addColorStop(0.35, css(cr * k * 0.35, cg * k * 0.35, cb * k * 0.35, 1)); gr.addColorStop(1, 'rgba(0,0,0,0)');
              g.fillStyle = gr; g.fillRect(x0 - r * 3, y0 - r * 3, r * 6, r * 6);
            } else { g.strokeStyle = css(cr * k, cg * k, cb * k, 1); g.lineWidth = r * 1.6; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
          }
          g.restore();
          return L;
        },
      };
      return L;
    }
    return {
      W, H, opt, perdu: false, deuxD: true, calque, lot, cibles: {},
      regler(o) { Object.assign(opt, o); return this; },
      debut() { return this; },
      fin() {
        const S = calques.scene, Lu = calques.lumiere;
        ctx.save(); ctx.globalCompositeOperation = 'copy';
        if (S) ctx.drawImage(S.c, 0, 0, W, H); else { ctx.fillStyle = css(opt.fond[0], opt.fond[1], opt.fond[2], 1); ctx.fillRect(0, 0, W, H); }
        if (Lu) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.drawImage(Lu.c, 0, 0, W, H);
          if (opt.halo > 0) {
            const g = flou.g; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, flou.c.width, flou.c.height);
            g.filter = `blur(${Math.max(2, flou.c.width / 90)}px)`; g.drawImage(Lu.c, 0, 0, flou.c.width, flou.c.height); g.restore();
            ctx.globalAlpha = clamp(opt.halo, 0, 1); ctx.drawImage(flou.c, 0, 0, W, H); ctx.globalAlpha = 1;
          }
        }
        ctx.restore();
        return this;
      },
      detruire() {},
    };
  }
  function cabineOuRepli(env, reglages) {
    try { return cabine(env, reglages); } catch (e) { console.warn('FKR : repli en 2D', e); return cabine2D(env, reglages); }
  }

  /* ═══════════════ 6. Lueurs prêtes à l'emploi en canvas 2D ═══════════════ */
  // une tache de lumière (css sRGB, profil gaussien + ailes de Moffat), mise en cache ; à dessiner en 'lighter'
  const sprites = new Map();
  function sprite(rgb, rayon = 16) {
    const q = (v) => Math.round(clamp(v, 0, 4) * 32);
    const cle = q(rgb[0]) + ',' + q(rgb[1]) + ',' + q(rgb[2]) + ',' + Math.round(rayon);
    let s = sprites.get(cle);
    if (s) return s;
    const R = Math.max(2, Math.round(rayon)), N = R * 2;
    const c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d'), im = g.createImageData(N, N), d = im.data;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const r = Math.hypot(x + 0.5 - R, y + 0.5 - R) / R;
      const k = Math.max(0, Math.exp(-r * r * 9) + 0.12 * Math.pow(1 + r * r * 30, -1.5) - 0.12 * Math.pow(31, -1.5)) * (r < 1 ? 1 : 0);
      const o = (y * N + x) * 4;
      d[o] = Math.round(clamp(versSrgb(rgb[0] * k), 0, 1) * 255); d[o + 1] = Math.round(clamp(versSrgb(rgb[1] * k), 0, 1) * 255); d[o + 2] = Math.round(clamp(versSrgb(rgb[2] * k), 0, 1) * 255); d[o + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    if (sprites.size > 600) sprites.clear();
    sprites.set(cle, c);
    return c;
  }

  /* ═══════════════ 7. Veille de cadence : repli automatique (CEO, 13/11) ═══════════════ */
  // Une machine qui garde son ancien rendu (2D, plus léger) l'appelle quand la cadence RÉELLE de l'appareil reste
  // sous un seuil. Usage : const v = FKR.veille({ id: 'fourmis', seuil: 24, auRepli: (ips) => passerAuRendu2D() });
  // puis v.image(t) à chaque image (t = performance.now()). Après « attente » s, on mesure « duree » s ; si la médiane
  // des images est sous le seuil, auRepli est appelé une fois, et le choix est mémorisé pour cette machine (clé
  // fkr-repli du stockage local ; v.deja indique un repli déjà mémorisé, FKR.veille.oublier() efface tout).
  // Inactive sous automate de test (navigator.webdriver) : les bancs mesurent le rendu complet.
  const CLE_REPLI = 'fkr-repli';
  const lireRepli = () => { try { return JSON.parse(localStorage.getItem(CLE_REPLI) || '{}') || {}; } catch (e) { return {}; } };
  function veille(o) {
    o = Object.assign({ seuil: 24, attente: 1.5, duree: 4 }, o || {});
    const memo = lireRepli(), auto = typeof navigator !== 'undefined' && navigator.webdriver;
    let t0 = null, fini = !!auto, ts = [];
    const V = {
      deja: !!(o.id && memo[o.id]) && !auto,
      image(t) {
        if (fini) return;
        if (t0 === null) t0 = t;
        const age = (t - t0) / 1000;
        if (age < o.attente) return;
        ts.push(t);
        if (age < o.attente + o.duree) return;
        fini = true;
        const d = []; for (let i = 1; i < ts.length; i++) d.push(ts[i] - ts[i - 1]);
        d.sort((a, b) => a - b);
        const ips = d.length ? 1000 / Math.max(1, d[d.length >> 1]) : 0;
        if (ips && ips < o.seuil) {
          if (o.id) { const m = lireRepli(); m[o.id] = Math.round(ips); try { localStorage.setItem(CLE_REPLI, JSON.stringify(m)); } catch (e) { /* rien */ } }
          try { o.auRepli && o.auRepli(ips); } catch (e) { console.warn('FKR : repli', e); }
        }
      },
    };
    return V;
  }
  veille.oublier = () => { try { localStorage.removeItem(CLE_REPLI); } catch (e) { /* rien */ } };

  // fond(nom) : un fond de la DA en linéaire ('defaut', 'eau', 'cosmos')
  const fond = (nom) => deCss(FONDS[nom] || nom || FONDS.defaut);
  window.FKR = { version: '1.3.0', couleur, palette, GLSL: G, glsl, fs, cabine, cabine2D, cabineOuRepli, cabineK, sprite, veille, DEFAUTS, FONDS, fond, courbeLottes };
})();
