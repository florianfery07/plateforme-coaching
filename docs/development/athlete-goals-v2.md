# Objectifs V2

## Portée

Goals V2 remplace progressivement le flux legacy de demande et de validation
d'objectifs pour un pilote explicitement autorisé. Il ne remplace pas les
colonnes legacy, `athlete_goal_history`, ni leur interface hors pilote.

Le flux V2 est actif uniquement lorsque `accessControlV2` et `athleteGoalsV2`
sont activés, que le compte est actif, que le pilote est autorisé côté serveur
et que l'athlète possède un mapping legacy vers un membership V2 actif. Un flag
public ne vaut jamais autorisation.

## Workflow durable

1. Le coach ouvre une demande `requested`.
2. L'athlète soumet une version, qui devient `submitted`.
3. Le coach accepte la version, ou demande des modifications. Le second choix
   passe la demande à `changes_requested` et conserve la version précédente.
4. L'athlète soumet une nouvelle révision. Le coach peut alors l'accepter.
5. Le coach peut annuler une demande ouverte, ce qui la place à `cancelled`.

Seule l'acceptation modifie l'objectif courant V2. Les versions sont
append-only : leur contenu ne peut ni être modifié ni supprimé, et une issue de
revue ne peut être attachée qu'une fois. Les RPC verrouillent la demande, ce
qui rend les transitions atomiques et protège les concurrences coach/coach ou
athlète/appareil.

## Isolation et sécurité

- Les tables V2 sont protégées par RLS et ne sont pas accessibles directement.
- Les RPC `SECURITY DEFINER` utilisent un `search_path` fixé, exigent une
  session, un compte actif, un pilote actif et les accès Access Control V2.
- Chaque mutation vérifie le mapping actif, le membership et le rôle du
  demandeur; un athlète archivé devient indisponible jusqu'à sa restauration
  L12.
- Les écritures V2 ne modifient jamais les colonnes Objectifs legacy ni
  `athlete_goal_history`: il n'existe aucun dual-write.
- La lecture UI passe par `get_athlete_goal_state_v2`, une projection ciblée
  unique qui retourne l'objectif courant, la demande ouverte et l'historique.

Les créations et soumissions portent une clé d'idempotence. Le pilote UI
réutilise `useReliableMutation` pour rejouer une panne réseau avec la même
intention, refuser les actions concurrentes et relire uniquement l'état de
l'athlète après une réponse incertaine. Il n'appelle jamais `loadAllData()`.

## Rollout

| Étape | Décision | Preuve requise |
| --- | --- | --- |
| État actuel | Flag désactivé par défaut. | Tests SQL, composants et CI verte. |
| Pilote interne | Activer les deux flags pour une organisation et des comptes explicitement provisionnés. | Flux complet coach/athlète, journaux sans donnée sensible, contrôle du mapping. |
| Activation progressive | Étendre un pilote après revue des erreurs, des conflits et du support utilisateur. | Aucune perte d'historique, aucun dual-write, rollback testé. |
| Bascule par défaut | Décision produit et sécurité dans un lot dédié. | Usage pilote durable, monitoring et migration legacy validés. |
| Retrait legacy | Lot séparé, jamais dans L16. | Sauvegarde, plan de migration de données, contrôle de lecture et accord explicite. |

## Retour arrière

Pour stopper le pilote, désactiver l'un des deux flags et redémarrer Next.js.
Les nouveaux parcours repassent alors au legacy existant. Les versions V2 déjà
créées restent conservées comme audit et ne sont pas supprimées. Les valeurs
legacy ne sont pas synchronisées depuis V2 par conception; une future bascule
doit donc définir et valider sa stratégie de migration avant tout retrait du
legacy.

## Validation locale

```sh
npm run test:athlete-goals-v2:sql
npm run test -- src/services/goals-v2/goal-service.test.ts src/components/athlete/AthleteGoalsV2Panel.test.tsx
```

Le premier contrôle utilise un PostgreSQL Docker jetable avec des données
synthétiques et couvre les permissions, toutes les transitions, l'idempotence,
les deux concurrences, l'archivage/restauration L12, l'immuabilité et
l'isolement du legacy. Il n'utilise aucune instance Supabase distante.
