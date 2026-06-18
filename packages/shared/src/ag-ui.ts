/**
 * AG-UI 协议事件类型（最小子集，M1 stub）。
 *
 * 完整事件集合详见 docs/ag-ui-mapping.md，M1 仅落地最常用事件，
 * 后续 M2 双向交互再补 INPUT_REQUIRED / INTERRUPT 等。
 */

export type AGUIEventType =
  | 'RUN_STARTED'
  | 'TEXT_MESSAGE_START'
  | 'TEXT_MESSAGE_CONTENT'
  | 'TEXT_MESSAGE_END'
  | 'TOOL_CALL_START'
  | 'TOOL_CALL_ARGS'
  | 'TOOL_CALL_END'
  | 'STATE_SNAPSHOT'
  | 'RUN_FINISHED'
  | 'RUN_ERROR';

export interface AGUIEventBase {
  type: AGUIEventType;
  /** 一次 run 的全局唯一 ID */
  runId: string;
  /** 事件产生时的服务端时间戳（毫秒） */
  timestamp: number;
}

export interface AGUIRunStarted extends AGUIEventBase {
  type: 'RUN_STARTED';
  threadId: string;
}

export interface AGUITextMessageStart extends AGUIEventBase {
  type: 'TEXT_MESSAGE_START';
  messageId: string;
  role: 'assistant' | 'user' | 'system';
}

export interface AGUITextMessageContent extends AGUIEventBase {
  type: 'TEXT_MESSAGE_CONTENT';
  messageId: string;
  delta: string;
}

export interface AGUITextMessageEnd extends AGUIEventBase {
  type: 'TEXT_MESSAGE_END';
  messageId: string;
}

export interface AGUIToolCallStart extends AGUIEventBase {
  type: 'TOOL_CALL_START';
  toolCallId: string;
  toolName: string;
}

export interface AGUIToolCallArgs extends AGUIEventBase {
  type: 'TOOL_CALL_ARGS';
  toolCallId: string;
  delta: string;
}

export interface AGUIToolCallEnd extends AGUIEventBase {
  type: 'TOOL_CALL_END';
  toolCallId: string;
}

export interface AGUIStateSnapshot extends AGUIEventBase {
  type: 'STATE_SNAPSHOT';
  state: Record<string, unknown>;
}

export interface AGUIRunFinished extends AGUIEventBase {
  type: 'RUN_FINISHED';
}

export interface AGUIRunError extends AGUIEventBase {
  type: 'RUN_ERROR';
  message: string;
  code?: string;
}

export type AGUIEvent =
  | AGUIRunStarted
  | AGUITextMessageStart
  | AGUITextMessageContent
  | AGUITextMessageEnd
  | AGUIToolCallStart
  | AGUIToolCallArgs
  | AGUIToolCallEnd
  | AGUIStateSnapshot
  | AGUIRunFinished
  | AGUIRunError;

export interface AGUISessionRef {
  sessionId: string;
  threadId?: string;
}
