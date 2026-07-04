#!/bin/bash
# Deploy script for COSMO app
# Usage:
#   ./deploy.sh          - deploy frontend + backend
#   ./deploy.sh frontend - deploy frontend only
#   ./deploy.sh backend  - deploy backend only

set -e

VPS="ubuntu@51.83.160.253"
REMOTE_DIR="/home/ubuntu/cosmo-app"
WEBROOT="/var/www/kosmetologwiktoriacwik.pl"

MODE=${1:-"full"}

echo "=== COSMO Deploy ($MODE) ==="

# 1. Push local changes
echo "[1/4] Pushing to GitHub..."
git -C "$(dirname "$0")" push origin main

# 2. Pull on VPS
echo "[2/4] Pulling on VPS..."
ssh "$VPS" "cd $REMOTE_DIR && git pull origin main"

# 3. Apply database migrations, then build and restart the backend.
# The frontend SEO build reads current public services and posts from the API,
# so the migrated backend data must be available first.
if [ "$MODE" = "full" ] || [ "$MODE" = "backend" ]; then
  echo "[3/4] Migrating and building backend..."
  ssh "$VPS" "cd $REMOTE_DIR/apps/server && pnpm prisma migrate deploy && pnpm prisma generate && pnpm build"
  echo "      Restarting PM2..."
  ssh "$VPS" "pm2 restart cosmo-server"
  echo "      Backend deployed."
fi

# 4. Build the crawlable frontend from the current production API.
if [ "$MODE" = "full" ] || [ "$MODE" = "frontend" ]; then
  echo "[4/4] Building frontend..."
  ssh "$VPS" "cd $REMOTE_DIR/apps/web && pnpm build"
  echo "      Synchronizing webroot..."
  # Remove stale generated pages for deleted or deactivated CMS entries.
  ssh "$VPS" "sudo rsync -a --delete $REMOTE_DIR/apps/web/dist/ $WEBROOT/"
  echo "      Installing nginx configuration..."
  ssh "$VPS" "sudo cp $REMOTE_DIR/deploy/nginx/cosmo.conf /etc/nginx/sites-available/kosmetologwiktoriacwik.pl && sudo nginx -t && sudo systemctl reload nginx"
  echo "      Frontend deployed."
fi

if [ "$MODE" = "full" ] || [ "$MODE" = "frontend" ]; then
  echo "Checking the local production origin..."
  ssh "$VPS" "curl --fail --silent --show-error -H 'Host: kosmetologwiktoriacwik.pl' http://127.0.0.1:8080/ >/dev/null"
fi

echo "Checking Cloudflare Tunnel when installed..."
ssh "$VPS" "if systemctl is-active --quiet cloudflared-cosmo.service; then curl --fail --silent --show-error http://127.0.0.1:20241/ready >/dev/null; fi"

echo ""
echo "=== Deploy complete ==="
