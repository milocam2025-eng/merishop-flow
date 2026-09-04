select
  to_regclass('public.authorized_admins') is not null as lista_administradores,
  to_regprocedure('public.is_admin()') is not null as funcion_autorizacion,
  exists (
    select 1
    from public.authorized_admins
    where user_id = '1c6a6f15-ce47-4884-a62a-39b57b99dd84'::uuid
  ) as propietario_autorizado,
  (
    select count(*) = 8
    from pg_policies
    where schemaname = 'public'
      and policyname = 'admin_authorization_required'
  ) as tablas_protegidas,
  exists (
    select 1
    from public.schema_migrations
    where version = '12'
  ) as fase_12_registrada;
