# Workouts structures V2 (P05.C / P05.D / P05.E / P05.F)

## Source de vérité

`public.workout_structures_v2.document` est l'unique contenu éditable V2. Il contient seulement les blocs, étapes, répétitions, durées en secondes, intensité, consigne et `isSpecific`. Le titre, la taxonomie, la description et les RPE prévus restent les métadonnées des tables parentes.

La structure vise exactement une ressource explicite : `workout_library`, `calendar_workouts` ou `group_sessions_v2`. P05.F ajoute cette troisième cible concrète, sans propriétaire polymorphe ni calendrier groupe artificiel.

## Révisions et snapshots

Une modification bibliothèque ajoute une révision immuable et rend cette révision courante. Une séance calendrier est un snapshot indépendant : sa ligne conserve le `source_structure_id` de la révision bibliothèque exacte dont elle provient. Modifier le modèle ne modifie donc jamais une séance déjà programmée.

P05.E ajoute `calendar_workouts.structured_workout_v2` comme marqueur additif et trois RPC ciblées : création atomique d’un parent calendrier et de son snapshot, lecture autorisée du snapshot, et modification atomique des métadonnées calendrier avec une nouvelle révision de structure. Une création directe n’a pas de source bibliothèque; une programmation depuis la bibliothèque référence exactement la révision courante sélectionnée. Dans les deux cas, `blocks` legacy reste inchangé.

## Validation, projections et P04

Les RPC `SECURITY DEFINER` possèdent un `search_path` verrouillé. PostgreSQL valide le contrat V1, recalcule les secondes totales et spécifiques, et refuse toute valeur dérivée non fiable. La validation TypeScript P05.B sert au retour utilisateur, jamais à l'autorisation serveur.

Une même transaction projette uniquement les valeurs legacy nécessaires :

| Parent | Champs projetés | Usage conservé |
| --- | --- | --- |
| `workout_library` | `total_duration`, `expected_specific_duration` | résumé bibliothèque et future programmation |
| `calendar_workouts` | `duration`, `expected_specific_duration` | calendrier actuel et exigence spécifique P04 |

`blocks` legacy n'est jamais écrasé par le chemin V2. Les secondes non entières en minutes sont projetées au format `HH:MM:SS`, déjà compris par le parseur de durée existant; la formule P04 reste strictement inchangée.

## Sécurité, rollout et rollback

La nouvelle table a RLS activée et aucun accès direct pour les clients. Les écritures passent uniquement par RPC : bibliothèque pour un coach V2 actif; calendrier pour un coach V2 actif ayant un accès explicite à un athlète actif et mappé. Le flag public n'est jamais une autorisation.

`structuredWorkoutsV2` est désactivé par défaut. P05.D ajoute le constructeur bibliothèque uniquement : création atomique du parent et de sa révision initiale, lecture de la révision courante, édition sous forme d'une nouvelle révision et duplication avec une nouvelle identité. P05.E raccorde ce pilote à la programmation individuelle depuis Pilotage et à une lecture compacte coach/athlète. Un modèle ou une séance legacy reste sur son chemin historique : aucune conversion ni dual-write n'est introduit.

P05.F programme une séance structurée de groupe dans une unique `group_sessions_v2`, avec les assignations membres Groups V2 existantes et un snapshot `workout_structures_v2` indépendant. Aucune ligne `calendar_workouts` individuelle n’est créée. La lecture du snapshot est autorisée au coach concerné ou à l’athlète assigné par le RLS Groups V2; l’interface athlète et le feedback individuel de groupe restent reportés, car le calendrier athlète ne consomme pas encore cette représentation canonique.

La création directe et la programmation depuis un modèle bibliothèque utilisent les mêmes RPC transactionnelles. Toute édition structurée de groupe ajoute une révision immuable du snapshot et met à jour uniquement les métadonnées de la séance groupe canonique. La RPC historique de modification de groupe refuse une séance structurée afin d’empêcher une divergence entre les métadonnées et le document V2.

Le rollback consiste à garder le flag désactivé : les structures et projections additives restent en base, tandis que le constructeur legacy continue sans changement. Le flag public ne donne jamais accès à lui seul; les RPC contrôlent le pilote Access Control V2.

## Vérification locale

```bash
npm run test:workout-structures-v2:sql
npm run test:structured-group-sessions-v2:sql
npm run generate:types:check
```

Le test SQL utilise uniquement un PostgreSQL Docker jetable, sans projet Supabase hébergé.

## Analyse et Garmin futurs

Les snapshots groupe exposent déjà le document validé, les durées planifiées totale et spécifique, les intensités explicites, le nombre et la répartition des efforts, ainsi que les RPE attendus. P05 ne calcule aucune charge ni recommandation et n’intègre aucune API Garmin. `schemaVersion: 1` ne représente pas encore les cibles de cadence, fréquence cardiaque, puissance absolue ni les exports de formats partenaires; ces décisions restent du ressort de P07 et d’un lot d’intégration dédié.
