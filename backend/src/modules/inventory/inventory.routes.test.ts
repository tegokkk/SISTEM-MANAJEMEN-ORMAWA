import { describe, expect, it } from 'vitest';
import { inventoryFiltersSchema } from './inventory.routes';

describe('inventory filters', () => {
  it('accepts supported filters and rejects unknown status values', () => {
    expect(inventoryFiltersSchema.parse({ condition: 'GOOD', location: ' Gudang ', status: 'ACTIVE' }))
      .toEqual({ condition: 'GOOD', location: 'Gudang', status: 'ACTIVE' });
    expect(() => inventoryFiltersSchema.parse({ status: 'DELETED' })).toThrow();
  });
});
