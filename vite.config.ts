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
        scene: 'scene/index.html',
        skills: 'skills/index.html',
        village: 'village/index.html',
        spike3d: 'spike3d/index.html',
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
