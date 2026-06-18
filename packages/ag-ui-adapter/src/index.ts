/**
 * @archai/agent-webui-ag-ui-adapter
 *
 * 提供两个能力：
 *  1. OpenCode SSE -> AG-UI Event Stream 的协议翻译（translator）
 *  2. 一个 Hono 应用，承载 /webui/* 与 /webui/ag-ui/* 路由（M1 stub）
 *
 * M1 阶段实现是骨架级别：
 *  - translator 只覆盖 docs/ag-ui-mapping.md 列出的 RUN/MESSAGE/TOOL 主线
 *  - server 提供 mock 流，便于 ide-app 联调
 *  - 真正接入 OpenCode 在 M2，由 docs/ag-ui-mapping.md 校对真实事件字段
 */

export { createApp } from './app.js';
export { translateOpenCodeEvent } from './translator.js';
export { loadConfigFromEnv } from './config.js';
export type { AdapterConfig } from './config.js';
