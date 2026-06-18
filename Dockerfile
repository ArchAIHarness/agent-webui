FROM node:22-bookworm-slim AS builder

WORKDIR /opt/agent-webui

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ pkg-config ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && corepack prepare pnpm@11.1.2 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.json tsconfig.base.json eslint.config.mjs ./
COPY packages ./packages

RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    AGENT_WEBUI_PORT=3000 \
    AGENT_WEBUI_OPENCODE_BASE=http://127.0.0.1:4096 \
    AGENT_WEBUI_BASE_PATH=/webui \
    AGENT_WEBUI_DIRECTORY=/app \
    AGENT_WEBUI_MOCK=true

WORKDIR /opt/agent-webui

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl dumb-init supervisor git \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g opencode-ai@1.17.8

COPY --from=builder /opt/agent-webui/package.json ./package.json
COPY --from=builder /opt/agent-webui/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /opt/agent-webui/node_modules ./node_modules
COPY --from=builder /opt/agent-webui/packages ./packages
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/entrypoint.sh /usr/local/bin/agent-webui-entrypoint
COPY docker/healthcheck.sh /usr/local/bin/agent-webui-healthcheck

RUN chmod +x /usr/local/bin/agent-webui-entrypoint /usr/local/bin/agent-webui-healthcheck \
  && mkdir -p /app /data /data/logs /data/extensions

EXPOSE 3000 4096

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD ["/usr/local/bin/agent-webui-healthcheck"]

ENTRYPOINT ["/usr/local/bin/agent-webui-entrypoint"]
