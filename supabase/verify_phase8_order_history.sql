-- MeriShop Flow Pro - Fase 8: verificación posterior.

select
  to_regclass('public.order_status_history') is not null as tabla_historial,
  exists (
    select 1 from pg_trigger
    where tgname = 'orders_status_history_trigger' and not tgisinternal
  ) as trigger_habilitado,
  (select relrowsecurity from pg_class where oid = 'public.order_status_history'::regclass)
    as rls_habilitado,
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'order_status_history'
      and policyname = 'order_status_history_authenticated_read'
  ) as politica_lectura;
