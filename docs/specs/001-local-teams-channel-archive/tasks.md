# Tâches — 001 Local Teams Channel Archive

> Statut global : **socle V0.1 en cours**. Le collecteur reste limité aux éléments actuellement rendus tant que le spike Teams Web n’est pas validé.

## Phase 0 — Validation produit et sécurité

- [ ] T001 Obtenir les réponses aux six questions de la section 10 de `spec.md`.
- [ ] T002 Valider explicitement que l’outil vise une archive locale de consultation et non un export officiel/intégral.
- [ ] T003 Valider la politique locale de conservation, chiffrement et destination des exports.

## Phase 1 — Spike de compatibilité Teams Web

- [ ] T004 Créer `docs/COMPATIBILITY.md` avec le protocole de test sur canal autorisé.
- [ ] T005 Relever les sélecteurs et attributs nécessaires, sans conserver de contenu sensible.
- [ ] T006 Déterminer la stratégie de scroll, de virtualisation et d’ouverture des fils.
- [ ] T007 Réaliser une décision go/no-go et documenter les limitations constatées.

## Phase 2 — Socle extension

- [x] T008 Créer le manifeste MV3 avec permissions minimales revues.
- [x] T009 Créer popup, service worker et protocole de messages interne.
- [x] T010 Implémenter l’opt-in de persistance et l’effacement complet local.
- [x] T011 Écrire les tests rouges du schéma, de la normalisation et du dédoublonnage.

## Phase 3 — Collecte et modèle

- [ ] T012 Implémenter l’adaptateur Teams versionné à partir du spike validé. *(Un adaptateur générique de capture visible existe ; à ne pas valider avant spike.)*
- [ ] T013 Implémenter collecte, pause, arrêt et détection de changement de canal.
- [ ] T014 Implémenter dates/période, messages, réponses, références de pièces jointes et journal d’erreurs. *(Partiel : période, messages/réponses et warnings existent ; à compléter après spike.)*
- [x] T015 Implémenter la vue de couverture et les états limitatifs. *(V0.1 : statut `partial`/`observed-range-only` et avertissement affichés.)*

## Phase 4 — Export et validation

- [ ] T016 Implémenter JSON brut, HTML local sanitizé et `manifest.json`. *(Partiel : JSON brut et manifeste sont implémentés ; HTML reste à faire.)*
- [x] T017 Ajouter les tests manifest, sanitation et cas limites.
- [ ] T018 Vérifier l’absence de requêtes réseau additionnelles.
- [ ] T019 Vérifier les exports hors ligne et la suppression locale.
- [ ] T020 Réaliser une revue sécurité/confidentialité et publier un guide d’utilisation.
