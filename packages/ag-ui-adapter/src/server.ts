import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { loadConfigFromEnv } from './config.js';

const config = loadConfigFromEnv();
const app = createApp(config);

serve({ fetch: app.fetch, port: config.port, hostname: '0.0.0.0' }, (info) => {
  console.info(
    `[agent-webui] listening on :${info.port}, basePath=${config.basePath}, ` +
      `opencodeConfigured=${Boolean(config.opencodeBaseUrl)}, mock=${config.mockMode}`,
  );
});

const shutdown = (sig: string) => {
  console.info(`[agent-webui] received ${sig}, shutting down`);
  process.exit(0);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
