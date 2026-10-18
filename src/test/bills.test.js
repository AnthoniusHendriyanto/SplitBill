import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import useBillStore from '../store/useBillStore';
import useAuthStore from '../store/useAuthStore';
import { api } from '../lib/api';
import { billAmounts, calculatePersonTotals, savedShares, splitError } from '../utils/shares';

const baseBill = () => ({
  id: 'original-draft', title: 'Lunch', date: '2026-10-18', splitType: 'equal', payerId: 'a',
  items: [{ id: 'meal', name: 'Meal', price: 100, quantity: 1 }],
  persons: [{ id: 'a', name: 'Same', userId: 'actor', percentage: 50 }, { id: 'b', name: 'Same', userId: 'friend', percentage: 50 }],
  tax: 0, taxMode: 'amount', serviceCharge: 0, serviceMode: 'amount', discount: 0,
});

beforeEach(() => {
  useBillStore.getState().resetAccountData();
  useBillStore.setState({ bill: baseBill() });
  useAuthStore.setState({ accessToken: 'token', user: { id: 'actor' } });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('matches backend allocations for all split types, discount, fees, and quantities', () => {
  // Same cases as backend TestSharesReconcile, including explicit expected allocations.
  const bill = { ...baseBill(), items: [{ id: 'meal', name: 'Meal', price: 100, quantity: 3 }], serviceCharge: 10, serviceMode: 'percent', tax: 20, discount: 14.99,
    persons: [{ id: 'a', name: 'A', percentage: 20, customAmount: 50 }, { id: 'b', name: 'B', percentage: 30, customAmount: 100 }, { id: 'c', name: 'C', percentage: 50, customAmount: 185.01 }] };
  for (const [splitType, expected] of Object.entries({ equal: [111.67, 111.67, 111.67], percentage: [67, 100.5, 167.51], custom: [50, 100, 185.01], shared_items: [0, 0, 335.01] })) {
    const totals = calculatePersonTotals({ ...bill, splitType }, { c: { meal: true } });
    expect(totals.map(p => p.total)).toEqual(expected);
    expect(totals.reduce((sum, p) => sum + Math.round(p.total * 100), 0)).toBe(33501);
  }
  const thirds = calculatePersonTotals({ ...baseBill(), persons: bill.persons }, { c: { meal: true } });
  expect(thirds.map(p => p.total)).toEqual([33.34, 33.33, 33.33]);
  expect(billAmounts({ ...baseBill(), ocrSubtotal: 999, discount: 10, discountMode: 'percent' }).total).toBe(90);
  expect(splitError({ ...baseBill(), splitType: 'custom' })).toMatch(/Custom final/);
  expect(splitError({ ...baseBill(), discount: 101 })).toMatch(/discount/);
  expect(splitError({ ...baseBill(), tax: NaN })).not.toBe('');
});

it('keeps the original draft and retries the same payload with one key', async () => {
  const create = vi.spyOn(api, 'createBill').mockRejectedValueOnce(new Error('network lost')).mockResolvedValue({ id: 'saved' });
  const remove = vi.spyOn(api, 'deleteBill');
  vi.spyOn(api, 'getBills').mockResolvedValue({ data: [], pagination: { page: 1, total_pages: 0, total_items: 0 } });
  vi.spyOn(api, 'getDebts').mockResolvedValue([]);
  useBillStore.setState({ bill: { ...baseBill(), splitType: 'custom', persons: baseBill().persons.map(p => ({ ...p, customAmount: 50 })) } });
  await expect(useBillStore.getState().completeBill()).rejects.toThrow('network lost');
  expect(useBillStore.getState().bill.id).toBe('original-draft');
  const persisted = JSON.parse(localStorage.getItem('splitmate-storage')).state;
  expect(persisted.pendingSave.key).toBe(create.mock.calls[0][0].request_key);
  await useBillStore.getState().completeBill();
  expect(remove).not.toHaveBeenCalled();
  expect(create.mock.calls[0][0]).toEqual(create.mock.calls[1][0]);
  expect(create.mock.calls[0][0].request_key).toMatch(/^[0-9a-f-]{36}$/);
  expect(create.mock.calls[0][0].persons[1]).toMatchObject({ user_id: 'friend', custom_amount: 50 });
  useBillStore.getState().updateBill({ title: 'Changed' });
  await useBillStore.getState().completeBill();
  expect(create.mock.calls[2][0].request_key).not.toBe(create.mock.calls[0][0].request_key);
});

it('restores all draft split data and assignments by ID, not duplicate names', async () => {
  vi.spyOn(api, 'getBill').mockResolvedValue({ bill: {
    id: 'draft', status: 'draft', split_type: 'custom', bill_date: '2026-10-18',
    items: [{ id: 'meal', name: 'Meal', price: 100, quantity: 2, assigned_person_ids: ['b'] }],
    persons: [{ id: 'a', name: 'Same', user_id: 'actor', is_payer: true, percentage: 40, custom_amount: 80 }, { id: 'b', name: 'Same', user_id: 'friend', percentage: 60, custom_amount: 120 }],
  } });
  await useBillStore.getState().loadBillDraft('draft');
  const { bill, assignments } = useBillStore.getState();
  expect(bill).toMatchObject({ splitType: 'custom', payerId: 'a', discountMode: 'amount' });
  expect(bill.persons[1]).toMatchObject({ userId: 'friend', percentage: 60, customAmount: 120 });
  expect(assignments).toEqual({ a: {}, b: { meal: true } });
  useBillStore.getState().removeItem('meal');
  expect(useBillStore.getState().assignments).toEqual({ a: {}, b: {} });
});

it('uses saved shares and recorded legacy payments without matching names', () => {
  const bill = { grand_total: 100, status: 'completed', persons: [{ id: 'a', name: 'Same', is_payer: true, share_amount: 40 }, { id: 'b', name: 'Same', share_amount: 60 }], payments: [{ from_person_id: 'b', to_person_id: 'a', amount: 60, is_paid: true }] };
  expect(savedShares(bill).map(p => p.total)).toEqual([40, 60]);
  expect(savedShares({ ...bill, persons: bill.persons.map(p => ({ ...p, share_amount: null })) }).map(p => p.total)).toEqual([40, 60]);
  expect(savedShares({ ...bill, status: 'draft', persons: [{ id: 'a' }] })[0].total).toBeNull();
});

it('loads history pages while balances come from the independent debt endpoint', async () => {
  vi.spyOn(api, 'getBills').mockImplementation(async page => ({ data: [{ id: `page-${page}`, receivable: 1 }], pagination: { page, total_pages: 2, total_items: 21 } }));
  vi.spyOn(api, 'getDebts').mockResolvedValue([{ bill_id: 'outside-page', direction: 'receivable', amount: 1000 }]);
  await Promise.all([useBillStore.getState().fetchCompletedBills(), useBillStore.getState().fetchDebts()]);
  await useBillStore.getState().fetchCompletedBills(2);
  expect(useBillStore.getState().completedBills.map(b => b.id)).toEqual(['page-1', 'page-2']);
  expect(useBillStore.getState().pagination.page).toBe(2);
  expect(useBillStore.getState().debts[0].amount).toBe(1000);
  api.getDebts.mockRejectedValue(new Error('database unavailable'));
  await useBillStore.getState().fetchDebts();
  expect(useBillStore.getState().debtsError).toBe('database unavailable');
});

it('clears account data before logout finishes and discards late list and debt responses', async () => {
  let finishList, finishDebts, finishLogout;
  vi.spyOn(api, 'getBills').mockImplementation(() => new Promise(resolve => { finishList = resolve; }));
  vi.spyOn(api, 'getDebts').mockImplementation(() => new Promise(resolve => { finishDebts = resolve; }));
  vi.spyOn(api, 'logout').mockImplementation(() => new Promise(resolve => { finishLogout = resolve; }));
  useBillStore.setState({ completedBills: [{ id: 'private' }], debts: [{ amount: 10 }] });
  const list = useBillStore.getState().fetchCompletedBills();
  const debts = useBillStore.getState().fetchDebts();
  const logout = useAuthStore.getState().logout();
  expect(useAuthStore.getState().accessToken).toBeNull();
  expect(useBillStore.getState()).toMatchObject({ completedBills: [], debts: [], pendingSave: null });
  finishList({ data: [{ id: 'old-account' }] });
  finishDebts([{ amount: 10 }]);
  finishLogout();
  await Promise.all([list, debts, logout]);
  expect(useBillStore.getState().completedBills).toEqual([]);
  expect(useBillStore.getState().debts).toEqual([]);
});

it('does not refresh or retry an old request under a new account', async () => {
  let finish;
  const fetch = vi.fn(() => new Promise(resolve => { finish = resolve; }));
  vi.stubGlobal('fetch', fetch);
  const request = api.getBill('private');
  useAuthStore.setState(s => ({ sessionVersion: s.sessionVersion + 1, accessToken: 'new-account' }));
  finish({ status: 401, json: async () => ({ success: false }) });
  await expect(request).rejects.toThrow('Account changed');
  expect(fetch).toHaveBeenCalledTimes(1);
});
