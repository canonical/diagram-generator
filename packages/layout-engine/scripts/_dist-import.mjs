import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const pkgRoot = resolve(__dirname, '..');
export const repoRoot = resolve(pkgRoot, '../..');

const DEFAULT_FRAMES_DIR = join(repoRoot, 'scripts/diagrams/frames');

/** Match preview_server.py `DG_FRAMES_DIR` override for isolated tests and custom layouts. */
export function framesDir() {
  const override = process.env.DG_FRAMES_DIR;
  if (override && String(override).trim()) {
    return resolve(String(override).trim());
  }
  return DEFAULT_FRAMES_DIR;
}

export function distImport(name) {
  return import(pathToFileURL(join(pkgRoot, 'dist', name)).href);
}

export function resolveFrameYamlPath(arg, argv) {
  const base = framesDir();
  if (arg.startsWith('--slug=')) {
    const slug = arg.slice('--slug='.length);
    return join(base, `${slug}.yaml`);
  }
  if (arg === '--slug' && argv[3]) {
    return join(base, `${argv[3]}.yaml`);
  }
  return resolve(arg);
}

export function slugFromArgv(argv) {
  const arg = argv[2];
  if (!arg) return null;
  if (arg.startsWith('--slug=')) return arg.slice('--slug='.length);
  if (arg === '--slug' && argv[3]) return argv[3];
  return null;
}
