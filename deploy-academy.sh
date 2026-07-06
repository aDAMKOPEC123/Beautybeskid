#!/bin/bash
# Deploy script for COSMO Academy app
# Usage: ./deploy-academy.sh

set -e

VPS="ubuntu@51.83.160.253"
REMOTE_DIR="/home/ubuntu/cosmo-app"
WEBROOT="/var/www/akademia.kosmetologwiktoriacwik.pl"

echo "=== COSMO Academy Deploy ==="

# 1. Push local changes
echo "[1/4] Pushing to GitHub..."
git -C "$(dirname "$0")" push origin main

# 2. Pull on VPS
echo "[2/4] Pulling on VPS..."
ssh "$VPS" "cd $REMOTE_DIR && git pull origin main"

# 3. Install deps and build academy app
echo "[3/4] Installing dependencies and building academy-web..."
ssh "$VPS" "cd $REMOTE_DIR && pnpm install --frozen-lockfile && pnpm --filter cosmo-academy-web... build"

# 4. Deploy to webroot
echo "[4/4] Synchronizing webroot..."
ssh "$VPS" "sudo mkdir -p $WEBROOT"
ssh "$VPS" "sudo rsync -a --delete --exclude='assets/' $REMOTE_DIR/apps/academy-web/dist/ $WEBROOT/"
ssh "$VPS" "sudo mkdir -p $WEBROOT/assets && sudo rsync -a $REMOTE_DIR/apps/academy-web/dist/assets/ $WEBROOT/assets/"
ssh "$VPS" "sudo find $WEBROOT/assets -type f -mtime +30 -delete"

# Install nginx config
echo "      Installing nginx configuration..."
ssh "$VPS" "sudo cp $REMOTE_DIR/deploy/nginx/academy.conf /etc/nginx/sites-available/akademia.kosmetologwiktoriacwik.pl"
ssh "$VPS" "sudo ln -sf /etc/nginx/sites-available/akademia.kosmetologwiktoriacwik.pl /etc/nginx/sites-enabled/"
ssh "$VPS" "sudo nginx -t && sudo systemctl reload nginx"

echo ""
echo "=== Academy Deploy complete ==="
