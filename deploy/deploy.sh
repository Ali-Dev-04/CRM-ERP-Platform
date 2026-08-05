#!/usr/bin/env bash
# Deployment helper for the full stack via Docker Compose.
#   ./deploy/deploy.sh up      — build + start the whole stack
#   ./deploy/deploy.sh down    — stop the stack
#   ./deploy/deploy.sh migrate — run prisma migrate deploy in the backend
set -euo pipefail

COMPOSE="docker compose -f deploy/docker-compose.prod.yml --env-file .env"

case "${1:-up}" in
  up)
    echo ">> Building and starting the stack..."
    $COMPOSE up -d --build
    echo ">> Applying database migrations..."
    $COMPOSE exec -T backend node -e "require('./node_modules/prisma/build/index.js')" migrate deploy || \
      echo "!! Migration step requires the backend container to have the prisma CLI; run locally if absent."
    echo ">> Stack is up. NGINX on :80. Health: GET /api/health/ready"
    ;;
  down)
    echo ">> Stopping the stack..."
    $COMPOSE down
    ;;
  migrate)
    echo ">> Running prisma migrate deploy inside backend..."
    $COMPOSE exec -T backend npx prisma migrate deploy
    ;;
  logs)
    $COMPOSE logs -f --tail=200 "${2:-}"
    ;;
  *)
    echo "Usage: $0 {up|down|migrate|logs [service]}"
    exit 1
    ;;
esac
