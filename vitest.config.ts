import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // The first (tooling-only) commit has no tests yet; this must not fail `npm test`.
    passWithNoTests: true,
    restoreMocks: true,
  },
});
