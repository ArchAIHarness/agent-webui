import fs from 'node:fs/promises';
import path from 'node:path';

export interface RuntimeDirectoryOptions {
  dataDir?: string;
}

export const DEFAULT_DATA_DIR = '/data';

export function resolveDataDir(value = process.env.AGENT_WEBUI_DATA_DIR): string {
  return value?.trim() || DEFAULT_DATA_DIR;
}

export async function ensureRuntimeDirectories(options: RuntimeDirectoryOptions = {}): Promise<void> {
  const dataDir = options.dataDir ?? resolveDataDir();
  await fs.mkdir(dataDir, { recursive: true });
  await Promise.all([
    fs.mkdir(path.join(dataDir, 'logs'), { recursive: true }),
    fs.mkdir(path.join(dataDir, 'extensions'), { recursive: true }),
  ]);
}
