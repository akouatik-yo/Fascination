# État — point de reprise

maj : 12/11/2026 15:52 (heure de Paris, horloge de la session)

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

## Engagement en cours
Aucun.
