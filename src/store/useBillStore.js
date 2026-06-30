import { create } from 'zustand';
import { persist } from 'zustand/middleware';
const createId = () => crypto.randomUUID();
import { api } from '../lib/api';
import useAuthStore from './useAuthStore';

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

      addPerson: (name) => set((state) => ({
        bill: {
          ...state.bill,
          persons: [...state.bill.persons, { 
            id: createId(), 
            name: name || '', 
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
            persons: state.bill.persons.filter(p => p.id !== id)
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
        }
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
          payerId: null,
          splitType: 'equal',
          date: new Date().toISOString().slice(0, 10),
        },
        assignments: {},
      }),

      completedBills: [],

      isLoadingBills: false,
      billsError: null,
      isSaving: false,

      fetchCompletedBills: async () => {
        const isAuth = !!useAuthStore.getState().accessToken;
        if (!isAuth) return;
        set({ isLoadingBills: true, billsError: null });
        try {
          const res = await api.getBills();
          set({
            completedBills: (res && res.data ? res.data.map(bill => ({
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
              totals: [],
              items: [],
              persons: [],
              assignments: {},
              serverData: bill,
            })) : []),
            isLoadingBills: false,
          });
        } catch (err) {
          console.error('Failed to fetch bills from server:', err);
          set({ isLoadingBills: false, billsError: err.message || 'Failed to load bills' });
        }
      },

      completeBill: async (customStatus = null) => {
        const state = get();
        if (state.isSaving) throw new Error('Save already in progress');
        set({ isSaving: true });

        const isAuth = !!useAuthStore.getState().accessToken;

        const billData = {
          title: state.bill.title || 'Untitled Bill',
          merchant: state.bill.merchant || '',
          items: state.bill.items.map(item => ({ id: item.id, name: item.name, price: item.unitPrice ?? item.price, quantity: item.qty ?? item.quantity ?? 1 })),
          persons: state.bill.persons.map(p => ({
            id: p.id,
            name: p.name,
            payment_info: p.paymentInfo || {},
            is_payer: p.id === state.bill.payerId,
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
          discount: state.bill.discount || 0,
          bill_date: state.bill.date || new Date().toISOString().slice(0, 10),
          status: customStatus || (state.bill.persons.every(p => (p.id === (state.bill.payerId || state.bill.persons[0]?.id)) || false) ? 'completed' : 'pending'),
        };

        if (!isAuth) {
          set({ isSaving: false });
          throw new Error('Must be logged in to save bills');
        }

        try {
          await api.createBill(billData);
        } catch (err) {
          set({ isSaving: false });
          throw err;
        }
        try {
          await get().fetchCompletedBills();
        } catch (err) {
          console.error('Bill saved but failed to refresh list:', err);
        }
        set({ isSaving: false });
      },

      loadBillDraft: async (id) => {
        try {
          const data = await api.getBill(id);
          const billData = data.bill || data;
          const persons = billData.persons || [];
          const payer = persons.find(p => p.is_payer);

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
                paymentInfo: p.payment_info || { bank: '', accountNumber: '', qrisData: '' },
              })),
              tax: billData.tax || 0,
              taxMode: billData.tax_mode || 'percent',
              serviceCharge: billData.service_charge || 0,
              serviceMode: billData.service_mode || 'percent',
              discount: billData.discount || 0,
              date: billData.bill_date || new Date().toISOString().slice(0, 10),
              payerId: payer?.id || null,
              splitType: 'equal',
            },
            assignments: {},
          });
        } catch (err) {
          console.error('Failed to load bill draft:', err);
        }
      },

      deleteCompletedBill: async (id) => {
        try {
          await api.deleteBill(id);
          await get().fetchCompletedBills();
        } catch (err) {
          console.error('Failed to delete bill from server:', err);
        }
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
        const { bill, assignments, settings } = get();
        const lineTotal = (item) => (item.unitPrice ?? item.price) * (item.qty ?? item.quantity ?? 1);
        const totalBillSubtotal = bill.items.reduce((sum, item) => sum + lineTotal(item), 0);

        const totalTax = bill.taxMode === 'percent'
          ? totalBillSubtotal * (bill.tax / 100)
          : bill.tax;

        const totalService = bill.serviceMode === 'percent'
          ? totalBillSubtotal * (bill.serviceCharge / 100)
          : bill.serviceCharge;

        const grandTotal = totalBillSubtotal + totalTax + totalService;
        const personCount = bill.persons.length || 1;

        const taxAlloc = settings.taxAllocation || 'proportionate';
        const svcAlloc = settings.serviceChargeHandling || 'proportionate';

        const distributeTax = (shareRatio) =>
          taxAlloc === 'even' ? totalTax / personCount : totalTax * shareRatio;

        const distributeService = (shareRatio) =>
          svcAlloc === 'even' ? totalService / personCount : totalService * shareRatio;

        const round = (v) =>
          settings.roundNumbers ? Math.round(v) : Number(v.toFixed(2));

        // Percentage split
        if (bill.splitType === 'percentage') {
          return bill.persons.map((person) => {
            const ratio = (person.percentage || 0) / 100;
            const personShare = grandTotal * ratio;
            const personTax = distributeTax(ratio);
            const personService = distributeService(ratio);
            const personSubtotal = Math.max(0, personShare - personTax - personService);

            return {
              ...person,
              subtotal: round(personSubtotal),
              tax: round(personTax),
              service: round(personService),
              total: round(personShare),
            };
          });
        }

        // Custom split
        if (bill.splitType === 'custom') {
          return bill.persons.map((person) => {
            const customSubtotal = Math.max(0, person.customAmount || 0);
            const shareRatio = totalBillSubtotal > 0 ? customSubtotal / totalBillSubtotal : 0;
            const personTax = distributeTax(shareRatio);
            const personService = distributeService(shareRatio);

            return {
              ...person,
              subtotal: round(customSubtotal),
              tax: round(personTax),
              service: round(personService),
              total: round(customSubtotal + personTax + personService),
            };
          });
        }

        // Equal / shared-items split
        return bill.persons.map((person) => {
          let subtotal = 0;
          bill.items.forEach((item) => {
            const assignedPersons = bill.persons.filter((p) => assignments[p.id]?.[item.id]);
            const sharers = assignedPersons.length > 0 ? assignedPersons : bill.persons;
            const isAssigned = assignedPersons.length > 0 ? (assignments[person.id]?.[item.id] || false) : true;
            if (isAssigned && sharers.length > 0) {
              subtotal += lineTotal(item) / sharers.length;
            }
          });

          const shareRatio = totalBillSubtotal > 0 ? subtotal / totalBillSubtotal : 0;
          const personTax = distributeTax(shareRatio);
          const personService = distributeService(shareRatio);

          return {
            ...person,
            subtotal: round(subtotal),
            tax: round(personTax),
            service: round(personService),
            total: round(subtotal + personTax + personService),
          };
        });
      },

      settings: {
        darkMode: true,
        currency: 'IDR',
        autoScan: true,
        roundNumbers: true,
        taxAllocation: 'proportionate',
        serviceChargeHandling: 'proportionate',
      },

      ui: {
        activeTab: 'dashboard',
        step: 1,
      },

      updateSettings: (data) => set((state) => ({
        settings: { ...state.settings, ...data }
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
      }),
      merge: (persisted, current) => {
        const merged = { ...current, ...persisted };
        merged.bill = { ...current.bill, ...persisted.bill };
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
