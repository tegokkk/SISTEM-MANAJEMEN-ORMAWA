import { describe, expect, it } from 'vitest';
import { canAccessTenant, canReviewChildHima, isHmjHimaPair, resolveReviewTarget } from './tenant.policy';

describe('tenant isolation policy', () => {
  const hmjA = { id: '10', type: 'HMJ' as const };
  const hmjB = { id: '20', type: 'HMJ' as const };
  const himaA = { id: '11', type: 'HIMA' as const, parentTenantId: '10' };
  const himaB = { id: '12', type: 'HIMA' as const, parentTenantId: '10' };

  it('only permits direct tenant access to the same tenant', () => {
    expect(canAccessTenant(himaA, '11')).toBe(true);
    expect(canAccessTenant(himaA, '12')).toBe(false);
  });

  it('permits only the valid HMJ-HIMA parent pair', () => {
    expect(isHmjHimaPair(hmjA, himaA)).toBe(true);
    expect(isHmjHimaPair(hmjB, himaA)).toBe(false);
    expect(isHmjHimaPair(himaA, himaB)).toBe(false);
  });

  it('prevents an HMJ from reviewing another HMJ child', () => {
    expect(canReviewChildHima(hmjA, himaA)).toBe(true);
    expect(canReviewChildHima(hmjB, himaA)).toBe(false);
  });

  it('resolves workflow targets without accepting an arbitrary tenant id', () => {
    expect(resolveReviewTarget(himaA, '20')).toBe('10');
    expect(resolveReviewTarget(hmjA)).toBe('10');
    expect(resolveReviewTarget(hmjA, '20')).toBeNull();
  });
});
