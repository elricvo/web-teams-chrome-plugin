# Tâches — 001 Local Teams Channel Archive

> Statut global : **V0.1 — capture visible Teams Free qualifiée ; collecte d’historique longue non implémentée.**

## Phase 0 — Validation produit et sécurité

- [ ] T001 Obtenir les réponses aux six questions de la section 11 de `spec.md`.
- [x] T002 Valider explicitement que l’outil vise une archive locale de consultation et non un export officiel/intégral.
- [ ] T003 Valider la politique locale de conservation, chiffrement et destination des exports.

## Phase 1 — Spike de compatibilité Teams Web

- [x] T004 Créer `docs/COMPATIBILITY.md` avec protocole, résultat et limites de qualification.
- [x] T005 Relever les sélecteurs et attributs nécessaires sans conserver de contenu sensible. *(Teams Free : `message-wrapper`, `message-body-*` ; Microsoft 365 : adaptateur distinct.)*
- [ ] T006 Déterminer la stratégie de scroll, de virtualisation et d’ouverture des fils.
- [x] T007 Rendre une décision go/no-go pour la capture visible Teams Free : **go**, sous limite `visible-dom-only`; aucune décision positive pour l’historique long.

## Phase 2 — Socle extension

- [x] T008 Créer le manifeste MV3 avec permissions minimales revues.
- [x] T009 Créer popup, service worker et protocole de messages interne.
- [x] T010 Implémenter l’opt-in de persistance et l’effacement complet local.
- [x] T011 Écrire les tests rouges du schéma, de la normalisation et du dédoublage.

## Phase 3 — Collecte et modèle

- [x] T012 Implémenter les adaptateurs de capture visible qualifiés. *(Teams Free personnel validé par MHTML/export ; Teams Microsoft 365 doit être requalifié à chaque évolution DOM.)*
- [ ] T013 Implémenter collecte progressive, pause, arrêt et détection de changement d’espace.
- [ ] T014 Finaliser fils, pièces jointes visibles et journal d’erreurs. *(Période et messages visibles validés sur Teams Free ; réponses et pièces jointes restent à faire.)*
- [x] T015 Implémenter la vue de couverture et les états limitatifs. *(Statut `partial`, bornes observées et avertissement `visible-dom-only`.)*

## Phase 4 — Export et validation

- [ ] T016 Implémenter HTML local sanitizé. *(JSON brut et manifeste sont implémentés.)*
- [x] T017 Ajouter les tests manifest, sanitation, sélecteurs et cas limites.
- [x] T018 Vérifier l’absence de requêtes réseau additionnelles dans les sources ; qualification DevTools manuelle encore à réaliser.
- [ ] T019 Vérifier exports hors ligne et suppression locale dans un navigateur réel.
- [ ] T020 Réaliser une revue sécurité/confidentialité finale et publier le guide d’utilisation V1.
