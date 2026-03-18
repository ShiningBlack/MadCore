import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { initDb } from '../lib/db';

interface User {
  username: string;
  avatar?: string;
  lastLogin: string;
}

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  error: string | null;
  
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string) => Promise<boolean>;
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
          const users = await db.select<any[]>(
            'SELECT * FROM users WHERE username = $1 AND password = $2',
            [username, password]
          );

          if (users.length > 0) {
            set({
              user: {
                username: users[0].username,
                avatar: users[0].avatar,
                lastLogin: new Date().toISOString(),
              },
              isAuthenticated: true,
              error: null
            });
            return true;
          } else {
            set({ error: 'Username or password incorrect' });
            return false;
          }
        } catch (err: any) {
          set({ error: `System error: ${err.message}` });
          return false;
        }
      },

      register: async (username, password) => {
        set({ error: null });
        try {
          const db = await initDb();
          const exists = await db.select<any[]>('SELECT * FROM users WHERE username = $1', [username]);
          if (exists.length > 0) {
            set({ error: 'User already exists' });
            return false;
          }

          const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
          await db.execute(
            'INSERT INTO users (username, password, avatar) VALUES ($1, $2, $3)',
            [username, password, avatar]
          );

          set({
            user: { username, avatar, lastLogin: new Date().toISOString() },
            isAuthenticated: true,
            error: null
          });
          return true;
        } catch (err: any) {
          set({ error: `System error: ${err.message}` });
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
