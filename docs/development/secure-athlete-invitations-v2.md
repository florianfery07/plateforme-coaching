# Invitations athlètes V2 (L11)

L11 ajoute un pilote d'invitation athlète sécurisé, sans supprimer ni modifier le parcours legacy. Il est désactivé par défaut et nécessite simultanément `NEXT_PUBLIC_FEATURE_ACCESS_CONTROL_V2=enabled` et `NEXT_PUBLIC_FEATURE_ATHLETE_INVITES_V2=enabled` côté client. Un flag ne constitue jamais une autorisation : chaque RPC vérifie l'utilisateur authentifié, son compte V2 actif, son statut pilote et son membership coach actif.

## Périmètre et réversibilité

Le pilote concerne uniquement l'invitation depuis la fiche athlète. Lorsque les flags sont désactivés, l'interface conserve le parcours legacy. Un jeton commençant par `v2i_` n'est jamais transmis à `link_athlete_invite` : avec le pilote désactivé, il renvoie une erreur sûre. Il n'y a ni double écriture d'invitation, ni suppression de code legacy, ni écriture dans `calendar_workouts`.

## Modèle et RPC

`access_control.athlete_invites` conserve l'organisation, le membership coach émetteur, l'athlète legacy ciblé, l'état et les dates. Elle ne conserve jamais le jeton brut : seul `digest(token, 'sha256')` est persisté. Le jeton est généré par PostgreSQL avec 32 octets aléatoires, est retourné une seule fois à la création et expire au bout de sept jours.

Les fonctions `create_athlete_invite_v2`, `list_athlete_invites_v2`, `revoke_athlete_invite_v2` et `consume_athlete_invite_v2` sont `SECURITY DEFINER`, avec `search_path` fixé et `EXECUTE` réservé à `authenticated`. La table possède RLS et n'accorde aucun accès direct. La consommation verrouille l'invitation, ne peut réussir qu'une fois, crée atomiquement le compte/membership athlète V2, le lien coach-athlète et le mapping legacy explicite. Elle fixe ensuite uniquement `public.athletes.user_id` pour que la lecture legacy identifie l'athlète après un retour des flags ; elle ne crée ni n'actualise d'invitation legacy.

## Validation locale

La preuve SQL isolée se lance avec :

```bash
npm run test:athlete-invites-v2:sql
```

Le bootstrap local ajoute la baseline L01, L05, L09, L09bis, L11, puis les fixtures synthétiques :

```bash
npm run local:groups-v2:bootstrap
```

La fixture crée `L11 Invited Athlete`, athlète legacy actif et non lié. Elle permet d'exercer le flux navigateur sans donnée distante. Ne pas exécuter `db push`, `db reset --linked` ou une commande `--linked` pendant ce pilote.
