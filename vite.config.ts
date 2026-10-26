import { defineConfig } from 'vitest/config';

// Served from https://andrejohanssonlindh.github.io/slicehaven/
export default defineConfig({
  base: '/slicehaven/',
  build: {
    chunkSizeWarningLimit: 2000, // Phaser alone is ~1.3 MB
    rollupOptions: {
      input: {
        game: 'index.html',
        director: 'director/index.html',
        artlab: 'artlab/index.html',
        chargen: 'chargen/index.html',
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
