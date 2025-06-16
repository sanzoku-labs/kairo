import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/extensions.ts',
    'src/extensions/events.ts',
    'src/extensions/transactions.ts',
    'src/extensions/caching.ts',
    'src/extensions/plugins.ts',
    'src/extensions/workflows.ts',
    'src/extensions/performance.ts',
    'src/extensions/contracts.ts',
  ],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: true,
  sourcemap: true,
  target: 'es2022',
})
