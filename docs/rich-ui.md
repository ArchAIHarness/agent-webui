# rich-ui.md · 富 UI 组件设计

## 1. 总原则

- 所有富 UI 组件以 OpenSumi Module 形式存在，不写到 vscode 扩展里。
- 组件应可独立启停、独立测试。
- 第三方库（Tiptap / pdf.js / Mermaid / mcp-ui）在 packages/ide-app 内统一锁版本。
- 安全：嵌入 HTML / iframe 一律 sandbox，不共享 Cookie，不允许 top.location 操作。

## 2. AgentChatModule

- 位置：默认右侧 Slot（IDE 模式）/ 主区（Chat 模式）
- 职责：消息流渲染、工具卡片、输入框、Session Tab
- 关键依赖：`@ag-ui/client`
- 内部组件：
  - `MessageList`（virtualized）
  - `MessageItem`（assistant/user/system）
  - `ToolCallCard`（折叠/展开、复制参数、查看结果）
  - `Composer`（输入框，支持 @文件、@命令）
  - `SessionTabs`

## 3. AgentInteractionModule

- 职责：处理 AG-UI INTERRUPT 事件，渲染 ask/permission 弹窗
- 三类形态：
  - `approval`：是/否/总是允许
  - `form`：JSON Schema 表单（委托 AgentFormModule）
  - `select`：单选/多选
- 用户响应通过 `POST /interrupt-response` 回流

## 4. AgentFormModule

- 职责：JSON Schema 表单引擎
- 候选库：`@rjsf/core` + 自定义主题适配 OpenSumi 样式
- 支持：文本、数字、布尔、枚举、文件上传、嵌套对象、数组
- 与 AgentInteractionModule 解耦：可被任何 Module 调用渲染表单

## 5. MCPUIRendererModule

- 职责：渲染工具结果中的 MCP-UI 资源
- 三种 format：
  - `html`：sandbox iframe 渲染
  - `remote-dom`：复用 mcp-ui 的 Remote DOM 客户端 SDK
  - `iframe`：直接嵌入指定 URL（需在白名单内）
- 安全：所有 iframe 强制 `sandbox="allow-scripts allow-same-origin"`（视场景调整），禁止 `allow-top-navigation`

## 6. TiptapEditorModule

- 职责：富文本编辑器，针对 `.md` `.tiptap` 文件或 Agent 直接生成的富文本
- 关键依赖：`@tiptap/react` + `@tiptap/starter-kit` + 自研扩展（Mermaid 块、文件块、AG-UI 引用块）
- 与 OpenSumi Editor 共存：
  - 默认 Editor 仍是 Monaco
  - 用户可在编辑器右上角切换 "Source" / "Tiptap"
  - 双向同步：Tiptap 编辑结果 -> Markdown 字符串 -> 写回文件

## 7. PDFViewerModule

- 职责：PDF 预览与基础批注
- 关键依赖：`pdf.js`（直接引入，不用 react-pdf 包装层避免 peer 依赖问题）
- M1：仅预览
- M2：高亮、批注（批注存为 sidecar `.annotations.json`，不修改 PDF 本体）
- M3：与 Agent 联动（"询问 Agent 这一页内容"）

## 8. DiagramModule

- 职责：Mermaid 图表渲染（图表方案统一 Mermaid，不引 ECharts）
- 渲染来源：
  - Markdown / 富文本中的 ` ```mermaid ... ``` ` 代码块
  - Agent 输出的 mermaid 字符串（消息流 / 工具结果）
  - `.mmd` 文件预览
- 关键依赖：`mermaid`（按需懒加载，首次使用前不进入主 bundle）
- 安全：渲染时禁用 mermaid 的 `securityLevel: 'loose'`，统一使用 `'strict'`，禁止内联事件 / 外链跳转
- 性能：超大图（节点数超阈值）自动降级为静态 SVG + 折叠预览
- 错误：mermaid 解析失败时回退展示原始文本块，并在工具栏给出"复制源码"
- 与 Agent 联动：图表卡片支持"让 Agent 解释 / 修改这张图"快捷入口（M3）

## 9. 共用规范

### 9.1 Slot 注册

每个富 UI Module 通过 ComponentContribution 注册组件 ID（命名空间 `@archai/`），LayoutConfig 决定挂载位置。

### 9.2 主题

所有组件颜色使用 OpenSumi 主题变量，不硬编码；保证主题切换无白屏。

### 9.3 i18n

文本通过 OpenSumi i18n 机制注册；中文为默认，英文兜底。

### 9.4 测试

每个 Module 在 M2/M3 起补齐：

- 单元测试（vitest）覆盖核心逻辑
- 集成冒烟（Playwright）覆盖关键交互

## 10. 优先级与里程碑

| Module | 优先级 | 里程碑 |
|---|---|---|
| AgentChatModule | P0 | M2 |
| AgentInteractionModule | P0 | M2 |
| AgentFormModule | P0 | M2 |
| LayoutSwitcherModule | P0 | M2 |
| MCPUIRendererModule | P1 | M3 |
| TiptapEditorModule | P1 | M3 |
| PDFViewerModule | P1 | M3 |
| DiagramModule | P2 | M3-M4 |

## 11. 风险

- Tiptap 与 Monaco 的 Markdown 行为差异需要明确对齐；可能需要自研 Markdown <-> Tiptap 转换器
- pdf.js 在浏览器内渲染大 PDF 性能压力大；超过阈值降级为分页加载
- MCP-UI 协议本身仍在演进，agent-webui 锁定一个发布版后跟进升级
- Mermaid 表达力有限，Agent 生成复杂图表（甘特、时序大图、状态机大图）时易超出节点阈值；需要在 Agent 端引导拆图，不在前端硬撑
