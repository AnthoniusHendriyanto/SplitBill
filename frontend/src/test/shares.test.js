import { describe, expect, it } from 'vitest';
import { calculateShares, savedShares, isPremiumSplit, splitTypeForTab } from '../utils/shares';

const bill = { items: [{ id: 'meal', price: 100, quantity: 3 }], persons: [{ id: 'actor', percentage: 20, customAmount: 50 }, { id: 'payer', percentage: 30, customAmount: 100 }, { id: 'friend', percentage: 50, customAmount: 185.01 }], tax: 20, taxMode: 'amount', serviceCharge: 10, serviceMode: 'percent', discount: 14.99 };
describe('final payable shares', () => {
  it.each(['equal', 'percentage', 'custom', 'shared_items'])('%s reconciles discounts and fees', splitType => {
    const result = calculateShares({ ...bill, splitType }, { friend: { meal: true } });
    expect(result.reduce((sum, p) => sum + Math.round(p.total * 100), 0)).toBe(33501);
    if (splitType === 'custom') expect(result[0].total).toBe(50);
    if (splitType === 'shared_items') expect(result.map(p => p.total)).toEqual([0, 0, 335.01]);
  });
  it('equal ignores stale assignments and allocates remainder deterministically', () => {
    const result = calculateShares({ ...bill, items: [{ id: 'meal', price: 1, quantity: 1 }], tax: 0, serviceCharge: 0, discount: 0, splitType: 'equal' }, { friend: { meal: true } });
    expect(result.map(p => p.total)).toEqual([0.34, 0.33, 0.33]);
  });
  it('saved views use authoritative shares instead of names or recalculation', () => {
    const result = savedShares({ total_amount: 100, grand_total: 90, tax: 0, service_charge: 0, discount: 10, persons: [{ id: 'a', name: 'Same', share_amount: 20 }, { id: 'b', name: 'Same', share_amount: 70, is_payer: true }], payments: [] });
    expect(result.map(p => p.total)).toEqual([20, 70]);
  });
});

describe('premium gating', () => {
  it('keeps Equal and By Item free, matching the backend tier', () => {
    // Regression: the tab lock and the save guard used different conditions, so a free user was
    // shown a padlock on By Item while the save path and backend both allowed it.
    expect(splitTypeForTab('equal')).toBe('equal');
    expect(splitTypeForTab('item')).toBe('shared_items');
    expect(isPremiumSplit(splitTypeForTab('equal'))).toBe(false);
    expect(isPremiumSplit(splitTypeForTab('item'))).toBe(false);
    expect(isPremiumSplit(splitTypeForTab('percent'))).toBe(true);
    expect(isPremiumSplit(splitTypeForTab('custom'))).toBe(true);
    expect(isPremiumSplit(splitTypeForTab('unknown'))).toBe(false);
  });
});
