-- MeriShop Flow Pro - Fase 16: galería confiable de productos.
-- Ejecutar una sola vez en el SQL Editor de Supabase.

begin;

-- La tienda siempre obtiene una portada, incluso si el campo heredado
-- inventory.image_url no alcanzó a sincronizarse.
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
        'image_url', coalesce(
          i.image_url,
          (
            select ii.image_url
            from public.inventory_images ii
            where ii.inventory_id = i.id
            order by ii.is_primary desc, ii.sort_order asc, ii.created_at asc
            limit 1
          )
        ),
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

create or replace function public.get_store_product(p_inventory_id uuid)
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
    'image_url', coalesce(
      i.image_url,
      (
        select ii.image_url
        from public.inventory_images ii
        where ii.inventory_id = i.id
        order by ii.is_primary desc, ii.sort_order asc, ii.created_at asc
        limit 1
      )
    ),
    'sale_price_mxn', i.sale_price_mxn,
    'quantity', i.quantity,
    'status', i.status
  )
  from public.inventory i
  where i.id = p_inventory_id
    and i.status in ('Disponible', 'Stock bajo')
    and coalesce(i.quantity, 0) > 0;
$$;

revoke all on function public.list_store_products() from public;
grant execute on function public.list_store_products() to anon, authenticated;
revoke all on function public.get_store_product(uuid) from public;
grant execute on function public.get_store_product(uuid) to anon, authenticated;

-- Permisos de Storage limitados a administradores y a su propia carpeta.
update storage.buckets
set public = true,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'product-images';

drop policy if exists merishop_admin_upload_product_images on storage.objects;
create policy merishop_admin_upload_product_images
on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.is_admin()
);

drop policy if exists merishop_admin_manage_product_images on storage.objects;
create policy merishop_admin_manage_product_images
on storage.objects for update to authenticated
using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.is_admin()
)
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.is_admin()
);

drop policy if exists merishop_admin_delete_product_images on storage.objects;
create policy merishop_admin_delete_product_images
on storage.objects for delete to authenticated
using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.is_admin()
);

insert into public.schema_migrations (version, description)
values ('16', 'Galería de hasta cinco fotos y portada confiable en tienda')
on conflict (version) do update
set description = excluded.description;

commit;
