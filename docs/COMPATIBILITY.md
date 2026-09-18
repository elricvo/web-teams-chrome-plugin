# Compatibilité Teams Web — qualification V0.1

**Dernière qualification :** 2026-09-17
**Portée :** collecte locale des éléments déjà rendus ; aucune garantie d’exhaustivité.

## Hôtes pris en charge

- `teams.microsoft.com`, `teams.cloud.microsoft` et `teams.live.com` : conversations actuelles rendues avec `data-testid="message-wrapper"` contenant un corps `message-body-*`.

La qualification du 18 septembre a montré que `teams.microsoft.com` peut afficher en parallèle des aperçus de barre latérale sous `comfy-message-wrapper` et la conversation ouverte sous `message-wrapper`. Le collecteur ne choisit donc plus un sélecteur sur le seul nom d’hôte : il ne conserve que les cartes possédant un corps `message-body-*`, ce qui exclut les aperçus.

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

Le premier essai avait exporté un unique élément de rail de navigation (`48:notes`) sur Teams Free. La qualification complémentaire Microsoft 365 du 18 septembre a ensuite révélé le problème inverse : le sélecteur `comfy-message-wrapper` récupérait 27 aperçus de la barre latérale, dépourvus des métadonnées de conversation, puis le filtre de période les écartait tous. Le correctif V0.1.1 sélectionne désormais les cartes `message-wrapper` contenant `message-body-*`, extrait l’identifiant du corps et ignore les aperçus.

Sur le MHTML privé fourni pour la conversation Microsoft 365, cette règle identifie **43 cartes de conversation**, toutes avec un `message-body-*` et un `time[datetime]` ISO. Cela qualifie le sélecteur et les métadonnées sur l’instantané ; la validation dans Chrome reste requise avant de conclure à une exportation réelle.

## Collecte automatique V0.3 — implémentée, qualification Chrome requise

La V0.3 exécute un scroll progressif uniquement après consentement explicite, date cible et clic utilisateur. Elle archive chaque lot visible, dédoublonne localement et s’arrête sur une borne observée, un haut stable, un plafond, une demande d’arrêt ou un changement de conversation. Les sélecteurs de conteneur tentés sont `message-pane-list-viewport`, `message-pane-body` et un journal accessible ; l’absence de conteneur provoque un arrêt sûr.

Cette mécanique a des tests unitaires déterministes pour ses décisions de borne, stagnation, plafond et dédoublonnage. **Elle n’a pas encore été qualifiée dans une session Teams Web interactive depuis cet environnement.** La procédure obligatoire figure dans [AUTOMATED-HISTORY-COLLECTION.md](AUTOMATED-HISTORY-COLLECTION.md) ; conserver `partial` jusqu’à sa réalisation sur un corpus de test autorisé.

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
