import { create } from 'zustand';
import { WatchlistItem, FundRealtime } from '../types/asset';
import { getDb, initDb } from '../lib/db';
import { invoke } from '@tauri-apps/api/core';

interface WatchlistState {
  items: WatchlistItem[];
  isLoading: boolean;
  error: string | null;

  fetchWatchlist: (userId: number) => Promise<void>;
  addToWatchlist: (userId: number, item: Omit<WatchlistItem, 'id' | 'userId'>) => Promise<void>;
  updateWatchlistItem: (id: string, userId: number, patch: Partial<WatchlistItem>) => Promise<void>;
  removeFromWatchlist: (id: string, userId: number) => Promise<void>;
  updateWatchlistValuations: () => Promise<void>;
  clearWatchlist: () => void;
}

export const useWatchlistStore = create<WatchlistState>()((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  fetchWatchlist: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const db = await initDb();
      const rows = await db.select<any[]>(
        'SELECT * FROM watchlist WHERE user_id = $1 ORDER BY created_at ASC',
        [userId]
      );
      const items: WatchlistItem[] = rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        fundCode: r.fund_code,
        name: r.name ?? undefined,
        note: r.note ?? undefined,
        simAmount: r.sim_amount ?? undefined,
        simNav: r.sim_nav ?? undefined,
        simDate: r.sim_date ?? undefined,
        simShares: r.sim_shares ?? undefined,
      }));
      set({ items, isLoading: false });
      get().updateWatchlistValuations();
    } catch (err: any) {
      set({ error: `加载监控列表失败: ${err.message || err}`, isLoading: false });
    }
  },

  addToWatchlist: async (userId, item) => {
    set({ error: null });
    try {
      const db = await getDb();
      const id = crypto.randomUUID();
      await db.execute(
        `INSERT INTO watchlist (id, user_id, fund_code, name, note, sim_amount, sim_nav, sim_date, sim_shares)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          id, userId, item.fundCode, item.name ?? null, item.note ?? null,
          item.simAmount ?? null, item.simNav ?? null, item.simDate ?? null, item.simShares ?? null,
        ]
      );
      await get().fetchWatchlist(userId);
    } catch (err: any) {
      set({ error: `添加失败: ${err.message || err}` });
    }
  },

  updateWatchlistItem: async (id, userId, patch) => {
    set({ error: null });
    try {
      const db = await getDb();
      await db.execute(
        `UPDATE watchlist SET name=$1, note=$2, sim_amount=$3, sim_nav=$4, sim_date=$5, sim_shares=$6 WHERE id=$7`,
        [
          patch.name ?? null, patch.note ?? null,
          patch.simAmount ?? null, patch.simNav ?? null,
          patch.simDate ?? null, patch.simShares ?? null,
          id,
        ]
      );
      await get().fetchWatchlist(userId);
    } catch (err: any) {
      set({ error: `更新失败: ${err.message || err}` });
    }
  },

  removeFromWatchlist: async (id, userId) => {
    set({ error: null });
    try {
      const db = await getDb();
      await db.execute('DELETE FROM watchlist WHERE id = $1', [id]);
      await get().fetchWatchlist(userId);
    } catch (err: any) {
      set({ error: `删除失败: ${err.message || err}` });
    }
  },

  updateWatchlistValuations: async () => {
    const { items } = get();
    if (!items.length) return;
    const updated = [...items];
    for (let i = 0; i < updated.length; i++) {
      try {
        const realtime: FundRealtime = await invoke('fetch_fund_realtime', { code: updated[i].fundCode });
        updated[i] = { ...updated[i], realtime };
      } catch (e) {
        console.warn(`Watchlist: failed to fetch ${updated[i].fundCode}`, e);
      }
    }
    set({ items: updated });
  },

  clearWatchlist: () => set({ items: [] }),
}));
