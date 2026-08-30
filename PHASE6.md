# Fase 6 — Control y calidad de inventario

## Incluye

- validación compartida para altas y ediciones;
- SKU obligatorio, normalizado y sin duplicados por propietario;
- controles de cantidades, costos, tipo de cambio y precio de venta;
- bitácora automática de cada cambio de existencias;
- historial visible en la ficha del producto;
- auditoría SQL previa y migración transaccional separada.

## Orden seguro de despliegue

1. Ejecutar `supabase/audit_phase6_inventory.sql` en Supabase.
2. Resolver SKU duplicados o vacíos informados por la auditoría.
3. Ejecutar `supabase/migration_phase6_inventory.sql`.
4. Confirmar que la tabla `inventory_movements` y sus políticas RLS existen.
5. Desplegar el código de `phase-6-inventory-control`.
6. Crear, editar, vender y cancelar un producto de prueba.
7. Confirmar que cada cambio aparece una sola vez en el historial.

La migración no corrige ni elimina registros existentes automáticamente.
