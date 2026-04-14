import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';

export interface User {
  id: number;
  username: string;
  email?: string;
  avatar?: string;
  created_at: string;
}

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  error: string | null;

  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string, email?: string) => Promise<boolean>;
  fetchProfile: () => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      error: null,

      clearError: () => set({ error: null }),

      login: async (username, password) => {
        set({ error: null });
        try {
          const body = new URLSearchParams();
          body.append('username', username);
          body.append('password', password);

          const tokenData = await api<{ access_token: string; token_type: string }>('/api/auth/login', {
            method: 'POST',
            body,
          });

          localStorage.setItem('madcore_token', tokenData.access_token);

          // Fetch user profile after successful login
          await get().fetchProfile();
          return true;
        } catch (err: any) {
          set({ error: err.data?.detail || '用户名或密码错误' });
          return false;
        }
      },

      register: async (username, password, email) => {
        set({ error: null });
        try {
          await api('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({
              username,
              password,
              email: email || undefined,
            }),
          });

          // After registration, log them in automatically
          return await get().login(username, password);
        } catch (err: any) {
          set({ error: err.data?.detail || '注册失败' });
          return false;
        }
      },

      fetchProfile: async () => {
        try {
          const user = await api<User>('/api/auth/me');
          set({ user, isAuthenticated: true, error: null });
        } catch (err: any) {
          set({ user: null, isAuthenticated: false, error: '登录已过期，请重新登录' });
          localStorage.removeItem('madcore_token');
        }
      },

      logout: () => {
        localStorage.removeItem('madcore_token');
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'madcore-user-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
