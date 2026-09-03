-- MeriShop Flow Pro - Fase 11: reparación aislada de cancelación de pedidos.
-- Ejecutar solo si audit_phase11_continuity.sql reporta una función ausente
-- y el diagnóstico confirma cancel_order_and_restore_inventory.

begin;

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
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión.' using errcode = '42501';
  end if;

  select *
    into v_order
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
    for v_item in
      select value
      from jsonb_array_elements(coalesce(v_order.items, '[]'::jsonb))
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

revoke all on function public.cancel_order_and_restore_inventory(uuid) from public, anon;
grant execute on function public.cancel_order_and_restore_inventory(uuid) to authenticated;

commit;
