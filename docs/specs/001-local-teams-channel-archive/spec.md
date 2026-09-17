# Spécification fonctionnelle — Archive locale d’un canal Teams Web

**Fonctionnalité :** `001-local-teams-channel-archive`
**Statut :** V0.1 partiellement implémentée ; capture visible Teams Free qualifiée le 2026-09-17
**Date :** 2026-09-17
**Produit :** extension Chrome Manifest V3, locale

## 1. Problème et objectif

Un utilisateur autorisé à consulter un canal Microsoft Teams ou une conversation personnelle Teams Free dans Teams Web souhaite constituer une archive locale lisible et structurée du contenu visible, potentiellement sur une longue période, sans droits d’administration Microsoft 365, sans accès Purview et sans transmission de contenu à un tiers.

L’objectif V1 est de capturer les publications et réponses effectivement rendues par Teams Web, de les dédoublonner, de les organiser par fil et de permettre une exportation locale accompagnée d’un manifeste de couverture.

## 2. Hors périmètre explicite

- Contourner les permissions Teams, MFA, politiques de rétention, anti-bot ou mécanismes Microsoft.
- Lire ou stocker identifiants, cookies, jetons d’accès ou secrets.
- Affirmer une exhaustivité sans preuve de couverture.
- Récupérer des messages supprimés, purgés ou non accessibles au compte.
- Réaliser un export eDiscovery, légalement probant ou officiellement certifié.
- Télécharger automatiquement des pièces jointes ou contourner leurs droits d’accès.
- Exporter tous les Teams, tous les canaux ou les conversations privées en V1.
- Envoyer les messages vers un serveur, une IA distante ou une API tierce.

## 3. Utilisateurs et préconditions

### Utilisateur cible

Membre autorisé d’un canal Teams Microsoft 365, ou titulaire d’une conversation Teams Free personnelle, qui ouvre lui-même l’espace cible dans Teams Web.

### Préconditions

1. L’utilisateur confirme qu’il est autorisé à archiver le contenu du canal et à le conserver localement.
2. Le canal cible est déjà ouvert dans l’onglet Teams Web actif.
3. L’utilisateur définit la période visée et confirme le nom du Team/canal détecté avant toute collecte.
4. L’utilisateur comprend que la collecte porte sur ce que Teams Web charge et rend visible au compte connecté.
5. Pour Teams Free, l’utilisateur ouvre une conversation personnelle rendue sur `teams.live.com` ; ce parcours ne prétend pas être un canal Microsoft 365.

## 4. Parcours utilisateur V1

### US-1 — Vérifier le canal actif

En tant qu’utilisateur, je veux que l’extension détecte le libellé visible du Team et du canal ouverts afin de confirmer que je ne vais pas archiver le mauvais espace.

**Critères d’acceptation :**

- L’extension n’affiche jamais un libellé détecté comme certain si le DOM est ambigu.
- L’utilisateur doit confirmer manuellement le périmètre avant le bouton « Démarrer ».
- Si le canal ne peut pas être identifié, l’extension s’arrête et affiche une action de diagnostic, sans collecter.

### US-2 — Collecter progressivement l’historique visible

En tant qu’utilisateur, je veux démarrer une collecte contrôlée qui remonte progressivement l’historique rendu par Teams Web et ajoute les éléments nouvellement disponibles à une archive locale.

**Critères d’acceptation :**

- La collecte se limite à l’onglet Teams Web explicitement sélectionné.
- L’utilisateur voit l’état : en attente, collecte, pause, arrêté, erreur, terminé.
- Le collecteur dédoublonne les messages et réponses par identifiant stable lorsque disponible ; sinon il consigne une clé de repli et un avertissement.
- La collecte est limitée en cadence ; elle ne simule pas de contournement de rate limit ni de comportement furtif.
- L’utilisateur peut mettre en pause ou arrêter immédiatement.
- Les erreurs de rendu, fils non ouverts, éléments non chargés et bornes temporelles sont consignés dans le manifeste.

### US-3 — Collecter les fils de discussion disponibles

En tant qu’utilisateur, je veux inclure les réponses aux publications lorsque Teams Web les rend accessibles.

**Critères d’acceptation :**

- Les réponses sont rattachées au message racine dans le modèle de données.
- Une réponse non chargée n’est jamais inventée.
- Le manifeste indique le nombre de fils vus, ouverts, complets quand cela est vérifiable, et potentiellement incomplets.

### US-4 — Définir une période de collecte

En tant qu’utilisateur, je veux indiquer une date de début et une date de fin pour prioriser la collecte et identifier les bornes atteintes.

**Critères d’acceptation :**

- Les bornes sont enregistrées en ISO 8601 dans les métadonnées de session.
- Le filtre de date n’efface pas les éléments collectés hors période : ils sont marqués « hors périmètre » puis exclus des vues exportées par défaut.
- Une date absente ou non lisible est signalée, jamais silencieusement incluse comme certaine.

### US-5 — Sauvegarder localement et reprendre volontairement

En tant qu’utilisateur, je veux pouvoir reprendre une collecte longue après fermeture du navigateur sans envoyer mes données ailleurs.

**Critères d’acceptation :**

- Avant toute persistance, l’extension affiche ce qui sera conservé : messages, métadonnées, paramètres et état de progression.
- Le stockage `chrome.storage.local` est désactivé par défaut et exige une confirmation explicite.
- Une commande « Effacer les données locales » supprime la session et confirme la suppression.
- Sans persistance, les données ne survivent pas au rechargement ou à la fermeture de l’extension.

### US-6 — Exporter une archive et son manifeste

En tant qu’utilisateur, je veux exporter les données brutes et une version lisible, avec une déclaration des limites de la collecte.

**Critères d’acceptation :**

- L’export est déclenché explicitement par l’utilisateur.
- L’export brut JSON contient messages, réponses, références de pièces jointes, événements et métadonnées de session.
- Un export HTML local lisible regroupe les conversations par date et fil.
- Un fichier `manifest.json` contient : canal confirmé, période demandée, première/dernière date observée, compteurs, erreurs, éléments hors période, état des fils, version de l’extension et hash SHA-256 des fichiers exportés lorsque techniquement possible sans dépendance externe.
- L’interface indique clairement « archive locale de consultation — exhaustivité non garantie ».

## 5. Exigences fonctionnelles

- **FR-01 :** l’utilisateur initie chaque collecte ; aucune collecte automatique au chargement de Teams.
- **FR-02 :** l’extension ne lit que les éléments de l’espace Teams actif sélectionné et confirmés par l’utilisateur : canal Microsoft 365 ou conversation personnelle Teams Free prise en charge.
- **FR-03 :** l’extension préserve le contenu HTML brut disponible et produit une représentation texte nettoyée, sans exécuter le HTML collecté.
- **FR-04 :** les mentions, liens et noms sont conservés comme contenu potentiellement personnel ; aucun enrichissement externe n’est réalisé.
- **FR-05 :** les pièces jointes sont recensées comme métadonnées/références visibles ; aucun téléchargement automatique V1.
- **FR-06 :** les doublons, modifications et suppressions visibles sont représentés dans le journal de collecte sans réécrire silencieusement l’historique.
- **FR-07 :** le tableau de bord affiche les compteurs de publications, réponses, auteurs affichés, plages de dates, erreurs et état de la session.
- **FR-08 :** l’utilisateur peut exporter même si la collecte est incomplète, avec un avertissement explicite et le manifeste associé.

## 6. Exigences de sécurité et confidentialité

- **SEC-01 :** aucune permission Chrome `cookies`, `webRequest`, `debugger`, `management`, `history` ou `downloads` large sans justification revue.
- **SEC-02 :** permissions limitées à l’onglet Teams Web choisi, via `activeTab` et `scripting`. Les origines acceptées sont explicitement `teams.microsoft.com`, `teams.cloud.microsoft` et `teams.live.com` ; aucune `host_permission` large ni `<all_urls>` n’est utilisée.
- **SEC-03 :** aucune ressource distante : scripts, styles, polices, analytics, télémétrie et mises à jour de contenu externes interdits.
- **SEC-04 :** aucun contenu collecté n’est injecté avec `innerHTML` sans sanitation ; les vues utilisent le DOM textuel ou une sanitation locale documentée.
- **SEC-05 :** les journaux applicatifs ne contiennent pas le texte des messages par défaut.
- **SEC-06 :** l’extension ne tente jamais d’intercepter les requêtes Teams ou de reproduire l’API Microsoft privée.

## 7. Données minimales

### Session de collecte

- identifiant local aléatoire ;
- Team/canal affichés et confirmés ;
- URL d’origine réduite aux informations nécessaires ;
- période demandée ;
- démarrage, pause, reprise et fin ;
- version extension, version du parseur et journal d’erreurs.

### Message

- identifiant source lorsque rendu ;
- identifiant de fil/réponse ;
- auteur tel qu’affiché ;
- dates visibles ou extraites ;
- contenu HTML brut disponible, texte dérivé et type de message ;
- références de fichiers/liens rendues ;
- état de collecte et empreinte de dédoublonnage.

## 8. Cas limites

- Changement de canal durant la collecte : arrêt automatique et demande de confirmation.
- Interface Teams modifiée : arrêt sécurisé avec diagnostic versionné ; jamais d’extraction approximative silencieuse.
- Message sans date/auteur/identifiant : conserver avec marqueur de qualité faible.
- Fil de plus de réponses que le DOM chargé : signaler « incomplet potentiel ».
- Réseau indisponible ou session Teams expirée : mettre en pause et conserver le journal, sans réessai agressif.
- Données locales insuffisantes : suspendre avant perte et proposer l’export/effacement.

## 9. Mesures de succès V1

- Sur un espace de test autorisé avec jeu de données connu, 100 % des messages rendus et réponses ouvertes sont capturés une fois, sans doublon.
- Qualification réalisée le 2026-09-17 sur une conversation Teams Free : 10 corps de message rendus, 10 messages exportés, identifiants uniques et auteur/date/texte présents. Ce résultat ne vaut que pour les éléments affichés et la version d’interface testée.
- L’export JSON passe la validation de schéma ; l’HTML est lisible localement et n’exécute aucun contenu de message.
- Aucune requête réseau ajoutée par l’extension n’est observée.
- Un utilisateur peut arrêter, reprendre après persistance volontaire, exporter et effacer une session sans assistance technique.
- Le manifeste rend visibles toutes les limites connues ; aucune interface ne promet « intégral » sans validation.

## 10. Qualification réalisée

La qualification détaillée est conservée dans `docs/COMPATIBILITY.md`. Les artefacts MHTML et exports utilisés comme preuve restent exclusivement dans le coffre local ; seul un résultat agrégé, sans contenu de conversation, est documenté dans le dépôt.

## 11. Questions à compléter avec Groot

1. Le canal cible est-il standard, privé ou partagé ?
2. Quelle URL Teams Web est utilisée dans l’organisation (`teams.microsoft.com`, autre domaine, client web nouveau/classique) ?
3. Quel format de lecture est prioritaire : JSON, HTML, Markdown, CSV, ou combinaison ?
4. Quelle profondeur de pièces jointes est attendue : références seulement, téléchargement manuel guidé, ou téléchargement automatisé ultérieur ?
5. Quelle taille approximative : nombre de posts, de fils et de fichiers sur deux ans ?
6. Les données exportées doivent-elles être chiffrées localement, et avec quelle méthode opérable ?
