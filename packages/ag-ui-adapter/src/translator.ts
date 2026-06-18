import type {
  AGUIEvent,
  OpenCodeEvent,
  OpenCodeMessageDelta,
  OpenCodeToolDelta,
  OpenCodeError,
} from '@archai/agent-webui-shared';

/**
 * OpenCode 事件 -> AG-UI 事件 翻译。
 *
 * M1 stub：只翻译核心子集，未识别事件返回 null。
 * 真实事件字段在 M2 以 OpenCode 实际抓包为准统一校对。
 */
export function translateOpenCodeEvent(
  ev: OpenCodeEvent,
  ctx: { runId: string },
): AGUIEvent | null {
  const base = { runId: ctx.runId, timestamp: ev.timestamp };
  switch (ev.type) {
    case 'session.start':
      return { ...base, type: 'RUN_STARTED', threadId: ev.sessionId };
    case 'session.message.start': {
      const m = ev as OpenCodeMessageDelta;
      return {
        ...base,
        type: 'TEXT_MESSAGE_START',
        messageId: m.messageId,
        role: 'assistant',
      };
    }
    case 'session.message.delta': {
      const m = ev as OpenCodeMessageDelta;
      return {
        ...base,
        type: 'TEXT_MESSAGE_CONTENT',
        messageId: m.messageId,
        delta: m.delta,
      };
    }
    case 'session.message.end': {
      const m = ev as OpenCodeMessageDelta;
      return { ...base, type: 'TEXT_MESSAGE_END', messageId: m.messageId };
    }
    case 'session.tool.start': {
      const t = ev as OpenCodeToolDelta;
      return {
        ...base,
        type: 'TOOL_CALL_START',
        toolCallId: t.toolCallId,
        toolName: 'unknown',
      };
    }
    case 'session.tool.delta': {
      const t = ev as OpenCodeToolDelta;
      return { ...base, type: 'TOOL_CALL_ARGS', toolCallId: t.toolCallId, delta: t.delta };
    }
    case 'session.tool.end': {
      const t = ev as OpenCodeToolDelta;
      return { ...base, type: 'TOOL_CALL_END', toolCallId: t.toolCallId };
    }
    case 'session.end':
      return { ...base, type: 'RUN_FINISHED' };
    case 'session.error': {
      const e = ev as OpenCodeError;
      return { ...base, type: 'RUN_ERROR', message: e.message, code: e.code };
    }
    default:
      return null;
  }
}
