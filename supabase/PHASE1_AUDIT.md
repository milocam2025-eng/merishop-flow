# Resultado preliminar de auditoría - Fase 1

Fecha: 2026-08-30

## Alcance

Comprobaciones externas de solo lectura realizadas contra la aplicación publicada y la API pública de Supabase. No se consultaron valores de clientes, pedidos, pagos ni envíos. No se modificaron datos.

## Resultado

- La aplicación de producción responde y redirige la raíz a `/login`.
- Supabase reconoce las tablas `inventory`, `inventory_images`, `orders`, `clients`, `payments` y `shipments` para el rol anónimo.
- Las columnas requeridas por `migration_phase1_security.sql` existen en `inventory` y `orders`.
- Visibilidad anónima observada mediante solicitudes `HEAD` sin cuerpos de datos:
  - `inventory`: 0 filas visibles.
  - `inventory_images`: 4 filas visibles.
  - `orders`: 0 filas visibles.
  - `clients`: 0 filas visibles.
  - `payments`: 0 filas visibles.
  - `shipments`: 0 filas visibles.

## Interpretación

La prueba no encontró exposición anónima observable de clientes, pedidos, pagos o envíos. Las imágenes del inventario son visibles, lo cual es compatible con una galería pública.

El resultado `0 filas visibles` no demuestra por sí solo que una política RLS sea correcta: también puede significar que la tabla está vacía. La revisión definitiva de políticas, permisos, tipos de identificadores y buckets requiere ejecutar `audit_phase1_readonly.sql` dentro de Supabase SQL Editor.

## Políticas confirmadas en Supabase

- Las siete tablas públicas tienen RLS activado: `clients`, `inventory`, `inventory_images`, `orders`, `payments`, `product_images` y `shipments`.
- Las tablas administrativas utilizan condiciones basadas en `auth.uid() = user_id`.
- `orders` contiene `orders_public_insert`, una política `INSERT` para `public` con `with_check = true`. Esta política permite inserciones anónimas directas y debe eliminarse al aplicar la migración.
- `orders_admin_read_store` y `orders_admin_update_store` permiten al usuario autenticado administrar pedidos originados en la tienda.
- No existe una política anónima segura para listar productos. En lugar de abrir lectura completa de `inventory`, la migración expondrá funciones de catálogo con una lista limitada de columnas públicas.

## Estado de la migración

La migración todavía no se ha ejecutado. Antes de aplicarla se debe confirmar:

1. Que RLS está activo en las tablas con información privada.
2. Que `inventory.id` y `orders.id` usan UUID.
3. Que el rol anónimo no conserva otra vía de inserción directa en `orders`.
4. Que el bucket de imágenes permite lectura pública pero restringe escritura y eliminación al propietario autenticado.
