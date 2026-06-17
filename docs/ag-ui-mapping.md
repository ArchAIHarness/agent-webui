# ag-ui-mapping.md · OpenCode 事件 ↔ AG-UI 事件映射

## 1. 总原则

- AG-UI 是 agent-webui 与 OpenCode 之间的标准协议层，由 `agent-webui Server` 内的 AG-UI Adapter 实现翻译。
- 浏览器端用 `@ag-ui/client` 订阅，不直连 OpenCode 4096。
- 所有 ask / permission / 中断都用 AG-UI 标准事件承载，不发明新事件类型。
- 协议版本以 `@ag-ui/core` 当前发布版为准；M0 阶段先按草案对齐，M2 上线前锁定具体版本。

## 2. 通道

| 通道 | 协议 | 路径 | 方向 |
|---|---|---|---|
| 主事件流 | SSE | `GET /webui/ag-ui/sessions/:sid/stream` | Server -> Browser |
| 反向输入 | HTTP POST | `POST /webui/ag-ui/sessions/:sid/input` | Browser -> Server |
| 中断响应 | HTTP POST | `POST /webui/ag-ui/sessions/:sid/interrupt-response` | Browser -> Server |
| 状态查询 | HTTP GET | `GET /webui/ag-ui/sessions/:sid/state` | Browser -> Server |
| 会话列表 | HTTP GET | `GET /webui/ag-ui/sessions` | Browser -> Server |

WebSocket 备选：当 SSE 在企业代理下表现不稳时，提供 `/webui/ag-ui/ws` 作为兜底；事件载荷不变。

## 3. 事件映射

下表中"OpenCode 事件"以 OpenCode Web API 当前实际事件为准；M1 调研后补充字段对照。

| AG-UI 事件 | 含义 | OpenCode 来源 | 备注 |
|---|---|---|---|
| `RUN_STARTED` | 一次推理开始 | session 开始消息 | 包含 sessionId, runId |
| `RUN_FINISHED` | 一次推理结束 | session 结束消息 | 含 status |
| `TEXT_MESSAGE_START` | 助手消息开始 | assistant message start | 含 messageId |
| `TEXT_MESSAGE_CONTENT` | 助手消息流式 chunk | assistant message delta | append text |
| `TEXT_MESSAGE_END` | 助手消息结束 | assistant message complete | finalize |
| `TOOL_CALL_START` | 工具调用开始 | tool call start | 含 toolCallId, name |
| `TOOL_CALL_ARGS` | 工具参数流式 | tool call args delta | append args |
| `TOOL_CALL_END` | 工具调用结束 | tool call complete | 含 result |
| `STATE_SNAPSHOT` | 全量状态快照 | session state | 用于断线重连 |
| `STATE_DELTA` | 状态增量 | state diff | 频率低 |
| `INTERRUPT` | 中断等待用户输入 | permission / ask / form | 含 schema |
| `RAW` | 不映射的原始事件 | 其它 | 调试用 |

## 4. ask / permission 流

OpenCode 触发权限或人工确认时：

```text
OpenCode -> Adapter:
  permission_request {
    sessionId, requestId, type: "approval" | "form" | "select",
    payload: { ... }
  }

Adapter -> Browser (SSE):
  event: INTERRUPT
  data: {
    interruptId,
    kind: "approval" | "form" | "select",
    schema: { jsonSchema or approvalConfig },
    payload
  }

Browser:
  AgentInteractionModule 渲染弹窗
  用户操作 -> POST /webui/ag-ui/sessions/:sid/interrupt-response
    body: { interruptId, response: {...} }

Adapter -> OpenCode:
  permission_response { requestId, response }

OpenCode 继续推理
```

## 5. 工具卡片

工具调用展示分两层：

1. 通用结构：`AgentChatModule` 渲染工具名、参数、状态、结果摘要。
2. 富 UI：若工具结果包含 MCP-UI 资源（`type: ui-resource`），交由 `MCPUIRendererModule` 渲染在工具卡片下方。

字段约定：

```ts
type ToolCallResult =
  | { kind: 'text', content: string }
  | { kind: 'json', content: object }
  | { kind: 'ui-resource', format: 'html' | 'remote-dom' | 'iframe', content: string, sandbox: true }
  | { kind: 'file', path: string, mimeType?: string };
```

`ui-resource` 走 MCP-UI 渲染规范。`file` 由 IDE 内置 Preview 处理。

## 6. 多 Session

- 每个用户在同一 Pod 内可能有多个 OpenCode session。
- agent-webui 在浏览器端为每个 session 起一条独立的 SSE 流。
- `GET /webui/ag-ui/sessions` 返回当前活跃 session 列表。
- 切换 Session Tab 不重建连接，仅切换订阅 ID。

## 7. 重连与回放

- SSE 断开时自动重连，使用 `Last-Event-ID` 续传。
- Adapter 在内存中缓存最近 N 条事件（N 配置项，默认 500），用于短时重连。
- 长时间重连（超过缓存窗口）使用 `STATE_SNAPSHOT` + 后续 `STATE_DELTA` 重建。

## 8. 鉴权

- 所有 `/webui/ag-ui/*` 请求必须携带 `agent-master` 注入的 `x-user-id`。
- agent-webui Server 不自验签；信任 `agent-master`。NetworkPolicy 限定只接受来自 `agent-master` 的入站。
- 一用户一 Pod，Pod 边界即隔离边界。

## 9. 错误与降级

| 场景 | 处理 |
|---|---|
| OpenCode 4096 不可达 | Adapter 返回 503；Browser 显示离线，重试 |
| AG-UI 协议版本不兼容 | Browser 启动时显示警告，禁用对话面板，仍允许 IDE 功能 |
| 工具结果超大 | Adapter 截断 + 提供下载链接；不阻塞流 |

## 10. 待 M1 调研后补全

- OpenCode 实际事件名与字段（M0 暂用占位）
- 是否需要 WS（SSE 是否覆盖所有场景）
- `STATE_DELTA` 在 OpenCode 侧的来源（state 是否真的增量推送）
- 多 Session 的会话 ID 命名规则
