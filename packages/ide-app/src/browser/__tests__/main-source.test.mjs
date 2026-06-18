import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mainSource = readFileSync(resolve(__dirname, '../main.tsx'), 'utf8');
const webpackConfigSource = readFileSync(resolve(__dirname, '../../../webpack.config.mjs'), 'utf8');
const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../../../package.json'), 'utf8'));

test('browser startup does not filter OpenSumi modules by constructor name', () => {
  assert.equal(
    mainSource.includes('moduleConstructor.name'),
    false,
    'production minification makes constructor.name unstable and can drop required providers',
  );
});

test('browser startup uses an explicit M1 module whitelist', () => {
  assert.equal(
    mainSource.includes('CommonBrowserModules'),
    false,
    'CommonBrowserModules pulls in deep contributions that require terminal/search/extension providers before M1 enables them',
  );
  assert.match(mainSource, /const browserModules = \[/, 'M1 startup should use an explicit module array');
});

test('browser startup does not import non-M1 deep feature modules', () => {
  for (const moduleName of [
    'TerminalNextModule',
    'ExtensionModule',
    'OpenVsxExtensionManagerModule',
    'ExtensionStorageModule',
    'MonacoEnhanceModule',
    'SearchModule',
    'DebugModule',
  ]) {
    assert.equal(mainSource.includes(moduleName), false, `${moduleName} should not be imported in M1`);
  }
});

test('package dependencies do not directly enable non-M1 deep OpenSumi features', () => {
  for (const packageName of [
    '@opensumi/ide-debug',
    '@opensumi/ide-extension',
    '@opensumi/ide-extension-manager',
    '@opensumi/ide-extension-storage',
    '@opensumi/ide-monaco-enhance',
    '@opensumi/ide-search',
    '@opensumi/ide-terminal-next',
    '@opensumi/ide-startup',
  ]) {
    assert.equal(
      Object.hasOwn(packageJson.dependencies, packageName),
      false,
      `${packageName} should be added only when the corresponding M2+ capability is enabled`,
    );
  }
});

test('browser startup lets OpenSumi render into the host element', () => {
  assert.equal(
    mainSource.includes("from 'react-dom/client'"),
    false,
    'ClientApp.start already renders the IDE React component when given an HTMLElement host',
  );
  assert.doesNotMatch(
    mainSource,
    /React\.createElement\([^\n]*element|appendChild\(element\)/,
    'ClientApp.start renderer callback receives a React component, not a DOM node or React child',
  );
  assert.match(
    mainSource,
    /app\.start\(rootEl, ESupportRuntime\.Web\)/,
    'OpenSumi startup should pass #main directly as the host element',
  );
});

test('browser websocket path stays under the configured base path', () => {
  assert.match(
    mainSource,
    /normalizedBasePath/,
    'OpenSumi websocket URL must normalize AGENT_WEBUI_BASE_PATH before building wsPath',
  );
  assert.doesNotMatch(
    mainSource,
    /return `\$\{protocol\}\/\/\$\{window\.location\.host\}`;/,
    'sub-path deployments must not connect to root /service and bypass the /webui/* proxy',
  );
});

test('webpack preserves OpenSumi css module underscore class keys', () => {
  assert.match(
    webpackConfigSource,
    /exportLocalsConvention:\s*'as-is'/,
    'OpenSumi CommonJS modules access css module keys like mod_selected; css-loader must not camel-case them away',
  );
});
