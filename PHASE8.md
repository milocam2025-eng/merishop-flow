# Fase 8: clientes y seguimiento de pedidos

Esta fase agrega una bitácora inmutable de estados de pedido y mensajes de WhatsApp adaptados al estado y saldo de cada compra.

## Despliegue

1. Ejecutar `supabase/audit_phase8_orders.sql` en Supabase y revisar los resultados. Un estado vacío debe resolverse antes de continuar; pedidos sin número y teléfonos inválidos pueden corregirse después, pero reducen la calidad del seguimiento.
2. Ejecutar `supabase/migration_phase8_order_history.sql`.
3. Ejecutar `supabase/verify_phase8_order_history.sql`; las cuatro columnas deben mostrar `true`.
4. Desplegar la aplicación y comprobar en **Pedidos → Ver detalle** que aparece el historial.

## Prueba funcional

1. Abrir un pedido pendiente y confirmar el pedido.
2. Volver a abrir el detalle y comprobar la transición `Pendiente → Confirmado`.
3. Usar **WhatsApp al cliente** y verificar que el texto incluya el estado actual y, si aplica, el saldo pendiente.

La migración no concede acceso público a la tabla de historial. Las altas se realizan exclusivamente mediante el trigger protegido.
