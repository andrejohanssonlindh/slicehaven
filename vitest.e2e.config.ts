import { defineConfig } from 'vitest/config';

// Browser tests (Playwright). Run with `npm run test:e2e`; not part of `npm test`.
export default defineConfig({
  base: '/slicehaven/',
  test: {
    include: ['e2e/**/*.e2e.ts'],
    // (The 3D pages render in software here, and the folded panel gives them a taller stage.)
    testTimeout: 120_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
