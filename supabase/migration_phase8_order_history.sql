-- MeriShop Flow Pro - Fase 8: historial seguro de estados de pedido.

begin;

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid,
  changed_by uuid,
  previous_status text,
  new_status text not null,
  source text not null default 'application',
  created_at timestamptz not null default now()
);

create index if not exists order_status_history_order_created_idx
  on public.order_status_history (order_id, created_at desc);

create index if not exists order_status_history_user_created_idx
  on public.order_status_history (user_id, created_at desc);

alter table public.order_status_history enable row level security;

drop policy if exists order_status_history_authenticated_read
  on public.order_status_history;

create policy order_status_history_authenticated_read
  on public.order_status_history
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.orders o
      where o.id = order_id
        and (o.user_id = auth.uid() or o.source = 'tienda')
    )
  );

revoke all on table public.order_status_history from public, anon;
grant select on table public.order_status_history to authenticated;

create or replace function public.log_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.order_status_history (
      order_id, user_id, changed_by, previous_status, new_status, source
    ) values (
      new.id,
      new.user_id,
      auth.uid(),
      case when tg_op = 'UPDATE' then old.status else null end,
      new.status,
      case when auth.uid() is null then 'public_store' else 'application' end
    );
  end if;
  return new;
end;
$$;

revoke all on function public.log_order_status_change() from public;

drop trigger if exists orders_status_history_trigger on public.orders;
create trigger orders_status_history_trigger
after insert or update of status on public.orders
for each row execute function public.log_order_status_change();

commit;
