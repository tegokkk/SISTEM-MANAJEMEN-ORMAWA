import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { env } from '../config/env';
import { errorHandler } from './error.middleware';
import { verifyMutationOrigin } from './origin.middleware';
import { loginRateLimiter } from './rate-limit.middleware';

describe('mutation origin and login rate limits', () => {
  it('rejects cross-site and missing origins on mutations', async () => {
    const app = express();
    app.use(verifyMutationOrigin);
    app.post('/save', (_req, res) => res.sendStatus(204));
    app.use(errorHandler);
    await request(app).post('/save').set('Content-Type', 'application/json').expect(403);
    await request(app).post('/save').set('Origin', 'https://evil.example').set('Content-Type', 'application/json').expect(403);
    await request(app).post('/save').set('Origin', env.FRONTEND_URL).set('Content-Type', 'application/json').expect(204);
  });

  it('blocks the sixth login attempt from the same IP', async () => {
    const app = express();
    app.post('/login', loginRateLimiter, (_req, res) => res.sendStatus(401));
    for (let attempt = 0; attempt < 5; attempt++) await request(app).post('/login').expect(401);
    const blocked = await request(app).post('/login').expect(429);
    expect(blocked.body.message).toContain('Terlalu banyak');
  });
});
