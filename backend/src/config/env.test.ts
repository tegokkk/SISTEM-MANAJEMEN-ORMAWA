import { describe, expect, it } from 'vitest';
import { envSchema } from './env';

describe('production security configuration', () => {
  it('requires HTTPS and secure cookies in production', () => {
    const base = { DATABASE_URL: 'mysql://user:pass@localhost:3306/test', SESSION_SECRET: 'a-long-test-secret', NODE_ENV: 'production' };
    expect(envSchema.safeParse({ ...base, FRONTEND_URL: 'http://example.com', COOKIE_SECURE: 'false' }).success).toBe(false);
    expect(envSchema.safeParse({ ...base, FRONTEND_URL: 'https://example.com', COOKIE_SECURE: 'true' }).success).toBe(true);
  });
});
