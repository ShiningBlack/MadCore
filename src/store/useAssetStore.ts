import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AssetAccount, Transaction, TransactionType, FundRealtime } from '../types/asset';
import { getDb, initDb } from '../lib/db';
import { invoke } from '@tauri-apps/api/core';

interface AssetState {
  accounts: AssetAccount[];
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  showBalances: boolean;

  toggleBalances: () => void;
  clearError: () => void;
  clearAssets: () => void;

  fetchAccounts: (userId: number, username: string) => Promise<void>;
  addAccount: (userId: number, username: string, account: Omit<AssetAccount, 'id' | 'userId'>) => Promise<void>;
  updateAccountBalance: (accountId: string, newBalance: number, userId: number, username: string) => Promise<void>;
  deleteAccount: (accountId: string, userId: number, username: string) => Promise<void>;

  fetchTransactions: (assetId: string) => Promise<void>;
  addTransaction: (
    assetId: string,
    userId: number,
    type: TransactionType,
    amount: number,
    note: string,
    sharesChange?: number
  ) => Promise<void>;

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

      // ── Fetch all accounts for user ────────────────────────────────
      fetchAccounts: async (userId, username) => {
        set({ isLoading: true, error: null });
        try {
          const db = await initDb();
          const rows = await db.select<any[]>(
            'SELECT * FROM assets WHERE user_id = $1 OR (user_id = 0 AND username = $2) ORDER BY created_at DESC',
            [userId, username]
          );

          const accounts: AssetAccount[] = rows.map((r) => ({
            id: r.id,
            userId: r.user_id ?? userId,
            name: r.name,
            type: r.type,
            balance: r.balance,
            currency: r.currency,
            accountNumber: r.account_number,
            fundCode: r.fund_code,
            shares: r.shares ?? undefined,
            costPrice: r.cost_price ?? undefined,
          }));

          set({ accounts, isLoading: false });
          get().updateValuations();
        } catch (err: any) {
          set({ error: `加载失败: ${err.message || err}`, isLoading: false });
        }
      },

      // ── Add a new account ──────────────────────────────────────────
      addAccount: async (userId, username, account) => {
        set({ error: null });
        try {
          const db = await getDb();
          const id = crypto.randomUUID();
          await db.execute(
            `INSERT INTO assets (id, user_id, username, name, type, balance, currency, account_number, fund_code, shares, cost_price)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              id, userId, username, account.name, account.type,
              account.balance, account.currency,
              account.accountNumber ?? null, account.fundCode ?? null,
              account.shares ?? null, account.costPrice ?? null,
            ]
          );
          await get().fetchAccounts(userId, username);
        } catch (err: any) {
          set({ error: `保存失败: ${err.message || err}` });
        }
      },

      // ── Update balance directly (after transaction) ────────────────
      updateAccountBalance: async (accountId, newBalance, userId, username) => {
        set({ error: null });
        try {
          const db = await getDb();
          await db.execute('UPDATE assets SET balance = $1 WHERE id = $2', [newBalance, accountId]);
          await get().fetchAccounts(userId, username);
        } catch (err: any) {
          set({ error: `更新失败: ${err.message || err}` });
        }
      },

      // ── Delete account ─────────────────────────────────────────────
      deleteAccount: async (accountId, userId, username) => {
        set({ error: null });
        try {
          const db = await getDb();
          await db.execute('DELETE FROM transactions WHERE asset_id = $1', [accountId]);
          await db.execute('DELETE FROM assets WHERE id = $1', [accountId]);
          await get().fetchAccounts(userId, username);
        } catch (err: any) {
          set({ error: `删除失败: ${err.message || err}` });
        }
      },

      // ── Fetch transactions for a specific account ───────────────────
      fetchTransactions: async (assetId) => {
        try {
          const db = await getDb();
          const rows = await db.select<any[]>(
            'SELECT * FROM transactions WHERE asset_id = $1 ORDER BY timestamp DESC LIMIT 100',
            [assetId]
          );
          const transactions: Transaction[] = rows.map((r) => ({
            id: r.id,
            assetId: r.asset_id,
            userId: r.user_id,
            type: r.type,
            amount: r.amount,
            note: r.note,
            timestamp: r.timestamp,
          }));
          set({ transactions });
        } catch (err: any) {
          console.error('fetchTransactions error:', err);
        }
      },

      // ── Add a transaction and update account balance ────────────────
      addTransaction: async (assetId, userId, type, amount, note, sharesChange) => {
        set({ error: null });
        try {
          const db = await getDb();
          await db.execute(
            'INSERT INTO transactions (asset_id, user_id, type, amount, note) VALUES ($1, $2, $3, $4, $5)',
            [assetId, userId, type, amount, note]
          );

          // Update balance based on transaction type
          const account = get().accounts.find((a) => a.id === assetId);
          if (account) {
            let newBalance = account.balance;
            let newShares = account.shares ?? 0;

            if (type === 'income' || type === 'transfer_in' || type === 'fund_dividend') {
              newBalance += amount;
            } else if (type === 'expense' || type === 'transfer_out') {
              newBalance -= amount;
            } else if (type === 'fund_buy') {
              newBalance += amount; // amount is the new market value after buy
              newShares += sharesChange ?? 0;
            } else if (type === 'fund_sell') {
              newBalance -= amount;
              newShares -= sharesChange ?? 0;
            }

            // Ensure non-negative shares
            newShares = Math.max(0, newShares);

            await db.execute(
              'UPDATE assets SET balance = $1, shares = $2 WHERE id = $3',
              [newBalance, newShares, assetId]
            );

            // Re-fetch the user's account list
            const user = get().accounts.find(a => a.id === assetId);
            if (user) {
              await get().fetchAccounts(account.userId, '');
            }
          }
          await get().fetchTransactions(assetId);
        } catch (err: any) {
          set({ error: `交易失败: ${err.message || err}` });
        }
      },

      // ── Fetch real-time valuations for all fund accounts ───────────
      updateValuations: async () => {
        const { accounts } = get();
        const funds = accounts.filter((a) => a.type === 'fund' && a.fundCode);
        if (funds.length === 0) return;

        const updated = [...accounts];
        for (const fund of funds) {
          try {
            const realtime: FundRealtime = await invoke('fetch_fund_realtime', { code: fund.fundCode });
            const idx = updated.findIndex((a) => a.id === fund.id);
            if (idx !== -1) {
              // If we track shares, update balance = shares × estimated NAV
              if (updated[idx].shares && updated[idx].shares! > 0) {
                const estimatedNAV = parseFloat(realtime.gsz);
                if (!isNaN(estimatedNAV)) {
                  updated[idx] = {
                    ...updated[idx],
                    balance: updated[idx].shares! * estimatedNAV,
                    realtime,
                  };
                } else {
                  updated[idx] = { ...updated[idx], realtime };
                }
              } else {
                updated[idx] = { ...updated[idx], realtime };
              }
            }
          } catch (e) {
            console.warn(`Failed to update valuation for ${fund.name}`, e);
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
