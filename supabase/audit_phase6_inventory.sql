-- Solo lectura. Ejecutar antes de migration_phase6_inventory.sql.
select 'SKU VACIO' as comprobacion, count(*) as encontrados
from public.inventory where nullif(btrim(sku), '') is null
union all
select 'SKU DUPLICADO', count(*)
from (
  select user_id, upper(btrim(sku))
  from public.inventory
  where nullif(btrim(sku), '') is not null
  group by user_id, upper(btrim(sku))
  having count(*) > 1
) duplicates
union all
select 'PRODUCTO VACIO', count(*)
from public.inventory where nullif(btrim(product), '') is null
union all
select 'CATEGORIA VACIA', count(*)
from public.inventory where nullif(btrim(category), '') is null
union all
select 'CANTIDAD INVALIDA', count(*)
from public.inventory where quantity < 0
union all
select 'VALORES NEGATIVOS', count(*)
from public.inventory
where coalesce(cost_usd, 0) < 0
   or coalesce(exchange_rate, 0) < 0
   or coalesce(sale_price_mxn, 0) < 0;

