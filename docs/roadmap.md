# roadmap.md · agent-webui 路线图

## 总体节奏

- M0：仓库与设计文档落地（当前阶段）
- M1：可运行的最小 IDE + AG-UI 单向流 + 内置镜像构建
- M2：vscode 扩展生态接入 + AG-UI 双向交互
- M3：富 UI Module（AgentChat / Form / Mermaid / Tiptap / PDF / MCP-UI）
- M4：完整布局切换 + 富 UI 全套就绪
- M5：替换 AionUi 默认形态

每个里程碑以"可运行 + 可在 agent-master 后通过浏览器访问"为完成口径。

## M0：仓库与设计（已完成）

- 仓库初始化、LICENSE / NOTICE / .gitignore / AGENTS.md / README.md
- 设计文档全套：architecture / opensumi-integration / extension-strategy / layout-design / ag-ui-mapping / rich-ui / integration-with-agent-master / roadmap
- 形态确认：每用户独立 IDE Pod，OpenCode + agent-webui 双进程同容器，supervisord 编排
- 协议确认：AG-UI 主、MCP-UI 辅，不引入私有协议
- 图表方案：Mermaid 单一方案

完成口径：本仓库当前 markdown 状态。

## M1：最小 IDE + 单向 AG-UI + 镜像

目标：用户从 `agent-master` 反代访问到本仓库镜像，能看到一个 OpenSumi IDE，能向 OpenCode 发消息并以 AG-UI 形式接收回包。

任务：

- workspace：bun 或 pnpm workspace 锁定
- packages/ide-app：OpenSumi BrowserModule + NodeModule 启动壳
- packages/ag-ui-adapter：OpenCode SSE -> AG-UI Event Stream 转换
- packages/shared：AG-UI / OpenCode / MCP-UI 共享类型
- 自研 Module 最小集：AGUIClientModule、AgentChatModule（只读视图）
- 子路径挂载：根路径 `/webui/`
- docker/Dockerfile：基于 node alpine，`npm install -g opencode-ai` 内置 OpenCode CLI，COPY agent-webui 构建产物
- docker/supervisord.conf：opencode + agent-webui 双进程
- docker/entrypoint.sh：dumb-init -> supervisord
- docker/healthcheck.sh：双端口探活
- 与 `agent-master` 联调：经 `/agent/*` 与 `/webui/*` 双反代访问

完成口径：本地 docker run + curl 双端口通；接入测试 master 能在浏览器看到 IDE 并完成单轮 chat。

## M2：vscode 扩展生态 + 双向 AG-UI

目标：vscode 扩展可加载，AG-UI 支持工具调用 / 中断 / 输入回填的双向闭环。

任务：

- vscode 扩展加载链路：`vscode/contributes` + 容器内扩展安装目录持久化
- 自研扩展 `extensions/agent-commands`：注册 `agent.*` 命令族
- AG-UI 双向：`/webui/ag-ui/sessions/:sid/input`、`/interrupt-response`、`/state` 全部打通
- vscode Webview API 与 AG-UI 互通：扩展可订阅 / 派发 AG-UI 事件
- 主题、快捷键、Settings UI 走 vscode 原生

完成口径：装一个第三方 vscode 扩展（如 vscode-icons）能正常加载；agent-commands 能从 IDE 内触发 AG-UI 输入并被 OpenCode 接收。

## M3：富 UI Module 第一批

目标：`docs/rich-ui.md` 中的核心 Module 落地为可用组件。

任务：

- AgentChatModule：会话视图、消息流式渲染、错误重试
- InteractionModule：确认、选择、表单（基础控件）
- MCPUIRendererModule：MCP-UI 工具结果渲染（HTML iframe / 受控组件）
- DiagramModule：Mermaid 渲染（按需加载，禁止 ECharts）

完成口径：四个 Module 能在 IDE 内由 AG-UI 事件触发并展示。

## M4：完整布局切换 + 富 UI 第二批

目标：IDE / Chat / Hybrid 三模式可切换；富 UI 全套就绪。

任务：

- LayoutSwitcherModule：三模式切换 + 持久化
- TiptapDocModule：富文本编辑（用于 Agent 产出文档）
- PdfPreviewModule：PDF 内嵌预览
- FormModule：复杂表单（Schema 驱动）
- 性能基线：首屏、SSE 吞吐、富 UI 大数据量场景

完成口径：用户可一键在三模式间切换；五个 Module 全部走通真实 AG-UI / MCP-UI 流。

## M5：替换 AionUi 默认形态

目标：本仓库镜像成为平台默认 WebUI 镜像。

任务：

- `agent-master` 镜像选择策略默认指向本仓库镜像
- `agent-image-webui`（AionUi）保留为兼容/经济版
- 文档迁移：用户文档、运维文档、品牌叙事更新
- 监控与可观测：双进程健康、AG-UI QPS、富 UI 错误率
- 回滚预案：master 一键切回 AionUi 镜像

完成口径：默认场景下用户拿到的就是 OpenSumi + OpenCode，AionUi 镜像仍可按需选择。

## 已废弃的方向（不再追求）

- 共享 WebUI / 多用户单后端：明确否决，原因见 `docs/architecture.md` 与历史决策
- 远程文件系统、远程终端、远程 Extension Host Bridge：不做
- 私有 A2UI 协议：不引入，统一走 AG-UI + MCP-UI
- ECharts 图表：统一走 Mermaid

## 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| OpenSumi 升级破坏 API | 中 | 锁版本，仅在 M2/M4 评估升级 |
| OpenCode 事件字段变更 | 高 | ag-ui-adapter 单点适配，加版本检测 |
| vscode 扩展兼容性 | 中 | 平台审核 + Allowlist，不做静默安装 |
| 双进程资源占用偏高 | 中 | M4 做 Pod 资源基线 + 限额 |
| Mermaid 图表性能 | 低 | 大图懒渲染 + 错误降级到代码块 |

## 状态记录原则

- 路线图状态以仓库实际产物为准。
- 设计文档完成不等于 Module 完成。
- M1 起，每个里程碑结束必须更新本文件状态。
