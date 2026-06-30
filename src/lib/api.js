import { API } from '../config/api';
import useAuthStore from '../store/useAuthStore';
import { getErrorMessage } from '../utils/errors';

const authBase = `${API.base}/api/v1/auth`;
const ocrBase = `${API.base}/api/v1/ocr`;

let refreshPromise = null;

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${authBase}/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) return false;

      const body = await res.json();
      const data = body.data || body;
      useAuthStore.getState().setTokens(data.access_token);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request(path, options = {}) {
  const accessToken = useAuthStore.getState().accessToken;

  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...options.headers,
  };

  const isFormData = options.body instanceof FormData;
  if (isFormData) {
    delete headers['Content-Type'];
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  const signal = options.signal || controller.signal;

  try {
    const res = await fetch(`${API.base}${path}`, {
      ...options,
      headers,
      signal,
      credentials: 'include',
    });
    clearTimeout(timeoutId);

    if (res.status === 204) return null;

    const body = await res.json().catch(() => ({}));

    if (res.status === 401 && body.error?.code !== 'INVALID_CREDENTIALS') {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        const newToken = useAuthStore.getState().accessToken;
        const retryController = new AbortController();
        const retryTimeout = setTimeout(() => retryController.abort(), 30000);
        const retryRes = await fetch(`${API.base}${path}`, {
          ...options,
          headers: { ...headers, Authorization: `Bearer ${newToken}` },
          signal: retryController.signal,
          credentials: 'include',
        });
        clearTimeout(retryTimeout);
        if (retryRes.status === 204) return null;
        const retryBody = await retryRes.json().catch(() => ({}));
        if (retryBody.success) return retryBody.data;
        throw new Error(getErrorMessage({
          code: retryBody.error?.code,
          message: retryBody.message,
        }));
      }
      useAuthStore.getState().logout();
      throw new Error('Session expired. Please login again.');
    }

    if (!body.success) {
      throw new Error(getErrorMessage({
        code: body.error?.code,
        message: body.message,
      }));
    }

    return body.data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.', { cause: err });
    }
    throw new Error(err.message, { cause: err });
  }
}

export const api = {
  // Auth
  login: (email, password) =>
    request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (name, email, password) =>
    request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  logout: async () => {
    try {
      await fetch(`${authBase}/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore logout errors
    }
  },

  // Bills
  getBills: (page = 1, limit = 20, fromDate = '', toDate = '') => {
    const params = new URLSearchParams({ page, limit });
    if (fromDate) params.append('from_date', fromDate);
    if (toDate) params.append('to_date', toDate);
    return request(`/api/v1/bills?${params}`);
  },

  getBill: (id) => request(`/api/v1/bills/${id}`),

  createBill: (billData) =>
    request('/api/v1/bills', {
      method: 'POST',
      body: JSON.stringify(billData),
    }),

  updateBillStatus: (id, status) =>
    request(`/api/v1/bills/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  markPersonPaid: (billId, personId) =>
    request(`/api/v1/bills/${billId}/payments/${personId}`, {
      method: 'PATCH',
    }),

  deleteBill: (id) =>
    request(`/api/v1/bills/${id}`, { method: 'DELETE' }),

  // OCR (public endpoint, no auth required)
  processOCR: async (file) => {
    const formData = new FormData();
    formData.append('image', file);

    const res = await fetch(ocrBase, {
      method: 'POST',
      body: formData,
    });

    if (res.status === 204) return null;

    const body = await res.json().catch(() => ({}));

    if (!body.success) {
      throw new Error(getErrorMessage({
        code: body.error?.code,
        message: body.message,
      }));
    }

    return body.data;
  },

  // User
  getMe: () => request('/api/v1/users/me'),

  updateMe: (data) => request('/api/v1/users/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  // Contacts
  getContacts: () => request('/api/v1/contacts'),

  createContact: (name) =>
    request('/api/v1/contacts', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  deleteContact: (id) =>
    request(`/api/v1/contacts/${id}`, { method: 'DELETE' }),

  // Usage
  getUsage: () => request('/api/v1/usage'),
};
