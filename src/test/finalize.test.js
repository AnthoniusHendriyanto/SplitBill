import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import useBillStore from '../store/useBillStore';
import useAuthStore from '../store/useAuthStore';
import { api } from '../lib/api';

beforeEach(() => {
  useBillStore.getState().resetBill();
  useAuthStore.setState({ accessToken: 'test', user: { id: 'actor' } });
  useBillStore.getState().updateBill({ title: 'Dinner', splitType: 'custom', persons: [{ id: 'a', name: 'A', userId: 'actor', customAmount: 50 }, { id: 'b', name: 'B', userId: 'friend', customAmount: 50 }], payerId: 'b', items: [{ id: 'i', name: 'Meal', price: 100, quantity: 1 }] });
  vi.spyOn(api, 'getBills').mockResolvedValue({ data: [] });
});
afterEach(() => vi.restoreAllMocks());

it('reuses uncertain finalization key and preserves account/custom fields', async () => {
  const saved = { id: 'saved', user_id: 'actor' };
  const create = vi.spyOn(api, 'createBill').mockRejectedValueOnce(new Error('timeout')).mockResolvedValue(saved);
  await expect(useBillStore.getState().completeBill()).rejects.toThrow('timeout');
  await expect(useBillStore.getState().completeBill()).resolves.toEqual(saved);
  expect(create.mock.calls[0][0].request_key).toBe(create.mock.calls[1][0].request_key);
  expect(create.mock.calls[1][0].persons[1]).toMatchObject({ user_id: 'friend', custom_amount: 50, is_payer: true });
  await useBillStore.getState().completeBill();
  expect(create).toHaveBeenCalledTimes(2);
});

it('blocks changed payload after ambiguous save and never deletes the previous bill', async () => {
  vi.spyOn(api, 'createBill').mockRejectedValue(new Error('timeout'));
  const remove = vi.spyOn(api, 'deleteBill');
  await expect(useBillStore.getState().completeBill()).rejects.toThrow();
  useBillStore.getState().updateBill({ title: 'Different' });
  await expect(useBillStore.getState().completeBill()).rejects.toThrow('unresolved');
  expect(remove).not.toHaveBeenCalled();
});

it('allows correcting rejected input and clears stale data for a new bill', async () => {
  vi.spyOn(api, 'createBill').mockRejectedValue(Object.assign(new Error('bad amounts'), { status: 400 }));
  await expect(useBillStore.getState().completeBill()).rejects.toThrow('bad amounts');
  expect(useBillStore.getState().pendingSave).toBeNull();
  useBillStore.setState({ assignments: { a: { i: true } } });
  useBillStore.getState().updateBill({ discount: 10, ocrSubtotal: 123 });
  useBillStore.getState().resetBill();
  expect(useBillStore.getState().assignments).toEqual({});
  expect(useBillStore.getState().bill).toMatchObject({ discount: 0, ocrSubtotal: 0, persons: [], items: [] });
});
