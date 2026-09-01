-- MeriShop Flow Pro - Fase 10: auditoría previa de pagos (solo lectura).

select 'PAGO NO POSITIVO' as comprobacion, count(*) as encontrados
from public.payments
where amount is null or amount <= 0

union all

select 'PAGO SIN PEDIDO', count(*)
from public.payments p
left join public.orders o on o.id = p.order_id
where p.order_id is null or o.id is null

union all

select 'PEDIDO CON PAGADO NEGATIVO', count(*)
from public.orders
where coalesce(paid, 0) < 0

union all

select 'PEDIDO SOBREPAGADO', count(*)
from public.orders
where coalesce(paid, 0) >
  case when source = 'tienda' then coalesce(total_mxn, total, 0) else coalesce(total, 0) end;
