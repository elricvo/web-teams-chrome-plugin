# Collecte automatique d’historique Teams Web — conception V1.0

## Objet et niveau de garantie

La V1.0 automatise la **remontée visuelle** d’une conversation Teams Web depuis l’onglet que l’utilisateur a lui-même ouvert et confirmé. Elle ne lit ni API privée, ni cookies, ni jetons, ni trafic réseau Teams. Elle n’est donc pas un export Microsoft 365 officiel et ne prouve jamais l’exhaustivité.

Elle répond au besoin pratique suivant : Teams virtualise l’historique ; le DOM ne contient qu’un nombre limité de messages. La collecte progressive archive chaque lot rendu avant que Teams ne le remplace par un lot plus ancien.

## Déclenchement et périmètre

1. L’utilisateur ouvre une conversation ou un canal Teams Web pris en charge.
2. Il coche l’autorisation d’archivage, renseigne obligatoirement la date **Du** à atteindre, puis clique **Collecter l’historique automatiquement**.
3. L’extension confirme le libellé visible de la conversation et le verrouille pour la durée du parcours.
4. Seul cet onglet reçoit le script de contenu via `activeTab` et `scripting`.

Il n’y a aucune collecte au chargement de Teams, aucune tâche planifiée, aucune navigation vers un autre canal et aucune action sans geste initial explicite. L’utilisateur peut cliquer **Arrêter** ; le lot déjà lu est alors finalisé avant l’arrêt.

## Algorithme

La boucle s’exécute dans le script de contenu de l’onglet Teams, pas dans le service worker Manifest V3 : celui-ci peut être suspendu et ne peut pas tenir de manière fiable une boucle longue.

À chaque cycle :

1. lire les seuls wrappers de conversation qualifiés (`message-wrapper` qui contient un corps `message-body-*`) ;
2. extraire le texte du seul corps du message, ses métadonnées visibles et les références d’images rendues ;
3. envoyer le lot local au service worker ;
4. normaliser et dédoublonner par identifiant stable ; une clé de repli date/auteur/contenu est utilisée et signalée si l’identifiant est absent ;
5. conserver uniquement les messages dans la période demandée ; les cartes chargées hors période sont comptées dans `outOfPeriodCount`, jamais exportées comme corpus cible ;
6. rechercher le conteneur scrollable de la liste des messages (`message-pane-list-viewport`, `message-pane-body` ou journal accessible) et remonter de 80 % de sa hauteur, au minimum 480 px ;
7. attendre 1,5 s avant le cycle suivant. Cette cadence modérée est volontaire : l’extension ne tente pas de contourner un rate limit ni d’imiter un utilisateur de façon furtive.

Le plafond par défaut est de 500 lots, configurable entre 1 et 1 000. À 1,5 seconde au minimum, 500 lots représentent environ 12,5 minutes hors temps de rendu. Le plafond est une protection contre les boucles interminables ; il ne garantit aucune durée ni profondeur d’historique.

## Décisions d’arrêt et leurs significations

| Motif dans le manifeste | Décision | Ce que cela signifie |
|---|---|---|
| `target-date-reached` | Un horodatage rendu est antérieur ou égal au début demandé. | La borne a été observée dans le DOM, pas l’exhaustivité du corpus. |
| `history-top-stable` | Le conteneur est en haut et quatre lots consécutifs n’apportent aucun nouvel identifiant. | Teams semble ne plus rendre d’éléments plus anciens ; ce n’est pas une preuve serveur. |
| `max-cycles-reached` | Plafond de sécurité atteint. | Parcours interrompu, archive partielle. |
| `stopped-by-user` | L’utilisateur a demandé l’arrêt. | Lot courant préservé, archive partielle. |
| `channel-changed-or-ambiguous` | Le libellé visible change ou ne peut plus être établi. | Arrêt préventif : aucun lot d’un autre espace n’est accepté. |
| `history-scroll-container-not-found` | Aucun conteneur de conversation reconnu comme scrollable. | Adaptateur DOM à qualifier ; aucune approximation. |
| `history-run-error` | Erreur non attendue de la boucle. | À diagnostiquer avec le manifeste et la console, sans contenu de messages. |

Les avertissements `visible-dom-only` et `automated-history-scroll` restent systématiquement présents. La couverture reste `partial`, même lorsqu’une borne est atteinte.

## Architecture locale

```text
Popup (consentement, date cible, arrêt, statut)
  └─ activeTab + scripting
      └─ script de contenu Teams
          ├─ lit le DOM rendu
          ├─ fait défiler uniquement le panneau de messages
          └─ transmet des lots au service worker
              ├─ normalise / dédoublonne / filtre la période
              ├─ conserve l’état dans chrome.storage.session
              └─ écrit dans chrome.storage.local uniquement si l’option a été cochée
```

Le popup interroge périodiquement l’état local pour afficher le nombre de messages, le nombre de lots et la borne observée. Il peut être fermé pendant l’exécution : la boucle reste dans l’onglet Teams tant que Chrome, l’onglet et le script de contenu restent vivants. Si l’onglet est rechargé, fermé, suspendu ou si le navigateur s’arrête, la boucle ne peut pas continuer en arrière-plan. L’état déjà reçu est conservé dans `chrome.storage.session`, ou dans `chrome.storage.local` lorsque la persistance a été explicitement acceptée.

La persistance n’est pas un mécanisme de reprise automatique : une reprise après rechargement de l’onglet demanderait un nouveau geste explicite et une requalification de la conversation. Ce choix évite de déplacer le scroll d’un onglet Teams que l’utilisateur n’est plus en train de contrôler.

## Données et manifeste

Le manifeste exporté ajoute `historyCollection` lorsqu’une collecte automatique a été utilisée :

```json
{
  "historyCollection": {
    "status": "completed",
    "reason": "target-date-reached",
    "cycles": 17,
    "earliestObserved": "2026-06-17T23:59:00Z",
    "latestObserved": "2026-09-18T10:00:00Z",
    "outOfPeriodCount": 1
  }
}
```

`earliestObserved` et `latestObserved` décrivent ce que le DOM a rendu pendant le parcours. La plage exportée (`observedPeriod`) décrit seulement les messages retenus dans la période demandée. Cette distinction évite de confondre une carte de dépassement de borne avec un message inclus dans l’archive.

Les images rendues sont représentées dans le Markdown par `![texte alternatif](teams-archive-images/.../image-XXX.ext)`, sur une ligne qui conserve l’horodatage du message. Elles deviennent affichables localement une fois l’action distincte **Télécharger les images rendues** exécutée ; avant cela, le lien local peut naturellement être absent.

Les archives Markdown commencent par le logo Cloudseeders à gauche du titre. Le logo est encodé directement dans le document (`data:image/png;base64`) : il reste affichable dans un aperçu Markdown, même en dehors du dossier d’archive. Les images de conversation continuent, elles, à utiliser les liens relatifs du dossier `images/`.

L’option **Sauvegarder Markdown + images** crée, en un seul geste explicite, un dossier `teams-archive-<horodatage>/` sous le dossier de téléchargements configuré dans Chrome. Il contient le fichier `.md` et `images/`; le Markdown emploie alors les chemins relatifs `images/image-XXX.ext`. Cette option ne télécharge toujours que les images HTTP(S) déjà rendues. Les échecs (lien Teams expiré ou protégé) sont comptés dans le statut ; le Markdown reste créé mais l’image concernée ne pourra pas s’afficher.

## Limitations connues

- Teams peut changer ses sélecteurs, sa virtualisation ou son comportement de scroll sans préavis.
- Des messages peuvent être absents si Teams ne les charge pas, si la rétention les a supprimés, si le compte n’y a pas accès, si le réseau/session échoue ou si le fil n’est pas rendu.
- Les fils/réponses que Teams conserve fermés ne sont pas ouverts automatiquement ; seules les réponses déjà rendues sont capturées.
- L’ordre visuel, les dates localisées et les identifiants peuvent différer entre Teams Free et Microsoft 365 ; les métadonnées absentes génèrent des avertissements plutôt que des valeurs inventées.
- L’utilisateur ne doit pas utiliser la conversation cible dans le même onglet pendant le parcours. Un changement détecté provoque l’arrêt ; un changement non reflété dans le libellé reste un risque résiduel.
- Le test automatisé valide les décisions pures de progression/dédoublonnage. La qualification dans une vraie instance Teams autorisée reste requise pour chaque variante d’interface.
- L’extension ne télécharge pas les vidéos ou pièces jointes génériques. Les images HTTP(S) rendues sont téléchargées uniquement après un clic distinct.

## Qualification à effectuer avant corpus de production

Sur une conversation de test autorisée contenant des messages fictifs datés :

1. charger l’extension V1.0, recharger l’onglet Teams et choisir une date cible connue ;
2. lancer la collecte, sans toucher l’onglet ;
3. vérifier dans le manifeste le motif d’arrêt, les lots, les bornes observées et l’avertissement `partial` ;
4. comparer le nombre d’identifiants uniques obtenu avec le corpus de test attendu ;
5. tester l’arrêt utilisateur et un changement de conversation ;
6. vérifier l’absence de requête réseau initiée par l’extension dans DevTools ;
7. effacer la session locale et vérifier la suppression dans le popup.

Ne partager avec un tiers que les compteurs, motifs et captures non sensibles nécessaires au diagnostic ; les archives et MHTML restent dans le coffre local.
