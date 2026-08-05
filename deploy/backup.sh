#!/usr/bin/env bash
# PostgreSQL backup. Schedule via cron, e.g. daily at 02:17:
#   17 2 * * * /path/to/crm-erp/deploy/backup.sh
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATABASE_URL="${DATABASE_URL:?DATABASE_URL is required}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

OUT="${BACKUP_DIR}/crm-erp-${TIMESTAMP}.sql.gz"
echo "Backing up to ${OUT} ..."
# -Fc = custom compressed format suitable for pg_restore; pipe through gzip too.
pg_dump --dbname "$DATABASE_URL" --no-owner --no-privileges --format=custom \
  | gzip > "$OUT"

echo "Pruning backups older than ${RETENTION_DAYS} days ..."
find "$BACKUP_DIR" -name 'crm-erp-*.sql.gz' -mtime "+${RETENTION_DAYS}" -delete

echo "Done: $(du -h "$OUT" | cut -f1)"
