-- MeriShop Flow Pro - Fase 10: verificación posterior.

select
  to_regprocedure('public.register_order_payment(uuid,numeric,text)') is not null
    as funcion_pago,
  has_function_privilege('authenticated', 'public.register_order_payment(uuid,numeric,text)', 'EXECUTE')
    as authenticated_ejecuta,
  not has_table_privilege('authenticated', 'public.payments', 'INSERT')
    as insercion_directa_bloqueada,
  not has_column_privilege('authenticated', 'public.orders', 'paid', 'UPDATE')
    as saldo_directo_bloqueado,
  has_column_privilege('authenticated', 'public.orders', 'status', 'UPDATE')
    as estado_actualizable;
