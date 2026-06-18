import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { AGUIEvent } from '@archai/agent-webui-shared';
import type { AdapterConfig } from './config.js';

/**
 * 创建 agent-webui server Hono 应用。
 *
 * 路由布局（M1 骨架）：
 *  GET  {basePath}/healthz                    - 自身存活
 *  GET  {basePath}/readyz                     - 上游 OpenCode 可达性
 *  GET  {basePath}/ag-ui/sessions/:sid/stream - AG-UI SSE（M1 mock）
 *  POST {basePath}/ag-ui/sessions/:sid/input  - 占位 501，M2 实现
 *  GET  {basePath}/                           - SPA 入口（M1 占位 HTML）
 *
 * 子路径前缀由 basePath 决定，便于在 agent-master /webui/* 反代下原路挂载。
 */
export function createApp(config: AdapterConfig): Hono {
  const app = new Hono();
  const base = config.basePath.replace(/\/$/, '');

  app.get(`${base}/healthz`, (c) => c.json({ ok: true }));

  app.get(`${base}/readyz`, async (c) => {
    try {
      const r = await fetch(`${config.opencodeBaseUrl}/`, {
        signal: AbortSignal.timeout(2000),
      });
      return c.json({ ok: true, opencode: r.status });
    } catch (err) {
      console.warn('[agent-webui] OpenCode readiness check failed', err);
      return c.json({ ok: false, error: 'opencode_unreachable' }, 503);
    }
  });

  app.get(`${base}/ag-ui/sessions/:sid/stream`, (c) => {
    if (!config.mockMode) {
      return c.json({ error: 'real OpenCode stream is not implemented in M1' }, 501);
    }

    const sid = c.req.param('sid');
    return streamSSE(c, async (stream) => {
      const runId = `run-${Date.now()}`;
      const meta = { runId, timestamp: Date.now() };
      const events: AGUIEvent[] = [
        { ...meta, type: 'RUN_STARTED', threadId: sid },
        { ...meta, type: 'TEXT_MESSAGE_START', messageId: 'm1', role: 'assistant' },
        {
          ...meta,
          type: 'TEXT_MESSAGE_CONTENT',
          messageId: 'm1',
          delta: 'hello from agent-webui M1 mock stream',
        },
        { ...meta, type: 'TEXT_MESSAGE_END', messageId: 'm1' },
        { ...meta, type: 'RUN_FINISHED' },
      ];
      for (const ev of events) {
        await stream.writeSSE({ event: ev.type, data: JSON.stringify(ev) });
        await stream.sleep(50);
      }
    });
  });

  app.post(`${base}/ag-ui/sessions/:sid/input`, (c) =>
    c.json({ error: 'not implemented in M1, will land in M2' }, 501),
  );

  app.get(`${base}/adapter-info`, (c) =>
    c.json({
      name: 'agent-webui-ag-ui-adapter',
      basePath: base,
      opencodeConfigured: Boolean(config.opencodeBaseUrl),
      mockMode: config.mockMode,
    }),
  );

  return app;
}
