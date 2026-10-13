import tseslint from 'typescript-eslint';

export default tseslint.config(...tseslint.configs.recommended, {
  ignores: [
    '**/.output/**',
    '**/.wxt/**',
    '**/coverage/**',
    '**/dist/**',
    '**/node_modules/**',
    '**/test-results/**',
    '.superpowers/**',
  ],
});
