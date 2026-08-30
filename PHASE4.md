# Fase 4: pruebas funcionales de navegador

Esta fase protege los recorridos principales del cliente y el acceso administrativo con Playwright.

## Cobertura

- Carga de la tienda pública, buscador y navegación al carrito.
- Estado vacío del carrito y regreso seguro a la tienda.
- Disponibilidad del formulario de acceso administrativo.

Las pruebas no crean pedidos, no modifican inventario y no utilizan la base de datos de producción.

## Ejecución

```bash
npx playwright install chromium
npm run test:e2e
```

GitHub Actions ejecuta estas pruebas en Chromium para cada pull request y cada envío a `main`.
