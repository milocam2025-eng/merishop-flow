# Fase 1: seguridad y respaldo

Esta fase mueve la creación de pedidos de la tienda a una función transaccional de Supabase. El navegador deja de decidir el precio final y ya no puede insertar directamente en `orders` como visitante anónimo.

## Antes de aplicar la migración

1. Crear un respaldo de la base de datos desde Supabase.
2. Ejecutar `audit_phase1_readonly.sql` y guardar el resultado.
3. Confirmar que `inventory.id` y `orders.id` son UUID.
4. Confirmar que existen las columnas utilizadas por la función: `inventory.product`, `brand`, `size`, `color`, `quantity`, `minimum_stock`, `status`, `sale_price_mxn`; y `orders.order_number`, `source`, `customer_name`, `customer_phone`, `product`, `items`, `total_mxn`, `total`, `paid`, `status`, `user_id`.
5. Probar primero en un proyecto de Supabase de desarrollo o en una copia restaurada.

## Aplicación

Ejecutar `migration_phase1_security.sql` una sola vez en Supabase SQL Editor. La migración se ejecuta dentro de una transacción y crea:

- `orders.inventory_reserved` para distinguir pedidos que ya descontaron existencias.
- `create_store_order(...)`, que valida el carrito, bloquea filas de inventario, usa precios reales, descuenta existencias y crea el pedido de forma atómica.
- Funciones públicas de catálogo que exponen únicamente nombre, marca, categoría, talla, color, fotografía, precio de venta, cantidad y estado; nunca costos internos ni `user_id`.
- `cancel_order_and_restore_inventory(...)`, que cancela y repone existencias en una sola transacción.
- Eliminación de `orders_public_insert` y restricción para impedir que `anon` inserte directamente en `orders`.
- Bloqueo de lectura directa anónima sobre `inventory` e `inventory_images`; la tienda utiliza funciones con una lista explícita de columnas seguras.

## Pruebas obligatorias antes de publicar

- Pedido válido con un producto.
- Pedido válido con varios productos.
- Cantidad superior a las existencias.
- Precio modificado manualmente en `localStorage`.
- Producto agotado durante la compra.
- Cancelación y reposición de existencias.
- Segundo intento de cancelar el mismo pedido.
- Compra desde celular y apertura del mensaje de WhatsApp.

## Reversión de emergencia

La aplicación anterior requiere inserción anónima directa en `orders`. Si fuera necesario regresar temporalmente al código anterior, también sería necesario restaurar el permiso/política anterior desde el respaldo. No se debe habilitar ese acceso sin recuperar exactamente la configuración previa.
