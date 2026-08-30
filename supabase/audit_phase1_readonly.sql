-- Auditoría de solo lectura para ejecutar en Supabase SQL Editor.
-- No crea, modifica ni elimina datos.

-- 1. Tablas y columnas de MeriShop.
select
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'clients',
    'inventory',
    'inventory_images',
    'orders',
    'payments',
    'shipments'
  )
order by table_name, ordinal_position;

-- 2. Estado de Row Level Security.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;

-- 3. Políticas RLS existentes.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 4. Permisos otorgados a visitantes y usuarios autenticados.
select
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

-- 5. Buckets y reglas de almacenamiento.
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
order by name;

select
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
order by policyname;
