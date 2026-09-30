/**
 * Unit tests for the app's own logic.
 *
 * Node, not a React Native runtime: everything tested here is a pure function or
 * a module whose only side effect is `fetch`. Rendering a screen would need a
 * whole native shim and would test React Native rather than HugFab.
 *
 * **These are not integration tests and must never be mistaken for them.** No
 * test here proves the API answers as expected — the API's shape is a contract
 * only a real request can check, and `docs/PRODUCTION-READINESS.md` says why
 * none has been made yet. What these cover is the code between the response and
 * the screen: the envelope, the error mapping, the URL building, the money.
 */

import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
