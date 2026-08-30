-- MeriShop Flow Pro - Fase 6: control y trazabilidad del inventario.
-- Requisito: revisar audit_phase6_inventory.sql antes de ejecutar.
begin;

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  inventory_id uuid not null references public.inventory(id) on delete cascade,
  order_id uuid null references public.orders(id) on delete set null,
  movement_type text not null,
  reason text not null,
  previous_quantity integer not null,
  new_quantity integer not null,
  quantity_delta integer not null,
  created_at timestamptz not null default now(),
  constraint inventory_movements_consistent_delta
    check (quantity_delta = new_quantity - previous_quantity)
);

create index if not exists inventory_movements_inventory_created_idx
  on public.inventory_movements (inventory_id, created_at desc);
create index if not exists inventory_movements_user_created_idx
  on public.inventory_movements (user_id, created_at desc);

alter table public.inventory_movements enable row level security;

drop policy if exists inventory_movements_owner_read on public.inventory_movements;
create policy inventory_movements_owner_read
  on public.inventory_movements for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on table public.inventory_movements from public, anon;
grant select on table public.inventory_movements to authenticated;

create or replace function public.log_inventory_quantity_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_type text;
  v_reason text;
begin
  if tg_op = 'INSERT' then
    if coalesce(new.quantity, 0) = 0 then return new; end if;
    v_type := 'entrada';
    v_reason := 'Inventario inicial';
    insert into public.inventory_movements (
      user_id, inventory_id, movement_type, reason,
      previous_quantity, new_quantity, quantity_delta
    ) values (
      new.user_id, new.id, v_type, v_reason,
      0, new.quantity, new.quantity
    );
    return new;
  end if;

  if new.quantity is not distinct from old.quantity then return new; end if;
  v_type := case when new.quantity > old.quantity then 'entrada' else 'salida' end;
  v_reason := case
    when current_setting('merishop.inventory_reason', true) <> ''
      then current_setting('merishop.inventory_reason', true)
    when new.quantity > old.quantity then 'Reposición o ajuste manual'
    else 'Venta o ajuste manual'
  end;

  insert into public.inventory_movements (
    user_id, inventory_id, movement_type, reason,
    previous_quantity, new_quantity, quantity_delta
  ) values (
    new.user_id, new.id, v_type, v_reason,
    old.quantity, new.quantity, new.quantity - old.quantity
  );
  return new;
end;
$$;

drop trigger if exists inventory_quantity_audit on public.inventory;
create trigger inventory_quantity_audit
after insert or update of quantity on public.inventory
for each row execute function public.log_inventory_quantity_change();

-- Protege los nuevos datos sin bloquear el despliegue por registros históricos.
alter table public.inventory
  drop constraint if exists inventory_quantity_nonnegative,
  add constraint inventory_quantity_nonnegative check (quantity >= 0) not valid,
  drop constraint if exists inventory_minimum_stock_nonnegative,
  add constraint inventory_minimum_stock_nonnegative check (minimum_stock >= 0) not valid,
  drop constraint if exists inventory_product_not_blank,
  add constraint inventory_product_not_blank check (nullif(btrim(product), '') is not null) not valid,
  drop constraint if exists inventory_sku_not_blank,
  add constraint inventory_sku_not_blank check (nullif(btrim(sku), '') is not null) not valid,
  drop constraint if exists inventory_category_not_blank,
  add constraint inventory_category_not_blank check (nullif(btrim(category), '') is not null) not valid,
  drop constraint if exists inventory_money_nonnegative,
  add constraint inventory_money_nonnegative check (
    coalesce(cost_usd, 0) >= 0
    and coalesce(exchange_rate, 0) >= 0
    and coalesce(sale_price_mxn, 0) >= 0
  ) not valid;

-- Se crea después de resolver los duplicados detectados por el audit previo.
create unique index if not exists inventory_owner_sku_unique_idx
  on public.inventory (user_id, upper(btrim(sku)))
  where nullif(btrim(sku), '') is not null;

commit;
