#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Falta DATABASE_URL. Usa la cadena de conexión directa de Supabase." >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1 || ! command -v pg_restore >/dev/null 2>&1; then
  echo "Se requieren pg_dump y pg_restore de PostgreSQL." >&2
  exit 1
fi

backup_dir="${1:-backups}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="${backup_dir}/merishop-${timestamp}.dump"
manifest_file="${backup_file}.sha256"

umask 077
mkdir -p "$backup_dir"

pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="$backup_file"

pg_restore --list "$backup_file" >/dev/null

if command -v sha256sum >/dev/null 2>&1; then
  (cd "$backup_dir" && sha256sum "$(basename "$backup_file")") >"$manifest_file"
else
  (cd "$backup_dir" && shasum -a 256 "$(basename "$backup_file")") >"$manifest_file"
fi

echo "Respaldo verificado: $backup_file"
echo "Integridad: $manifest_file"
