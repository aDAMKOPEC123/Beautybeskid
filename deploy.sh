#!/bin/bash
# Deploy script for COSMO app
# Usage:
#   ./deploy.sh          - deploy frontend + backend
#   ./deploy.sh frontend - deploy frontend only
#   ./deploy.sh backend  - deploy backend only

set -e

VPS="ubuntu@51.83.160.253"
REMOTE_DIR="/home/ubuntu/cosmo-app"
WEBROOT="/var/www/cosmo-app/dist"

MODE=${1:-"full"}

echo "=== COSMO Deploy ($MODE) ==="

# 1. Push local changes
echo "[1/4] Pushing to GitHub..."
git -C "$(dirname "$0")" push origin main

# 2. Pull on VPS
echo "[2/4] Pulling on VPS..."
ssh "$VPS" "cd $REMOTE_DIR && git pull origin main"

# 3. Build & deploy frontend
if [ "$MODE" = "full" ] || [ "$MODE" = "frontend" ]; then
  echo "[3/4] Building frontend..."
  ssh "$VPS" "cd $REMOTE_DIR/apps/web && pnpm build"
  echo "      Copying to webroot..."
  ssh "$VPS" "sudo cp -r $REMOTE_DIR/apps/web/dist/* $WEBROOT/"
  echo "      Frontend deployed."
fi

# 4. Build & restart backend
if [ "$MODE" = "full" ] || [ "$MODE" = "backend" ]; then
  echo "[4/4] Building backend..."
  ssh "$VPS" "cd $REMOTE_DIR/apps/server && pnpm build"
  echo "      Restarting PM2..."
  ssh "$VPS" "pm2 restart cosmo-server"
  echo "      Backend deployed."
fi

echo ""
echo "=== Deploy complete ==="
