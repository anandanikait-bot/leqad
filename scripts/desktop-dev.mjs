import { createServer } from 'vite';
import { context } from 'esbuild';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const app = path.join(root, 'apps/desktop');
const require = createRequire(import.meta.url);
let child,
  timer,
  stopping = false;
const server = await createServer({
  configFile: path.join(app, 'vite.config.ts'),
});
await server.listen();
const ready = new Set();
function launch() {
  if (stopping || ready.size !== 2) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    const start = () => {
      if (!stopping)
        child = spawn(require('electron'), [path.join(app, 'dist/main.cjs')], {
          stdio: 'inherit',
          env: {
            ...process.env,
            LEQAD_DESKTOP_DEV_URL: 'http://127.0.0.1:5197',
          },
        });
    };
    if (child && child.exitCode === null) {
      child.once('exit', start);
      child.kill();
    } else start();
  }, 100);
}
const contexts = [];
for (const name of ['main', 'preload']) {
  const ctx = await context({
    entryPoints: [path.join(app, `src/${name}/index.ts`)],
    outfile: path.join(app, `dist/${name}.cjs`),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    external: ['electron'],
    sourcemap: true,
    plugins: [
      {
        name: 'restart-host',
        setup(b) {
          b.onEnd((result) => {
            if (!result.errors.length) {
              ready.add(name);
              launch();
            }
          });
        },
      },
    ],
  });
  contexts.push(ctx);
  await ctx.watch();
}
async function stop() {
  if (stopping) return;
  stopping = true;
  clearTimeout(timer);
  child?.kill();
  await Promise.all(contexts.map((c) => c.dispose()));
  await server.close();
}
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
