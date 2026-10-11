# Dossier commun — refonte « Fascinations Jeunesse » (10-14 ans)

## La demande de Yoann (le créateur du projet), mot pour mot
« Je voudrais s'il te plaît que tu fasses une refonte majeure du projet : une version jeunesse de l'application à destination d'enfants entre 10 et 14 ans. Tu gardes exactement les mêmes machines, mais il faudrait que tu réfléchisses à complètement retravailler l'interface pour la rendre plus accessible et ergonomique, moins complexe dans les menus tout en essayant de conserver les possibilités d'interactions intéressantes et éducatives. Il faut également que tu adaptes les explications pour qu'elles soient accessibles à ce public, tu peux même en rajouter.
Et pour cette version, je voudrais que même si elle est in fine pédagogique, le premier abord soit surtout ludique et fascinant. Ça doit être la fascination et le jeu qui donne envie d'en savoir plus, pas l'inverse. Dans cette version il faut qu'il y ait au maximum possible des possibilités de bac à sable/laboratoire, c'est en manipulant qu'on apprend beaucoup aussi. Petits détails à améliorer par rapport à la version actuelle : les machines se réinitialisent quand on allume ou éteint le son, entre ou sort du mode Zen, active ou désactive le décor… c'est gênant. Il faut que tant qu'on est dans une machine elle ne se réinitialise que si on le demande. Autre point, il faudrait qu'au démarrage de l'application la machine change aléatoirement, et au démarrage d'une machine il faudrait qu'elle affiche des scènes et réglages différents, là aussi de manière aléatoire. Comme ça si on fait défiler les machines avec les flèches du haut, on peut le faire des centaines de fois sans jamais tomber sur la même chose.
C'est vraiment une refonte majeure […] réfléchir à comment structurer l'application de manière complètement nouvelle (pas juste un skin et des textes différents), afin de la rendre ludique puis pédagogique. »

## Le produit actuel
- « Fascinations » : 32 machines (simulations scientifiques interactives, souvent très belles : WebGL2, Canvas 2D, son synthétisé), en français. Appli web empaquetée en APK Android (WebView plein écran, hors ligne) ; cible principale : une **tablette** (tactile, paysage ou portrait). Aussi utilisable sur ordinateur.
- 6 catégories : Vivant, Éléments, Motifs, Cosmos, Sons, Invisible.
- Inventaire détaillé de chaque machine (accroche, outils, contenu du panneau) : `/tmp/claude-0/-home-user-Fascination/70d63a52-45f3-5991-b205-95e085c7eea2/scratchpad/inventaire.md` (à lire).
- Code : `/home/user/Fascination/app/` (shell : `app/js/shell.js`, machines : `app/js/machines/s-*.js`). Lecture possible si utile, mais l'essentiel est dans l'inventaire.

### Interface actuelle (version « adulte », dense)
- Barre du haut : menu ☰ (liste des machines), ‹ ›, HASARD, SON, BRUITS (générateur de bruits d'ambiance), thème (auto/clair/sombre), PSYCHÉ (filtre de couleurs), molette VITESSE, PHOTO, PAUSE, ZEN (plein écran), PANNEAU.
- Rail de gauche : les 32 machines groupées par catégorie (nom + accroche).
- Panneau de droite (par machine) : titre, accroche, introduction (paragraphe), section « Scènes » (boutons), « Outils » (le geste du doigt : observer, verser, souffler, gomme…, avec une phrase d'aide), « Simulation » (pause, recommencer, vider, décor), puis des dizaines de curseurs / interrupteurs / choix propres à la scène (souvent du vocabulaire savant : « Nombre de Reynolds », « Couplage », « Ramification η », « Mie »…), et « En savoir plus » (4-5 paragraphes denses, niveau adulte cultivé, avec dates et noms de savants).
- Chaque machine a 1 à 6 scènes ; en tout environ 90 scènes. Les machines exposent : des outils (gestes), une fonction `ui()` qui renvoie la liste des réglages (section, note, barre, curseur, interrupteur, choix, boutons), `frame`, `down/move/up` (toucher), `clear` (vider).

### Contraintes techniques
- Les 32 machines doivent rester **exactement les mêmes** (même moteur, mêmes scènes) ; la refonte porte sur l'interface, la structure de l'appli, les textes, les modes de jeu, et ce qu'on peut ajouter « autour » des machines (défis, carnet, questions, etc.) sans réécrire leurs moteurs.
- Il est possible d'ajouter des métadonnées par machine (textes jeunesse, défis, préréglages « recettes », réglages exposés aux enfants, plages aléatoires de départ) dans des fichiers à part.
- Hors ligne, pas de compte, pas de serveur ; on peut stocker localement (progression, carnet, collection).
- Un seul développeur (moi, Claude) : il faut un plan réaliste, dont le cœur est livrable bien fait, plutôt qu'une liste de souhaits.
