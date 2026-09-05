select
  to_regprocedure('public.list_store_products()') is not null as lista_tienda,
  to_regprocedure('public.get_store_product(uuid)') is not null as detalle_tienda,
  exists (
    select 1 from storage.buckets
    where id = 'product-images'
      and public = true
      and file_size_limit = 10485760
  ) as bucket_configurado,
  (
    select count(*) >= 3
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like 'merishop_admin_%_product_images'
  ) as storage_protegido;
