import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';
import useAuthStore from './useAuthStore';
import { calculateShares } from '../utils/shares';

const createId = () => crypto.randomUUID();
const newBill = () => ({ id: createId(), title: '', merchant: '', imageUrl: '', items: [], persons: [], tax: 11, taxMode: 'percent', serviceCharge: 5, serviceMode: 'percent', payerId: null, splitType: 'equal', discount: 0, ocrConfidence: 0, ocrSubtotal: 0, ocrGrandTotal: 0, date: new Date().toISOString().slice(0, 10) });

const useBillStore = create(persist((set, get) => ({
  bill: newBill(), assignments: {}, completedBills: [], isLoadingBills: false, billsError: null, isSaving: false,
  pendingSave: null, savedBill: null,
  updateBill: data => set(s => ({ bill: { ...s.bill, ...data } })),
  addPerson: (name, email = '', userId = '') => set(s => ({ bill: { ...s.bill, persons: [...s.bill.persons, { id: createId(), name, email, userId, paymentInfo: { bank: '', accountNumber: '', qrisData: '' } }] } })),
  updatePerson: (id, data) => set(s => ({ bill: { ...s.bill, persons: s.bill.persons.map(p => p.id === id ? { ...p, ...data, paymentInfo: { ...p.paymentInfo, ...data.paymentInfo } } : p) } })),
  removePerson: id => set(s => {
    const assignments = { ...s.assignments }; delete assignments[id];
    return { bill: { ...s.bill, persons: s.bill.persons.filter(p => p.id !== id), payerId: s.bill.payerId === id ? null : s.bill.payerId }, assignments };
  }),
  addItem: () => set(s => ({ bill: { ...s.bill, items: [...s.bill.items, { id: createId(), name: '', price: 0, quantity: 1 }] } })),
  updateItem: (id, data) => set(s => ({ bill: { ...s.bill, items: s.bill.items.map(item => item.id === id ? { ...item, ...data } : item) } })),
  removeItem: id => set(s => ({ bill: { ...s.bill, items: s.bill.items.filter(i => i.id !== id) }, assignments: Object.fromEntries(Object.entries(s.assignments).map(([person, items]) => [person, Object.fromEntries(Object.entries(items).filter(([item]) => item !== id))])) })),
  resetBill: () => set({ bill: newBill(), assignments: {}, pendingSave: null, savedBill: null }),
  toggleAssignment: (personId, itemId) => set(s => ({ assignments: { ...s.assignments, [personId]: { ...s.assignments[personId], [itemId]: !s.assignments[personId]?.[itemId] } } })),
  calculateTotals: () => calculateShares(get().bill, get().assignments),
  fetchCompletedBills: async () => {
    if (!useAuthStore.getState().accessToken) return;
    set({ isLoadingBills: true, billsError: null });
    try {
      const res = await api.getBills();
      set({ completedBills: (res?.data || []).map(b => ({ id: b.id, title: b.title, merchant: b.merchant || '', completedAt: b.created_at, grandTotal: b.grand_total, user_share: b.user_share || 0, receivable: b.receivable || 0, payable: b.payable || 0, personCount: b.person_count, status: b.status, discount: b.discount || 0, payerName: b.payer_name || '', billDate: b.bill_date || '', totals: [], items: [], persons: [], assignments: {}, serverData: b })), isLoadingBills: false });
    } catch (err) { set({ isLoadingBills: false, billsError: err.message }); }
  },
  completeBill: async (status = 'pending') => {
    const s = get();
    if (s.isSaving) throw new Error('Save already in progress');
    const auth = useAuthStore.getState();
    if (!auth.accessToken) throw new Error('Sign in to save bills');
    if (s.savedBill) {
      if (s.savedBill.user_id === auth.user.id) return s.savedBill;
      throw new Error('Start a new bill for this account.');
    }
    const b = s.bill;
    const data = {
      title: b.title || 'Untitled Bill', merchant: b.merchant || '',
      items: b.items.map(i => ({ id: i.id, name: i.name, price: i.unitPrice ?? i.price, quantity: i.qty ?? i.quantity ?? 1 })),
      persons: b.persons.map(p => ({ id: p.id, name: p.name, email: p.email || '', user_id: p.userId || '', custom_amount: p.customAmount || 0, percentage: p.percentage || 0, payment_info: p.paymentInfo || {}, is_payer: p.id === b.payerId })),
      split_type: b.splitType,
      assignments: Object.entries(s.assignments).flatMap(([person_id, items]) => Object.entries(items).filter(([, selected]) => selected).map(([item_id]) => ({ person_id, item_id }))),
      service_charge: b.serviceCharge || 0, service_mode: b.serviceMode, tax: b.tax || 0, tax_mode: b.taxMode, discount: b.discount || 0, bill_date: b.date, status: status || 'pending',
    };
    const payload = JSON.stringify(data);
    // Retry the exact uncertain request before allowing edits to create another bill.
    if (s.pendingSave && (s.pendingSave.payload !== payload || s.pendingSave.userId !== auth.user.id)) throw new Error('A previous save is unresolved. Restore its values and retry, or start a new bill after checking History.');
    const pendingSave = s.pendingSave || { payload, userId: auth.user.id, key: createId() };
    set({ isSaving: true, pendingSave });
    try {
      const saved = await api.createBill({ ...data, request_key: pendingSave.key });
      set({ pendingSave: null, savedBill: status === 'draft' ? null : saved });
      await get().fetchCompletedBills();
      return saved;
    } catch (err) {
      if (err.status >= 400 && err.status < 500) set({ pendingSave: null });
      throw err;
    } finally { set({ isSaving: false }); }
  },
  loadBillDraft: async id => {
    const data = await api.getBill(id); const b = data.bill || data;
    const people = b.persons || [];
    set({ bill: { ...newBill(), title: b.title, merchant: b.merchant, items: b.items || [], persons: people.map(p => ({ ...p, userId: p.user_id, customAmount: p.custom_amount, paymentInfo: p.payment_info || {} })), payerId: people.find(p => p.is_payer)?.id || null, tax: b.tax, taxMode: b.tax_mode, serviceCharge: b.service_charge, serviceMode: b.service_mode, discount: b.discount, date: b.bill_date, splitType: b.split_type }, assignments: Object.fromEntries(people.map(p => [p.id, Object.fromEntries((b.items || []).map(i => [i.id, (i.assigned_person_ids || []).includes(p.id)]))])), pendingSave: null, savedBill: null });
  },
  deleteCompletedBill: async id => { await api.deleteBill(id); await get().fetchCompletedBills(); },
  settings: { darkMode: null, currency: 'IDR', autoScan: true, roundNumbers: false, taxAllocation: 'proportionate', serviceChargeHandling: 'proportionate' },
  ui: { activeTab: 'dashboard', step: 1 },
  updateSettings: data => set(s => ({ settings: { ...s.settings, ...data } })),
  updateUI: data => set(s => ({ ui: { ...s.ui, ...data } })),
}), {
  name: 'splitmate-storage',
  partialize: s => ({ settings: s.settings, bill: s.bill, assignments: s.assignments, ui: s.ui, pendingSave: s.pendingSave, savedBill: s.savedBill }),
  merge: (persisted, current) => ({ ...current, ...persisted, bill: { ...current.bill, ...persisted?.bill }, settings: { ...current.settings, ...persisted?.settings } }),
}));
export default useBillStore;
