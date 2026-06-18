/**
 * 本地开发引导（M1·A 占位）。
 *
 * 当前仅启动 ag-ui-adapter，便于在不拉起 OpenSumi IDE 的情况下做 SSE 自测。
 * 正式 M1 入口见 src/browser/main.tsx 与 src/node/server.ts，使用显式 OpenSumi 模块白名单。
 */
import { createApp, loadConfigFromEnv } from '@archai/agent-webui-ag-ui-adapter';
import { serve } from '@hono/node-server';

const cfg = loadConfigFromEnv();
const app = createApp(cfg);
serve({ fetch: app.fetch, port: cfg.port, hostname: '0.0.0.0' }, (info) => {
   
  console.info(`[ide-app dev] adapter on :${info.port}, basePath=${cfg.basePath}`);
});
