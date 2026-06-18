import { createAdaptorServer } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Injector } from '@opensumi/di';
import { ServerApp } from '@opensumi/ide-core-node/lib/bootstrap/app.js';
import { CommonNodeModules } from '@opensumi/ide-startup/lib/node/common-modules.js';
import { createApp as createAGUIApp, loadConfigFromEnv } from '@archai/agent-webui-ag-ui-adapter';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const config = loadConfigFromEnv();
const browserDist = path.resolve(dirname, '../browser');

async function main(): Promise<void> {
  const aguiApp = createAGUIApp(config);

  // 静态资源由 ide-app build:browser 输出，挂载到 /webui/*。
  aguiApp.get(`${config.basePath}/`, async (c) => {
    const html = await fs.readFile(path.join(browserDist, 'index.html'), 'utf8');
    return c.html(html);
  });
  aguiApp.use(
    `${config.basePath}/*`,
    serveStatic({
      root: browserDist,
      rewriteRequestPath: (p) => p.replace(new RegExp(`^${config.basePath}/?`), ''),
    }),
  );

  const server = createAdaptorServer({
    fetch: aguiApp.fetch,
    port: config.port,
    hostname: '0.0.0.0',
  });

  const injector = new Injector();
  const serverApp = new ServerApp({
    injector,
    modules: [...CommonNodeModules],
    logDir: '/data/logs',
    marketplace: {
      extensionDir: '/data/extensions',
    },
    // OpenSumi 默认 WS 路径为 /service。本地直连使用 /service；经 agent-master 时可由 /webui/* 做前缀剥离。
    pathMatchOptions: { end: false },
    disableKeytar: true,
  });

  await serverApp.start(server);

  await new Promise<void>((resolve) => {
    server.listen(config.port, '0.0.0.0', () => resolve());
  });

  console.info(
    `[agent-webui] OpenSumi server listening on :${config.port}, ` +
      `basePath=${config.basePath}, static=${browserDist}`,
  );
}

void main().catch((err: unknown) => {
  console.error('[agent-webui] failed to start', err);
  process.exit(1);
});
