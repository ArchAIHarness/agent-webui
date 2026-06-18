/**
 * @archai/agent-webui-ide-app
 *
 * OpenSumi 启动入口 + 自研 Module 注册中心。
 *
 * 当前为 M1·A 占位：
 *  - 真正的 OpenSumi BrowserModule / NodeModule 注册在 M1·B 接入
 *  - 此文件先暴露 ModuleRegistry 类型与启动 contract，让构建链路可走通
 */

export { ModuleRegistry } from './module-registry.js';
export type { AgentWebUIModule, IDEBootstrapOptions } from './types.js';
