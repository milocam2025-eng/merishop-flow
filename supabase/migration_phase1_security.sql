-- MeriShop Flow Pro - Fase 1, paso A: preparar funciones seguras
-- Compatible con la versión anterior de la aplicación.
-- Ejecutar antes de desplegar el código de la rama phase-1-security.

begin;

alter table public.orders
  add column if not exists inventory_reserved boolean not null default false;

create or replace function public.create_store_order(
  p_customer_name text,
  p_customer_phone text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item jsonb;
  v_inventory public.inventory%rowtype;
  v_inventory_id uuid;
  v_requested_quantity integer;
  v_new_quantity integer;
  v_new_status text;
  v_price numeric;
  v_total numeric := 0;
  v_normalized_items jsonb := '[]'::jsonb;
  v_product_summary text := '';
  v_order_number text;
  v_order_id uuid;
begin
  p_customer_name := btrim(coalesce(p_customer_name, ''));
  p_customer_phone := regexp_replace(coalesce(p_customer_phone, ''), '\D', '', 'g');

  if char_length(p_customer_name) < 2 or char_length(p_customer_name) > 100 then
    raise exception 'Escribe un nombre válido.' using errcode = '22023';
  end if;

  if char_length(p_customer_phone) < 10 or char_length(p_customer_phone) > 15 then
    raise exception 'Escribe un número de WhatsApp válido.' using errcode = '22023';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 25 then
    raise exception 'El carrito no es válido.' using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    begin
      v_inventory_id := nullif(v_item ->> 'inventory_id', '')::uuid;
      v_requested_quantity := (v_item ->> 'quantity')::integer;
    exception
      when invalid_text_representation then
        raise exception 'El carrito contiene un producto inválido.' using errcode = '22023';
    end;

    if v_inventory_id is null
       or v_requested_quantity is null
       or v_requested_quantity < 1
       or v_requested_quantity > 10 then
      raise exception 'La cantidad solicitada no es válida.' using errcode = '22023';
    end if;

    select *
      into v_inventory
      from public.inventory
     where id = v_inventory_id
       and status in ('Disponible', 'Stock bajo')
     for update;

    if not found then
      raise exception 'Uno de los productos ya no está disponible.' using errcode = 'P0001';
    end if;

    if coalesce(v_inventory.quantity, 0) < v_requested_quantity then
      raise exception 'No hay suficientes unidades de %.', v_inventory.product using errcode = 'P0001';
    end if;

    v_price := coalesce(v_inventory.sale_price_mxn, 0);

    if v_price <= 0 then
      raise exception 'El precio de % necesita confirmación.', v_inventory.product using errcode = 'P0001';
    end if;

    v_new_quantity := v_inventory.quantity - v_requested_quantity;
    v_new_status := case
      when v_new_quantity <= 0 then 'Agotado'
      when v_new_quantity <= coalesce(v_inventory.minimum_stock, 1) then 'Stock bajo'
      else 'Disponible'
    end;

    update public.inventory
       set quantity = v_new_quantity,
           status = v_new_status
     where id = v_inventory.id;

    v_total := v_total + (v_price * v_requested_quantity);
    v_normalized_items := v_normalized_items || jsonb_build_array(
      jsonb_build_object(
        'inventory_id', v_inventory.id,
        'product', v_inventory.product,
        'brand', v_inventory.brand,
        'size', v_inventory.size,
        'color', v_inventory.color,
        'quantity', v_requested_quantity,
        'price', v_price,
        'subtotal', v_price * v_requested_quantity
      )
    );

    v_product_summary := v_product_summary
      || case when v_product_summary = '' then '' else ', ' end
      || v_inventory.product || ' x' || v_requested_quantity;
  end loop;

  v_order_number := 'MS-'
    || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS')
    || '-'
    || upper(substr(md5(random()::text), 1, 4));

  insert into public.orders (
    order_number,
    source,
    customer_name,
    customer_phone,
    product,
    items,
    total_mxn,
    total,
    paid,
    status,
    inventory_reserved
  ) values (
    v_order_number,
    'tienda',
    p_customer_name,
    p_customer_phone,
    v_product_summary,
    v_normalized_items,
    v_total,
    v_total,
    0,
    'Pendiente',
    true
  )
  returning id into v_order_id;

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'total_mxn', v_total,
    'items', v_normalized_items
  );
end;
$$;

create or replace function public.list_store_products()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', i.id,
        'product', i.product,
        'brand', i.brand,
        'category', i.category,
        'size', i.size,
        'image_url', i.image_url,
        'sale_price_mxn', i.sale_price_mxn,
        'quantity', i.quantity,
        'status', i.status
      )
      order by i.created_at desc
    ),
    '[]'::jsonb
  )
  from public.inventory i
  where i.status in ('Disponible', 'Stock bajo')
    and coalesce(i.quantity, 0) > 0;
$$;

create or replace function public.get_store_product(
  p_inventory_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', i.id,
    'product', i.product,
    'brand', i.brand,
    'category', i.category,
    'size', i.size,
    'color', i.color,
    'image_url', i.image_url,
    'sale_price_mxn', i.sale_price_mxn,
    'quantity', i.quantity,
    'status', i.status
  )
  from public.inventory i
  where i.id = p_inventory_id
    and i.status in ('Disponible', 'Stock bajo')
    and coalesce(i.quantity, 0) > 0;
$$;

create or replace function public.list_store_product_images(
  p_inventory_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', ii.id,
        'image_url', ii.image_url,
        'sort_order', ii.sort_order,
        'is_primary', ii.is_primary
      )
      order by ii.sort_order asc
    ),
    '[]'::jsonb
  )
  from public.inventory_images ii
  where ii.inventory_id = p_inventory_id;
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

revoke all on function public.create_store_order(text, text, jsonb) from public;
grant execute on function public.create_store_order(text, text, jsonb) to anon, authenticated;

revoke all on function public.list_store_products() from public;
grant execute on function public.list_store_products() to anon, authenticated;

revoke all on function public.get_store_product(uuid) from public;
grant execute on function public.get_store_product(uuid) to anon, authenticated;

revoke all on function public.list_store_product_images(uuid) from public;
grant execute on function public.list_store_product_images(uuid) to anon, authenticated;

revoke all on function public.cancel_order_and_restore_inventory(uuid) from public;
grant execute on function public.cancel_order_and_restore_inventory(uuid) to authenticated;

commit;
