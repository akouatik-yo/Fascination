# Fascinations Labo — état de la refonte jeunesse (branche `jeunesse`)

## Livré (version 0.1.65)
- **Conception** : le débat entre personas et sa synthèse, dans docs/jeunesse-debat/, docs/JEUNESSE-CONCEPTION.md et docs/JEUNESSE-FICHES.md.
- **Le shell jeunesse** :
  - 3 écrans : la Machine, la Carte en 7 mondes et le Carnet, plus le coin des grands ;
  - les gestes, les pastilles de scènes, et les tiroirs Bidouiller (leviers, recettes, Labo) et Pourquoi (« Et si » avec pari) ;
  - l'historique ‹ ›, le hasard à graine et le « sac » sans répétition.
- **Aucune réinitialisation involontaire**, même au changement de son, d'écran ou de tiroir, ou à la rotation. Les 8 tests de tools/test-jeunesse.mjs passent, sur les fichiers séparés comme sur le fichier unique.
- **Les 32 fiches** sont écrites, relues scientifiquement et conformes à tools/test-fiches.mjs. Le balayage des 32 machines (110 scènes, toutes les recettes) n'a trouvé aucune erreur.
- **Les vignettes de la Carte** sont générées par tools/vignettes.mjs.
- **Les livrables** : dist/fascinations-labo.apk, dist/jeunesse.html, et l'artefact https://claude.ai/artifact/5VrpY5djWxHT9VMirjD9La

## Points ouverts (à vérifier sur la tablette)
- **Fourmis** : avec le double pont, la colonie ne bascule pas toujours vers la branche courte en rendu lent. Le « Et si » correspondant est retiré.
- **Textes écrits par les machines sur l'image** : ils restent au vouvoiement, comme dans la version adulte.
- **Illusions** : les boutons « Illusion suivante », « Au hasard » et « Diaporama » du Labo changent de famille sans que les pastilles suivent.
- **État gardé d'une visite à l'autre** : certaines machines (ciel, sonillus, moire) gardent leur état au niveau du module. Les plages de hasard compensent pour les réglages qui comptent.
- **Murmuration** : l'effet de confusion du prédateur n'est pas modélisé.
- **Photo dans l'artefact claude.ai** : le téléchargement n'y est pas permis, mais la photo est bien rangée dans le Carnet. Dans l'APK, elle va dans Images/Fascinations.
- **Rien n'a été essayé sur un vrai appareil**, et les sons n'ont pas été écoutés.
