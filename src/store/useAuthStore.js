import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';
import { API } from '../config/api';
import useBillStore from './useBillStore';

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


const useAuthStore = create(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      isGuest: false,
      loginError: null,
      registerError: null,
      isLoggingIn: false,
      isRegistering: false,

      get isAuthenticated() {
        return !!get().accessToken;
      },

      setGuest: () => {
        set({ isGuest: true, user: null, accessToken: null, refreshToken: null });
        resetActiveBill();
      },

      login: async (email, password) => {
        set({ isLoggingIn: true, loginError: null });
        try {
          const data = await api.login(email, password);
          set({
            user: data.user,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
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
            refreshToken: data.refresh_token,
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
        const { refreshToken } = get();
        try {
          if (refreshToken) await api.logout(refreshToken);
        } catch {
          // ignore logout errors
        }
        set({ user: null, accessToken: null, refreshToken: null, isGuest: false, loginError: null, registerError: null });
        resetActiveBill();
      },

      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),

      silentRefresh: async () => {
        const state = get();
        if (!state.refreshToken) {
          set({ user: null, accessToken: null, refreshToken: null, isGuest: false });
          return false;
        }
        try {
          const res = await fetch(`${API.base}/api/v1/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: state.refreshToken }),
          });
          if (!res.ok) {
            set({ user: null, accessToken: null, refreshToken: null, isGuest: false });
            return false;
          }
          const body = await res.json();
          const data = body.data || body;
          set({
            user: data.user || state.user,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
          });
          return true;
        } catch {
          set({ user: null, accessToken: null, refreshToken: null, isGuest: false });
          return false;
        }
      },

      clearErrors: () => set({ loginError: null, registerError: null }),
    }),
    {
      name: 'splitmate-auth',
      partialize: (state) => ({
        refreshToken: state.refreshToken,
        isGuest: state.isGuest,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state._hasHydrated = true;
      },
      // Use Zustand persist hasHydrated via store
    }
  )
);

export default useAuthStore;
