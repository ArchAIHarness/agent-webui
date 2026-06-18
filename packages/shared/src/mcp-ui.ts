/**
 * MCP-UI 渲染负载最小子集（M1 stub）。
 *
 * 工具结果除常规 JSON 外，可携带受控 HTML / iframe 资源，由 IDE 端
 * Renderer 在 sandbox 内渲染。详见 docs/rich-ui.md。
 */

export type MCPUIResourceKind = 'html' | 'iframe' | 'json-form';

export interface MCPUIResourceBase {
  kind: MCPUIResourceKind;
  /** 资源描述，仅用于审计和无障碍展示 */
  description?: string;
}

export interface MCPUIHtmlResource extends MCPUIResourceBase {
  kind: 'html';
  /** 受控 HTML 片段，必须在 sandbox iframe 渲染，禁止跨域脚本 */
  html: string;
}

export interface MCPUIIframeResource extends MCPUIResourceBase {
  kind: 'iframe';
  /** 必须为 https URL；调用方需校验白名单 */
  src: string;
  sandbox?: string;
}

export interface MCPUIJsonFormResource extends MCPUIResourceBase {
  kind: 'json-form';
  schema: unknown;
  uiSchema?: unknown;
  data?: unknown;
}

export type MCPUIResource =
  | MCPUIHtmlResource
  | MCPUIIframeResource
  | MCPUIJsonFormResource;
