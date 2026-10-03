import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
    exclude: ['src/**/*.integration.test.ts'],
    env: {
      DATABASE_URL: 'mysql://test:test@localhost:3306/test',
      SESSION_SECRET: 'test-session-secret',
      FRONTEND_URL: 'http://localhost:3000',
      NODE_ENV: 'test',
    },
  },
});
