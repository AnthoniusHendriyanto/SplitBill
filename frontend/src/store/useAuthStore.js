import { create } from 'zustand';
import { api } from '../lib/api';
import useBillStore from './useBillStore';

// Clear stale localStorage key from old auth implementation
try { localStorage.removeItem('splitmate-auth'); } catch { /* Storage may be disabled by the browser. */ }

const resetActiveBill = () => {
  try {
    const store = useBillStore.getState();
    store.resetAccountData();
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
  sessionVersion: 0,

  login: async (email, password) => {
    const version = get().sessionVersion + 1;
    set({ sessionVersion: version, user: null, accessToken: null, isLoggingIn: true, loginError: null });
    resetActiveBill();
    try {
      const data = await api.login(email, password);
      if (get().sessionVersion !== version) return false;
      set({
        user: data.user,
        accessToken: data.access_token,
        isLoggingIn: false,
        loginError: null,
      });
      return true;
    } catch (err) {
      if (get().sessionVersion !== version) return false;
      set({ loginError: err.message, isLoggingIn: false });
      return false;
    }
  },

  register: async (name, email, password) => {
    const version = get().sessionVersion + 1;
    set({ sessionVersion: version, user: null, accessToken: null, isRegistering: true, registerError: null });
    resetActiveBill();
    try {
      const data = await api.register(name, email, password);
      if (get().sessionVersion !== version) return false;
      set({
        user: data.user,
        accessToken: data.access_token,
        isRegistering: false,
        registerError: null,
      });
      return true;
    } catch (err) {
      if (get().sessionVersion !== version) return false;
      set({ registerError: err.message, isRegistering: false });
      return false;
    }
  },

  logout: async () => {
    set({ sessionVersion: get().sessionVersion + 1, user: null, accessToken: null, loginError: null, registerError: null, isLoggingIn: false, isRegistering: false });
    resetActiveBill();
    try {
      await api.logout();
    } catch {
      // ignore logout errors
    }
  },

  setTokens: (accessToken) => set({ accessToken }),

  silentRefresh: async (signal) => {
    const version = get().sessionVersion;
    try {
      const res = await fetch(
        `${window.location.origin}/api/v1/auth/refresh`,
        {
          method: 'POST',
          credentials: 'include',
          signal,
        },
      );
      if (get().sessionVersion !== version) return false;
      if (!res.ok) {
        set({ user: null, accessToken: null });
        resetActiveBill();
        return false;
      }
      const body = await res.json();
      const data = body.data || body;
      if (get().sessionVersion !== version) return false;
      set({
        user: data.user || get().user,
        accessToken: data.access_token,
      });
      return true;
    } catch (err) {
      if (get().sessionVersion !== version) return false;
      if (err.name === 'AbortError') return false;
      set({ user: null, accessToken: null });
      resetActiveBill();
      return false;
    }
  },

  clearErrors: () => set({ loginError: null, registerError: null }),
}));

export default useAuthStore;
