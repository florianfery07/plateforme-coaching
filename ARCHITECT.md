# MyRidePlan - Architecture locale

## Référence

Les règles génériques sont définies par le Florian Dev Framework, en particulier
`.codex/AGENTS.md`, `.codex/ORCHESTRATOR.md` et
`docs/architecture/architecture-governance.md` dans son dépôt. Ce document ne
les recopie pas: il consigne uniquement les décisions et contraintes propres à
MyRidePlan.

## Vision de migration

MyRidePlan reste une seule application utilisée pendant son évolution. Les
modules changent progressivement, sans refonte parallèle ni interruption du
parcours actif. Un pilote V2 coexiste temporairement avec le legacy, demeure
désactivé par défaut et ne remplace ce dernier qu'après preuves suffisantes.

Ne pas créer de dual-write. Conserver le legacy jusqu'à validation de la
bascule, puis planifier son retrait dans un lot distinct et approuvé.

## Autonomie de l'architecte

Pour MyRidePlan, l'architecte technique pilote le développement courant dans le
cadre du Florian Dev Framework et de ce document. À la fin de chaque lot validé,
il analyse l'état du dépôt et de la roadmap, consulte ces deux références,
mesure la baseline lorsqu'il évalue une optimisation, puis choisit le candidat
suivant le plus utile et proportionné. Il n'attend pas de validation humaine
lorsque le périmètre reste cohérent avec la roadmap et les décisions établies.

Pour chaque optimisation, la mesure avant/après et le gain réel sont
obligatoires. Sans gain démontré, aucun code n'est créé: le constat est
documenté, le candidat est clos et l'architecte passe au suivant. Un domaine
déjà démontré optimal ne doit pas être repris sans nouvelle preuve factuelle.

L'architecte dimensionne les sous-lots, évite la sur-ingénierie, réutilise les
domaines existants, organise les contrôles nécessaires et exige les preuves du
Reviewer final. Il ne crée jamais un lot uniquement parce qu'il figure dans la
roadmap, ni une abstraction sans bénéfice démontré, ni une demande de validation
humaine évitable.

Son autonomie s'interrompt uniquement pour un arbitrage métier, une modification
de périmètre ou de roadmap, un changement de philosophie d'architecture, un
impact sur Auth, L11 ou L12, une migration destructive, un changement de
sécurité ou de modèle de données, ou un risque majeur identifié.

L'objectif n'est pas de réaliser tous les lots de la roadmap, mais d'améliorer
progressivement MyRidePlan avec des changements utiles, mesurés, réversibles et
proportionnés.

## État actuel

- L01 à L13 sont terminés: baseline Supabase, qualité, feature flags, Access
  Control V2, typage, lectures pilotes, mutations fiables, Groups V2,
  invitations, cycle de vie athlète et extraction ciblée du calendrier.
- L14 est terminé: L14a, L14b, L14d à L14k et le sous-lot final de création
  de bibliothèque ont remplacé les rechargements globaux évitables par des
  mises à jour locales confirmées dans leurs pilotes respectifs. Cela couvre les sauvegardes ciblées de
  feedback, de bibliothèque, de programmation individuelle, d'ajustement de
  durée spécifique, de repos individuel, de justification de séance non faite
  et de notes hebdomadaires au calendrier, ainsi que les modifications, la
  création et la suppression de groupes legacy. La création de séance de
  bibliothèque est désormais elle aussi ciblée.
- L14c a été volontairement abandonné après mesure: la sauvegarde du planning
  hebdomadaire réalise déjà une écriture ciblée, sans lecture globale ni
  `loadAllData`.
- L16c pilote Objectifs V2: workflow coach-athlète complet, historique
  immuable et lecture d’état ciblée en une RPC. `athleteGoalsV2` reste
  désactivé par défaut; hors pilote serveur et mapping explicite, le legacy
  Objectifs reste intégralement actif, sans dual-write.

La suite de la roadmap ne commence qu'après un lot explicitement approuvé.

## Trajectoire L08 à L14

- L08 a introduit la fiabilité de mutation comme fondation réutilisable pour un
  flux ciblé, avec confirmation et rollback local.
- L09 et L10 ont préparé puis piloté les groupes V2 autour d'une identité de
  séance canonique et d'un bridge legacy explicite.
- L11 sécurise les invitations athlètes V2; L12 remplace, pour son pilote,
  la suppression destructive par l'archivage atomique et sa restauration.
- L13 a extrait des lectures legacy du calendrier sans changement observable.
- L14 est clos: les sauvegardes ciblées mesurées sont intégrées pour les
  candidats proportionnés, y compris la création de séance de bibliothèque;
  L14c ne crée rien lorsque la baseline est déjà optimale. Les parcours
  restants qui exigent des écritures atomiques multi-ressources ou une décision
  métier sont reportés à L15, sans poursuivre L14.

## Domaines métier

Les domaines actuels sont Auth, Calendar, Workout Library, Week Notes, Weekly
Planning, Athlete Lifecycle, Invitations, Goals V2, Groups et Statistics. Les
frontières et contrats existants se trouvent dans `src/services/`, `src/types/`
et les documents de `docs/architecture/` et `docs/development/`.

Étendre le domaine propriétaire déjà présent avant de créer un service,
repository, hook ou couche parallèle. Les décisions spécifiques aux pilotes
restent documentées avec leur lot, sans déplacer leur détail ici.

## Pilotes et feature flags

Tous les flags du registre `src/lib/features/flags.ts` restent désactivés par
défaut. Leur contrat détaillé est dans
[`docs/development/feature-flags.md`](docs/development/feature-flags.md).

| Flag | État projet |
| --- | --- |
| `accessControlV2` | Fondations d'autorisation et lectures pilotes. |
| `groupsV2` | Fondations et programmation pilote de groupes V2. |
| `athleteInvitesV2` | Invitations athlètes V2, dépend de `accessControlV2`. |
| `athleteLifecycleV2` | Archivage/restauration athlète, dépend de `accessControlV2`. |
| `athleteGoalsV2` | Pilote UI Objectifs V2, dépend de `accessControlV2`, d’un pilote serveur et d’un mapping athlète explicite. |
| `reliableMutationsV2` | Pilotes locaux de mutations fiables. |

Un flag public ne constitue jamais une autorisation. Les pilotes L11 et L12 ne
doivent pas être cassés ni étendus hors de leur périmètre sans lot dédié.

## Documents de décision

- Accès et séparation des organisations: `docs/architecture/access-control-architecture.md`.
- Sessions de groupes V2: `docs/architecture/groups-v2-architecture.md`.
- Baseline, migrations et sécurité Supabase: `docs/supabase/` et `supabase/README.md`.
- Contrats de service, mutations fiables et pilotes: `docs/development/`.

Ces documents sont les sources de détail. `ARCHITECT.md` reste un index de
décisions, pas un second manuel d'implémentation.
