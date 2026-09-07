# Workouts structures V2 (P05.C)

## Source de vérité

`public.workout_structures_v2.document` est l'unique contenu éditable V2. Il contient seulement les blocs, étapes, répétitions, durées en secondes, intensité, consigne et `isSpecific`. Le titre, la taxonomie, la description et les RPE prévus restent les métadonnées des tables parentes.

La structure vise exactement une ressource explicite : `workout_library` ou `calendar_workouts`. P05.C ne crée ni propriétaire polymorphe ni cible Groups V2 dormante; P05.F pourra ajouter une cible explicite si ce flux est validé.

## Révisions et snapshots

Une modification bibliothèque ajoute une révision immuable et rend cette révision courante. Une séance calendrier est un snapshot indépendant : sa ligne conserve le `source_structure_id` de la révision bibliothèque exacte dont elle provient. Modifier le modèle ne modifie donc jamais une séance déjà programmée.

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

`structuredWorkoutsV2` est désactivé par défaut et P05.C ne crée aucune UI. Le rollback consiste à garder le flag désactivé pour les futurs écrans : les structures additives et leurs snapshots restent en base, tandis que le constructeur legacy continue sans changement. P05.D/E devront démontrer lecture et programmation avant tout retrait legacy.

## Vérification locale

```bash
npm run test:workout-structures-v2:sql
npm run generate:types:check
```

Le test SQL utilise uniquement un PostgreSQL Docker jetable, sans projet Supabase hébergé.
