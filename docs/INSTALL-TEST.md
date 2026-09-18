# Installer et qualifier V0.1 dans Chrome / Chromium

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
4. Vérifier que l’interface ne promet pas un export complet ; V0.1 ne capture que le DOM actuellement rendu.
5. Exporter le JSON/manifeste et le Markdown, puis vérifier localement les compteurs, limitations et la lisibilité de la transcription.
6. Si des images sont visibles, cliquer séparément sur « Télécharger les images rendues » et vérifier que Chrome les place sous `teams-archive-images/YYYY-MM-DD/` ; vérifier que les vidéos ne sont pas demandées.
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

## Limitation V0.1 bloquante pour un historique de deux ans

Le scroll rétroactif, l’ouverture des fils et les sélecteurs Teams ne sont pas encore qualifiés. Ne pas utiliser V0.1 pour une collecte longue : elle sert uniquement au **spike de compatibilité** et à valider le circuit local de capture/export.

## Éléments à rapporter après le test

- URL Teams Web et type de canal ;
- capture d’écran ou texte de tout diagnostic ;
- nombre de publications/réponses annoncées dans Teams et par l’extension ;
- comportement du scroll vers l’historique ;
- comportement des réponses ;
- erreurs de console ou d’installation ;
- contenu du manifeste, sans partager de messages sensibles.
