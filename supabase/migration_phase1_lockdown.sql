-- MeriShop Flow Pro - Fase 1, paso B: cerrar accesos públicos antiguos
-- Ejecutar SOLAMENTE después de:
-- 1. Aplicar migration_phase1_security.sql.
-- 2. Desplegar la rama phase-1-security.
-- 3. Confirmar que tienda, carrito y cancelación funcionan correctamente.

begin;

-- El carrito público ya no puede insertar pedidos directamente.
revoke insert on table public.orders from public, anon;
drop policy if exists orders_public_insert on public.orders;

-- El catálogo público solo puede leer las columnas expuestas por las funciones seguras.
revoke select on table public.inventory from public, anon;
revoke select on table public.inventory_images from public, anon;

commit;
