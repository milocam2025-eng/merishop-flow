# Fase 2: dependencias, pruebas y CI

Esta fase mejora la mantenibilidad sin modificar el esquema ni los datos de producción.

## Incluye

- Actualización de Next.js, React y Supabase a versiones corregidas y compatibles.
- Pruebas de regresión para las garantías de seguridad introducidas en la Fase 1.
- Comprobación de tipos con TypeScript.
- Compilación y auditoría de dependencias de producción en GitHub Actions.

## Validación local

```bash
npm ci
npm run check
npm run audit:prod
```

La integración continua ejecuta las mismas comprobaciones en cada pull request y en cada envío a `main`.
