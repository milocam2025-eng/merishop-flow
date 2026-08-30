# Fase 4: pruebas funcionales de navegador

Esta fase protege los recorridos principales del cliente y el acceso administrativo con Playwright.

## Cobertura

- Carga del catálogo público usando una respuesta controlada de Supabase.
- Búsqueda y navegación al detalle de un producto.
- Agregar un producto al carrito y comprobar el total.
- Redirección de visitantes sin sesión desde Inventario hacia Login.

Las pruebas no crean pedidos, no modifican inventario y no utilizan la base de datos de producción.

## Ejecución

```bash
npx playwright install chromium
npm run test:e2e
```

GitHub Actions ejecuta estas pruebas en Chromium para cada pull request y cada envío a `main`.
