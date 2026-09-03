-- MeriShop Flow Pro - Fase 11: auditoría previa de continuidad.
-- Solo lectura. Todos los valores de "encontrados" deben ser 0.

select 'TABLA ESENCIAL AUSENTE' as comprobacion, count(*) as encontrados
from (values
  ('clients'), ('inventory'), ('inventory_images'), ('orders'),
  ('payments'), ('shipments'), ('order_status_history'), ('inventory_movements')
) as required_table(table_name)
where to_regclass('public.' || table_name) is null

union all

select 'RLS DESHABILITADO', count(*)
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'clients', 'inventory', 'inventory_images', 'orders',
    'payments', 'shipments', 'order_status_history', 'inventory_movements'
  )
  and c.relkind = 'r'
  and not c.relrowsecurity

union all

select 'FUNCION ESENCIAL AUSENTE', count(*)
from (values
  ('create_store_order'),
  ('cancel_order_and_restore_inventory'),
  ('register_order_payment')
) as required_function(function_name)
where not exists (
  select 1
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = required_function.function_name
)

union all

select 'MIGRACION FASE 11 YA REGISTRADA', count(*)
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'schema_migrations';
