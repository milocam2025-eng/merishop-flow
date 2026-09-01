-- MeriShop Flow Pro - Fase 8: auditoría previa de seguimiento de pedidos.
-- Solo lectura. Revisa los resultados antes de aplicar la migración.

select 'ESTADO VACIO' as comprobacion, count(*) as encontrados
from public.orders
where nullif(btrim(status), '') is null

union all

select 'PEDIDO SIN IDENTIFICADOR', count(*)
from public.orders
where nullif(btrim(coalesce(order_number, '')), '') is null

union all

select 'CLIENTE CON TELEFONO INVALIDO', count(*)
from public.clients
where nullif(btrim(coalesce(phone, '')), '') is not null
  and length(regexp_replace(phone, '[^0-9]', '', 'g')) not between 10 and 15;
