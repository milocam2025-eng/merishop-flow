# Fase 3: refactor y mantenibilidad

Esta fase reduce duplicación y prepara el código para cambios futuros sin alterar el comportamiento de producción ni el esquema de Supabase.

## Cambios

- Formateadores compartidos para importes MXN, USD y entradas numéricas.
- Componente reutilizable para métricas de cabecera en Inventario y Pedidos.
- Tipos de dominio compartidos para pedidos, pagos, clientes e inventario publicable.
- Estilos comunes para las métricas, eliminando bloques repetidos de estilos en línea.
- Pruebas unitarias de los formateadores compartidos.

## Comprobaciones

```bash
npm run typecheck
npm test
npm run build
npm run audit:prod
```

No requiere ejecutar migraciones ni realizar cambios manuales en Supabase.
