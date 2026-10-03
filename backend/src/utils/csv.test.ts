import { describe, expect, it } from 'vitest';
import { csvCell } from './csv';

describe('csvCell', () => {
  it('quotes text and neutralizes spreadsheet formulas', () => {
    expect(csvCell('  =HYPERLINK("x")\n')).toBe('"\'=HYPERLINK(""x"")"');
  });
});
