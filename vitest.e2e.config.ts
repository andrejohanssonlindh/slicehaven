import { defineConfig } from 'vitest/config';

// Browser tests (Playwright). Run with `npm run test:e2e`; not part of `npm test`.
export default defineConfig({
  base: '/slicehaven/',
  test: {
    include: ['e2e/**/*.e2e.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
