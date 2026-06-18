/**
 * 自研 Module 元信息。M1·B 起替换为实际 OpenSumi BrowserModule/NodeModule 实例。
 */
export interface AgentWebUIModule {
  /** 模块标识，例如 "AGUIClientModule" */
  name: string;
  /** 模块在哪一侧装载 */
  side: 'browser' | 'node';
  /** 描述，仅用于诊断输出 */
  description?: string;
}

export interface IDEBootstrapOptions {
  /** OpenCode Web base URL，默认 http://127.0.0.1:4096 */
  opencodeBaseUrl: string;
  /** SPA 子路径前缀，默认 /webui */
  basePath: string;
}
