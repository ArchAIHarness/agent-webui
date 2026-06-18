export interface AdapterConfig {
  /** 监听端口，默认 3000 */
  port: number;
  /** OpenCode Web 监听地址，默认 http://127.0.0.1:4096 */
  opencodeBaseUrl: string;
  /** 子路径前缀，默认 /webui */
  basePath: string;
  /** OpenCode directory 透传值，默认 /app */
  directory: string;
  /** 是否启用 mock AG-UI 流（M1 默认开启，M2 切到真实流） */
  mockMode: boolean;
}

export function loadConfigFromEnv(): AdapterConfig {
  const port = Number.parseInt(process.env.AGENT_WEBUI_PORT ?? '3000', 10);
  return {
    port: Number.isFinite(port) ? port : 3000,
    opencodeBaseUrl: process.env.AGENT_WEBUI_OPENCODE_BASE ?? 'http://127.0.0.1:4096',
    basePath: process.env.AGENT_WEBUI_BASE_PATH ?? '/webui',
    directory: process.env.AGENT_WEBUI_DIRECTORY ?? '/app',
    mockMode: process.env.AGENT_WEBUI_MOCK !== 'false',
  };
}
