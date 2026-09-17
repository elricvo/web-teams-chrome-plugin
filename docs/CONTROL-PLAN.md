# Plan de contrôle — Teams Channel Archive Extension

## Finalité du contrôle

Déterminer si l’extension est techniquement sûre, fonctionnelle pour le contenu rendu par Teams Web, transparente sur ses limites et utilisable sans diffusion involontaire des données archivées.

> [!warning] Limite de qualification
> Ce plan valide une **archive locale de consultation**, jamais l’exhaustivité d’un canal Teams ni une valeur probante eDiscovery. Toute couverture reste conditionnée à l’accès utilisateur, à la rétention Microsoft 365 et au DOM effectivement rendu.

## Portes de contrôle

### C0 — Autorisation et périmètre, avant tout test réel

- [ ] Le testeur atteste être autorisé à consulter et archiver le canal de test.
- [ ] Le canal de test ne contient pas de données sensibles non nécessaires à la qualification.
- [ ] Le Team, le canal, la période et la destination locale des exports sont documentés.
- [ ] Aucune donnée de production n’est utilisée pour les fixtures automatisées.

**Preuve :** fiche de test sans contenu métier, approbation ou attestation du testeur.

### C1 — Revue des permissions et de la confidentialité

- [ ] `manifest.json` ne contient pas de permission large non justifiée.
- [ ] Absence de `cookies`, `webRequest`, `debugger`, `history`, `management`, `<all_urls>` et de host permission globale.
- [ ] Aucune dépendance, police, script, image, analytics ou API distante.
- [ ] Les journaux internes excluent le contenu des messages.
- [ ] La persistance locale exige un consentement explicite et l’effacement est testé.

**Preuve :** revue du manifeste, scan statique des appels réseau et test d’effacement.

### C2 — Tests unitaires déterministes

| Contrôle | Cas à couvrir | Résultat attendu |
|---|---|---|
| Normalisation | message complet, champs absents, HTML hostile | structure stable ; texte non exécutable ; avertissements qualité |
| Dédoublonnage | même identifiant, clé de repli, message modifié | une entrée canonique et journal de conflit |
| Période | bornes inclusives, date absente, date invalide | inclusion correcte ; marquage, jamais décision silencieuse |
| Modèle de fils | racine, réponse, réponse orpheline | rattachement exact ou avertissement |
| Manifeste | session complète/incomplète | compteurs cohérents, limites et erreurs exposées |
| Sanitation | script, URL dangereuse, HTML inattendu | aucun script exécuté et vue texte sûre |

**Seuil :** 100 % des tests réussissent, sans warning Node.

### C3 — Test de compatibilité Teams Web (spike)

- [ ] Le nom du Team et du canal est détecté ou l’extension s’arrête avec diagnostic.
- [ ] Les publications visibles sont extraites une seule fois dans un canal de test autorisé.
- [ ] Les réponses ouvertes sont rattachées à leur publication.
- [ ] Le scroll rétroactif est observé : chargement, virtualisation, doublons et stop condition documentés.
- [ ] Changement de canal, session expirée, réseau indisponible et DOM inattendu provoquent un arrêt/pause sûr.

**Critère go/no-go :** si les identifiants/sélecteurs ne sont pas assez stables, l’export long automatisé reste désactivé et l’extension se limite à une capture manuelle d’éléments rendus.

### Résultat de qualification Teams Free, 2026-09-17

- [x] Conversation personnelle autorisée sur `teams.live.com` : hôte accepté après geste utilisateur.
- [x] Comparaison locale MHTML/export : 10 corps de message rendus et 10 messages exportés, chacun avec identifiant unique, auteur et horodatage.
- [x] Manifest : bornes observées cohérentes avec la période demandée ; avertissement `visible-dom-only` et couverture `partial` conservés.
- [x] Le faux positif de rail de navigation observé au premier essai est empêché par un adaptateur Teams Free séparé.
- [ ] Scroll rétroactif, virtualisation, fils/réponses et changement d’espace restent à qualifier.

**Preuve :** `docs/COMPATIBILITY.md` et artefacts de test conservés exclusivement dans le coffre local.

### C4 — Test fonctionnel d’extension dans Chrome/Chromium

- [ ] Chargement de l’extension non empaquetée sans erreur manifeste.
- [ ] Le popup n’agit sur Teams qu’après clic utilisateur.
- [ ] L’extension n’agit que dans l’onglet Teams sélectionné.
- [ ] Pause, arrêt et changement de canal sont vérifiés.
- [ ] L’export JSON, HTML et manifeste sont déclenchés explicitement.
- [ ] Les fichiers exportés s’ouvrent hors ligne.
- [ ] Le manifeste indique la période demandée/observée, compteurs, erreurs et limites.

### C5 — Contrôle réseau et régression

- [ ] DevTools Network : aucune requête initiée par l’extension hors téléchargement local.
- [ ] Console : aucune erreur non traitée.
- [ ] Relecture sécurité des changements de permissions, sanitation et stockage.
- [ ] `node --test` passe ; `git diff --check` passe si le dépôt est initialisé.

## Décision de mise à disposition locale

| Décision | Conditions |
|---|---|
| **Accepté pour test privé** | C0, C1 et C2 validés ; C3 partiellement validé ; limites affichées. |
| **Accepté pour collecte contrôlée** | C0 à C4 validés sur canal de test ; manifest et effacement vérifiés. |
| **À bloquer** | permission excessive, appel réseau non justifié, exécution HTML, contenu persistant sans consentement, ou couverture présentée comme exhaustive sans preuve. |

## Indicateurs de suivi

- nombre de messages/réponses normalisés et dédoublonnés ;
- dates minimale/maximale observées versus période demandée ;
- nombre de fils potentiellement incomplets ;
- erreurs de parseur, changements de canal et pauses ;
- succès/échec d’export et effacement de session.
