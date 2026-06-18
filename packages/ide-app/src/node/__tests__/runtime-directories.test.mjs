import { mkdtemp, rm, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverSource = readFileSync(resolve(__dirname, '../server.ts'), 'utf8');

const { ensureRuntimeDirectories } = await import('../../../dist/node/runtime-directories.js');

test('ensureRuntimeDirectories creates logs and extensions directories', async () => {
  const root = await mkdtemp(join(tmpdir(), 'agent-webui-runtime-'));
  try {
    await ensureRuntimeDirectories({ dataDir: root });

    assert.equal((await stat(root)).isDirectory(), true);
    assert.equal((await stat(join(root, 'logs'))).isDirectory(), true);
    assert.equal((await stat(join(root, 'extensions'))).isDirectory(), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('node startup uses an explicit M1 module whitelist', () => {
  assert.equal(
    serverSource.includes('CommonNodeModules'),
    false,
    'CommonNodeModules enables terminal/search/extension/debug node services before M1 explicitly opens them',
  );
  assert.match(serverSource, /const nodeModules = \[/, 'M1 server startup should use an explicit node module array');
});

test('node startup does not import non-M1 deep feature modules', () => {
  for (const moduleName of [
    'TerminalNextModule',
    'ExtensionModule',
    'OpenVsxExtensionManagerModule',
    'ExtensionStorageModule',
    'SearchModule',
    'DebugModule',
  ]) {
    assert.equal(serverSource.includes(moduleName), false, `${moduleName} should not be imported in M1 node startup`);
  }
});

test('node startup rewrites base-path websocket upgrades before OpenSumi handles /service', () => {
  assert.match(
    serverSource,
    /prependListener\('upgrade'/,
    'OpenSumi hard-codes /service; base-path websocket upgrades must be rewritten before its upgrade handler runs',
  );
  assert.match(
    serverSource,
    /url\.slice\(basePath\.length\)/,
    'a /webui/service upgrade should enter OpenSumi as /service without requiring an extra master route',
  );
  assert.match(
    serverSource,
    /url !== servicePath && !url\.startsWith\(`\$\{servicePath\}\?`\)/,
    'websocket rewrite should match only /service or /service?query under the configured base path',
  );
});

test('node startup strips static base path without unescaped regular expressions', () => {
  assert.equal(
    serverSource.includes('new RegExp(`^${basePath}/?`)'),
    false,
    'basePath comes from environment config and should not be interpolated into an unescaped regular expression',
  );
  assert.match(
    serverSource,
    /pathname\.startsWith\(`\$\{basePath\}\/`\)/,
    'static path rewriting should use string prefix checks for sub-path deployments',
  );
});
