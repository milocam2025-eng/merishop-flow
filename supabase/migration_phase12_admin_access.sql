-- MeriShop Flow Pro - Fase 12: acceso administrativo autorizado.
-- Mantiene la tienda pública y protege todos los módulos internos.

begin;

create table if not exists public.authorized_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.authorized_admins enable row level security;
revoke all on table public.authorized_admins from public, anon, authenticated;

-- Administrador propietario inicial de MeriShop.
insert into public.authorized_admins (user_id)
values ('1c6a6f15-ce47-4884-a62a-39b57b99dd84'::uuid)
on conflict (user_id) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.authorized_admins a
      where a.user_id = auth.uid()
    );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Estas políticas son restrictivas: se suman a las políticas existentes.
-- Un usuario autenticado debe ser propietario de sus filas Y administrador.
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'clients',
    'inventory',
    'inventory_images',
    'inventory_movements',
    'orders',
    'payments',
    'shipments',
    'order_status_history'
  ]
  loop
    if to_regclass('public.' || v_table) is not null then
      execute format(
        'drop policy if exists admin_authorization_required on public.%I',
        v_table
      );
      execute format(
        'create policy admin_authorization_required on public.%I as restrictive for all to authenticated using (public.is_admin()) with check (public.is_admin())',
        v_table
      );
    end if;
  end loop;
end;
$$;

-- Las funciones administrativas con SECURITY DEFINER también validan la lista.
create or replace function public.register_order_payment(
  p_order_id uuid,
  p_amount numeric,
  p_method text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_total numeric;
  v_paid numeric;
  v_new_paid numeric;
  v_new_status text;
  v_payment_id public.payments.id%type;
begin
  if not public.is_admin() then
    raise exception 'Cuenta sin autorización administrativa.' using errcode = '42501';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'El monto debe ser mayor a cero.';
  end if;

  if nullif(btrim(coalesce(p_method, '')), '') is null then
    raise exception 'Selecciona un método de pago.';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
    and (user_id = auth.uid() or source = 'tienda')
  for update;

  if not found then
    raise exception 'Pedido no encontrado o sin permiso.';
  end if;

  if v_order.status = 'Cancelado' then
    raise exception 'No se puede registrar un pago en un pedido cancelado.';
  end if;

  v_total := case
    when v_order.source = 'tienda' then coalesce(v_order.total_mxn, v_order.total, 0)
    else coalesce(v_order.total, 0)
  end;
  v_paid := greatest(0, coalesce(v_order.paid, 0));

  if p_amount > v_total - v_paid then
    raise exception 'El pago excede el saldo pendiente.';
  end if;

  v_new_paid := v_paid + p_amount;
  v_new_status := case
    when v_new_paid >= v_total then 'Pagado'
    when v_new_paid > 0 then 'Apartado'
    else coalesce(v_order.status, 'Nuevo')
  end;

  insert into public.payments (user_id, order_id, amount, method)
  values (auth.uid(), v_order.id, p_amount, btrim(p_method))
  returning id into v_payment_id;

  update public.orders
  set paid = v_new_paid,
      status = v_new_status
  where id = v_order.id;

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'paid', v_new_paid,
    'balance', greatest(0, v_total - v_new_paid),
    'status', v_new_status
  );
end;
$$;

create or replace function public.cancel_order_and_restore_inventory(
  p_order_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_item jsonb;
  v_inventory public.inventory%rowtype;
  v_inventory_id uuid;
  v_restore_quantity integer;
  v_new_quantity integer;
  v_new_status text;
begin
  if not public.is_admin() then
    raise exception 'Cuenta sin autorización administrativa.' using errcode = '42501';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'El pedido no existe.' using errcode = 'P0002';
  end if;

  if v_order.user_id is not null and v_order.user_id <> auth.uid() then
    raise exception 'No tienes permiso para cancelar este pedido.' using errcode = '42501';
  end if;

  if v_order.status = 'Cancelado' then
    return jsonb_build_object('order_id', v_order.id, 'already_cancelled', true);
  end if;

  if v_order.source = 'tienda' and v_order.inventory_reserved then
    for v_item in select value from jsonb_array_elements(coalesce(v_order.items, '[]'::jsonb))
    loop
      v_inventory_id := nullif(v_item ->> 'inventory_id', '')::uuid;
      v_restore_quantity := greatest(coalesce((v_item ->> 'quantity')::integer, 0), 0);

      if v_inventory_id is null or v_restore_quantity = 0 then
        continue;
      end if;

      select * into v_inventory
      from public.inventory
      where id = v_inventory_id
      for update;

      if found then
        v_new_quantity := coalesce(v_inventory.quantity, 0) + v_restore_quantity;
        v_new_status := case
          when v_new_quantity <= coalesce(v_inventory.minimum_stock, 1) then 'Stock bajo'
          else 'Disponible'
        end;

        update public.inventory
        set quantity = v_new_quantity,
            status = v_new_status
        where id = v_inventory.id;
      end if;
    end loop;
  elsif v_order.source is distinct from 'tienda' and v_order.inventory_id is not null then
    select * into v_inventory
    from public.inventory
    where id = v_order.inventory_id
    for update;

    if found then
      v_new_quantity := coalesce(v_inventory.quantity, 0) + 1;
      v_new_status := case
        when v_new_quantity <= coalesce(v_inventory.minimum_stock, 1) then 'Stock bajo'
        else 'Disponible'
      end;

      update public.inventory
      set quantity = v_new_quantity,
          status = v_new_status
      where id = v_inventory.id;
    end if;
  end if;

  update public.orders
  set status = 'Cancelado',
      inventory_reserved = false
  where id = v_order.id;

  return jsonb_build_object('order_id', v_order.id, 'already_cancelled', false);
end;
$$;

revoke all on function public.register_order_payment(uuid, numeric, text) from public, anon;
grant execute on function public.register_order_payment(uuid, numeric, text) to authenticated;
revoke all on function public.cancel_order_and_restore_inventory(uuid) from public, anon;
grant execute on function public.cancel_order_and_restore_inventory(uuid) to authenticated;

insert into public.schema_migrations (version, description)
values ('12', 'Lista de administradores y autorización obligatoria')
on conflict (version) do update
set description = excluded.description;

commit;
