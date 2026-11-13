# Rendu B : point de reprise

Dernière mise à jour : 13/11/2026 vers 20 h, heure de Paris. Deux agents tournent (le Ciel et l'Eau, corrections de la recette de Constance) ; échéance du CEO : 21 h.

Rendu B, c'est la relève B du chantier de rendu, Léa « Frame », branche `rendu-b`. À relire ensemble :
- le brief de Kurt, `docs/RENDU-BRIEF.md` ;
- la refonte pédagogique, `docs/REFONTE-PEDAGOGIQUE.md` ;
- la direction artistique de Fausta, `design/fascinations/DA-rendu.md` sur la branche `design` du dépôt Lbxp ;
- la bibliothèque commune, `docs/RENDU-COMMUN.md` ;
- la recette de Constance, `qualite/recettes/2026-11-13-fascinations-rendu-B.md` (dépôt de l'équipe qualité).

## Fait, sur `rendu-b`

- **FKR, la bibliothèque commune** (`app/js/fkrendu.js`) :
  - 1.0 `f8e8704`, 1.1 `276bc8e` (matière), 1.2 `a87f5e0` (réglages de la DA et cabine de rendu A intégrée), `c09d4ac` (l'échelle du son est une convention) ;
  - 1.3 `0ca5857` : `FKR.veille`, le repli automatique selon la cadence réelle (demande du CEO) ;
  - il n'y en a qu'une (décision du CEO) ; rendu B en est propriétaire ;
  - Kurt en a relu la science.
- **Outils** :
  - `tools/test-rendu.mjs` : test de la bibliothèque ;
  - `tools/demo-rendu.html` : banc d'essai ;
  - `tools/avant-apres.mjs` : la preuve de la DA, en tablette paysage, à 3, 15 et 30 s, avec les i/s sur une fenêtre de 2 s et la charge de l'hôte.

  Pour les planches « avant », il faut une copie de référence : `git worktree add /home/user/fasc-avant 93ac705 --detach`.

## État vers 20 h

| Machine | Où | État |
|---|---|---|
| Bulles | `82260f8` | **intégrées** ; Kurt : elles restent dans l'artefact |
| Ciel | `59ea3d6`, aurores `16fd5cb` | intégré ; **recette en cours** (agent) : couchant gris, arc à 390 px (focale sur la largeur), étoiles sous −18°, légende d'altitude à 390 px, neige bleutée, œil nu par défaut sur une aurore forte. Point de reprise : `rendu-b-encours-ciel-recette` |
| Eau | `1def726` | **retirée de l'artefact v36 par Kurt** ; la mare au repos doit redevenir lumineuse (agent en cours) ; garder le V du sillage. Houle ensuite |
| Fourmilière | `5340f50`, planches `955ced5` | **reprise** (points de Kurt) : fourmis de 17 px sur environ 35 cm, taches noires corrigées (bug d'ombre), pont debout à 390 px, `FKR.veille` vers le rendu 2D d'origine |
| Galaxie | `8b81836` | **reprise** : corps noirs, Balmer et [N II], poussière de Cardelli ; trois doutes de science envoyés à Kurt (échelle de temps 230 Ma, poussière sur le bord intérieur des bras, disque à 5400 K stylisé) ; pas de `FKR.veille` (pas de rendu léger) |

**Règle de vitesse (Kurt, brief 89f61bf)** : banc `tools/avant-apres.mjs <id> <scène> --secondes=3,15,30`. Pas de déclin, et au moins la moitié des i/s de l'original sous la même charge. La Fourmilière et la collision de la Galaxie sont sous la moitié en simulation sans GPU : à vérifier sur la tablette ; la Fourmilière a la veille comme filet.

**Pour reprendre une machine** :
1. partir de `rendu-b` (ou de sa branche `rendu-b-encours-<machine>`) ;
2. lire `git log` puis le diff du fichier `app/js/machines/s-*.js` ;
3. finir le rendu ;
4. lancer les tests (`node tools/test-fiches.mjs <id>`, `node tools/test-jeunesse.mjs` à 8/8, `node tools/smoke.mjs`) ;
5. faire la planche `node tools/avant-apres.mjs <id> <scène> --secondes=3,15,30` ;
6. passer les fichiers de la machine sur `rendu-b` ;
7. envoyer le rapport de 5 lignes au CEO et le hash à Kurt.

## À faire ensuite, dans l'ordre du CEO (18 h 05)

- Intégrer les reprises du Ciel (et des aurores) et de l'Eau, avec un hash par machine pour Kurt.
- **Système solaire** (Galaxie), puis **houle et tsunamis** (Eau) ; le **Tunnel** est rattaché à la Galaxie : la porte des étoiles et le tunnel des démos sont retirés ou étiquetés « fiction », le trou de ver est « hypothétique ». Le cadrage est au §2 de la refonte. Envoyer à Kurt les chemins des réglages de chaque nouvelle scène.
- **Puis** : Murmuration avec les bancs de poissons (Couzin 2002), Sable, Harpe, Spectre, Cymatiques, Kaléidoscope, Jeu de la vie, Attracteur, Fractales.
  - Harpe, Spectre et Cymatiques utilisent l'échelle commune du son, et l'affichent comme une convention.
  - Le Blob et les Spirales sont à rendu A.

## Contraintes

- **Agents** : 2 en parallèle au plus (CEO, 18 h 05). La limite d'usage vaut pour tout le compte, sur 5 heures.
- **Redémarrages** : le conteneur peut redémarrer. Les agents committent tôt et souvent, et les branches de travail sont poussées (`rendu-b-encours-*` ; le proxy git refuse de les supprimer).
- **Consigne des agents** : DA, brief, FKR, méthode, tests, sauvegarde. Elle est dans le bloc-notes de la session, et ce fichier en reprend l'essentiel.
