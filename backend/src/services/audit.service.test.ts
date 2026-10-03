import { describe, expect, it } from 'vitest';
import { sanitizeAuditData } from './audit.service';

describe('audit metadata sanitization', () => {
  it('redacts nested secrets and tokens', () => {
    expect(sanitizeAuditData({ email: 'user@example.test', password: 'secret', nested: { sessionToken: 'abc' } })).toEqual({
      email: 'user@example.test', password: '[REDACTED]', nested: { sessionToken: '[REDACTED]' },
    });
  });
});
