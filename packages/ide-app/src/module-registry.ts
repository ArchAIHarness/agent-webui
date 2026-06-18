import type { AgentWebUIModule } from './types.js';

/**
 * 极简 Module 注册中心。
 * M1·A 仅维护 in-memory 列表，让 ide-app 启动 contract 可表达；
 * M1·B 接入 OpenSumi 后由其 DI 容器接管真实生命周期。
 */
export class ModuleRegistry {
  private readonly modules = new Map<string, AgentWebUIModule>();

  register(mod: AgentWebUIModule): void {
    if (this.modules.has(mod.name)) {
      throw new Error(`module already registered: ${mod.name}`);
    }
    this.modules.set(mod.name, mod);
  }

  list(): AgentWebUIModule[] {
    return [...this.modules.values()];
  }

  has(name: string): boolean {
    return this.modules.has(name);
  }
}
