# opensumi-integration.md · OpenSumi 集成方案

## 1. 总原则

- **不 fork、不改 core 源码**。所有定制走插件机制。
- 以 `@opensumi/ide-*` 系列包形式锁版本依赖。
- 升级跟随官方节奏；遇阻在 issue 反馈或 patch-package 临时绕，不改源码长期分叉。
- 学习路径：先吃透 OpenSumi `@opensumi/ide-*` 模块、BrowserModule/NodeModule 与 `tools/dev-tool`，再看具体模块源码。

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

## 3. 启动入口与模块白名单

M1 阶段不直接使用 `@opensumi/ide-startup` 的 `CommonBrowserModules` / `CommonNodeModules`，而是显式维护基础 IDE 所需的 Browser/Node 模块白名单，避免提前启用 Terminal、Search、Extension、Debug 等深功能。

```text
packages/ide-app/
  src/
    browser/
      main.tsx             # ClientApp 入口、BrowserModule 白名单、LayoutConfig
    node/
      server.ts            # ServerApp 入口、NodeModule 白名单、静态资源与 WebSocket 兼容
      runtime-directories.ts
    common/
      tokens.ts            # DI Token 定义（后续自研 Module 使用）
```

入口示例：

```ts
// browser/main.tsx
const browserModules = [
  MainLayoutModule,
  ClientCommonModule,
  MonacoModule,
  EditorModule,
  ExplorerModule,
  FileServiceClientModule,
  OutputModule,
  WorkspaceModule,
];

await app.start(rootEl, ESupportRuntime.Web);
```

```ts
// node/server.ts
const nodeModules = [ServerCommonModule, LogServiceModule, FileServiceModule, FileSchemeNodeModule];
await serverApp.start(server);
```

## 4. 直接复用的 OpenSumi 模块

M1 仅启用基础 IDE 必需模块：

- Browser：布局、菜单、Monaco/Editor、Explorer/FileTree、FileService、Output、QuickOpen、Theme、Workspace、Storage、Preferences、Decoration。
- Node：ServerCommon、LogService、FileService、FileScheme。

M1 暂不启用：TerminalNext、Extension、OpenVSX Extension Manager、Search、Debug、Monaco Enhance。后续 M2/M3 打开对应能力时，必须同步补齐 Browser 模块、Node 模块、直接依赖、测试和验收用例。

具体清单按 `packages/ide-app/src/browser/main.tsx`、`packages/ide-app/src/node/server.ts` 和 `packages/ide-app/package.json` 为准。

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

- 启动参考：OpenSumi `ClientApp` / `ServerApp` 与各 `@opensumi/ide-*` 模块源码
- Slot 体系：OpenSumi 文档 "Layout & Slot"
- Contribution：OpenSumi 文档 "Contribution Point"
- DI：`@opensumi/di` 仓库
- vscode 扩展兼容：`@opensumi/ide-extension` 包的 README
