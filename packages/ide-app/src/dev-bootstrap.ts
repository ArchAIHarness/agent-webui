/**
 * 本地开发引导（M1·A 占位）。
 *
 * 当前仅启动 ag-ui-adapter，便于在没有 OpenSumi 启动壳的情况下做 SSE 自测。
 * M1·B 起替换为 OpenSumi `@opensumi/ide-startup` 真正的启动入口。
 */
import { createApp, loadConfigFromEnv } from '@archai/agent-webui-ag-ui-adapter';
import { serve } from '@hono/node-server';

const cfg = loadConfigFromEnv();
const app = createApp(cfg);
serve({ fetch: app.fetch, port: cfg.port, hostname: '0.0.0.0' }, (info) => {
   
  console.info(`[ide-app dev] adapter on :${info.port}, basePath=${cfg.basePath}`);
});
