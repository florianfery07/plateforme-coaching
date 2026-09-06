# Coach Pilotage V2

## Périmètre

`coachPilotageV2` conserve l'application et le calendrier legacy comme voie
par défaut. Le pilote remplace uniquement la composition coach du calendrier
par l'espace Pilotage: P01/P02 couvrent le shell et la semaine; P03 ajoute la
lecture mensuelle moyen terme.

Le flag ne constitue pas une autorisation. Les opérations P03 exigent aussi un
compte actif, un pilote serveur, un mapping athlète explicite et l'accès coach
approprié fournis par Access Control V2.

## Modèle P03

Deux objets métier distincts évitent de déformer les données legacy:

- `athlete_pilotage_cycles_v2` stocke un intervalle nommé, sa couleur et son
  intention coach. Les chevauchements sont volontairement permis.
- `athlete_pilotage_milestones_v2` stocke un jalon daté de type `goal` ou
  `competition`. Un jalon objectif référence, lorsque nécessaire, une version
  Goals V2 acceptée et immuable.

Les couleurs hebdomadaires legacy restent inchangées: elles n'ont ni période,
ni titre, ni capacité de chevauchement. Goals V2 reste le propriétaire du
contenu objectif; P03 ne lit pas et ne réécrit pas son historique.

Toutes les tables P03 sont sous RLS sans accès direct pour `anon` ou
`authenticated`. Les lectures, créations, modifications optimistes protégées
par révision et archivages logiques passent par les RPC dédiées. P03 ne modifie
jamais `calendar_workouts`, `athlete_week_planning` ou les données Goals V2.

## Rollout et retour arrière

1. Laisser `coachPilotageV2` désactivé par défaut.
2. Activer localement pour un coach pilote avec `accessControlV2`; activer
   `athleteGoalsV2` seulement lorsqu'un jalon doit proposer l'objectif courant.
3. Valider la semaine, le mois, les cycles qui se chevauchent, les jalons et
   les deux chemins de sélection athlète/groupe.
4. Élargir progressivement uniquement après preuve produit et sécurité.

Le rollback est immédiat: désactiver `coachPilotageV2` et redémarrer le client.
Les objets P03 restent intacts mais inactifs, aucune donnée legacy n'a besoin
d'être restaurée. Leur retrait éventuel exige un lot ultérieur dédié; il ne
fait pas partie de P03.

## Validation locale

`npm run test:pilotage-timeline-v2:sql` lance une preuve PostgreSQL isolée.
`npm run local:groups-v2:bootstrap` charge uniquement la baseline et les
migrations/fixtures locales, y compris la fixture P03. Aucune commande de ces
procédures n'utilise `--linked` ou un projet Supabase distant.
