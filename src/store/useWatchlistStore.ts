import { create } from 'zustand';
import { WatchlistItem } from '../types/asset';
import { api } from '../lib/api';

interface WatchlistState {
  items: WatchlistItem[];
  isLoading: boolean;
  error: string | null;

  fetchWatchlist: () => Promise<void>;
  addToWatchlist: (item: Omit<WatchlistItem, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  updateWatchlistItem: (id: string, patch: Partial<WatchlistItem>) => Promise<void>;
  removeFromWatchlist: (id: string) => Promise<void>;
  updateWatchlistValuations: () => Promise<void>;
  clearWatchlist: () => void;
}

export const useWatchlistStore = create<WatchlistState>()((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  fetchWatchlist: async () => {
    set({ isLoading: true, error: null });
    try {
      const items = await api<WatchlistItem[]>('/api/watchlist/');
      set({ items, isLoading: false });
      get().updateWatchlistValuations();
    } catch (err: any) {
      set({ error: `加载监控列表失败: ${err.message || err}`, isLoading: false });
    }
  },

  addToWatchlist: async (item) => {
    set({ error: null });
    try {
      await api('/api/watchlist/', {
        method: 'POST',
        body: JSON.stringify({
          symbol_code: item.symbolCode,
          symbol_type: item.symbolType,
          name: item.name,
          note: item.note,
          sim_amount: item.simAmount,
          sim_price: item.simPrice,
          sim_date: item.simDate,
          sim_shares: item.simShares,
        }),
      });
      await get().fetchWatchlist();
    } catch (err: any) {
      set({ error: `添加失败: ${err.message || err}` });
    }
  },

  updateWatchlistItem: async (id, patch) => {
    set({ error: null });
    try {
      const payload: any = { ...patch };
      if (patch.simAmount !== undefined) payload.sim_amount = patch.simAmount;
      if (patch.simPrice !== undefined) payload.sim_price = patch.simPrice;
      if (patch.simDate !== undefined) payload.sim_date = patch.simDate;
      if (patch.simShares !== undefined) payload.sim_shares = patch.simShares;

      await api(`/api/watchlist/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      await get().fetchWatchlist();
    } catch (err: any) {
      set({ error: `更新失败: ${err.message || err}` });
    }
  },

  removeFromWatchlist: async (id) => {
    set({ error: null });
    try {
      await api(`/api/watchlist/${id}`, {
        method: 'DELETE',
      });
      await get().fetchWatchlist();
    } catch (err: any) {
      set({ error: `删除失败: ${err.message || err}` });
    }
  },

  updateWatchlistValuations: async () => {
    const { items } = get();
    if (!items.length) return;

    // Fetch all realtime data in parallel
    const results = await Promise.all(
      items.map(async (item) => {
        try {
          const endpoint = item.symbolType === 'fund'
            ? `/api/finance/fund/realtime/${item.symbolCode}`
            : `/api/finance/stock/realtime/${item.symbolCode}`;
          const data = await api<any>(endpoint);
          const realtime = Array.isArray(data) ? data[0] : data;
          return { id: item.id, realtime };
        } catch (e) {
          console.warn(`Watchlist: failed to fetch ${item.symbolCode}`, e);
          return { id: item.id, realtime: null };
        }
      })
    );

    const updated = items.map((item) => {
      const found = results.find((r) => r.id === item.id);
      if (found?.realtime) {
        return { ...item, realtime: found.realtime };
      }
      return item;
    });
    set({ items: updated });
  },

  clearWatchlist: () => set({ items: [] }),
}));
