import { describe, expect, it } from 'vitest';
import { transactionDateFilter } from './finance.routes';

describe('transactionDateFilter', () => {
  it('includes the complete end date in the database range', () => {
    expect(transactionDateFilter('2026-09-01', '2026-09-30')).toEqual({
      gte: new Date('2026-09-01T00:00:00.000Z'),
      lt: new Date('2026-10-01T00:00:00.000Z'),
    });
  });
});
