import { create } from 'zustand';
import { persist } from 'zustand/middleware';
const createId = () => crypto.randomUUID();
import { api } from '../lib/api';
import useAuthStore from './useAuthStore';
import { billAmounts, calculateShares, splitError } from '../utils/shares';

let accountEpoch = 0;
let listRequest = 0;
let debtsRequest = 0;

const useBillStore = create(
  persist(
    (set, get) => ({
      bill: {
        id: createId(),
        title: '',
        merchant: '',
        imageUrl: '',
        items: [],
        persons: [],
        tax: 11,
        taxMode: 'percent',
        serviceCharge: 5,
        serviceMode: 'percent',
        payerId: null,
        splitType: 'equal',
        discount: 0,
        ocrConfidence: 0,
        ocrSubtotal: 0,
        ocrGrandTotal: 0,
        date: new Date().toISOString().slice(0, 10),
      },
      
      updateBill: (data) => set((state) => ({ 
        bill: { ...state.bill, ...data } 
      })),

      addPerson: (name, email = '', userId = null) => set((state) => ({
        bill: {
          ...state.bill,
          persons: [...state.bill.persons, { 
            id: createId(), 
            name: name || '', 
            email: email || '',
            userId,
            paymentInfo: { bank: '', accountNumber: '', qrisData: '' } 
          }]
        }
      })),

      updatePerson: (id, data) => set((state) => ({
        bill: {
          ...state.bill,
          persons: state.bill.persons.map(p => {
            if (p.id === id) {
              const updatedPerson = { ...p, ...data };
              // Deep merge paymentInfo if it exists in both
              if (data.paymentInfo && p.paymentInfo) {
                updatedPerson.paymentInfo = { ...p.paymentInfo, ...data.paymentInfo };
              }
              return updatedPerson;
            }
            return p;
          })
        }
      })),

      removePerson: (id) => set((state) => {
        const restAssignments = { ...state.assignments };
        delete restAssignments[id];
        return {
          bill: {
            ...state.bill,
            persons: state.bill.persons.filter(p => p.id !== id),
            payerId: state.bill.payerId === id ? null : state.bill.payerId,
          },
          assignments: restAssignments
        };
      }),

      addItem: () => set((state) => ({
        bill: {
          ...state.bill,
          items: [...state.bill.items, { id: createId(), name: '', price: 0, quantity: 1 }]
        }
      })),

      updateItem: (id, data) => set((state) => ({
        bill: {
          ...state.bill,
          items: state.bill.items.map(item => item.id === id ? { ...item, ...data } : item)
        }
      })),

      removeItem: (id) => set((state) => ({
        bill: {
          ...state.bill,
          items: state.bill.items.filter(item => item.id !== id)
        },
        assignments: Object.fromEntries(Object.entries(state.assignments).map(([personId, items]) => [personId, Object.fromEntries(Object.entries(items).filter(([itemId]) => itemId !== id))])),
      })),

      resetBill: () => set({
        bill: {
          id: createId(),
          title: '',
          merchant: '',
          imageUrl: '',
          items: [],
          persons: [],
          tax: 11,
          taxMode: 'percent',
          serviceCharge: 5,
          serviceMode: 'percent',
          discount: 0,
          discountMode: 'amount',
          ocrConfidence: 0,
          ocrSubtotal: 0,
          ocrGrandTotal: 0,
          payerId: null,
          splitType: 'equal',
          date: new Date().toISOString().slice(0, 10),
        },
        assignments: {},
        pendingSave: null,
        savedBill: null,
      }),

      completedBills: [],
      pagination: null,
      debts: [],
      debtsError: null,
      isLoadingDebts: false,
      pendingSave: null,

      resetAccountData: () => {
        accountEpoch++;
        listRequest++;
        debtsRequest++;
        get().resetBill();
        set({ completedBills: [], pagination: null, debts: [], debtsError: null, isLoadingDebts: false, billsError: null, isLoadingBills: false, isSaving: false });
      },

      isLoadingBills: false,
      billsError: null,
      isSaving: false,

      fetchCompletedBills: async (page = 1) => {
        const isAuth = !!useAuthStore.getState().accessToken;
        if (!isAuth) return;
        const epoch = accountEpoch;
        const request = ++listRequest;
        set({ isLoadingBills: true, billsError: null });
        try {
          const res = await api.getBills(page);
          if (epoch !== accountEpoch || request !== listRequest) return;
          const previous = page === 1 ? [] : get().completedBills;
          set({
            completedBills: [...previous, ...(res && res.data ? res.data.filter(b => !previous.some(p => p.id === b.id)).map(bill => ({
              id: bill.id,
              title: bill.title,
              merchant: bill.merchant || '',
              completedAt: bill.created_at,
              grandTotal: bill.grand_total,
              user_share: bill.user_share || 0,
              receivable: bill.receivable || 0,
              payable: bill.payable || 0,
              personCount: bill.person_count,
              status: bill.status || 'pending',
              discount: bill.discount || 0,
              payerName: bill.payer_name || '',
              billDate: bill.bill_date || bill.date || '',
              totals: [],
              items: [],
              persons: [],
              assignments: {},
              serverData: bill,
            })) : [])],
            pagination: res.pagination,
            isLoadingBills: false,
          });
        } catch (err) {
          if (epoch !== accountEpoch || request !== listRequest) return;
          console.error('Failed to fetch bills from server:', err);
          set({ isLoadingBills: false, billsError: err.message || 'Failed to load bills' });
        }
      },

      fetchDebts: async () => {
        if (!useAuthStore.getState().accessToken) return;
        const epoch = accountEpoch;
        const request = ++debtsRequest;
        set({ isLoadingDebts: true, debtsError: null });
        try {
          const debts = await api.getDebts();
          if (epoch === accountEpoch && request === debtsRequest) set({ debts: debts || [], isLoadingDebts: false });
        } catch (err) {
          if (epoch === accountEpoch && request === debtsRequest) set({ debtsError: err.message, isLoadingDebts: false });
        }
      },

      completeBill: async (customStatus = null) => {
        const state = get();
        if (state.isSaving) throw new Error('Save already in progress');
        const isAuth = !!useAuthStore.getState().accessToken;
        if (!isAuth) throw new Error('Must be logged in to save bills');
        const status = customStatus || 'pending';
        if (state.savedBill) {
          if (state.savedBill.user_id === useAuthStore.getState().user?.id) return state.savedBill;
          throw new Error('Start a new bill for this account.');
        }
        const validation = splitError(status === 'draft' ? { ...state.bill, splitType: 'equal' } : state.bill);
        if (validation) throw new Error(validation);
        const epoch = accountEpoch;

        const billData = {
          title: state.bill.title || 'Untitled Bill',
          merchant: state.bill.merchant || '',
          items: state.bill.items.map(item => ({ id: item.id, name: item.name, price: item.unitPrice ?? item.price, quantity: item.qty ?? item.quantity ?? 1 })),
          persons: state.bill.persons.map(p => ({
            id: p.id,
            name: p.name,
            email: p.email || '',
            user_id: p.userId || undefined,
            custom_amount: p.customAmount || 0,
            payment_info: p.paymentInfo || {},
            is_payer: p.id === state.bill.payerId,
            percentage: state.bill.splitType === 'percentage' ? (p.percentage || 0) : 0,
          })),
          split_type: state.bill.splitType || 'custom',
          assignments: Object.entries(state.assignments).flatMap(([personId, items]) =>
            Object.entries(items)
              .filter(([, assigned]) => assigned)
              .map(([itemId]) => ({ person_id: personId, item_id: itemId }))
          ),
          service_charge: state.bill.serviceCharge || 0,
          service_mode: state.bill.serviceMode || 'percent',
          tax: state.bill.tax || 0,
          tax_mode: state.bill.taxMode || 'percent',
          discount: billAmounts(state.bill).discount,
          bill_date: state.bill.date || new Date().toISOString().slice(0, 10),
          status,
        };
        const payload = JSON.stringify(billData);
        const userId = useAuthStore.getState().user?.id;
        // ponytail: an ambiguous save may already have landed. Until it is resolved, refuse a
        // changed payload rather than risk a second bill for the same receipt.
        if (state.pendingSave && (state.pendingSave.payload !== payload || state.pendingSave.userId !== userId)) {
          throw new Error('A previous save is unresolved. Retry the same values, or start a new bill after checking History.');
        }
        const pendingSave = state.pendingSave || { payload, userId, key: createId() };
        set({ isSaving: true, pendingSave });
        try {
          // ponytail: resuming saves a copy; preserve the original draft rather than delete-before-create.
          const saved = await api.createBill({ ...billData, request_key: pendingSave.key });
          if (epoch !== accountEpoch) throw new Error('Account changed while saving.');
          set({ pendingSave: null, savedBill: status === 'draft' ? null : saved });
          await Promise.all([get().fetchCompletedBills(), get().fetchDebts()]);
          if (epoch !== accountEpoch) throw new Error('Account changed while saving.');
          return saved;
        } catch (err) {
          // ponytail: a client-rejected payload is not an ambiguous save; drop the key so the user can correct and resubmit.
          if (err?.status === 400) set({ pendingSave: null });
          throw err;
        } finally {
          if (epoch === accountEpoch) set({ isSaving: false });
        }
      },

      loadBillDraft: async (id) => {
        const epoch = accountEpoch;
        try {
          const data = await api.getBill(id);
          const billData = data.bill || data;
          const persons = billData.persons || [];
          const payer = persons.find(p => p.is_payer);
          if (epoch !== accountEpoch) throw new Error('Account changed while loading.');
          if (billData.status !== 'draft') throw new Error('Only drafts can be resumed.');

          set({
            bill: {
              id: billData.id,
              title: billData.title || '',
              merchant: billData.merchant || '',
              imageUrl: '',
              items: (billData.items || []).map(item => ({ id: item.id, name: item.name, price: item.price, qty: item.quantity || 1, quantity: item.quantity || 1 })),
              persons: persons.map(p => ({
                id: p.id,
                name: p.name,
                email: p.email || '',
                userId: p.user_id || null,
                percentage: p.percentage || 0,
                customAmount: p.custom_amount || 0,
                paymentInfo: p.payment_info || { bank: '', accountNumber: '', qrisData: '' },
              })),
              tax: billData.tax || 0,
              taxMode: billData.tax_mode || 'percent',
              serviceCharge: billData.service_charge || 0,
              serviceMode: billData.service_mode || 'percent',
              discount: billData.discount || 0,
              discountMode: 'amount',
              date: billData.bill_date || new Date().toISOString().slice(0, 10),
              payerId: payer?.id || null,
              splitType: billData.split_type,
            },
            assignments: Object.fromEntries(persons.map(p => [p.id, Object.fromEntries((billData.items || []).filter(item => item.assigned_person_ids?.includes(p.id)).map(item => [item.id, true]))])),
            pendingSave: null,
          });
        } catch (err) {
          console.error('Failed to load bill draft:', err);
          throw err;
        }
      },

      deleteCompletedBill: async (id) => {
        const epoch = accountEpoch;
        await api.deleteBill(id);
        if (epoch !== accountEpoch) throw new Error('Account changed while deleting.');
        await Promise.all([get().fetchCompletedBills(), get().fetchDebts()]);
      },

      assignments: {}, // { personId: { itemId: boolean } }

      toggleAssignment: (personId, itemId) => set((state) => {
        const personAssignments = state.assignments[personId] || {};
        return {
          assignments: {
            ...state.assignments,
            [personId]: {
              ...personAssignments,
              [itemId]: !personAssignments[itemId]
            }
          }
        };
      }),

      // Selection Strategy: Calculate Shares
      calculateTotals: () => {
        const { bill, assignments } = get();
        return calculateShares(bill, assignments);
      },

      settings: {
        darkMode: null,
        currency: 'IDR',
        autoScan: true,
      },

      ui: {
        activeTab: 'dashboard',
        step: 1,
      },

      updateSettings: (data) => set((state) => ({
        settings: { ...state.settings, ...data, currency: 'IDR' }
      })),

      updateUI: (data) => set((state) => ({
        ui: { ...state.ui, ...data }
      })),
    }),
    {
      name: 'splitmate-storage',
      partialize: (state) => ({
        settings: state.settings,
        bill: state.bill,
        assignments: state.assignments,
        ui: state.ui,
        pendingSave: state.pendingSave,
      }),
      merge: (persisted, current) => {
        const merged = { ...current, ...persisted };
        merged.bill = { ...current.bill, ...persisted.bill };
        merged.settings = { ...current.settings, ...persisted.settings, currency: 'IDR' };
        if (merged.bill.persons) {
          merged.bill.persons = merged.bill.persons.map(p => ({
            ...p,
            id: /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(String(p.id)) ? p.id : crypto.randomUUID(),
          }));
        }
        return merged;
      },
    }
  )
);

export default useBillStore;
