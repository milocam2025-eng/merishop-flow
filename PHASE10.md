# Fase 10: integridad transaccional de pagos

Esta fase evita que un pago quede registrado sin actualizar el saldo del pedido, o que el saldo cambie sin un pago asociado. El registro se realiza en una sola transacción bloqueando el pedido mientras se calcula el nuevo saldo.

## Orden de despliegue

1. Ejecutar `supabase/audit_phase10_payments.sql` en el SQL Editor de Supabase.
2. Confirmar que las cuatro comprobaciones devuelvan `0`. Si alguna devuelve registros, detener el despliegue y corregir esos datos primero.
3. Ejecutar `supabase/migration_phase10_payment_integrity.sql`.
4. Ejecutar `supabase/verify_phase10_payment_integrity.sql` y confirmar que las cinco columnas devuelvan `true`.
5. Desplegar esta rama y probar el flujo en la vista previa antes de fusionar.

## Prueba funcional

Usar un pedido pendiente con saldo conocido:

1. Registrar un pago parcial desde **Pagos** o desde el detalle de **Pedidos**.
2. Confirmar que aparece un solo movimiento de pago, que el saldo disminuye exactamente por el monto capturado y que el estado cambia a `Apartado`.
3. Registrar el saldo restante.
4. Confirmar que el saldo termina en `$0.00` y el estado cambia a `Pagado`.
5. Intentar registrar un monto mayor al saldo y confirmar que la aplicación lo rechaza sin crear movimientos ni modificar el pedido.

## Resultado esperado

- Los pagos y saldos se actualizan de forma atómica.
- Dos registros simultáneos no pueden usar el mismo saldo disponible.
- La aplicación no puede insertar, modificar o eliminar pagos directamente.
- La columna `paid` solo puede cambiar mediante la función segura.
- El estado del pedido continúa siendo actualizable para el flujo de confirmación y cancelación.
- Los pedidos de la tienda pública usan `total_mxn` para calcular su saldo.

