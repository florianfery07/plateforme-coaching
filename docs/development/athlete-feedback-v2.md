# Retour séance V2

## Portée

P04 introduit un pilote de retour structuré pour une séance individuelle
legacy. Il ajoute une donnée `sensation` distincte du RPE et un `updated_at`
fiable dans `public.workout_feedbacks`, avec deux écritures V3 ciblées :
`save_workout_feedback_draft_v3` et `complete_workout_with_feedback_v3`.

Le pilote est actif uniquement lorsque `accessControlV2` et
`athleteFeedbackV2` sont activés, que le serveur confirme un compte pilote
actif et que l'athlète cible dispose d'un mapping legacy/V2 actif. Un flag
public ne vaut jamais autorisation.

Hors pilote, le formulaire et les écritures legacy restent inchangés. P04 ne
modifie pas les RPC L15, les formules de charge, les données de groupes V2 ni
les règles de programmation.

## Contrat métier

- `sensation` mesure le ressenti pendant la séance sur une échelle de 1 à 5;
  elle est indépendante du RPE.
- Le RPE global reste la difficulté perçue sur l'ensemble de la séance. Le
  miroir `rpe = rpe_global` est préservé.
- Le RPE spécifique est demandé uniquement lorsque les deux champs de
  planification explicites sont renseignés: `expected_rpe_specific` et une
  `expected_specific_duration` positive. Aucun bloc ou intitulé legacy ne sert
  d'heuristique.
- Le commentaire est facultatif dans le pilote V2. Motivation, plaisir,
  durée, RPE global et sensations restent obligatoires à la finalisation.
- P04 ne saisit pas de durée spécifique réellement effectuée. Les formules de
  charge existantes restent strictement inchangées; cette limite est reportée
  à P05, puis à l'analyse P07.

Les états sont dérivés dans `src/lib/trainingUtils.ts`, sans colonne de statut:
`scheduled`, `missing`, `incomplete`, `complete`, `nonDone` et `rest`.

## Brouillon, finalisation et correction

Un brouillon est une écriture partielle persistante, possible uniquement pour
une séance active non finalisée et non indiquée comme non réalisée. La RPC
verrouille la séance puis refuse qu'un brouillon écrase une finalisation.

La finalisation et la correction ultérieure verrouillent la même séance,
mettent à jour une unique ligne de feedback et marquent la séance réalisée
dans une seule transaction. Une requête répétée avec le même contenu est
idempotente: `updated_at` ne change que si les données changent. L'interface
utilise `useReliableMutation` avec une ressource sérialisée, une confirmation
serveur et un rollback local sûr en cas d'échec.

## Sécurité et lecture coach

Les RPC V3 sont `SECURITY DEFINER`, utilisent un `search_path` verrouillé,
révoquent l'exécution à `anon` et exigent une session, un compte actif, un
pilote actif, un membership actif et un accès explicite à l'athlète. Un
athlète archivé L12 est refusé jusqu'à sa restauration.

Le coach pilote voit une synthèse compacte et un détail en lecture seule. Les
anciens retours sans sensations structurées conservent leur sémantique legacy;
ils ne sont pas réinterprétés comme des retours V2.

## Rollout et retour arrière

| Étape | Décision | Preuve requise |
| --- | --- | --- |
| État actuel | Les deux flags sont désactivés par défaut. | Preuves SQL, tests de service/UI et CI verte. |
| Pilote interne | Activer les flags pour un compte et un athlète explicitement mappés. | Saisie mobile, lecture coach, brouillon, correction et rollback vérifiés. |
| Extension progressive | Ajouter des pilotes après revue des refus, erreurs et support. | Aucune écriture legacy depuis V2 et contrôle des retours finalisés. |
| Bascule par défaut | Lot produit et sécurité distinct. | Usage durable, plan de migration des retours et critères de support validés. |
| Retrait legacy | Hors P04, dans un lot approuvé. | Audit des données, plan de migration et preuve de rollback. |

Pour revenir au legacy, désactiver l'un des deux flags et redémarrer Next.js.
Les brouillons et retours V2 déjà enregistrés restent dans la ligne de
feedback existante mais ne sont jamais recopiés vers une seconde structure.

## Validation locale

```sh
npm run test:athlete-feedback-v2:sql
npx vitest run tests/services/calendar-feedback-v2-service.test.ts \
  tests/components/athlete-session-feedback-v2.test.tsx \
  tests/components/athlete-notifications-feedback-v2.test.tsx \
  tests/training-feedback-v2.test.ts
```

La preuve SQL utilise un PostgreSQL Docker jetable et des données synthétiques.
Elle couvre les permissions, le mapping explicite, les brouillons, les deux
bornes de sensations, la finalisation sans commentaire, la correction,
l'archivage/restauration L12, le rollback transactionnel et la concurrence
brouillon/finalisation. Elle ne contacte aucune instance Supabase distante.

Pour l'interface locale, `npm run local:groups-v2:bootstrap` inclut la
migration P04 et la fixture `athlete-feedback-v2-local-fixture.sql`. Elle
réutilise exclusivement les comptes synthétiques L10 et ajoute la séance
`P04 Retour seance local` pour `L10 Athlete One`.

## Dette volontaire

- Les feedbacks individuels de Groups V2 restent hors P04.
- Une durée spécifique réellement exécutée et des blocs explicitement
  spécifiques relèvent de P05.
- L'interprétation scientifique de la charge relève de P07.
- P04 n'introduit pas d'historique complet de versions de feedback.
