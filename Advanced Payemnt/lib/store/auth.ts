import { create } from 'zustand';
import { User } from '../types';
import api from '../api-client';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (email: string, password: string) => Promise<any>;
  verify2FA: (merchant_id: string, code: string) => Promise<void>;
  logout: () => void;
  signup: (businessName: string, email: string, phone: string, password: string) => Promise<void>;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,

  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  fetchUser: async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    try {
        const merchant = await api.get<any, any>('/merchants/me');
        const user = {
          id: merchant?.data?.id || merchant?.id || '',
          email: merchant?.data?.email || merchant?.email || '',
          name: merchant?.data?.business_name || merchant?.businessName || 'Merchant',
          role: 'merchant' as const,
          createdAt: merchant?.data?.created_at || merchant?.createdAt || new Date().toISOString(),
        };
        set({ user });
    } catch {
        // Leave unchanged
    }
  },

  verify2FA: async (merchant_id: string, code: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.post<any, any>('/auth/login/2fa', { merchant_id, code });
      const token = data?.access_token || data?.data?.access_token;
      if (!token) throw new Error('2FA Login failed');

      localStorage.setItem('authToken', token);
      set({ token, isLoading: false });
      await useAuthStore.getState().fetchUser();

    } catch (error) {
      const errAny: any = error;
      const backendMsg = errAny?.response?.data?.error;
      const msg = backendMsg || (error instanceof Error ? error.message : 'Invalid 2FA code');
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.post<any, any>('/auth/login', { email, password });
      
      const payload = data?.data || data;

      if (payload?.requires_2fa) {
        set({ isLoading: false });
        return { requires2FA: true, merchantId: payload.merchant_id };
      }

      const token = payload?.access_token;
      if (!token) throw new Error('Login failed');

      localStorage.setItem('authToken', token);
      set({ token, isLoading: false });
      
      await useAuthStore.getState().fetchUser();

      return { requires2FA: false };
    } catch (error) {
      const errAny: any = error;
      const backendMsg = errAny?.response?.data?.error;
      const msg = backendMsg || (error instanceof Error ? error.message : 'Login failed');
      set({
        error: msg,
        isLoading: false
      });
      throw new Error(msg);
    }
  },

  logout: () => {
    set({ user: null, token: null });
    localStorage.removeItem('authToken');
  },

  signup: async (businessName: string, email: string, phone: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.post<any, any>('/auth/register', {
        business_name: businessName,
        email,
        phone,
        password,
      });

      set({ isLoading: false });

      await (useAuthStore.getState().login(email, password));
    } catch (error) {
      const errAny: any = error;
      const backendMsg = errAny?.response?.data?.error;
      const msg = backendMsg || (error instanceof Error ? error.message : 'Signup failed');
      set({
        error: msg,
        isLoading: false
      });
      throw new Error(msg);
    }
  },
}));
