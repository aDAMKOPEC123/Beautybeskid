#!/usr/bin/env bash

set -Eeuo pipefail

DOMAIN="${COSMO_DOMAIN:-kosmetologwiktoriacwik.pl}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
TOKEN_FILE="/etc/cloudflared/cosmo-tunnel.token"
SERVICE_NAME="cloudflared-cosmo.service"
NGINX_TARGET="/etc/nginx/sites-available/kosmetologwiktoriacwik.pl"

fail() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

if [[ "${EUID}" -ne 0 ]]; then
  fail "Run this installer with sudo: sudo bash deploy/cloudflare/install.sh"
fi

command -v curl >/dev/null 2>&1 || fail "curl is required"
command -v nginx >/dev/null 2>&1 || fail "nginx is required"

printf '[1/7] Installing the official Cloudflare APT repository...\n'
install -d -m 0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
  -o /usr/share/keyrings/cloudflare-main.gpg
printf '%s\n' \
  'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main' \
  > /etc/apt/sources.list.d/cloudflared.list

printf '[2/7] Installing cloudflared...\n'
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install --yes cloudflared

printf '[3/7] Installing the Nginx configuration with a loopback-only origin...\n'
NGINX_BACKUP="$(mktemp)"
HAD_NGINX_CONFIG=0
if [[ -f "$NGINX_TARGET" ]]; then
  cp "$NGINX_TARGET" "$NGINX_BACKUP"
  HAD_NGINX_CONFIG=1
fi
install -m 0644 "$REPO_DIR/deploy/nginx/cosmo.conf" "$NGINX_TARGET"
ln -sfn "$NGINX_TARGET" \
  /etc/nginx/sites-enabled/kosmetologwiktoriacwik.pl
if ! nginx -t; then
  if [[ "$HAD_NGINX_CONFIG" -eq 1 ]]; then
    install -m 0644 "$NGINX_BACKUP" "$NGINX_TARGET"
  else
    rm -f "$NGINX_TARGET"
  fi
  rm -f "$NGINX_BACKUP"
  fail "The new Nginx configuration was invalid; the previous file was restored."
fi
rm -f "$NGINX_BACKUP"
systemctl reload nginx

printf '[4/7] Checking the local tunnel origin...\n'
curl --fail --silent --show-error \
  --header "Host: $DOMAIN" \
  http://127.0.0.1:8080/ >/dev/null \
  || fail "Nginx did not answer on 127.0.0.1:8080"

TUNNEL_TOKEN="${CLOUDFLARE_TUNNEL_TOKEN:-}"
if [[ -z "$TUNNEL_TOKEN" && -t 0 ]]; then
  printf 'Paste the tunnel token copied from Cloudflare (input is hidden): '
  IFS= read -r -s TUNNEL_TOKEN
  printf '\n'
fi
[[ -n "$TUNNEL_TOKEN" ]] || fail \
  "No token supplied. Set CLOUDFLARE_TUNNEL_TOKEN or run the script interactively."

printf '[5/7] Storing the token outside the repository...\n'
getent group cloudflared >/dev/null || groupadd --system cloudflared
id cloudflared >/dev/null 2>&1 || useradd \
  --system --gid cloudflared --home-dir /var/lib/cloudflared \
  --create-home --shell /usr/sbin/nologin cloudflared
usermod --append --groups cloudflared cloudflared
install -d -o root -g cloudflared -m 0750 /etc/cloudflared
umask 0077
printf '%s\n' "$TUNNEL_TOKEN" > "$TOKEN_FILE"
chown root:cloudflared "$TOKEN_FILE"
chmod 0640 "$TOKEN_FILE"
unset TUNNEL_TOKEN CLOUDFLARE_TUNNEL_TOKEN

printf '[6/7] Installing and starting the automatic systemd service...\n'
install -m 0644 "$SCRIPT_DIR/cloudflared-cosmo.service" \
  /etc/systemd/system/cloudflared-cosmo.service
install -m 0644 "$SCRIPT_DIR/cloudflared-update.service" \
  /etc/systemd/system/cloudflared-update.service
install -m 0644 "$SCRIPT_DIR/cloudflared-update.timer" \
  /etc/systemd/system/cloudflared-update.timer
systemctl daemon-reload
systemctl enable --now "$SERVICE_NAME"
systemctl enable --now cloudflared-update.timer

printf '[7/7] Waiting for a healthy Cloudflare connection...\n'
for _ in {1..20}; do
  if curl --fail --silent http://127.0.0.1:20241/ready >/dev/null 2>&1; then
    printf '\nCloudflare Tunnel is connected and will start automatically after reboot.\n'
    printf 'Local origin: http://127.0.0.1:8080\n'
    printf 'Service status: systemctl status %s\n' "$SERVICE_NAME"
    exit 0
  fi
  sleep 1
done

journalctl -u "$SERVICE_NAME" --no-pager -n 30 >&2 || true
fail "The tunnel did not become healthy. Verify the token and outbound port 7844."
