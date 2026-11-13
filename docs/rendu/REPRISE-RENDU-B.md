# Rendu B : point de reprise

Dernière mise à jour : 13/11/2026 vers 13 h 01, heure de Paris (après une seconde limite d'usage de 06 h à 10 h 10).

Rendu B, c'est la relève B du chantier de rendu, Léa « Frame », branche `rendu-b`. À relire ensemble :
- le brief de Kurt, `docs/RENDU-BRIEF.md` ;
- la refonte pédagogique, `docs/REFONTE-PEDAGOGIQUE.md` ;
- la direction artistique de Fausta, `design/fascinations/DA-rendu.md` sur la branche `design` du dépôt Lbxp ;
- la bibliothèque commune, `docs/RENDU-COMMUN.md`.

## Fait, sur `rendu-b`

- **FKR, la bibliothèque commune** (`app/js/fkrendu.js`) :
  - 1.0 `f8e8704`, 1.1 `276bc8e` (matière), 1.2 `a87f5e0` (réglages de la DA et cabine de rendu A intégrée), `c09d4ac` (l'échelle du son est une convention) ;
  - il n'y en a qu'une (décision du CEO) ; rendu B en est propriétaire ;
  - Kurt en a relu la science.
- **Outils** :
  - `tools/test-rendu.mjs` : test de la bibliothèque ;
  - `tools/demo-rendu.html` : banc d'essai ;
  - `tools/avant-apres.mjs` : la preuve de la DA, en tablette paysage, à 3 s et 30 s, avec les i/s.

  Pour les planches « avant », il faut une copie de référence : `git worktree add /home/user/fasc-avant 93ac705 --detach`.

## En cours : chaque machine est reprise par un agent (état à 13 h 01)

Chaque machine a sa branche de travail, poussée comme point de reprise. Ce ne sont pas des livraisons : leur contenu passera dans `rendu-b` par cherry-pick, après relecture et tests. Les branches seront supprimées ensuite.

| Machine | Branche de travail | État |
|---|---|---|
| Bulles | `rendu-b-encours-bulles` | v1 livrée sur `rendu-b` (`b0e4e72`, science validée) ; v2 en cours : plafond de coût (échelle 0,75, 8 bulles), reflet, éclat (retours du CEO et de la recette) |
| Ciel | `rendu-b-encours-ciel` | v1 livrée sur `rendu-b` (`d9d82d0`, science validée, trop coûteux) ; correctif de coût et contraste de l'arc en cours ; aurores ensuite |
| Eau | `rendu-b-encours-eau` | quatre scènes faites (la cuve en dernier), tests à passer ; la houle ensuite |
| Fourmilière | `rendu-b-encours-fourmis` | en pause : sol fait, fourmis peu lisibles |
| Galaxie | `rendu-b-encours-galaxie` | en pause : couleurs et poussière faites ; reste la lumière diffuse en blocs |

**Règle de vitesse (Kurt, brief 89f61bf)** : banc `tools/avant-apres.mjs <id> <scène> --secondes=3,15,30`. Pas de déclin, et au moins la moitié des i/s de l'original sous la même charge. Ni le Ciel ni les Bulles ne sont intégrés à l'artefact tant qu'ils ne tiennent pas.

**Pour reprendre une machine** :
1. `git checkout -b travail origin/rendu-b-encours-<machine>` ;
2. lire `git log origin/rendu-b..` puis le diff du fichier `app/js/machines/s-*.js` ;
3. finir le rendu ;
4. lancer les tests (`node tools/test-fiches.mjs <id>`, `node tools/test-jeunesse.mjs` à 8/8, `node tools/smoke.mjs`) ;
5. faire la planche `node tools/avant-apres.mjs <id> <scène>` ;
6. passer les commits sur `rendu-b` par cherry-pick ;
7. envoyer le rapport de 5 lignes au CEO et le hash à Kurt.

## À faire ensuite, dans l'ordre de Kurt

- **Ajouts pédagogiques** :
  - la houle et les tsunamis (Eau) ;
  - les aurores polaires (Ciel) ;
  - le système solaire (Galaxie) ;
  - le Tunnel, rattaché à la Galaxie : la porte des étoiles et le tunnel des démos sont retirés ou étiquetés « fiction », le trou de ver est « hypothétique ».

  Le cadrage est au §2 de la refonte. Envoyer à Kurt les chemins des réglages de chaque nouvelle scène.
- **Puis** : Murmuration avec les bancs de poissons (Couzin 2002), Sable, Harpe, Spectre, Cymatiques, Kaléidoscope, Jeu de la vie, Attracteur, Fractales.
  - Harpe, Spectre et Cymatiques utilisent l'échelle commune du son, et l'affichent comme une convention.
  - Le Blob et les Spirales sont à rendu A.

## Contraintes de cette nuit

- **Limite d'usage** : elle vaut pour tout le compte, sur 5 heures. Elle a arrêté tous les agents de 01 h 48 à 05 h 10. On reste à **3 agents en parallèle au plus**.
- **Redémarrages** : le conteneur peut redémarrer. Les agents committent tôt et souvent, et les branches de travail sont poussées.
- **Consigne des agents** : DA, brief, FKR, méthode, tests, sauvegarde. Elle est dans le bloc-notes de la session, et ce fichier en reprend l'essentiel.
