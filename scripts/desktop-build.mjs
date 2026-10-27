import { build } from 'esbuild';
import { build as viteBuild } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const app = path.join(root, 'apps/desktop');
export async function buildHost() {
  for (const name of ['main', 'preload'])
    await build({
      entryPoints: [path.join(app, `src/${name}/index.ts`)],
      outfile: path.join(app, `dist/${name}.cjs`),
      bundle: true,
      platform: 'node',
      format: 'cjs',
      external: ['electron'],
      sourcemap: true,
    });
}
export async function buildDesktop() {
  await buildHost();
  await viteBuild({ configFile: path.join(app, 'vite.config.ts') });
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await buildDesktop();
