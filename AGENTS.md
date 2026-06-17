# AGENTS.md · agent-webui

本文件约束 `agent-webui` 仓库内 AI 助手的开发协作行为。仓库子目录可有自己的 `AGENTS.md`，子目录规则优先。

## 1. 仓库定位回顾

- 基于 OpenSumi core 的 Agent IDE 自研项目，不 fork、不改 OpenSumi 源码。
- 通过 AG-UI 协议与 OpenCode 双向交互。
- VS Code 插件生态优先，OpenSumi Module 只承担深度集成能力。
- 浏览器访问：经 `agent-master` 反代到用户 Pod；每用户一个 Pod，Pod 内 OpenCode + agent-webui 双进程同容器，不依赖桌面运行时。

## 2. 协作总原则

- 先理解任务，再修改文件。
- 修改前先查看相关文件；不凭记忆泛化。
- 事实、判断、建议分离；不确定内容标记"待确认"或"待补齐"。
- 默认中文回复，先结论后理由。
- 引用代码使用 `路径:行号` 格式。
- 修改 OpenCode 配置、agent、skill 后，提醒用户重启 OpenCode。

## 3. 设计纪律

1. 不 fork OpenSumi：所有定制必须走 Module + Slot + Contribution + DI，不动 `@opensumi/ide-*` 源码。
2. 不发明私有协议：Agent 与 IDE 通信走 AG-UI，工具结果富 UI 走 MCP-UI；不引入 A2UI 私有方案。
3. 插件优先：能用 vscode 扩展实现的，不写 Module；能写 Module 的，不动核心服务。
4. 薄网关：服务端只做协议翻译 + 资源托管，不承载业务逻辑。
5. 与 OpenCode 契约：OpenCode Web API 是唯一事实源；agent-webui 不直接管理 Agent 会话状态，只镜像和翻译。
6. 浏览器访问优先：所有功能必须能在容器内通过 `agent-master` 反代到浏览器正常工作；不依赖桌面运行时。
7. 不在仓库提交真实凭证、`.env`、kubeconfig、证书、私钥。

## 4. 文档纪律

- README 是仓库定位与长期规划入口；变更目标形态、协议选型、技术栈时必须同步更新。
- `docs/` 下按主题拆文件，单文件控制在 300 行以内；超过则继续拆分。
- 路线图的勾选状态以仓库实际产物为准；未实现的不勾。
- 设计文档使用纯 Markdown + 必要的代码块；不使用平台专属标记。

## 5. 编码纪律（M1 起生效）

- 包管理：bun 或 pnpm workspace（在 M1 锁定，不混用）。
- 语言：TypeScript strict 模式，禁止 `any`。
- 模块组织：
  - `packages/ide-app`：OpenSumi 启动入口 + 自研 Module 集合
  - `packages/ag-ui-adapter`：OpenCode -> AG-UI Node 适配
  - `packages/shared`：协议类型 / 工具，无副作用
  - `extensions/*`：平台自研 vscode 扩展
- 命名：`*Module` 后缀必须实现 OpenSumi BrowserModule/NodeModule 接口；`*Service` 后缀走 DI 注入。
- 不在 OpenSumi Module 内直接 fetch 业务接口；统一经 `AGUIClientService` 或 vscode 扩展。

## 6. 安全边界

- 不读取、不输出、不保存真实 Token / Cookie / API Key / 账号密码。
- 不提交 `.env`、kubeconfig、证书、私钥。
- 不暴露内部地址、客户材料、真实用户数据或私有业务配置。
- 富 UI 嵌入第三方资源（HTML / iframe）必须使用 sandbox，禁止共享 Cookie。
- vscode 扩展不内置在线市场静默安装；用户主动安装或平台审核后才能加载。

## 7. 与上游的协同边界

| 仓库 | 由谁主导 | 本仓库的关系 |
|---|---|---|
| OpenSumi core | 上游（蚂蚁/阿里云） | 锁版本依赖，不 fork |
| OpenCode | 上游 | API 契约消费方，不旁路 |
| AG-UI Protocol | 上游 | 协议消费方 |
| `agent-master` | 平台内 | 反代上游，不直连用户浏览器 |
| 本仓库 `docker/` 镜像产物 | 同仓库内置 | 与 `agent-image-webui` 平级的运行镜像，supervisord 双进程 |
| `agent-plugin` | 同平台仓库 | OpenCode 侧能力扩展，不绑定 WebUI |

## 8. PR / 提交纪律

- 提交前必须本地通过 typecheck + lint + 关键路径冒烟。
- 提交信息中文优先，格式：`<scope>: <change>`。
- 不 amend 已推送 commit；修复另起 commit。
- 高风险变更（删除文件、批量重命名、改 origin、改可见性）必须用户明确确认。
