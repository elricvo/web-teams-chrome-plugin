# Compatibilité Teams Web — qualification V0.1

**Dernière qualification :** 2026-09-17
**Portée :** collecte locale des éléments déjà rendus ; aucune garantie d’exhaustivité.

## Hôtes pris en charge

- `teams.microsoft.com` et `teams.cloud.microsoft` : interface Teams Microsoft 365, adaptée à partir des wrappers `comfy-message-wrapper`.
- `teams.live.com` : Teams Free personnel, adapté à partir des wrappers `message-wrapper`.

L’extension n’accepte pas les autres origines. Elle s’exécute seulement après un clic explicite de l’utilisateur dans l’onglet Teams actif, avec les permissions MV3 `activeTab`, `scripting`, `storage` et `downloads`.

## Qualification Teams Free personnel

Un test autorisé a été effectué sur une conversation personnelle Teams Free rendue dans `teams.live.com`. Les fichiers de preuve (MHTML, JSON et manifeste) restent dans un coffre local et ne sont ni suivis par Git ni publiés.

Résultats vérifiés :

- le DOM sauvegardé contient 10 vrais corps de messages sous `message-body-*` ;
- l’export produit 10 messages, 0 réponse et un `rawCaptureCount` de 10 ;
- les 10 identifiants sont présents et uniques ;
- les 10 auteurs, horodatages et textes normalisés sont présents ;
- la période demandée et la plage observée sont cohérentes ;
- le manifeste conserve l’avertissement `visible-dom-only` et l’état de couverture `partial`.

Le premier essai avait exporté un unique élément de rail de navigation (`48:notes`). La cause était l’emploi du sélecteur Microsoft 365 dans Teams Free. Le correctif sélectionne désormais `data-testid="message-wrapper"` sur `teams.live.com` et utilise l’identifiant du corps de message, plutôt que l’identifiant visuel temporaire du menu.

## Limites non levées

Cette qualification ne valide pas :

- le chargement automatique d’historique par scroll ;
- la détection d’une borne historique atteinte ;
- les fils/réponses non déjà rendus ;
- les pièces jointes, messages supprimés ou modifiés ;
- le caractère exhaustif ou probant de l’archive.

Le statut `partial` doit donc rester affiché et être conservé dans chaque manifeste.

## Procédure de régression manuelle

1. Utiliser une conversation ou un canal de test autorisé, avec des données fictives.
2. Charger et rendre les éléments à vérifier dans Teams Web.
3. Définir une période lorsque les horodatages sont visibles, puis déclencher la capture.
4. Comparer le nombre de vrais wrappers rendus et le nombre de messages exportés.
5. Vérifier l’unicité des identifiants, la présence attendue d’auteur/date/texte et les bornes observées dans le manifeste.
6. Enregistrer les artefacts de test dans le coffre local uniquement ; ne jamais les commiter ni les envoyer à GitHub.
