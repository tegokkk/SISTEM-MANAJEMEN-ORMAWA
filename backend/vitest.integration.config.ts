import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { defineConfig } from 'vitest/config';

dotenv.config({ path: resolve(__dirname, '.env') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL backend/.env wajib tersedia untuk integration test MySQL');
}

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.integration.test.ts'],
    fileParallelism: false,
    maxWorkers: 1,
    hookTimeout: 30_000,
    testTimeout: 30_000,
    env: {
      DATABASE_URL: process.env.DATABASE_URL,
      SESSION_SECRET: process.env.SESSION_SECRET ?? 'integration-test-session-secret',
      FRONTEND_URL: process.env.FRONTEND_URL ?? 'http://localhost:3000',
      NODE_ENV: 'test',
      LOG_LEVEL: 'error',
    },
  },
});
