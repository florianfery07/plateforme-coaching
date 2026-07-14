-- L05 operator verification. Read-only by design: it does not alter V1 or V2.
-- Run only after an approved migration/backfill procedure and capture its output.

begin read only;

select
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'access_control'
order by tablename;

select
  tablename,
  policyname,
  cmd,
  roles
from pg_policies
where schemaname = 'access_control'
order by tablename, policyname;

select
  event_object_table as tablename,
  trigger_name,
  event_manipulation,
  action_timing
from information_schema.triggers
where trigger_schema = 'access_control'
order by event_object_table, trigger_name;

select
  routine_schema,
  routine_name,
  security_type
from information_schema.routines
where routine_schema in ('access_control', 'public')
  and routine_name in (
    'current_account_is_active',
    'current_user_is_platform_admin',
    'current_user_is_active_member',
    'current_user_can_access_athlete',
    'current_user_can_manage_athlete',
    'current_user_is_pilot',
    'get_access_context_v2'
  )
order by routine_schema, routine_name;

select
  account_status,
  migration_state,
  count(*) as account_count
from access_control.accounts
group by account_status, migration_state
order by account_status, migration_state;

select
  status,
  count(*) as membership_count
from access_control.organization_memberships
group by status
order by status;

select
  status,
  count(*) as relation_count
from access_control.coach_athlete_access
group by status
order by status;

select
  status,
  count(*) as delegation_count
from access_control.access_delegations
group by status
order by status;

select
  status,
  count(*) as pilot_count
from access_control.pilots
group by status
order by status;

rollback;
