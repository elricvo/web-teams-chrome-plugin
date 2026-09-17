# Recherche et décisions — V1

## Faits établis

- Microsoft Teams Web est une application dynamique : les messages anciens et les réponses peuvent être chargés progressivement, donc leur simple absence du DOM ne prouve pas leur absence du canal.
- Sans droits Microsoft 365 d’export/eDiscovery ou Graph, une extension navigateur ne peut viser que le contenu que le compte connecté peut déjà consulter dans Teams Web.
- Les pièces jointes Teams peuvent être soumises à des droits et emplacements séparés ; leur capture automatique est exclue de V1.
- Le DOM Teams est une interface non contractuelle et peut évoluer. Un adaptateur à sélecteurs versionnés et un spike de compatibilité sont obligatoires.

## Décisions

### Adaptateurs de DOM séparés selon l’interface

Le test de qualification a confirmé que Teams Free personnel (`teams.live.com`) ne partage pas le même wrapper de message que Teams Microsoft 365. L’extension sélectionne donc explicitement `message-wrapper` pour Teams Free et conserve `comfy-message-wrapper` pour l’interface Microsoft 365. L’identifiant `message-body-*` est préféré dans Teams Free au nom visuel de menu. Cette séparation évite de confondre un aperçu de conversation du rail de navigation avec un message rendu.

### Pourquoi une extension plutôt qu’un script de console

Une extension offre un consentement visible, un périmètre de permissions contrôlable, une interface de pause/export/effacement et un code versionné/testable. Elle évite de demander à l’utilisateur d’exécuter du code non traçable dans la console.

### Pourquoi pas l’API Graph

Graph fournit un export structuré plus robuste mais requiert des permissions et consentements que l’utilisateur ne possède pas. V1 ne tente aucune authentification Microsoft supplémentaire ni API privée.

### Pourquoi JSON + HTML

Le JSON conserve la structure et permet une transformation ultérieure. L’HTML local donne une consultation immédiate sans dépendance externe. Le Markdown sera envisagé quand le modèle de fils et les pièces jointes seront validés.

### Pourquoi score de couverture au lieu d’une promesse d’intégralité

Le navigateur ne peut pas établir de façon fiable qu’il a vu toutes les données du serveur. Le manifeste doit donc exposer des indices de couverture : bornes dates, messages/réponses capturés, éléments non ouverts et erreurs.

## Résultat de spike — Teams Free personnel, 2026-09-17

Un MHTML et un export locaux d’une conversation de test Teams Free ont été comparés sans verser de contenu de conversation dans le dépôt. Dix corps de messages rendus ont été observés dans le DOM, et l’export corrigé a produit dix messages avec identifiants uniques, auteurs et horodatages. Le premier essai avait produit un seul élément de rail de navigation ; la correction d’adaptateur a supprimé ce faux positif.

Cette preuve valide la capture du DOM **déjà rendu** pour le scénario testé. Elle ne valide ni le scroll historique, ni les fils non ouverts, ni l’exhaustivité. Voir `docs/COMPATIBILITY.md`.

## Questions de spike

- Le nouveau Teams Web rend-il des identifiants stables dans les attributs accessibles ?
- Les dates complètes sont-elles disponibles dans le DOM, les attributs ARIA ou le texte visible ?
- Un scroll contrôlé déclenche-t-il un chargement déterministe de l’historique ?
- Le système de virtualisation détruit-il les anciens nœuds ; si oui, quand faut-il confirmer la persistance des données collectées ?
- Les réponses doivent-elles être ouvertes fil par fil, et le bouton est-il accessible/identifiable ?
- Les messages supprimés/modifiés sont-ils distinguables ?
- Une mise à jour Teams peut-elle être détectée par un sélecteur sentinelle plutôt que par un numéro de version ?

## Références de contexte

- Microsoft Graph — List channel messages : https://learn.microsoft.com/en-us/graph/api/channel-list-messages?view=graph-rest-1.0
- Microsoft Graph — List channel message replies : https://learn.microsoft.com/en-us/graph/api/chatmessage-list-replies?view=graph-rest-1.0
- Microsoft Purview — eDiscovery Teams workflow : https://learn.microsoft.com/en-us/purview/ediscovery-teams-workflow

Ces références décrivent les voies administratives/API officielles et servent à expliciter ce que V1 ne remplace pas.
