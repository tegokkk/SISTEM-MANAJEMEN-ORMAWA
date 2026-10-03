import { describe, expect, it } from 'vitest';
import { moneySummary } from './money';

describe('moneySummary', () => {
  it('reconciles cents without floating-point rounding', () => {
    expect(moneySummary('9007199254740992.11', '9007199254740991.02')).toEqual({
      income: '9007199254740992.11', expense: '9007199254740991.02', balance: '1.09',
    });
  });
});
