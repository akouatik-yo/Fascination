# Décisions

Les dates sont en heure de Paris. « Source » dit comment la décision est arrivée dans cette session.

| Date | Décision | Source |
|---|---|---|
| au plus tard le 11/10/2026 | Créer une version jeunesse (10-14 ans), **Fascinations Labo** : les mêmes machines et une interface entièrement refaite, sur une nouvelle branche `jeunesse`. | Yoann, dans cette session |
| au plus tard le 11/10/2026 | Ne jamais réinitialiser sans demande explicite (son, Zen, décor…). Machine au hasard au démarrage, scènes et réglages au hasard à chaque arrivée. | Yoann, dans cette session |
| 11/10/2026 | Les choix de conception viennent d'un débat entre personas (`docs/jeunesse-debat/`), synthétisé dans `docs/JEUNESSE-CONCEPTION.md`. | Session (commit be12f5d), sur demande de Yoann |
| 11/11/2026 | La reprise visuelle de certaines machines est mise en attente jusqu'à la lecture du rapport d'audit. | CEO (Tim), message à cette session |
| 11/11/2026 vers 22:15 | **P-S14** : l'ancienne clé de signature Android est compromise. On ne signe plus avec elle et on la retire du dépôt sans réécrire l'historique. La nouvelle clé est créée par Ruth (CTO), hors de tout dépôt. | Yoann, dans le fil du CEO (relayé par Tim et Ruth) |
| 11/11/2026 vers 22:15 | **P-Q7** : un `etat.md`, un `decisions.md`, et la branche de référence indiquée dans le README. | Yoann, dans le fil du CEO (relayé par Tim) |
| 12/11/2026 | Les messages du CEO valent ceux de Yoann pour le travail de cette session, hors actions sensibles. | Yoann, dans cette session |
| 12/11/2026 | Branche de référence : `jeunesse`. | Session, d'après l'historique (elle contient `main` et `ccr-ba505dc0-e427km`) |
| 12/11/2026 | Pas de commit séparé pour retirer l'ancienne clé de `main` ni de `ccr-ba505dc0-e427km` : `main` suivra à la fusion de `jeunesse`, et la clé est de toute façon dans l'historique public. | Ruth (CTO), message à cette session |
