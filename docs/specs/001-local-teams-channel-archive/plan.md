# Plan technique — Archive locale d’un canal Teams Web

## 1. Contexte technique

- **Plateforme :** Chrome / Chromium, extension Manifest V3.
- **Cible :** Teams Web dans l’onglet actif d’un utilisateur authentifié et autorisé.
- **Mode :** local-first, sans backend ni API Microsoft Graph.
- **Maturité :** plan V1 ; l’implémentation dépend d’un spike de compatibilité du DOM Teams actuel.

## 2. Décision d’architecture

Le produit utilisera une extension Chrome à trois responsabilités séparées :

1. **Popup / page d’archive** : consentement, sélection de période, état de session, tableau de bord, export et effacement.
2. **Content script injecté à la demande** : observe uniquement l’interface Teams Web de l’onglet confirmé, extrait les éléments rendus et déclenche le défilement contrôlé.
3. **Service worker** : coordonne les messages, maintient l’état temporaire, applique les règles de stockage volontaire et construit les exports.

Aucune API Teams interne ou Graph ne sera appelée. Cette limite réduit les privilèges mais impose de ne jamais promettre une couverture que le DOM visible ne permet pas de vérifier.

## 3. Décisions fonctionnelles V1

| Décision | Choix V1 | Justification |
|---|---|---|
| Périmètre | Un canal actif confirmé | Évite une collecte accidentelle multi-canaux. |
| Acquisition | DOM rendu + défilement explicite | Respecte l’accès déjà accordé au compte et évite l’interception de trafic. |
| Réponses | Capture uniquement si ouvertes/rendues ; stratégie d’ouverture à valider par spike | Évite de déclarer les fils complets sans visibilité réelle. |
| Pièces jointes | Métadonnées/références visibles | Évite un second flux de téléchargement et le risque de droits SharePoint. |
| Persistances | `chrome.storage.local`, opt-in, effaçable | Nécessaire à un historique long mais explicite pour les données sensibles. |
| Export | JSON brut + HTML lisible + manifeste | Sépare la preuve de collecte de la consultation. |
| Sortie Markdown | Hors V1 initiale | Peut être ajoutée après validation du modèle JSON. |

## 4. Arborescence prévue

```text
manifest.json
src/
  popup/
    popup.html
    popup.css
    popup.js
  collector/
    teams-adapter.js
    collector.js
    normalizer.js
  background/
    service-worker.js
  export/
    json-export.js
    html-export.js
    manifest-builder.js
  shared/
    schema.js
    sanitizer.js
    messages.js
tests/
  fixtures/
  normalizer.test.js
  dedupe.test.js
  period-filter.test.js
  manifest-builder.test.js
docs/
  SECURITY.md
  PRIVACY.md
  COMPATIBILITY.md
```

## 5. Modèle de sécurité

### Permission minimale visée

- `activeTab` : agir uniquement après geste utilisateur sur l’onglet actif.
- `scripting` : injecter le collecteur à la demande.
- `storage` : seulement pour la persistance explicitement acceptée.
- `downloads` : uniquement si nécessaire pour le bouton d’export ; à confirmer lors de l’implémentation.

Le domaine Teams ne sera ajouté à `host_permissions` qu’après le spike. Ne pas utiliser `<all_urls>`.

### Frontières de confiance

- **Contenu Teams :** non fiable comme HTML, personnel/confidentiel ; il est stocké comme donnée et affiché avec sanitation.
- **DOM Teams :** instable ; tout sélecteur doit être versionné et testé sur fixtures.
- **Stockage local extension :** persistant mais non chiffré nativement ; avertissement visible et option d’effacement.
- **Fichier exporté :** sensible ; le téléchargement est explicitement demandé par l’utilisateur et le manifeste rappelle le périmètre.

## 6. Spike obligatoire avant implémentation

Sur un canal de test autorisé, documenter sans collecter le contenu réel :

1. URL et version visuelle de Teams Web ;
2. sélecteurs disponibles pour Team, canal, publication, réponse, auteur, date, contenu et pièces jointes ;
3. comportement du chargement rétroactif lors du scroll ;
4. comportement d’ouverture des fils ;
5. présence et stabilité d’identifiants DOM ;
6. mécanisme permettant de détecter les éléments déjà vus ;
7. messages système, posts modifiés/supprimés et fichiers ;
8. limites d’automatisation et signaux de session expirée.

**Décision go/no-go :** si l’interface ne fournit pas de discriminants suffisamment stables, ne pas automatiser une collecte longue ; orienter vers export administratif ou capture manuelle structurée.

## 7. Stratégie d’exhaustivité

L’outil mesure une **couverture observée**, pas une exhaustivité absolue :

- compter messages racines et réponses normalisés ;
- conserver l’horodatage minimal/maximal effectivement observé ;
- détecter les gaps temporels lorsque les dates existent ;
- enregistrer chaque erreur et chaque fil non développé ;
- comparer la période demandée à la période observée ;
- afficher un état : `incomplète`, `couverture partielle`, `bornes atteintes à confirmer`, jamais `intégrale` en V1.

## 8. Tests et validation

Avant implémentation finale :

- tests Node sur fixtures DOM synthétiques : normalisation, dédoublonnage, fils, dates invalides, messages sans auteur, sanitation ;
- tests du manifeste : compteurs, limites, fichiers attendus et hash ;
- test manuel autorisé sur un canal de test : pause, arrêt, changement de canal, persistance consentie, export, effacement ;
- test `file` des exports HTML hors connexion ;
- inspection réseau : aucune requête ajoutée par l’extension ;
- audit des permissions du manifeste et revue de code des surfaces `innerHTML`.

## 9. Constitution check

- Accès légitime : conforme, DOM déjà rendu uniquement.
- Local-first : conforme, aucune dépendance ou service distant prévu.
- Exhaustivité : conforme, manifest et états limitatifs obligatoires.
- Traçabilité : conforme, JSON brut + journal de session + manifest.
- Testabilité : conforme, parseur, normalisation et manifest isolés et testés.
