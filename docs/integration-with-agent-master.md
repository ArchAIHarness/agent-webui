# integration-with-agent-master.md · 与 agent-master 的集成契约

本文件约束 `agent-webui` 与 `agent-master` 之间的接口与运行契约。`agent-webui` 不直接面向用户浏览器，所有访问经 `agent-master` 反代。

## 1. 前提

- 一用户一 Pod。
- Pod 由 `agent-master` 在 K8s 集群中调度创建。
- 镜像由本仓库 `docker/Dockerfile` 直接构建：内置 OpenCode CLI + agent-webui server，supervisord 双进程。
- 形态与 `agent-image-webui` 平级；`agent-master` 选镜像逻辑相同。

## 2. 容器内进程与端口

```text
[ Pod (本仓库 agent-webui 镜像) ]
  - PID 1: dumb-init -> supervisord
      - opencode web    listen 0.0.0.0:4096
      - agent-webui     listen 0.0.0.0:3000
```

| 端口 | 监听 | 由谁代理 |
|---|---|---|
| 4096 | OpenCode Web | `agent-master` `/agent/*` |
| 3000 | agent-webui server（OpenSumi Node + AG-UI 适配 + 静态资源） | `agent-master` `/webui/*` |

## 3. 反代路径

`agent-master` 维护两条反代，**与 `agent-image-webui` 完全一致**：

| Master 路径 | 转发目标 | 协议 | 备注 |
|---|---|---|---|
| `/agent/*` | `<runtime-svc>:4096/*` | HTTP / SSE / WebSocket | OpenCode 既有路径，沿用 |
| `/webui/*` | `<runtime-svc>:3000/*` | HTTP / SSE / WebSocket | agent-webui 资产 + AG-UI 流 |

要求：

- `/webui/*` 必须支持 WebSocket Upgrade 与 SSE。
- 反代必须剥离 master 内部 Header（`Authorization`、`x-user-id`），不能透传给容器内进程。
- agent-webui 在子路径 `/webui/` 下运行；如挂在根路径 `/`，需要 master 配合做路径前缀剥离与 Cookie 路径改写。

## 4. 鉴权与隔离

- 鉴权由上游网关 + `agent-master` 完成；agent-webui 不自验签。
- 隔离由 K8s Pod 边界保证；NetworkPolicy 限定 3000/4096 仅允许 `agent-master` 入站。
- 不通过 Ingress 直接对公网暴露 3000/4096。

## 5. 数据卷与挂载

| 源路径（NAS） | 容器路径 | 挂载 | 用途 |
|---|---|---|---|
| `{runtime.workdir}/{userId}/runtime` | `/app` | subPath | 用户项目工作目录；OpenCode 与 OpenSumi 共用 |
| `{runtime.workdir}/{userId}/global` | `~` | subPath | OpenCode 全局配置 / 数据 / 缓存 |
| `{runtime.workdir}/{userId}/global/.agent-webui` | `/data` | subPath | agent-webui 自身的 SQLite 与会话索引 |
| `{runtime.workdir}/{userId}/global/.vscode-extensions` | 容器内 vscode 扩展安装目录 | subPath | vscode 扩展持久化（M2 之后启用） |

`agent-webui` 镜像不创建 NAS 目录；`agent-master` 在创建 Pod 前完成路径准备。

## 6. 健康检查

`docker/healthcheck.sh` 同时校验两个端口：

```bash
curl -fsS http://127.0.0.1:4096/   # OpenCode Web
curl -fsS http://127.0.0.1:3000/   # agent-webui SPA
```

任一失败视为 unhealthy；K8s 重启 Pod。

## 7. 启停信号

- `SIGTERM` -> supervisord 转发给两个子进程，`stopwaitsecs=10` 后强杀。
- 用户 Pod 由 `agent-master` 按 TTL / 空闲策略回收；agent-webui 不参与回收决策。

## 8. 重启与配置变更

修改 OpenCode 配置（`.opencode/opencode.json`、agents、skills、plugins）后，需要通过 `agent-master` 的 `POST /api/v1/runtime/restart` 重启用户 Pod。容器内不暴露自重启控制接口。

## 9. 镜像选择策略（master 侧）

`agent-master` 根据用户/产品形态选择镜像：

| 镜像 | 适用场景 |
|---|---|
| `agent-image` | 仅 API/SDK 调用，不需要浏览器 |
| `agent-image-webui` | 即开即用、轻量浏览器 WebUI（AionUi） |
| 本仓库 `agent-webui` 镜像 | 重度沉浸 IDE，OpenSumi + 完整 vscode 扩展生态 |

`agent-master` 镜像选择逻辑由 master 仓库自行维护，agent-webui 不参与决策。

## 10. 静态资源（可选优化）

agent-webui 的 SPA 是浏览器加载的纯静态资源，可走 CDN / 共享 Nginx 加速：

- 默认：SPA 由容器内 3000 端口直接托管，简单可靠。
- 优化：构建产物发到对象存储 / CDN，HTML 模板留容器内，JS/CSS/WASM 走 CDN。

是否启用 CDN 由部署侧决定，不影响仓库代码。

## 11. 兼容承诺

- 不破坏 `agent-image-webui` 已有的反代路径与挂载约定。
- `agent-master` 接入本仓库镜像时，不需要新增反代路径，不需要新增 NetworkPolicy 规则；只是镜像选择策略多一个候选。
- 协议层（OpenCode Web API、AG-UI、vscode Extension API、MCP）由各自上游主导，本仓库只作消费方。

## 12. 不在本仓库范畴

- Runtime 创建、查询、关闭、重启
- 用户鉴权或 `x-user-id` 注入
- Redis 状态、租约、TTL
- K8s 多集群调度
- Deployment / Service / NetworkPolicy 创建
- 反向代理本身的实现
- NAS 用户目录初始化
- 镜像选择策略

以上能力由 `agent-master` 承接。
