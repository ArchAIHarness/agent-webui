#!/usr/bin/env sh
set -eu

curl -fsS http://127.0.0.1:4096/ >/dev/null
curl -fsS http://127.0.0.1:3000/webui/healthz >/dev/null
