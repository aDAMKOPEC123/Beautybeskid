#!/usr/bin/env bash

set -euo pipefail

REPO_DIR="${REPO_DIR:-/home/ubuntu/cosmo-app}"
SERVICE_DIR="$REPO_DIR/services/skin-analysis"
SERVICE_ENV="$SERVICE_DIR/.env"
SERVER_ENV="$REPO_DIR/apps/server/.env"
UNIT_SOURCE="$REPO_DIR/deploy/systemd/cosmo-skin-analysis.service"
UNIT_TARGET="/etc/systemd/system/cosmo-skin-analysis.service"

fail() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

upsert_env() {
  local file="$1"
  local key="$2"
  local value="$3"
  local temporary
  temporary="$(mktemp)"

  if [[ -f "$file" ]]; then
    awk -v key="$key" 'index($0, key "=") != 1 { print }' "$file" > "$temporary"
  fi
  printf '%s=%s\n' "$key" "$value" >> "$temporary"
  install -m 0600 "$temporary" "$file"
  rm -f "$temporary"
}

ensure_swap() {
  if swapon --show=NAME --noheadings | grep -Fxq '/swapfile'; then
    return
  fi

  if [[ ! -e /swapfile ]]; then
    printf 'Creating a 2 GB swap safety net for model startup...\n'
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile >/dev/null
  fi

  sudo swapon /swapfile
  if ! grep -Eq '^/swapfile[[:space:]]' /etc/fstab; then
    printf '/swapfile none swap sw 0 0\n' | sudo tee -a /etc/fstab >/dev/null
  fi
}

[[ -d "$SERVICE_DIR" ]] || fail "Missing service directory: $SERVICE_DIR"
[[ -f "$SERVER_ENV" ]] || fail "Missing backend environment file: $SERVER_ENV"
[[ -f "$UNIT_SOURCE" ]] || fail "Missing systemd unit: $UNIT_SOURCE"
command -v python3 >/dev/null || fail 'python3 is required'
python3 -m venv --help >/dev/null 2>&1 || fail 'python3-venv is required'

ensure_swap

if [[ ! -x "$SERVICE_DIR/.venv/bin/python" ]]; then
  python3 -m venv "$SERVICE_DIR/.venv"
fi

"$SERVICE_DIR/.venv/bin/python" -m pip install --disable-pip-version-check --upgrade pip
"$SERVICE_DIR/.venv/bin/python" -m pip install --disable-pip-version-check -r "$SERVICE_DIR/requirements.txt"
"$SERVICE_DIR/.venv/bin/python" "$SERVICE_DIR/scripts/download_models.py"

if [[ -f "$SERVICE_ENV" ]]; then
  API_KEY="$(sed -n 's/^SKIN_ANALYSIS_API_KEY=//p' "$SERVICE_ENV" | tail -n 1)"
else
  API_KEY=''
fi
if [[ ${#API_KEY} -lt 32 ]]; then
  API_KEY="$("$SERVICE_DIR/.venv/bin/python" -c 'import secrets; print(secrets.token_urlsafe(48))')"
fi

upsert_env "$SERVICE_ENV" 'SKIN_ANALYSIS_API_KEY' "$API_KEY"
upsert_env "$SERVICE_ENV" 'SKIN_MODEL_DEVICE' 'cpu'
upsert_env "$SERVICE_ENV" 'SKIN_WRINKLE_IMAGE_SIZE' '512'
upsert_env "$SERVER_ENV" 'SKIN_ANALYSIS_URL' 'http://127.0.0.1:8010'
upsert_env "$SERVER_ENV" 'SKIN_ANALYSIS_API_KEY' "$API_KEY"
upsert_env "$SERVER_ENV" 'SKIN_ANALYSIS_TIMEOUT_MS' '90000'

sudo install -m 0644 "$UNIT_SOURCE" "$UNIT_TARGET"
sudo systemctl daemon-reload
sudo systemctl enable cosmo-skin-analysis.service >/dev/null
sudo systemctl restart cosmo-skin-analysis.service

for _ in $(seq 1 120); do
  if curl --fail --silent http://127.0.0.1:8010/health | grep -q '"modelsLoaded":true'; then
    printf 'Skin analysis service is healthy.\n'
    exit 0
  fi
  sleep 2
done

sudo journalctl -u cosmo-skin-analysis.service -n 80 --no-pager >&2
fail 'Skin analysis service did not become healthy within 240 seconds'
