-- L05 controlled, idempotent backfill preparation.
-- Run only after the L05 migration is approved and applied to the target
-- database. It never creates an organization, membership, coach role,
-- relationship, delegation, or pilot. It is intentionally conservative.

begin;

create temporary table access_control_backfill_counts (
  phase text primary key,
  account_count bigint not null
) on commit drop;

insert into access_control_backfill_counts (phase, account_count)
select 'before', count(*)
from access_control.accounts;

with linked_athlete_identities as (
  select distinct athlete.user_id
  from public.athletes athlete
  where athlete.user_id is not null
), inserted_accounts as (
  insert into access_control.accounts (
    user_id,
    account_status,
    migration_state
  )
  select
    user_id,
    'unverified',
    'observed_athlete'
  from linked_athlete_identities
  on conflict (user_id) do nothing
  returning user_id
)
select count(*) as inserted_accounts
from inserted_accounts;

insert into access_control_backfill_counts (phase, account_count)
select 'after', count(*)
from access_control.accounts;

select
  before_count.account_count as accounts_before,
  after_count.account_count as accounts_after,
  after_count.account_count - before_count.account_count as accounts_inserted
from access_control_backfill_counts before_count
join access_control_backfill_counts after_count
  on before_count.phase = 'before'
 and after_count.phase = 'after';

select
  'athlete_without_auth_identity' as anomaly_type,
  athlete.id::text as subject_id,
  'Legacy athlete has no linked auth user and remains unmigrated.' as detail
from public.athletes athlete
where athlete.user_id is null
union all
select
  'auth_identity_linked_to_multiple_athletes' as anomaly_type,
  athlete.user_id::text as subject_id,
  'One auth identity is linked to multiple legacy athlete rows.' as detail
from public.athletes athlete
where athlete.user_id is not null
group by athlete.user_id
having count(*) > 1
union all
select
  'linked_athlete_has_legacy_coach_role' as anomaly_type,
  athlete.user_id::text as subject_id,
  'Linked athlete identity also has legacy coach role; no V2 role is assigned.' as detail
from public.athletes athlete
join public.user_roles legacy_role
  on legacy_role.user_id = athlete.user_id
where athlete.user_id is not null
  and legacy_role.role = 'coach'
union all
select
  'legacy_coach_requires_manual_review' as anomaly_type,
  legacy_role.user_id::text as subject_id,
  'Legacy coach role is not backfilled because organization and scope are unknown.' as detail
from public.user_roles legacy_role
where legacy_role.role = 'coach';

-- The transaction is intentionally retained only for the safe account
-- observation rows. Operators must review the anomaly report before any manual
-- V2 organization, membership, relationship, or pilot provisioning.
commit;
