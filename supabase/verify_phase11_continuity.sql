-- MeriShop Flow Pro - Fase 11: verificación posterior.
-- La única fila debe mostrar true en todas las columnas.

select
  to_regclass('public.schema_migrations') is not null as registro_migraciones,
  exists (
    select 1 from public.schema_migrations where version = '11'
  ) as fase_11_registrada,
  (select relrowsecurity from pg_class where oid = 'public.schema_migrations'::regclass)
    as rls_habilitado,
  to_regprocedure('public.health_check()') is not null as funcion_salud,
  has_function_privilege('anon', 'public.health_check()', 'EXECUTE')
    as anon_ejecuta,
  has_function_privilege('authenticated', 'public.health_check()', 'EXECUTE')
    as authenticated_ejecuta,
  not has_table_privilege('anon', 'public.schema_migrations', 'SELECT')
    as registro_privado;
