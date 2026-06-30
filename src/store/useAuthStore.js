import { create } from 'zustand';
import { api } from '../lib/api';
import useBillStore from './useBillStore';

// Clear stale localStorage key from old auth implementation
try { localStorage.removeItem('splitmate-auth'); } catch {}

const resetActiveBill = () => {
  try {
    const store = useBillStore.getState();
    if (typeof store.resetBill === 'function') {
      store.resetBill();
    }
    if (typeof store.updateUI === 'function') {
      store.updateUI({ activeTab: 'dashboard', step: 1 });
    }
  } catch (err) {
    console.warn('Error trying to reset active bill store:', err);
  }
};

const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  loginError: null,
  registerError: null,
  isLoggingIn: false,
  isRegistering: false,

  login: async (email, password) => {
    set({ isLoggingIn: true, loginError: null });
    try {
      const data = await api.login(email, password);
      set({
        user: data.user,
        accessToken: data.access_token,
        isLoggingIn: false,
        loginError: null,
      });
      resetActiveBill();
      return true;
    } catch (err) {
      set({ loginError: err.message, isLoggingIn: false });
      return false;
    }
  },

  register: async (name, email, password) => {
    set({ isRegistering: true, registerError: null });
    try {
      const data = await api.register(name, email, password);
      set({
        user: data.user,
        accessToken: data.access_token,
        isRegistering: false,
        registerError: null,
      });
      resetActiveBill();
      return true;
    } catch (err) {
      set({ registerError: err.message, isRegistering: false });
      return false;
    }
  },

  logout: async () => {
    try {
      await api.logout();
    } catch {
      // ignore logout errors
    }
    set({ user: null, accessToken: null, loginError: null, registerError: null });
    resetActiveBill();
  },

  setTokens: (accessToken) => set({ accessToken }),

  silentRefresh: async (signal) => {
    try {
      const res = await fetch(
        `${window.location.origin}/api/v1/auth/refresh`,
        {
          method: 'POST',
          credentials: 'include',
          signal,
        },
      );
      if (!res.ok) {
        set({ user: null, accessToken: null });
        return false;
      }
      const body = await res.json();
      const data = body.data || body;
      set({
        user: data.user || get().user,
        accessToken: data.access_token,
      });
      return true;
    } catch (err) {
      if (err.name === 'AbortError') return false;
      set({ user: null, accessToken: null });
      return false;
    }
  },

  clearErrors: () => set({ loginError: null, registerError: null }),
}));

export default useAuthStore;
