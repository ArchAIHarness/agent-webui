# architecture.md · 系统架构

## 1. 设计目标

agent-webui 是基于 OpenSumi core 的 Agent IDE，部署在 K8s 用户 Pod 内，通过 `agent-master` 反代远程访问。核心目标：

- 提供完整 IDE 体验（编辑器、终端、调试、文件管理、Git）
- 通过 AG-UI 协议承载 Agent 对话与 ask/permission 交互
- 复用 VS Code 插件生态
- 完全自定义布局，支持 IDE / Chat / Hybrid 模式
- 不 fork OpenSumi，所有定制走插件机制

## 2. 部署形态

每用户一个 Pod，Pod 内两个进程：

| 进程 | 端口 | 职责 |
|---|---|---|
| OpenCode Web | 4096 | Agent 基座；处理推理、工具调用、会话状态 |
| agent-webui Server | 3000 | OpenSumi 后端 + AG-UI 适配 + 静态资源 |

`agent-master` 负责：

- `/agent/*` 反代到 4096
- `/webui/*` 反代到 3000（含 SSE / WebSocket）
- 鉴权与 `x-user-id` 注入

## 3. 进程拓扑

```text
[ Browser ]
    |
    v
[ Upstream Gateway ]   --- 注入 x-user-id ---
    |
    v
[ agent-master ]
    |  --- /agent/*  --->  [ Pod ] :4096  OpenCode Web
    |  --- /webui/*  --->  [ Pod ] :3000  agent-webui Server
    |                                      |
    |                                      +-- AG-UI Adapter   --> 4096
    |                                      +-- OpenSumi Node Modules
    |                                      +-- vscode Extension Host
    |                                      +-- Static Assets (IDE SPA)
```

## 4. 进程内分层

### 4.1 agent-webui Server (Node)

- OpenSumi Node 模块：FileService、TerminalService、SearchService、DebugService 等。
- AG-UI Adapter：把 OpenCode 4096 的会话事件翻译成 AG-UI 标准事件流。
- vscode Extension Host：OpenSumi 自带，负责加载用户/平台 vscode 扩展。
- 静态资源：托管编译后的 IDE SPA。
- 持久化：SQLite，存会话索引、工作区元数据。

### 4.2 IDE SPA (Browser)

- OpenSumi Browser 模块组装入口。
- 自研 OpenSumi Module（M2 起）：
  - `AgentChatModule`：对话面板
  - `AgentInteractionModule`：ask/permission 弹窗
  - `AgentFormModule`：JSON Schema 表单
  - `LayoutSwitcherModule`：布局切换
  - `MCPUIRendererModule`：MCP-UI 资源渲染
  - `TiptapEditorModule` / `PDFViewerModule` / `DiagramModule`
- vscode 扩展运行在隔离的 Web Worker 中。

## 5. 数据流（Agent 对话）

```text
用户输入
  -> AgentChatModule
  -> AGUIClientService (Browser, @ag-ui/client)
       SSE/WS over /webui/ag-ui
  -> AG-UI Adapter (Server)
  -> OpenCode Web 4096 (sessions, tools)
       OpenCode 推理 + 工具调用
  <- OpenCode 事件流
  <- AG-UI Adapter 翻译
  <- AGUIClientService 接收
  <- AgentChatModule 渲染
```

ask / permission 走相同通路，使用 AG-UI INTERRUPT + USER_RESPONSE。

## 6. 数据流（IDE 操作）

IDE 文件、终端、调试操作不经 AG-UI，走 OpenSumi 自带 RPC：

```text
IDE SPA -- OpenSumi Connection (WS) --> OpenSumi Node Modules
                                         -> 文件系统 / pty / DAP / git
```

OpenSumi 的工作区目录指向容器 `/app`（即用户 NAS subPath 挂载点），与 OpenCode 共用同一份用户工作目录。

## 7. 多 Session

- 一个 Pod 内只跑一份 OpenCode，多 session 由 OpenCode 管理。
- IDE 内通过多 Tab 选择不同 session，每个 Tab 对应一条 AG-UI 流。
- 一用户一 Pod，Pod 之间天然隔离，agent-webui 不参与跨 Pod 协调。

## 8. 持久化

| 数据 | 位置 |
|---|---|
| OpenCode 会话 | OpenCode 自管，落在 `~/.local/share/opencode/`（NAS subPath） |
| OpenCode 工作目录 | `/app`（NAS subPath） |
| agent-webui 会话索引 | `/data/agent-webui.sqlite` |
| agent-webui 用户偏好 | `/data/preferences/` |
| vscode 扩展 | OpenSumi 标准目录，跟随 NAS 持久化 |

agent-webui 不复制 OpenCode 已经持久化的内容；只索引必要的元数据用于多 Tab 恢复。

## 9. 失效与降级

- AG-UI Adapter 与 OpenCode 4096 断联：IDE 仍可继续编辑文件、跑终端；对话面板显示离线，重连时回放缓存事件。
- agent-webui Server 重启：SPA 自动重连；OpenSumi 协议层自带恢复机制。
- OpenCode 重启：会话 ID 不变即可恢复；变更则在 IDE 内提示用户重新进入会话。

## 10. 与 agent-image-webui 的关系

agent-image-webui（AionUi）与本仓库构建的 agent-webui 镜像不并存于同一 Pod。

- `agent-image-webui` 镜像：跑 AionUi（即开即用形态）
- `agent-webui` 镜像（本仓库构建）：跑 OpenCode + OpenSumi IDE 双进程（重度沉浸形态）

`agent-master` 按用户/产品形态选择镜像，互不干扰。
