# Fase 11: continuidad, respaldo y recuperación

Esta fase añade una comprobación real de conexión a la base de datos, un registro privado de migraciones y un procedimiento reproducible de respaldo. No restaura ni modifica datos automáticamente.

## Aplicación segura

1. En Supabase SQL Editor, ejecuta `audit_phase11_continuity.sql`.
2. Confirma que todos los resultados sean `0`. La comprobación `MIGRACION FASE 11 YA REGISTRADA` también debe ser `0` antes de la primera aplicación.
3. Ejecuta `migration_phase11_continuity.sql`.
4. Ejecuta `verify_phase11_continuity.sql`; la fila debe mostrar `true` en todas las columnas.
5. Despliega la rama y abre `/api/health`. Debe responder HTTP 200 con `status: "ok"` y `checks.database: "ok"`.

Si el health check no puede consultar Supabase, responde HTTP 503 con `status: "degraded"`. La respuesta no expone credenciales ni detalles internos del error.

## Crear un respaldo

Se necesita PostgreSQL Client (`pg_dump` y `pg_restore`) y la cadena de conexión directa de Supabase. No pegues la contraseña en el repositorio ni en capturas.

```bash
export DATABASE_URL='postgresql://...'
./scripts/backup-database.sh /ruta/segura/respaldos
unset DATABASE_URL
```

El script crea un archivo en formato custom de PostgreSQL, valida que su catálogo pueda leerse y genera un SHA-256. Guarda el `.dump` y su `.sha256` juntos, cifrados y fuera del equipo principal.

## Simulacro de recuperación

Nunca pruebes una restauración sobre producción. Crea un proyecto Supabase aislado, verifica el checksum y restaura allí:

```bash
cd /ruta/segura/respaldos
sha256sum -c merishop-AAAAMMDDTHHMMSSZ.dump.sha256
pg_restore --clean --if-exists --no-owner --no-privileges \
  --dbname="$RECOVERY_DATABASE_URL" merishop-AAAAMMDDTHHMMSSZ.dump
```

Después del restore, ejecuta `verify_phase11_continuity.sql`, confirma los conteos principales y realiza una prueba manual de inventario, pedido y pago. Documenta fecha, archivo, resultado y responsable.

## Respuesta ante incidentes

1. Pausa operaciones que escriban datos si existe riesgo de corrupción.
2. Conserva el respaldo más reciente y sus checksums; no sobrescribas evidencia.
3. Identifica el último respaldo válido y crea un entorno aislado.
4. Restaura y valida primero en ese entorno.
5. Solo restaura producción con una ventana aprobada, respaldo previo inmediato y plan de reversión.
