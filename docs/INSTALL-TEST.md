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
5. Exporter le JSON/manifeste, puis vérifier localement les compteurs et limitations.
6. Cliquer « Effacer la session locale », fermer/réouvrir le popup et vérifier l’absence de session.

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
