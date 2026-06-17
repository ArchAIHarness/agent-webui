# layout-design.md · 自由布局设计

## 1. 设计目标

- 支持完全自定义布局：用户可拖拽、隐藏、调整每个面板。
- 内置三种预设模式：IDE、Chat、Hybrid。
- 模式之间无缝切换，状态可记忆。
- 所有 Slot 都允许换内容；不绑死"左侧只能放文件树"。

## 2. OpenSumi 的 Slot 体系

OpenSumi 用 `LayoutConfig` 描述布局。Slot 是命名区域，模块通过 `registerComponent` 注册组件，再通过 `LayoutConfig` 把组件挂到 Slot。

常见 Slot：

| SlotLocation | 默认含义 |
|---|---|
| `top` | 标题栏 / 全局菜单 |
| `left` | 左侧栏（文件树、搜索、Git） |
| `right` | 右侧栏 |
| `main` | 编辑器主区 |
| `bottom` | 底部栏（终端、问题、输出） |
| `statusBar` | 状态栏 |
| `extra` | 额外悬浮区 |

LayoutConfig 例：

```ts
export const layoutConfig = {
  top: { modules: ['@opensumi/menu-bar'] },
  left: { modules: ['@opensumi/explorer', '@opensumi/search', '@opensumi/scm'] },
  right: { modules: ['@archai/agent-chat'] },
  main: { modules: ['@opensumi/editor'] },
  bottom: { modules: ['@opensumi/terminal-next', '@opensumi/output'] },
  statusBar: { modules: ['@opensumi/status-bar'] },
};
```

## 3. 预设模式

### 3.1 IDE 模式（默认）

```text
+----------------------------------------------------------+
| MenuBar                                                  |
+--------+-------------------------------------+-----------+
| Left   | Editor                              | Agent     |
|        |                                     | Chat      |
|        |                                     |           |
+--------+-------------------------------------+-----------+
| Bottom (Terminal / Problems / Output)                    |
+----------------------------------------------------------+
| StatusBar                                                |
+----------------------------------------------------------+
```

适合：写代码为主，Agent 辅助。

### 3.2 Chat 模式

```text
+----------------------------------------------------------+
| MenuBar                                                  |
+----------------+-----------------------------------------+
|                |                                         |
| Agent Chat     |   Preview / File Viewer                 |
| (大区域)       |                                         |
|                |                                         |
+----------------+-----------------------------------------+
| StatusBar                                                |
+----------------------------------------------------------+
```

隐藏 Editor / Terminal / 文件树，主区让给对话。适合：纯对话、问答、文档浏览。

### 3.3 Hybrid 模式

```text
+----------------------------------------------------------+
| MenuBar                                                  |
+--------+-------------------------+----------------------+
| Left   | Editor                  | Agent Chat           |
|        |                         |                      |
+--------+-------------------------+                      |
| Bottom (Terminal)                |                      |
+----------------------------------+----------------------+
| StatusBar                                               |
+----------------------------------------------------------+
```

对话区与编辑区平分主区。适合：边写代码边讨论。

## 4. LayoutSwitcherModule

负责：

- 注册三套 LayoutConfig
- 提供命令 `layout.switch.ide` / `layout.switch.chat` / `layout.switch.hybrid`
- 在 StatusBar 提供模式切换按钮
- 持久化用户最后选择（`/data/preferences/layout.json`）
- 监听窗口尺寸，自动建议（小屏强制 Chat 模式可选）

实现要点：

- 切换布局通过 `LayoutService.setLayoutConfig`，不重建整个 SPA。
- Slot 内的组件状态尽量保留（编辑器 buffer、对话上下文）。
- 切换时显示过渡动画，避免闪烁。

## 5. 用户级自定义

允许用户在 IDE 内：

- 拖拽 Slot 大小（OpenSumi 原生支持）
- 隐藏 / 显示某个 Slot（命令面板）
- 把 Agent Chat 从右侧拖到底部 / 浮动（M3 增强）
- 保存自定义布局为命名预设（M4）

不允许：

- 删除 Editor / StatusBar 这类核心 Slot（防止误操作锁死）

## 6. 多 Tab 与多 Session

- Editor 区原生支持多 Tab。
- Agent Chat 区支持多 Session Tab（`AgentChatModule` 自管，不依赖 Editor 的 Tab 系统）。
- IDE 模式与 Chat 模式之间切换时保留 Session Tab 状态。

## 7. 移动端 / 小屏

- agent-webui 主要面向桌面浏览器；移动端不是 P0。
- 屏幕宽度小于 1024px 时默认进入 Chat 模式，且禁用 Editor 区。
- 真正适配移动端见未来路线图。

## 8. 主题与品牌

- 走 OpenSumi 主题机制（vscode 主题兼容）。
- 平台默认主题作为独立 vscode 主题扩展提供。
- LogoModule（M1）替换启动 Logo 与 IDE 标题，不动 OpenSumi 品牌资源源码。

## 9. 与 vscode 扩展的协作

- vscode 扩展可以贡献 Webview Panel；agent-webui 把它们挂在标准 Slot。
- vscode 扩展的 Activity Bar 项目通过 OpenSumi 兼容层呈现在 IDE 模式的左侧栏。
- 自定义 LayoutConfig 时不能让 vscode 扩展的视图无处安放；必须为它们保留兜底 Slot。

## 10. 待定项

- 浮动窗口（detached panel）支持时机：M3 或更后。
- 多窗口（multi-window）支持：暂不在路线图。
- 全屏沉浸模式（隐藏所有 chrome）：M2 末期或 M3。
