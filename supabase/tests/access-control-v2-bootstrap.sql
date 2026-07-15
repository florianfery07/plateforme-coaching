create extension if not exists pgcrypto;

create schema if not exists auth;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end;
$$;

create table if not exists auth.users (
  id uuid primary key,
  email text not null unique
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create table if not exists public.athletes (
  id uuid primary key,
  user_id uuid references auth.users (id),
  active boolean not null default true,
  email text
);

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users (id),
  role text not null check (role in ('coach', 'athlete'))
);
create table if not exists public.athlete_groups (id uuid primary key, name text not null);
create table if not exists public.athlete_group_members (group_id uuid not null references public.athlete_groups (id), athlete_id uuid not null references public.athletes (id), unique (group_id, athlete_id));
