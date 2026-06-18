import { Injector } from '@opensumi/di';
import { SlotLocation } from '@opensumi/ide-core-browser';
import { ClientApp } from '@opensumi/ide-core-browser/lib/bootstrap/app';
import { ESupportRuntime } from '@opensumi/ide-core-browser/lib/application/runtime/constants';
import type { IClientAppOpts } from '@opensumi/ide-core-browser';
import '@opensumi/ide-core-browser/lib/style/index.less';
import '@opensumi/ide-i18n';
import { ClientCommonModule } from '@opensumi/ide-core-browser';
import { DecorationModule } from '@opensumi/ide-decoration/lib/browser';
import { EditorModule } from '@opensumi/ide-editor/lib/browser';
import { ExplorerModule } from '@opensumi/ide-explorer/lib/browser';
import { FileSchemeModule } from '@opensumi/ide-file-scheme/lib/browser';
import { FileServiceClientModule } from '@opensumi/ide-file-service/lib/browser';
import { FileTreeNextModule } from '@opensumi/ide-file-tree-next/lib/browser';
import { LogModule } from '@opensumi/ide-logs/lib/browser';
import { MainLayoutModule } from '@opensumi/ide-main-layout/lib/browser';
import { MenuBarModule } from '@opensumi/ide-menu-bar/lib/browser';
import { MonacoModule } from '@opensumi/ide-monaco/lib/browser';
import { OutputModule } from '@opensumi/ide-output/lib/browser';
import { OverlayModule } from '@opensumi/ide-overlay/lib/browser';
import { PreferencesModule } from '@opensumi/ide-preferences/lib/browser';
import { QuickOpenModule } from '@opensumi/ide-quick-open/lib/browser';
import { StatusBarModule } from '@opensumi/ide-status-bar/lib/browser';
import { StorageModule } from '@opensumi/ide-storage/lib/browser';
import { ThemeModule } from '@opensumi/ide-theme/lib/browser';
import { WorkspaceModule } from '@opensumi/ide-workspace/lib/browser';
import './styles.less';

const basePath = (window as unknown as { AGENT_WEBUI_BASE_PATH?: string }).AGENT_WEBUI_BASE_PATH ?? '/webui';
const normalizedBasePath = basePath === '/' ? '' : basePath.replace(/\/$/, '');
const browserModules = [
  MainLayoutModule,
  OverlayModule,
  LogModule,
  ClientCommonModule,
  MenuBarModule,
  MonacoModule,
  StatusBarModule,
  EditorModule,
  ExplorerModule,
  FileTreeNextModule,
  FileServiceClientModule,
  FileSchemeModule,
  OutputModule,
  QuickOpenModule,
  ThemeModule,
  WorkspaceModule,
  StorageModule,
  PreferencesModule,
  DecorationModule,
];

const toWsPath = (): string => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // ClientApp 会在 wsPath 后自动拼接 /service。
  // 子路径部署时必须连接 /webui/service，避免绕过 agent-master 的 /webui/* 反代入口。
  return `${protocol}//${window.location.host}${normalizedBasePath}`;
};

const layoutConfig: IClientAppOpts['layoutConfig'] = {
  [SlotLocation.top]: { modules: ['@opensumi/ide-menu-bar'] },
  [SlotLocation.action]: { modules: [] },
  [SlotLocation.left]: { modules: ['@opensumi/ide-explorer'] },
  [SlotLocation.main]: { modules: ['@opensumi/ide-editor'] },
  [SlotLocation.right]: { modules: [] },
  [SlotLocation.statusBar]: { modules: ['@opensumi/ide-status-bar'] },
  [SlotLocation.bottom]: { modules: ['@opensumi/ide-output'] },
  [SlotLocation.extra]: { modules: [] },
};

async function bootstrap(): Promise<void> {
  const injector = new Injector();
  const app = new ClientApp({
    injector,
    modules: [...browserModules],
    layoutConfig,
    appName: 'agent-webui',
    appHost: 'web',
    uriScheme: 'agent-webui',
    workspaceDir: '/app',
    extensionDir: '/data/extensions',
    storageDirName: '.agent-webui',
    preferenceDirName: '.agent-webui',
    extensionStorageDirName: '.agent-webui/extensions',
    wsPath: toWsPath(),
    staticServicePath: `${basePath}/assets`,
    useCdnIcon: true,
    defaultPreferences: {
      'general.theme': 'ide-dark',
      'general.icon': 'vsicons-slim',
      'editor.quickSuggestionsDelay': 100,
      'editor.scrollBeyondLastLine': false,
      'terminal.integrated.fontFamily': 'monospace',
    },
  });

  app.fireOnReload = () => window.location.reload();

  const rootEl = document.getElementById('main');
  if (!rootEl) {
    throw new Error('missing #main element');
  }

  rootEl.classList.add('agent-webui-root');
  await app.start(rootEl, ESupportRuntime.Web);

  document.getElementById('loading')?.remove();
}

void bootstrap().catch((err: unknown) => {
  console.error('[agent-webui] failed to bootstrap OpenSumi', err);
  const loading = document.getElementById('loading');
  if (loading) {
    loading.textContent = `Failed to bootstrap agent-webui: ${(err as Error).message}`;
  }
});
