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

## État actuel

- L01 à L13 sont terminés: baseline Supabase, qualité, feature flags, Access
  Control V2, typage, lectures pilotes, mutations fiables, Groups V2,
  invitations, cycle de vie athlète et extraction ciblée du calendrier.
- L14a, L14b, L14d, L14e et L14f sont terminés: sauvegardes ciblées de
  feedback, de bibliothèque, de programmation individuelle, d'ajustement de
  durée spécifique et de repos individuel au calendrier.
- L14c a été volontairement abandonné après mesure: la sauvegarde du planning
  hebdomadaire réalise déjà une écriture ciblée, sans lecture globale ni
  `loadAllData`.

La suite de la roadmap ne commence qu'après un lot explicitement approuvé.

## Trajectoire L08 à L14

- L08 a introduit la fiabilité de mutation comme fondation réutilisable pour un
  flux ciblé, avec confirmation et rollback local.
- L09 et L10 ont préparé puis piloté les groupes V2 autour d'une identité de
  séance canonique et d'un bridge legacy explicite.
- L11 sécurise les invitations athlètes V2; L12 remplace, pour son pilote,
  la suppression destructive par l'archivage atomique et sa restauration.
- L13 a extrait des lectures legacy du calendrier sans changement observable.
- L14 privilégie les sauvegardes ciblées mesurées: L14a, L14b, L14d, L14e et
  L14f sont intégrés; L14c ne crée rien lorsque la baseline est déjà optimale.

## Domaines métier

Les domaines actuels sont Auth, Calendar, Workout Library, Week Notes, Weekly
Planning, Athlete Lifecycle, Invitations, Groups et Statistics. Les frontières
et contrats existants se trouvent dans `src/services/`, `src/types/` et les
documents de `docs/architecture/` et `docs/development/`.

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
