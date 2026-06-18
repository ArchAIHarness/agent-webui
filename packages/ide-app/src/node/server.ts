import { createAdaptorServer } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Injector } from '@opensumi/di';
import { ServerApp } from '@opensumi/ide-core-node/lib/bootstrap/app.js';
import { ServerCommonModule } from '@opensumi/ide-core-node';
import { FileSchemeNodeModule } from '@opensumi/ide-file-scheme/lib/node/index.js';
import { FileServiceModule } from '@opensumi/ide-file-service/lib/node/index.js';
import { LogServiceModule } from '@opensumi/ide-logs/lib/node/index.js';
import { createApp as createAGUIApp, loadConfigFromEnv } from '@archai/agent-webui-ag-ui-adapter';
import type { IncomingMessage } from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureRuntimeDirectories, resolveDataDir } from './runtime-directories.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const config = loadConfigFromEnv();
const browserDist = path.resolve(dirname, '../browser');
const basePath = normalizeBasePath(config.basePath);
const nodeModules = [ServerCommonModule, LogServiceModule, FileServiceModule, FileSchemeNodeModule];

function normalizeBasePath(value: string): string {
  if (!value || value === '/') {
    return '';
  }
  return value.replace(/\/$/, '');
}

function routePath(pathname: string): string {
  return `${basePath}${pathname}` || '/';
}

function stripBasePath(pathname: string): string {
  if (!basePath) {
    return pathname.replace(/^\/?/, '');
  }
  if (pathname === basePath) {
    return '';
  }
  if (pathname.startsWith(`${basePath}/`)) {
    return pathname.slice(basePath.length + 1);
  }
  return pathname;
}

type UpgradeRewriterTarget = {
  prependListener(event: 'upgrade', listener: (request: IncomingMessage) => void): void;
};

function rewriteBasePathWebSocketUpgrade(server: UpgradeRewriterTarget): void {
  if (!basePath) {
    return;
  }

  server.prependListener('upgrade', (request) => {
    const servicePath = `${basePath}/service`;
    const url = request.url ?? '';
    if (url !== servicePath && !url.startsWith(`${servicePath}?`)) {
      return;
    }

    request.url = url.slice(basePath.length) || '/';
  });
}

async function main(): Promise<void> {
  const dataDir = resolveDataDir();
  await ensureRuntimeDirectories({ dataDir });

  const aguiApp = createAGUIApp(config);

  // 静态资源由 ide-app build:browser 输出；默认挂载到 /webui/*，root 模式挂载到 /*。
  aguiApp.get(routePath('/'), async (c) => {
    const html = await fs.readFile(path.join(browserDist, 'index.html'), 'utf8');
    return c.html(html);
  });
  aguiApp.use(
    routePath('/*'),
    serveStatic({
      root: browserDist,
      rewriteRequestPath: stripBasePath,
    }),
  );

  const server = createAdaptorServer({
    fetch: aguiApp.fetch,
    port: config.port,
    hostname: '0.0.0.0',
  });
  rewriteBasePathWebSocketUpgrade(server);

  const injector = new Injector();
  const serverApp = new ServerApp({
    injector,
    modules: [...nodeModules],
    logDir: path.join(dataDir, 'logs'),
    marketplace: {
      extensionDir: path.join(dataDir, 'extensions'),
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
      `basePath=${basePath || '/'}, static=${browserDist}`,
  );
}

void main().catch((err: unknown) => {
  console.error('[agent-webui] failed to start', err);
  process.exit(1);
});
