import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
    },
    reporters: ['default', 'junit'],
    outputFile: {
      junit: '.ci/junit.xml',
    },
  },
});
