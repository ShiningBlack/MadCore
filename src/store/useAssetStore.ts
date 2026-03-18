import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AssetAccount, FundValuation } from '../types/asset';
import { getDb, initDb } from '../lib/db';
import { invoke } from '@tauri-apps/api/core';

interface AssetState {
  accounts: AssetAccount[];
  isLoading: boolean;
  error: string | null;
  showBalances: boolean;
  
  toggleBalances: () => void;
  fetchAccounts: (username: string) => Promise<void>;
  addAccount: (username: string, account: Omit<AssetAccount, 'id'>) => Promise<void>;
  deleteAccount: (username: string, id: string) => Promise<void>;
  updateValuations: () => Promise<void>; // Fetch valuations for all funds
  clearAssets: () => void;
  clearError: () => void;
}

export const useAssetStore = create<AssetState>()(
  persist(
    (set, get) => ({
      accounts: [],
      isLoading: false,
      error: null,
      showBalances: true,

      toggleBalances: () => set((state) => ({ showBalances: !state.showBalances })),
      clearError: () => set({ error: null }),
      clearAssets: () => set({ accounts: [] }),

      fetchAccounts: async (username) => {
        set({ isLoading: true, error: null });
        try {
          const db = await initDb();
          const results = await db.select<any[]>(
            'SELECT * FROM assets WHERE username = $1 ORDER BY created_at DESC',
            [username]
          );
          
          const accounts: AssetAccount[] = results.map(row => ({
            id: row.id,
            name: row.name,
            type: row.type,
            balance: row.balance,
            currency: row.currency,
            accountNumber: row.account_number,
            fundCode: row.fund_code
          }));
          
          set({ accounts, isLoading: false });
          // Automatically update valuations for funds
          get().updateValuations();
        } catch (err: any) {
          set({ error: `Fetch Error: ${err.message}`, isLoading: false });
        }
      },

      updateValuations: async () => {
        const { accounts } = get();
        const funds = accounts.filter(a => a.type === 'fund' && a.fundCode);
        if (funds.length === 0) return;

        const updatedAccounts = [...accounts];
        for (const fund of funds) {
          try {
            const valuation: FundValuation = await invoke('fetch_fund_data', { code: fund.fundCode });
            const index = updatedAccounts.findIndex(a => a.id === fund.id);
            if (index !== -1) {
              updatedAccounts[index] = { ...updatedAccounts[index], valuation };
            }
          } catch (e) {
            console.warn(`Failed to update valuation for ${fund.name}`, e);
          }
        }
        set({ accounts: updatedAccounts });
      },

      addAccount: async (username, account) => {
        set({ error: null });
        try {
          const db = await getDb();
          const id = crypto.randomUUID();
          await db.execute(
            'INSERT INTO assets (id, username, name, type, balance, currency, account_number, fund_code) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [id, username, account.name, account.type, account.balance, account.currency, account.accountNumber, account.fundCode]
          );
          await get().fetchAccounts(username);
        } catch (err: any) {
          set({ error: `Save Error: ${err.message}` });
        }
      },

      deleteAccount: async (username, id) => {
        set({ error: null });
        try {
          const db = await getDb();
          await db.execute('DELETE FROM assets WHERE id = $1 AND username = $2', [id, username]);
          await get().fetchAccounts(username);
        } catch (err: any) {
          set({ error: `Delete Error: ${err.message}` });
        }
      },
    }),
    {
      name: 'madcore-asset-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ showBalances: state.showBalances }),
    }
  )
);
