/**
 * OpenCode Web API 事件最小子集（M1 stub）。
 *
 * 完整字段以 OpenCode 官方文档为准；本文件仅定义 ag-ui-adapter 当前
 * 需要消费的事件形状，避免重复 import OpenCode 内部类型。
 */

export type OpenCodeEventType =
  | 'session.start'
  | 'session.message.start'
  | 'session.message.delta'
  | 'session.message.end'
  | 'session.tool.start'
  | 'session.tool.delta'
  | 'session.tool.end'
  | 'session.end'
  | 'session.error';

export interface OpenCodeEventBase {
  type: OpenCodeEventType;
  sessionId: string;
  timestamp: number;
}

export interface OpenCodeMessageDelta extends OpenCodeEventBase {
  type: 'session.message.delta';
  messageId: string;
  delta: string;
}

export interface OpenCodeToolDelta extends OpenCodeEventBase {
  type: 'session.tool.delta';
  toolCallId: string;
  delta: string;
}

export interface OpenCodeError extends OpenCodeEventBase {
  type: 'session.error';
  message: string;
  code?: string;
}

export type OpenCodeEvent =
  | OpenCodeEventBase
  | OpenCodeMessageDelta
  | OpenCodeToolDelta
  | OpenCodeError;

export interface OpenCodeClientConfig {
  /** OpenCode Web 监听地址，容器内默认 http://127.0.0.1:4096 */
  baseUrl: string;
  /** 透传给 OpenCode 的 directory 参数，默认 /app */
  directory?: string;
  /** 请求超时（毫秒） */
  timeoutMs?: number;
}
