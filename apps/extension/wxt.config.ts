import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifestVersion: 3,
  manifest: {
    name: 'Leqad',
    description: 'Interactive CAD lessons and contextual guidance for Onshape.',
    permissions: ['storage'],
  },
  vite: () => ({ plugins: [tailwindcss()] }),
  outDir: '.output',
});
