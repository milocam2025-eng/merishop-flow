-- MeriShop Flow Pro - Fase 11: continuidad y comprobación de base de datos.

begin;

create table if not exists public.schema_migrations (
  version text primary key,
  description text not null,
  applied_at timestamptz not null default now()
);

alter table public.schema_migrations enable row level security;
revoke all on table public.schema_migrations from public, anon, authenticated;

create or replace function public.health_check()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'database', 'ok',
    'checked_at', transaction_timestamp()
  );
$$;

revoke all on function public.health_check() from public;
grant execute on function public.health_check() to anon, authenticated;

insert into public.schema_migrations (version, description)
values ('11', 'Continuidad, registro de migraciones y health check de base de datos')
on conflict (version) do update
set description = excluded.description;

commit;
