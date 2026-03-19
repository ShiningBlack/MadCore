import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { initDb } from '../lib/db';
import { invoke } from '@tauri-apps/api/core';

export interface User {
  id: number;
  username: string;
  email?: string;
  avatar?: string;
  lastLogin: string;
}

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  error: string | null;

  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string, email?: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      error: null,

      clearError: () => set({ error: null }),

      login: async (username, password) => {
        set({ error: null });
        try {
          const db = await initDb();
          
          if (typeof invoke === 'undefined') {
            throw new Error('未检测到 Tauri 环境 (invoke is undefined)。请确保在 Tauri 窗口中运行，而非在普通浏览器中。');
          }

          const hashed: string = await invoke('hash_password', { password });
          const users = await db.select<any[]>(
            'SELECT id, username, email, avatar FROM users WHERE username = $1 AND password = $2',
            [username, hashed]
          );

          if (users.length > 0) {
            const u = users[0];
            set({
              user: {
                id: u.id,
                username: u.username,
                email: u.email,
                avatar: u.avatar,
                lastLogin: new Date().toISOString(),
              },
              isAuthenticated: true,
              error: null,
            });
            return true;
          } else {
            set({ error: '用户名或密码错误' });
            return false;
          }
        } catch (err: any) {
          set({ error: `系统错误: ${err.message || err}` });
          return false;
        }
      },

      register: async (username, password, email) => {
        set({ error: null });
        try {
          const db = await initDb();
          const exists = await db.select<any[]>(
            'SELECT id FROM users WHERE username = $1',
            [username]
          );
          if (exists.length > 0) {
            set({ error: '该用户名已被注册' });
            return false;
          }

          const hashed: string = await invoke('hash_password', { password });
          const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

          await db.execute(
            'INSERT INTO users (username, password, email, avatar) VALUES ($1, $2, $3, $4)',
            [username, hashed, email ?? null, avatar]
          );

          const created = await db.select<any[]>(
            'SELECT id, username, email, avatar FROM users WHERE username = $1',
            [username]
          );
          const u = created[0];

          set({
            user: {
              id: u.id,
              username: u.username,
              email: u.email,
              avatar: u.avatar,
              lastLogin: new Date().toISOString(),
            },
            isAuthenticated: true,
            error: null,
          });
          return true;
        } catch (err: any) {
          set({ error: `系统错误: ${err.message || err}` });
          return false;
        }
      },

      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'madcore-user-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
