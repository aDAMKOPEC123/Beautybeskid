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
  # Remove stale generated pages, but keep old content-hashed JS/CSS for open
  # browser tabs. Deleting those assets during a deploy makes lazy imports fail
  # until every existing tab reloads.
  ssh "$VPS" "sudo rsync -a --delete --exclude='assets/' $REMOTE_DIR/apps/web/dist/ $WEBROOT/"
  ssh "$VPS" "sudo mkdir -p $WEBROOT/assets && sudo rsync -a $REMOTE_DIR/apps/web/dist/assets/ $WEBROOT/assets/"
  # Bound disk usage while retaining enough history for long-lived/PWA tabs.
  ssh "$VPS" "sudo find $WEBROOT/assets -type f -mtime +30 -delete"
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

echo "Checking that every sitemap URL returns 200 without a redirect..."
SITEMAP_XML=$(
  curl --fail --silent --show-error \
    --retry 12 --retry-delay 2 --retry-all-errors \
    https://kosmetologwiktoriacwik.pl/sitemap.xml
)
mapfile -t SITEMAP_URLS < <(
  printf '%s\n' "$SITEMAP_XML" | sed -n 's:.*<loc>\(.*\)</loc>.*:\1:p'
)

if [ "${#SITEMAP_URLS[@]}" -eq 0 ]; then
  echo "ERROR: sitemap.xml does not contain any URLs."
  exit 1
fi

for url in "${SITEMAP_URLS[@]}"; do
  status=$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' --max-redirs 0 "$url")
  if [ "$status" != "200" ]; then
    echo "ERROR: sitemap URL returned HTTP $status: $url"
    exit 1
  fi
done

echo "      Sitemap OK (${#SITEMAP_URLS[@]} URLs, all HTTP 200)."

echo ""
echo "=== Deploy complete ==="
