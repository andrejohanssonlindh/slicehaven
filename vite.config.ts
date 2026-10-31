import { execSync } from 'node:child_process';
import { defineConfig } from 'vitest/config';

/** Which build this is: commit count, short hash and build time, shown on the 3D spike so the director can see the latest loaded. */
function buildStamp(): string {
  let rev = 'dev';
  try {
    const n = execSync('git rev-list --count HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const h = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    rev = `${n}·${h}`;
  } catch {
    // Not a git checkout (a plain download): the time alone will do.
  }
  const d = new Date();
  const p = (v: number): string => String(v).padStart(2, '0');
  return `v${rev} ${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}Z`;
}

// Served from https://andrejohanssonlindh.github.io/slicehaven/
export default defineConfig({
  base: '/slicehaven/',
  define: { __BUILD__: JSON.stringify(buildStamp()) },
  build: {
    chunkSizeWarningLimit: 2000, // three.js and the world are ~740 kB
    rollupOptions: {
      input: {
        home: 'index.html',
        director: 'director/index.html',
        chargen: 'chargen/index.html',
        skills: 'skills/index.html',
        spike3d: 'spike3d/index.html',
        npcs: 'npcs/index.html',
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
