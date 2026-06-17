# agent-webui · 基于 OpenSumi 的 Agent IDE

> 智能体平台长期 WebUI 形态：以 OpenSumi core 为底座，通过 AG-UI 协议与 OpenCode 双向交互，复用 VS Code 插件生态，承载重度沉浸式 IDE 体验。本仓库直接通过 Dockerfile 内置集成 OpenCode CLI，构建出与 `agent-image-webui` 平级的运行镜像（OpenCode + OpenSumi IDE 双进程，supervisord 编排），渐进替换 AionUi。

## 1. 仓库定位

- 仓库名：`agent-webui`
- 归属：`https://github.com/ArchAIHarness/agent-webui`
- 可见性：Public
- License：MIT
- 当前阶段：规划期。设计文档先行，代码实现按路线图推进。
- 目标形态：Agent IDE。重度且沉浸的开发工作台，对话只是其中一个面板。

| 仓库 | 形态 | 协议 | 编辑器/终端 | 插件生态 | 角色 |
|---|---|---|---|---|---|
| `agent-image` | 无头 | OpenCode 原生 | 无 | OpenCode plugin | API/SDK 形态 |
| `agent-image-webui` | OpenCode + AionUi | AionUi 内部 | 受限只读 | AionUi Skill | 即开即用形态 |
| `agent-webui` | OpenCode + OpenSumi IDE | AG-UI | 完整 IDE | VS Code + OpenSumi Module | 重度沉浸形态 |

## 2. 设计目标

1. 重度 IDE 体验：完整的代码编辑、终端、调试、文件管理，不是"加了编辑器的聊天框"。
2. VS Code 插件生态优先：复用 vscode 扩展协议，第三方插件零成本接入。
3. Agent 一等公民：AG-UI 协议驱动的对话面板、ask/permission UI、富 UI 组件作为 IDE 内嵌模块。
4. 完全自定义布局：支持 IDE 模式 / 对话模式 / Hybrid 模式自由切换；每个 Slot 用户可调整。
5. 不改 OpenSumi 源码：以 `@opensumi/ide-*` 包形式锁版本依赖，扩展走 vscode 插件 + 自研 Module。
6. 浏览器访问：通过 `agent-master` 反代访问，不依赖桌面运行时；每用户一个 Pod，Pod 内 OpenCode + agent-webui 双进程同容器部署。
7. 渐进替换 AionUi：本仓库直接构建运行镜像（OpenCode + OpenSumi IDE 双进程），与 `agent-image-webui` 平级共存，由 `agent-master` 按用户/产品形态选择。

## 3. 三层扩展策略

| 层 | 机制 | 用途 | 学习成本 |
|---|---|---|---|
| L1 VS Code Extension（首选） | 标准 vscode 扩展协议 | 命令、菜单、视图、语言、调试、lint、第三方插件 | 低 |
| L2 OpenSumi Module（深度集成） | DI + Contribution Point + Slot 注入 | AG-UI 协议适配、Agent 对话面板、布局定制、内核服务 | 中高 |
| L3 MCP-UI Renderer（工具结果富 UI） | MCP-UI 客户端 SDK | 渲染 OpenCode MCP 工具返回的 HTML/Remote DOM 资源 | 中 |

优先级原则：能用 vscode 扩展就不写 Module；必须深度集成的能力（AG-UI、自定义布局、Slot 注入）才走 Module。详细策略见 [docs/extension-strategy.md](docs/extension-strategy.md)。

## 4. 协议选型

| 协议 | 角色 | 落点 |
|---|---|---|
| AG-UI Protocol | Agent 与 IDE 的事件流：message / tool call / state / interrupt / approval | 自研 OpenSumi Module 中的 `AGUIClientService` |
| VS Code Extension API | 编辑器 / 语言 / 调试 / lint 标准协议 | OpenSumi 自带兼容层 |
| MCP | 工具能力扩展，由 `agent-plugin` 提供 | OpenCode 原生消费，IDE 透传展示 |
| MCP-UI | 工具结果富 UI 资源 | 自研 Module 内嵌 Renderer |
| 不引入 A2UI 私有协议 | - | 已被 AG-UI 覆盖 |

AG-UI 是"A2UI"在跨厂商规范层的标准答案。MCP-UI 与 AG-UI 互补：AG-UI 管会话事件流，MCP-UI 管工具结果富表达。详见 [docs/ag-ui-mapping.md](docs/ag-ui-mapping.md)。

## 5. 架构总览

```text
浏览器
  -> 上游网关（鉴权注入 x-user-id）
       -> agent-master（控制面）
            - /agent/*  -> Runtime Service:4096 -> OpenCode Web
            - /webui/*  -> Runtime Service:3000 -> agent-webui Server
                                                   - OpenSumi Backend Modules
                                                   - AG-UI Adapter (SSE/WS)
                                                   - vscode Extension Host
                                                   - 静态资源 + IDE SPA
```

容器内进程：

| 进程 | 端口 | 角色 |
|---|---|---|
| OpenCode Web | 4096 | Agent 基座，由 `agent-master` `/agent/*` 反代 |
| agent-webui Server | 3000 | OpenSumi 后端 + AG-UI 适配 + 静态资源，由 `agent-master` `/webui/*` 反代 |

详见 [docs/architecture.md](docs/architecture.md) 与 [docs/integration-with-agent-master.md](docs/integration-with-agent-master.md)。

## 6. 能力清单

### 6.1 OpenSumi 自带（直接复用，不改源码）

| 能力 | 提供模块 |
|---|---|
| 代码编辑器（Monaco） | `@opensumi/ide-editor` |
| Terminal（xterm.js + pty） | `@opensumi/ide-terminal-next` |
| 文件树 / 工作区 | `@opensumi/ide-explorer` / `@opensumi/ide-workspace` |
| 调试协议（DAP） | `@opensumi/ide-debug` |
| 搜索 / 替换 | `@opensumi/ide-search` |
| Git 集成 | `@opensumi/ide-scm` |
| 命令面板 / 快捷键 | `@opensumi/ide-quick-open` / `@opensumi/ide-keymaps` |
| 主题 | `@opensumi/ide-theme` |
| vscode 扩展宿主 | `@opensumi/ide-extension` |

### 6.2 自研 OpenSumi Module 提供

| 能力 | 实现 | 优先级 |
|---|---|---|
| AG-UI 对话面板 | `AgentChatModule` + `@ag-ui/client` | P0 |
| ask / permission 弹窗 | `AgentInteractionModule` + AG-UI INTERRUPT | P0 |
| 表单回填（JSON Schema） | `AgentFormModule` + `@rjsf/core` | P0 |
| 自定义布局切换器 | `LayoutSwitcherModule`：IDE / Chat / Hybrid | P0 |
| MCP-UI Renderer | `MCPUIRendererModule` + `mcp-ui` SDK | P1 |
| Tiptap 富文本编辑器 | `TiptapEditorModule` | P1 |
| PDF 预览 / 批注 | `PDFViewerModule` + `pdf.js` | P1 |
| Mermaid 渲染 | `DiagramModule` | P2 |

详见 [docs/rich-ui.md](docs/rich-ui.md)。

### 6.3 通过 vscode 扩展提供（首选扩展形态）

| 能力 | 来源 |
|---|---|
| 语言支持（TS / Python / Go / Java / Rust ...） | vscode 官方扩展 / OpenVSX |
| Linter / Formatter | ESLint / Prettier / Ruff 扩展 |
| 调试器 | 各语言官方 DAP 扩展 |
| 主题 / 图标 | OpenVSX 市场 |
| Agent 自定义命令 | 平台自研 vscode 扩展（可独立仓库） |

## 7. 技术栈

- 底座：`@opensumi/ide-*` 系列模块（不 fork core）
- 前端：基于 `@opensumi/ide-startup` 模板派生，叠加自研 Module
- 编辑器：Monaco（OpenSumi 内置）
- 终端：xterm.js + pty（OpenSumi 内置）
- 协议：`@ag-ui/client` + `@ag-ui/core`
- 状态：OpenSumi DI + 自研 Service
- 富 UI：Tiptap / pdf.js / Mermaid / `mcp-ui` SDK（图表统一 Mermaid，不引 ECharts）
- 后端：OpenSumi Node + Hono（AG-UI 适配层）
- 持久化：SQLite（会话 / 工作区索引）
- 容器：本仓库 `docker/Dockerfile` 自建，内置 OpenCode CLI + agent-webui server，supervisord 双进程编排

详见 [docs/opensumi-integration.md](docs/opensumi-integration.md)。

## 8. 路线图

详见 [docs/roadmap.md](docs/roadmap.md)。简版：

- M0 规划：仓库初始化 + 设计文档（当前阶段）
- M1 最小 IDE + AG-UI 单向流 + 内置镜像：OpenSumi 启动骨架 + ag-ui-adapter + Dockerfile/supervisord，跑通从 master 反代到浏览器
- M2 vscode 扩展生态 + AG-UI 双向交互：扩展加载链路、agent-commands 自研扩展、双向闭环
- M3 富 UI 第一批：AgentChat / Interaction / MCPUIRenderer / Diagram(Mermaid)
- M4 完整布局切换 + 富 UI 第二批：LayoutSwitcher / Tiptap / PDF / Form
- M5 替换 AionUi：本仓库镜像成为默认 WebUI 镜像，`agent-image-webui` 保留为兼容/经济版

## 9. 仓库结构（规划）

```text
agent-webui/
- README.md
- AGENTS.md
- LICENSE
- NOTICE
- .gitignore
- docs/
  - architecture.md
  - opensumi-integration.md
  - extension-strategy.md
  - layout-design.md
  - ag-ui-mapping.md
  - rich-ui.md
  - integration-with-agent-master.md
  - roadmap.md
- packages/                # M1 起出现
  - ide-app/               # OpenSumi 启动入口 + 自研 Module 集合
  - ag-ui-adapter/         # OpenCode -> AG-UI 适配层（Node 服务）
  - shared/                # 协议类型 / 工具
- extensions/              # M2 起出现
  - agent-commands/        # 平台自研 vscode 扩展
- docker/                  # M1 起出现：直接内置 OpenCode CLI + supervisord 双进程
  - Dockerfile
  - supervisord.conf
  - entrypoint.sh
  - healthcheck.sh
- package.json             # bun/pnpm workspace
```

当前仓库仅 `docs/` 与根级元数据落地，代码实现按 M1 启动。

## 10. 与现有仓库的关系

- `agent-master`：增加镜像选择策略；不更换反代路径，仍是 `/agent/*` 与 `/webui/*`，但 `/webui/*` 在新镜像里指向 agent-webui。
- `agent-image-webui`：保持现状，作为"经济版/即开即用"形态长期共存。
- 本仓库构建的 `agent-webui` 镜像：与 `agent-image-webui` 平级的另一种 WebUI 形态。`docker/Dockerfile` 直接内置 OpenCode CLI 与 agent-webui server，使用 supervisord 双进程编排，不再额外建仓。
- `agent-image`：保持现状，作为无头 API/SDK 形态。
- `agent-plugin`：能力扩展继续走 OpenCode 原生 + MCP，不绑定 WebUI；agent-webui 通过 OpenCode 间接消费。

## 11. 安全边界

- 不保存 Token / Cookie / API Key / `.env` / 证书 / 私钥。
- 不读取用户 NAS 数据除非通过 OpenCode 标准会话/工具通道，或通过 OpenSumi 文件服务在用户工作区内。
- 远程访问必须经 `agent-master` + 上游网关鉴权，不直接暴露 3000/4096 端口。
- 富 UI 嵌入第三方资源时强制 sandbox iframe，禁止与主域共享 Cookie。
- vscode 扩展只允许加载经平台审核或用户主动安装的扩展；不内置在线市场静默安装。

## 12. 设计原则

1. 协议优先：先定 AG-UI 映射，再写 UI；不发明私有协议。
2. 不 fork OpenSumi：所有定制走 Module + Slot + Contribution，不动 core 源码。
3. 插件优先：能用 vscode 扩展就不写 Module；能写 Module 就不动核心服务。
4. 薄网关：服务端只做协议翻译 + 资源托管，不承载业务逻辑。
5. 与 OpenCode 契约：以 OpenCode Web API 为唯一事实源，不旁路。

## 13. 相关链接

- [智能体平台总览](../README.md)
- [agent-master](../agent-master/README.md)
- [agent-image](../agent-image/README.md)
- [agent-image-webui](../agent-image-webui/README.md)
- [agent-plugin](../agent-plugin/README.md)
- [OpenSumi](https://github.com/opensumi/core)
- [OpenSumi 文档](https://opensumi.com)
- [AG-UI Protocol](https://github.com/ag-ui-protocol/ag-ui)
- [OpenCode](https://opencode.ai)
