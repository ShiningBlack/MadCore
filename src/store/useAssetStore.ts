import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AssetAccount, Transaction, TransactionType } from '../types/asset';
import { api } from '../lib/api';

interface AssetState {
  accounts: AssetAccount[];
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  showBalances: boolean;

  toggleBalances: () => void;
  clearError: () => void;
  clearAssets: () => void;

  fetchAccounts: () => Promise<void>;
  addAccount: (account: Omit<AssetAccount, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  updateAccount: (accountId: string, updates: Partial<AssetAccount>) => Promise<void>;
  deleteAccount: (accountId: string) => Promise<void>;

  fetchTransactions: () => Promise<void>;
  addTransaction: (params: {
    asset_id: string;
    type: TransactionType;
    amount: number;
    note?: string;
    price?: number;
    shares_change?: number;
    fee?: number;
    status?: 'pending' | 'confirmed';
    confirm_date?: string;
  }) => Promise<void>;

  confirmPendingTransaction: (txId: number, nav: number) => Promise<void>;
  updateValuations: () => Promise<void>;
}

export const useAssetStore = create<AssetState>()(
  persist(
    (set, get) => ({
      accounts: [],
      transactions: [],
      isLoading: false,
      error: null,
      showBalances: true,

      toggleBalances: () => set((s) => ({ showBalances: !s.showBalances })),
      clearError: () => set({ error: null }),
      clearAssets: () => set({ accounts: [], transactions: [] }),

      // ── Fetch all accounts for user ──────────────────────────────────
      fetchAccounts: async () => {
        set({ isLoading: true, error: null });
        try {
          const accounts = await api<AssetAccount[]>('/api/assets/');
          set({ accounts, isLoading: false });
          get().updateValuations();
        } catch (err: any) {
          set({ error: `加载失败: ${err.message || err}`, isLoading: false });
        }
      },

      // ── Add a new account ────────────────────────────────────────────
      addAccount: async (account) => {
        set({ error: null });
        try {
          await api('/api/assets/', {
            method: 'POST',
            body: JSON.stringify({
              name: account.name,
              type: account.type,
              balance: account.balance,
              currency: account.currency,
              account_number: account.accountNumber,
              symbol_code: account.symbolCode,
              shares: account.shares,
              cost_price: account.costPrice,
              settlement_days: account.settlementDays ?? 1,
            }),
          });
          await get().fetchAccounts();
        } catch (err: any) {
          set({ error: `保存失败: ${err.message || err}` });
        }
      },

      // ── Update account ──────────────────────────────────────
      updateAccount: async (accountId, updates) => {
        set({ error: null });
        try {
          const payload: any = { ...updates };
          if (updates.accountNumber !== undefined) payload.account_number = updates.accountNumber;
          if (updates.symbolCode !== undefined) payload.symbol_code = updates.symbolCode;
          if (updates.costPrice !== undefined) payload.cost_price = updates.costPrice;
          if (updates.settlementDays !== undefined) payload.settlement_days = updates.settlementDays;

          await api(`/api/assets/${accountId}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          });
          await get().fetchAccounts();
        } catch (err: any) {
          set({ error: `更新失败: ${err.message || err}` });
        }
      },

      // ── Delete account ───────────────────────────────────────────────
      deleteAccount: async (accountId) => {
        set({ error: null });
        try {
          await api(`/api/assets/${accountId}`, {
            method: 'DELETE',
          });
          await get().fetchAccounts();
        } catch (err: any) {
          set({ error: `删除失败: ${err.message || err}` });
        }
      },

      // ── Fetch all transactions ─────────────────────
      fetchTransactions: async () => {
        try {
          const transactions = await api<Transaction[]>('/api/transactions/');
          set({ transactions });
        } catch (err: any) {
          console.error('fetchTransactions error:', err);
        }
      },

      // ── Add a transaction ─────────────────────────────────────────────
      addTransaction: async (params) => {
        set({ error: null });
        try {
          await api('/api/transactions/', {
            method: 'POST',
            body: JSON.stringify(params),
          });

          await get().fetchAccounts();
          await get().fetchTransactions();
        } catch (err: any) {
          set({ error: `交易失败: ${err.message || err}` });
        }
      },

      // ── Confirm a pending fund_buy ────────────────────────────────────
      confirmPendingTransaction: async (txId, price) => {
        set({ error: null });
        try {
          // This assumes we simply update the transaction price, 
          // and the backend handles updating shares/balance if implemented that way, 
          // or we may need custom logic.
          // Since the backend handles the business logic, it's safer to just PUT the transaction.
          await api(`/api/transactions/${txId}`, {
            method: 'PUT',
            body: JSON.stringify({
              status: 'confirmed',
              price,
            }),
          });
          
          await get().fetchAccounts();
          await get().fetchTransactions();
        } catch (err: any) {
          set({ error: `确认失败: ${err.message || err}` });
        }
      },

      // ── Fetch real-time valuations for all fund/stock accounts ──────────────
      updateValuations: async () => {
        const { accounts } = get();
        const investAccounts = accounts.filter(
          (a) => (a.type === 'fund' || a.type === 'stock') && a.symbolCode && a.symbolCode !== 'undefined'
        );
        if (investAccounts.length === 0) return;

        // Fetch all valuations in parallel
        const realtimeResults = await Promise.all(
          investAccounts.map(async (account) => {
            try {
              const endpoint = account.type === 'fund'
                ? `/api/finance/fund/realtime/${account.symbolCode}`
                : `/api/finance/stock/realtime/${account.symbolCode}`;
              const data = await api<any>(endpoint);
              // Server returns array for fund (one-element list), object for stock
              const realtime = Array.isArray(data) ? data[0] : data;
              return { id: account.id, realtime };
            } catch (e) {
              console.warn(`Failed to update valuation for ${account.name}`, e);
              return { id: account.id, realtime: null };
            }
          })
        );

        const updated = [...accounts];
        for (const { id, realtime } of realtimeResults) {
          if (!realtime) continue;
          const idx = updated.findIndex((a) => a.id === id);
          if (idx === -1) continue;
          const acc = updated[idx];
          if (acc.shares && acc.shares > 0) {
            // gsz = estimated NAV (fund), price = stock price
            const estimatedPrice = acc.type === 'fund'
              ? parseFloat(realtime.gsz || realtime.dwjz || '0')
              : parseFloat(String(realtime.price || '0'));
            if (!isNaN(estimatedPrice) && estimatedPrice > 0) {
              updated[idx] = { ...acc, balance: acc.shares * estimatedPrice, realtime };
            } else {
              updated[idx] = { ...acc, realtime };
            }
          } else {
            updated[idx] = { ...acc, realtime };
          }
        }
        set({ accounts: updated });
      },
    }),
    {
      name: 'madcore-asset-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ showBalances: state.showBalances }),
    }
  )
);
