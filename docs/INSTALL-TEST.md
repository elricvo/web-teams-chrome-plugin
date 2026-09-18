# Installer et qualifier V1.0 dans Chrome / Chromium

## Charger l’extension non empaquetée

1. Ouvrir `chrome://extensions` (ou `chromium://extensions`).
2. Activer le **Mode développeur**.
3. Cliquer sur **Charger l’extension non empaquetée**.
4. Sélectionner le dossier `teams-channel-archive-extension`.
5. Épingler « Teams Channel Archive — local » dans la barre d’outils.

## Test de sécurité minimal

1. Ouvrir un canal de test Teams Web auquel tu es autorisé à accéder.
2. Ouvrir le popup, vérifier l’avertissement et ne cocher l’autorisation qu’après contrôle du canal.
3. Cliquer « Capturer les éléments actuellement rendus ».
4. Vérifier que l’interface ne promet pas un export complet : V1.0 capture le DOM rendu et conserve le statut `partial`.
5. Exporter le JSON/manifeste et le Markdown, puis vérifier localement les compteurs, limitations et la lisibilité de la transcription.
6. Si des images sont visibles, cliquer **Sauvegarder Markdown + images** et vérifier que Chrome place le `.md` et le sous-dossier `images/` sous le même dossier `teams-archive-<horodatage>/` ; ouvrir le Markdown local et vérifier l’affichage des images téléchargées. Vérifier que les vidéos ne sont jamais demandées.
7. Cliquer « Effacer la session locale », fermer/réouvrir le popup et vérifier l’absence de session.

## Correctif V0.2.1 — texte Markdown nettoyé

La transcription Markdown n’utilise plus le HTML complet de la carte Teams. Elle isole le conteneur `[data-message-content]` : l’auteur, l’heure d’interface, les contrôles et les réactions sont donc exclus du texte. Les images visibles restent recensées et téléchargeables sur action explicite ; chaque référence inclut aussi l’horodatage ISO du message source.

## Correctif V0.1.1 — conversations Microsoft 365

Le correctif V0.1.1 traite le cas constaté dans une conversation ouverte sur `teams.microsoft.com` : Teams y affiche les messages actifs avec `message-wrapper` / `message-body-*`, tandis que les `comfy-message-wrapper` sont des aperçus de la barre latérale. L’ancienne version capturait ces aperçus sans date exploitable, puis le filtre de période produisait un export vide.

Après mise à jour :

1. dans `chrome://extensions`, cliquer sur l’icône **Recharger** de l’extension ;
2. recharger complètement l’onglet Teams (`Ctrl+R`) ;
3. ouvrir la conversation cible, rendre les messages voulus visibles, puis lancer la capture ;
4. contrôler que `rawCaptureCount` et `counts.messages` sont non nuls avant de faire un traitement de corpus ;
5. si le résultat est encore vide, exporter le manifeste et communiquer seulement ses compteurs/limitations, ainsi qu’une capture de l’état de l’extension — pas le contenu des messages.

## Test qualifié Teams Free personnel

Le 2026-09-17, une conversation de test autorisée sur `teams.live.com` a été qualifiée après comparaison locale d’un MHTML avec l’export. Les 10 messages rendus ont été exportés une seule fois avec identifiants uniques, auteurs, horodatages et texte normalisé. Les artefacts restent dans le coffre local et ne doivent jamais être ajoutés à Git.

Pour répéter ce test :

1. mettre le dépôt à jour avec `git pull` ;
2. recharger l’extension dans `chrome://extensions` ;
3. actualiser l’onglet Teams ;
4. rendre visibles les messages de test et renseigner la période ;
5. lancer la capture puis vérifier JSON/manifeste ;
6. confirmer que le manifeste porte toujours `visible-dom-only` et `partial`.

## Collecte automatique V1.0 — qualification obligatoire

La V1.0 peut remonter le fil sans action manuelle après le clic de départ. Elle reste une collecte du DOM rendu, non un export Microsoft officiel.

1. Utiliser une conversation de test autorisée avec des messages fictifs couvrant plusieurs dates.
2. Recharger l’extension et l’onglet Teams, ouvrir **une seule** conversation cible et ne plus la manipuler pendant le parcours.
3. Cocher l’autorisation, renseigner la date **Du** connue comme atteignable, puis choisir éventuellement la persistance locale explicite.
4. Cliquer **Collecter l’historique automatiquement** ; le popup peut être fermé, mais l’onglet Teams, Chrome et le poste doivent rester actifs.
5. Vérifier le statut : nombre de messages, nombre de lots, borne la plus ancienne observée et motif d’arrêt.
6. Exporter JSON/manifeste et vérifier `historyCollection.reason`, `cycles`, `earliestObserved`, `outOfPeriodCount`, `visible-dom-only` et le statut de couverture `partial`.
7. Répéter une fois avec **Arrêter la collecte historique** et une fois en changeant volontairement de conversation : l’extension doit préserver le lot courant puis s’arrêter avec un motif explicite.
8. Dans DevTools Network, confirmer qu’aucune requête réseau n’est initiée par l’extension. Enfin, effacer la session locale et vérifier sa disparition après réouverture du popup.

Le comportement, les conditions d’arrêt, les données conservées et les limites sont décrits dans [AUTOMATED-HISTORY-COLLECTION.md](AUTOMATED-HISTORY-COLLECTION.md).

## Limites V1.0 pour les corpus longs

Ne pas présenter le résultat comme complet. L’historique dépend de ce que Teams rend pour le compte connecté, des droits, de la rétention, de la session, du réseau, de la virtualisation et du DOM courant. Les fils et réponses fermés ne sont pas ouverts automatiquement. Un rechargement/fermeture de l’onglet interrompt la boucle ; la persistance locale ne la reprend pas d’elle-même afin d’éviter toute action non sollicitée dans une nouvelle conversation.

## Éléments à rapporter après le test

- URL Teams Web et type de canal ;
- capture d’écran ou texte de tout diagnostic ;
- nombre de publications/réponses annoncées dans Teams et par l’extension ;
- comportement du scroll vers l’historique ;
- comportement des réponses ;
- erreurs de console ou d’installation ;
- contenu du manifeste, sans partager de messages sensibles.
