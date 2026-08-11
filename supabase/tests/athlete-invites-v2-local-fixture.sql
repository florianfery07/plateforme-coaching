-- L11 local-only browser fixture. Synthetic, unlinked legacy athlete for the V2 invitation pilot.
insert into public.athletes (id, name, email, user_id, active, sport, color) values
  ('93000000-0000-0000-0000-000000000003', 'L11 Invited Athlete', 'l11-pending@example.test', null, true, 'Velo', 'bg-violet-500')
on conflict (id) do update set name = excluded.name, email = excluded.email, user_id = null, active = excluded.active;

delete from access_control.legacy_athlete_links
where legacy_athlete_id = '93000000-0000-0000-0000-000000000003';
