# Plan technique — Archive locale d’un canal Teams Web

## 1. Contexte technique

- **Plateforme :** Chrome / Chromium, extension Manifest V3.
- **Cible :** Teams Web dans l’onglet actif d’un utilisateur authentifié et autorisé.
- **Mode :** local-first, sans backend ni API Microsoft Graph.
- **Maturité :** V1.0 locale : capture visible, collecte progressive contrôlée, export JSON/Markdown et bundle Markdown+images ; qualification interactive Teams à poursuivre.

## 2. Décision d’architecture

Le produit utilisera une extension Chrome à trois responsabilités séparées :

1. **Popup / page d’archive** : consentement, sélection de période, état de session, tableau de bord, export et effacement.
2. **Content script injecté à la demande** : charge les helpers DOM versionnés, détecte l’interface Teams approuvée et extrait uniquement les éléments rendus de l’onglet confirmé. Il fait défiler de manière limitée le seul panneau de conversation après un clic explicite, puis s’arrête sur les conditions documentées.
3. **Service worker** : coordonne les messages, maintient l’état temporaire, applique les règles de stockage volontaire et construit les exports.

Aucune API Teams interne ou Graph ne sera appelée. Cette limite réduit les privilèges mais impose de ne jamais promettre une couverture que le DOM visible ne permet pas de vérifier.

## 3. Décisions fonctionnelles V1

| Décision | Choix V1 | Justification |
|---|---|---|
| Périmètre | Un espace Teams actif confirmé : canal Microsoft 365 ou conversation Teams Free | Évite une collecte accidentelle multi-espaces tout en séparant les interfaces qualifiées. |
| Acquisition | DOM rendu, adaptateur explicite et collecte progressive limitée | Les lots rendus sont mémorisés avant virtualisation ; aucun contournement ni interception de trafic. |
| Réponses | Capture uniquement si ouvertes/rendues ; ouverture automatique hors périmètre | Évite de déclarer les fils complets sans visibilité réelle. |
| Images | Images HTTP(S) rendues, uniquement sur action explicite ; bundle Markdown relatif | Les vidéos/blob/data et pièces jointes génériques restent exclus ; les échecs d’accès sont signalés. |
| Persistances | `chrome.storage.local`, opt-in, effaçable | Nécessaire à un historique long mais explicite pour les données sensibles. |
| Export | JSON brut + Markdown lisible + manifeste + bundle Markdown/images | Sépare le corpus structuré, la consultation et la couverture. |

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
