# opensumi-integration.md · OpenSumi 集成方案

## 1. 总原则

- **不 fork、不改 core 源码**。所有定制走插件机制。
- 以 `@opensumi/ide-*` 系列包形式锁版本依赖。
- 升级跟随官方节奏；遇阻在 issue 反馈或 patch-package 临时绕，不改源码长期分叉。
- 学习路径：先吃透 `@opensumi/ide-startup` 启动模板和 `tools/dev-tool`，再看具体模块源码。

## 2. 关键概念

| 概念 | 作用 |
|---|---|
| BrowserModule | 前端模块，注册视图、命令、Slot 内容、Service |
| NodeModule | 后端模块，注册 Service、提供 RPC |
| DI 容器 | 基于 `@opensumi/di`，所有 Service 通过 Token 注入 |
| Contribution Point | 命令、菜单、视图、布局、快捷键的注册入口 |
| Slot / SlotLocation | 决定一个组件挂在 IDE 的哪个区域（左/右/底部/活动栏/编辑器旁等） |
| LayoutConfig | 整个 IDE 的布局描述，自由组合 Slot |
| Connection | OpenSumi 自带的 Browser ↔ Node RPC，类似 vscode 的 IPC |

## 3. 启动模板派生

M1 阶段从 `@opensumi/ide-startup` 派生：

```text
packages/ide-app/
  src/
    browser/
      app.tsx              # renderApp 入口
      modules.ts           # BrowserModule 集合
      layout.ts            # 自定义 LayoutConfig
    node/
      server.ts            # 启动 Node 服务
      modules.ts           # NodeModule 集合
    common/
      tokens.ts            # DI Token 定义
```

入口示例：

```ts
// browser/app.tsx
import { renderApp } from '@opensumi/ide-startup/lib/web';
import { CommonBrowserModules } from './modules';
import { layoutConfig } from './layout';

renderApp({
  modules: CommonBrowserModules,
  layoutConfig,
  layoutComponent: undefined, // 用 OpenSumi 默认 Layout 渲染器，仅替换 LayoutConfig
});
```

## 4. 直接复用的 OpenSumi 模块

仅列 P0 必备：

```ts
import { CommonBrowserModules as Builtin } from '@opensumi/ide-startup/lib/web/common-modules';
// 等价于以下 + 一些工具模块
//   @opensumi/ide-editor/lib/browser
//   @opensumi/ide-terminal-next/lib/browser
//   @opensumi/ide-explorer/lib/browser
//   @opensumi/ide-workspace/lib/browser
//   @opensumi/ide-search/lib/browser
//   @opensumi/ide-scm/lib/browser
//   @opensumi/ide-debug/lib/browser
//   @opensumi/ide-quick-open/lib/browser
//   @opensumi/ide-keymaps/lib/browser
//   @opensumi/ide-theme/lib/browser
//   @opensumi/ide-extension/lib/browser
```

具体清单按 OpenSumi 当前发布版为准，M1 锁定后写入 `packages/ide-app/package.json`。

## 5. 自研 Module 标准结构

```ts
// packages/ide-app/src/browser/modules/agent-chat/index.ts
import { Injectable } from '@opensumi/di';
import { BrowserModule } from '@opensumi/ide-core-browser';
import { AgentChatContribution } from './chat.contribution';

@Injectable()
export class AgentChatModule extends BrowserModule {
  providers = [AgentChatContribution];
}
```

```ts
// chat.contribution.ts
import { Domain } from '@opensumi/ide-core-common';
import { ComponentContribution, ComponentRegistry } from '@opensumi/ide-core-browser';

@Domain(ComponentContribution)
export class AgentChatContribution implements ComponentContribution {
  registerComponent(registry: ComponentRegistry) {
    registry.register('@archai/agent-chat', {
      id: 'agent-chat',
      component: AgentChatPanel,
      name: 'Agent',
    });
  }
}
```

挂载到 LayoutConfig：

```ts
// layout.ts
export const layoutConfig = {
  'right': { modules: ['@archai/agent-chat'] },
  // ... 其它 Slot
};
```

## 6. DI 与 Service

跨模块共享逻辑通过 Service + Token：

```ts
// shared/tokens.ts
export const AGUIClientServiceToken = Symbol('AGUIClientService');

// services/ag-ui-client.service.ts
@Injectable()
export class AGUIClientService implements IAGUIClientService { ... }

// 在 Module 中注册：
providers = [
  { token: AGUIClientServiceToken, useClass: AGUIClientService },
];

// 在组件中获取：
const client = useInjectable<IAGUIClientService>(AGUIClientServiceToken);
```

## 7. 后端 Connection

需要 Browser ↔ Node 通信时（如 AG-UI 流、文件大对象）：

- 优先复用 OpenSumi 自带 RPC（`createServerProxy`）
- 流式数据（如 AG-UI SSE）单独走 `/webui/ag-ui`，不挤进 OpenSumi RPC

## 8. 不改源码的边界

可以做（不动 core）：

- 注册新 Module / Service / 命令 / 视图 / Slot 组件
- 替换 LayoutConfig
- 替换默认主题
- 通过 Contribution 覆盖现有命令实现
- 通过 DI 注入替换某些 Service（比如把默认的 Notification 实现换掉）
- patch-package 临时打补丁等待上游修复

不能做（必须改源码或 fork）：

- 改 `@opensumi/ide-*` 包内部硬编码 UI
- 替换 OpenSumi 依赖的 monaco-editor 到不兼容大版本
- 修改 core 模块的内部 API 形态

如果遇到必须改的场景，先评估是否能通过自研 Module 旁路；不行就走 patch-package + 上游 issue，不长期 fork。

## 9. 升级策略

- 锁定 minor 版本，定期跟进 patch
- 升级前在临时分支跑全量 typecheck + 启动冒烟
- 关注 OpenSumi 的 changelog 中 breaking changes
- 自研 Module 不依赖未公开 API；只用 `@opensumi/ide-core-*` 导出的稳定接口

## 10. 学习参考

- 启动模板：`@opensumi/ide-startup`
- Slot 体系：OpenSumi 文档 "Layout & Slot"
- Contribution：OpenSumi 文档 "Contribution Point"
- DI：`@opensumi/di` 仓库
- vscode 扩展兼容：`@opensumi/ide-extension` 包的 README
