#!/usr/bin/env sh
set -eu

mkdir -p /app /data /data/logs /data/extensions

if [ -z "${OPENCODE_SERVER_PASSWORD:-}" ]; then
  echo "[agent-webui] WARNING: OPENCODE_SERVER_PASSWORD is not set. Do not expose port 4096 directly outside agent-master or local-only debugging." >&2
fi

if [ ! -f /app/AGENTS.md ]; then
  cat > /app/AGENTS.md <<'EOF'
# AGENTS.md · Runtime Workspace

This workspace is managed by agent-webui. Put project-specific rules here.
EOF
fi

exec /usr/bin/dumb-init -- /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
