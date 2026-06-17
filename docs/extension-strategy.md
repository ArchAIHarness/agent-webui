# extension-strategy.md · 扩展策略（vscode 插件优先）

## 1. 总原则

能用 vscode 扩展就不写 OpenSumi Module；能写 Module 就不动核心服务。

## 2. 三层扩展决策树

```text
需求来了
  |
  +-- 是 IDE 通用能力（语言/lint/调试/主题/编辑器命令）?
  |     -> L1: 用 vscode 官方扩展 / OpenVSX，零代码
  |
  +-- 需要平台自定义命令、菜单、视图，但不深度集成 Agent?
  |     -> L1: 自研 vscode 扩展（独立仓库 extensions/agent-commands）
  |
  +-- 需要 IDE 内嵌一个新区域、或与 Agent 协议联动?
  |     -> L2: 自研 OpenSumi Module
  |
  +-- 需要渲染 MCP 工具返回的富 UI 资源?
        -> L3: 复用自研 MCPUIRendererModule，只编写 MCP-UI 资源
```

## 3. L1：VS Code 扩展

### 3.1 直接复用上游

| 类别 | 来源 | 加载方式 |
|---|---|---|
| 语言（TS/Python/Go/Java/Rust 等） | OpenVSX | 用户主动安装 |
| Linter / Formatter | OpenVSX | 用户主动安装 |
| 调试器 | OpenVSX | 用户主动安装 |
| 主题 / 图标 | OpenVSX | 用户主动安装 |

注意：

- 浏览器形态优先使用支持 `web` 上下文的扩展（vscode 扩展 manifest 中含 `browser` 字段）。
- Node 上下文扩展由 OpenSumi Extension Host 在容器内执行；磁盘访问限制在工作区内。
- 不内置在线市场静默安装；必须用户主动安装或平台审核。

### 3.2 平台自研 vscode 扩展

放在仓库 `extensions/` 子目录，每个扩展独立 `package.json`：

```text
extensions/
  agent-commands/
    package.json          # vscode extension manifest
    src/
      extension.ts        # activate/deactivate
    README.md
```

适合：

- 平台特有命令（"在 Agent 中讨论选中代码"、"用 Agent 重构当前文件"）
- 文件上下文菜单（"询问 Agent"）
- StatusBar 项（Agent 状态、当前模型）
- Webview 不深度交互的页面

不适合：

- 对话面板（深度交互，应走 L2 Module）
- 自定义布局（应走 L2 Module）
- AG-UI 协议适配（应走 L2 Service）

## 4. L2：OpenSumi Module

适用范围：

- AG-UI 协议适配与会话面板
- 自定义 Layout 与 Slot 体系
- 替换默认 Service（如 Notification、QuickPick）
- 与 Agent 深度联动的富 UI（Tiptap / PDF / MCP-UI）

每个 Module 一个目录：

```text
packages/ide-app/src/browser/modules/
  agent-chat/
  agent-interaction/
  agent-form/
  layout-switcher/
  mcp-ui-renderer/
  tiptap-editor/
  pdf-viewer/
  diagram/
```

设计纪律见 `opensumi-integration.md` §5、§6。

## 5. L3：MCP-UI Renderer

MCP 工具返回的 UI 资源由统一的 `MCPUIRendererModule` 渲染，不需要每个新工具单独写前端代码。

工具开发者只需在 MCP Server 返回符合 MCP-UI 规范的 `ui-resource`：

```json
{
  "type": "ui-resource",
  "format": "html" | "remote-dom" | "iframe",
  "content": "...",
  "sandbox": true
}
```

agent-webui 收到后由 `MCPUIRendererModule` 在工具卡片下方渲染。

详细规范留待 M3 阶段在 `mcp-ui-renderer.md` 落地。

## 6. 选择优先级表

| 需求示例 | 推荐层 |
|---|---|
| 加 Python 语法高亮 | L1（OpenVSX 官方） |
| 加 ESLint 自动修复 | L1（OpenVSX 官方） |
| "用 Agent 解释这段代码" 右键菜单 | L1（自研 vscode 扩展） |
| Agent 对话面板 | L2（AgentChatModule） |
| ask/permission 弹窗 | L2（AgentInteractionModule） |
| Tiptap 富文本编辑 | L2（TiptapEditorModule） |
| PDF 预览 | L2（PDFViewerModule） |
| MCP 工具返回的图表卡片 | L3（MCPUIRendererModule） |
| 自定义 IDE / Chat / Hybrid 三模式切换 | L2（LayoutSwitcherModule） |
| 平台主题色（深色版 ArchAI） | L1（自研 vscode 主题扩展） |

## 7. 反模式

- 在 vscode 扩展里塞一整个 Agent 对话 SPA：违反扩展生命周期，性能差，Slot 控制弱。改 L2。
- 在 OpenSumi Module 里写语言服务：重复造轮子。改 L1 用 LSP 扩展。
- 直接改 `@opensumi/ide-extension` 源码以支持新扩展点：禁止。需要扩展点先开 issue 推动上游。

## 8. 上线门禁

- 任何 vscode 扩展上架前需平台审核（清单、权限、网络访问、依赖来源）。
- 自研 vscode 扩展跟随 agent-webui 镜像发版；不走在线市场动态拉取。
- L2 Module 必须有自动化冒烟测试（M2 起补齐）。
