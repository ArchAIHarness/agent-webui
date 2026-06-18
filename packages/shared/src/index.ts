/**
 * @archai/agent-webui-shared
 *
 * 平台无关的协议类型与工具，供 ide-app 与 ag-ui-adapter 共同消费。
 *
 * 边界：
 *  - 不依赖 OpenSumi、不依赖 OpenCode 运行时、不依赖 Hono
 *  - 只导出纯 TypeScript 类型与无副作用的纯函数
 */

export * from './ag-ui.js';
export * from './opencode.js';
export * from './mcp-ui.js';
