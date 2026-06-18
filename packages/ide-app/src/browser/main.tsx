import { Injector } from '@opensumi/di';
import { SlotLocation } from '@opensumi/ide-core-browser';
import { ClientApp } from '@opensumi/ide-core-browser/lib/bootstrap/app';
import type { IClientAppOpts } from '@opensumi/ide-core-browser';
import '@opensumi/ide-core-browser/lib/style/index.less';
import '@opensumi/ide-i18n';
import { CommonBrowserModules } from '@opensumi/ide-startup/lib/browser/common-modules';
import { createRoot } from 'react-dom/client';
import React from 'react';
import './styles.less';

const basePath = (window as unknown as { AGENT_WEBUI_BASE_PATH?: string }).AGENT_WEBUI_BASE_PATH ?? '/webui';

const toWsPath = (): string => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // OpenSumi ServerApp 默认 WS 路径是 /service。
  // agent-master 可在 /webui/* 入口处做路径前缀剥离；本地直连走 /service。
  return `${protocol}//${window.location.host}/service`;
};

const layoutConfig: IClientAppOpts['layoutConfig'] = {
  [SlotLocation.top]: { modules: ['@opensumi/ide-menu-bar'] },
  [SlotLocation.action]: { modules: [] },
  [SlotLocation.left]: { modules: ['@opensumi/ide-explorer'] },
  [SlotLocation.main]: { modules: ['@opensumi/ide-editor'] },
  [SlotLocation.right]: { modules: [] },
  [SlotLocation.statusBar]: { modules: ['@opensumi/ide-status-bar'] },
  [SlotLocation.bottom]: { modules: ['@opensumi/ide-output', '@opensumi/ide-terminal-next'] },
  [SlotLocation.extra]: { modules: [] },
};

async function bootstrap(): Promise<void> {
  const injector = new Injector();
  const app = new ClientApp({
    injector,
    modules: [...CommonBrowserModules],
    layoutConfig,
    appName: 'agent-webui',
    appHost: 'web',
    uriScheme: 'agent-webui',
    workspaceDir: '/app',
    extensionDir: '/data/extensions',
    storageDirName: '.agent-webui',
    preferenceDirName: '.agent-webui',
    extensionStorageDirName: '.agent-webui/extensions',
    wsPath: toWsPath,
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

  await app.start((element) => {
    const root = createRoot(rootEl);
    return new Promise<void>((resolve) => {
      root.render(
        React.createElement('div', { id: 'agent-webui-root', className: 'agent-webui-root' }, element),
      );
      resolve();
    });
  });

  document.getElementById('loading')?.remove();
}

void bootstrap().catch((err: unknown) => {
  console.error('[agent-webui] failed to bootstrap OpenSumi', err);
  const loading = document.getElementById('loading');
  if (loading) {
    loading.textContent = `Failed to bootstrap agent-webui: ${(err as Error).message}`;
  }
});
