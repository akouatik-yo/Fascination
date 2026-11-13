# État — point de reprise

maj : 14/11/2026 vers 0 h 40 (heure de Paris)

## Où en est le dépôt
- **Branche de référence : `jeunesse`.** Elle contient `main` et `ccr-ba505dc0-e427km` (la branche de session d'origine, APK adulte 0.1.33). Rien n'est fusionné dans `main` : c'est Yoann qui décide de la fusion.
- **Livré** : Fascinations Labo 0.1.65 (version 10-14 ans) et Fascinations 0.1.65 (adulte), dans `dist/`. Le détail et les points ouverts sont dans [`docs/JEUNESSE-AVANCEMENT.md`](docs/JEUNESSE-AVANCEMENT.md).

## Fait aujourd'hui (audit n° 1)
- **P-S14, clé de signature** : l'ancienne clé `android/fascinations.p12` est retirée de `jeunesse`, sans réécrire l'historique. Les fichiers de clé sont exclus par `.gitignore`.
  - `tools/build-apk.mjs` lit désormais la clé hors du dépôt (`FASC_KEYSTORE`, `FASC_KEYSTORE_PASS`). Il refuse de signer sans elles, ou si la clé est dans le dépôt, et il ne crée plus de clé lui-même.
  - Le README signale que l'ancienne clé est compromise.
- **P-Q7** : ce fichier, [`decisions.md`](decisions.md), et la ligne « branche de référence » en tête du README.

## Ce qui attend
- **Nouvelle clé de signature** : créée par Ruth le 12/11 vers 15:35, avec l'accord de Yoann. Ses secrets sont dans l'environnement GitHub `signature`, collés par Yoann et non vérifiés par Ruth.
  - Le workflow `.github/workflows/signer-apk.yml` a été relu par Ruth (bon pour un premier lancement, au commit 45e3df4). Il n'a jamais été lancé.
  - **Il attend la décision de Yoann sur la fusion de `jeunesse` dans `main`** : Ruth la recommande, car le bouton de lancement n'apparaît que sur `main`. Au premier passage, prévenir Ruth : elle lira l'empreinte dans le journal.
  - Son premier lancement attend l'approbation de Yoann. Ensuite, Yoann désinstallera l'application, puis la réinstallera une fois.
  - D'ici là, **aucune APK ne peut être construite**, et c'est voulu.
- **Branches `main` et `ccr-ba505dc0-e427km`** : elles portent encore l'ancienne clé, et on n'y fait pas de commit séparé (décision de Ruth, 12/11). `main` la perdra à la fusion de `jeunesse`. Le sort de `ccr-ba505dc0-e427km`, une branche d'essai, relève de l'élagage des branches (R22).
- **Retours de Yoann** : ses tests sur tablette des deux APK 0.1.65.
- **Tutoiement** : la passe sur les textes que les machines écrivent sur l'image attend la réponse de Yoann.
- **Reprise visuelle** de certaines machines : en attente depuis l'audit du 11/11.

## Nuit du 12 au 13/11
- **Fusion** : `jeunesse` est fusionnée dans `main` (26bfa38, en avance rapide), avec l'accord de Yoann. L'ancienne clé n'est plus dans `main`.
- **Chantier rendu** : brief et répartition dans [`docs/RENDU-BRIEF.md`](docs/RENDU-BRIEF.md). Rendu A travaille sur `rendu-a`, rendu B sur `rendu-b` ; cette session relit la justesse scientifique. Feu, Eau et Fourmilière sont intouchables.
- **Âge et niveau** (le rêve de Yoann) : un écran d'accueil demande l'âge (dès 5 ans) puis le niveau ; l'interface s'adapte. Le détail est dans `docs/JEUNESSE-FICHES.md`. Chaque fiche a reçu un texte `petit` (5-8 ans). L'avis de Fausta sur l'ergonomie enfant est attendu.

## 13/11, journée et soirée : livraison finale (point de reprise)
- **Arrêt demandé par Yoann** (relayé par le CEO, 14/11 vers 0 h 15) : on arrête d'itérer, on livre l'état actuel et on se repose.
- **Livré** : l'application unique sur `app-unique`, publiée en artefact « Fascinations » (**v38, finale**). La liste des points restants est dans [`SYNTHESE-NUIT.md`](SYNTHESE-NUIT.md), rubrique « Points restants ».
- **Branches** :
  - `rendu-a` et `rendu-b` : ce qui n'est pas intégré (Galaxie reprise, Eau v2) ;
  - `jeunesse` : la version Labo seule ;
  - `main` : inchangé depuis la fusion du 13/11 à 0 h 40.
- **À la reprise** :
  1. Lire le retour de Yoann sur la tablette : le repli 2D, le Feu, le son.
  2. Décider entre l'application unique et deux applications.
  3. Lever les réserves de Constance listées dans la synthèse, puis faire sa recette avant toute arrivée sur `main`.

## Engagement en cours
Aucun : en pause jusqu'à la reprise.
