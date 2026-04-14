import React, { useMemo, useEffect, useState } from 'react';
import { AssetAccount } from '../types/asset';
import { TotalNetWorth } from './TotalNetWorth';
import { AssetList } from './AssetList';
import { AssetDetailModal } from './AssetDetailModal';
import { AddAssetModal } from './AddAssetModal';
import { WatchlistPanel } from './WatchlistPanel';
import {
  LayoutDashboard, Plus, LogOut, Loader2, AlertCircle, X, RefreshCw
} from 'lucide-react';
import { useAssetStore } from '../store/useAssetStore';
import { useUserStore } from '../store/useUserStore';
import { useWatchlistStore } from '../store/useWatchlistStore';

export const AssetsDashboard: React.FC = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AssetAccount | null>(null);

  const { user, logout: userLogout } = useUserStore();
  const {
    accounts,
    fetchAccounts,
    updateValuations,
    isLoading,
    error,
    clearError,
    showBalances,
    toggleBalances,
    clearAssets,
  } = useAssetStore();

  const { fetchWatchlist, clearWatchlist } = useWatchlistStore();

  useEffect(() => {
    if (user) {
      fetchAccounts();
      fetchWatchlist();

      // Poll real-time valuations every 1 minute
      const intervalId = setInterval(() => {
        updateValuations();
        useWatchlistStore.getState().updateWatchlistValuations();
      }, 60000);

      return () => clearInterval(intervalId);
    }
  }, [user?.id]);

  const handleLogout = () => {
    clearAssets();
    clearWatchlist();
    userLogout();
  };

  const totalNetWorth = useMemo(() => accounts.reduce((s, a) => s + a.balance, 0), [accounts]);

  const liquidAssets = useMemo(
    () => accounts.filter(a => ['cash', 'bank', 'alipay', 'wechat'].includes(a.type)),
    [accounts]
  );
  const investmentAssets = useMemo(
    () => accounts.filter(a => a.type === 'fund' || a.type === 'stock'),
    [accounts]
  );

  // Today's estimated fund/stock PnL
  const todayPnL = useMemo(() => {
    return accounts
      .filter(a => (a.type === 'fund' || a.type === 'stock') && a.realtime && a.shares && a.shares > 0)
      .reduce((sum, a) => {
        const rt = a.realtime!;
        let changeRate = 0;
        let price = 0;

        if ('gszzl' in rt) {
          const gszzlRaw = parseFloat(rt.gszzl ?? '');
          const gszRaw = parseFloat(rt.gsz ?? '');
          changeRate = isFinite(gszzlRaw) ? gszzlRaw : 0;
          price = isFinite(gszRaw) ? gszRaw : 0;
        } else if ('change_rate' in rt || 'change_percent' in rt) {
          const cr = (rt as any).change_rate ?? (rt as any).change_percent;
          changeRate = parseFloat(String(cr ?? '0'));
          price = parseFloat(String((rt as any).price ?? '0'));
        }
        
        if (!isNaN(changeRate) && !isNaN(price)) {
          return sum + (a.shares! * price * changeRate) / 100;
        }
        return sum;
      }, 0);
  }, [accounts]);

  // Today's portfolio percentage change
  const todayPnLPct = useMemo(() => {
    if (todayPnL === 0) return 0;
    const baseValue = totalNetWorth - todayPnL;
    if (baseValue <= 0) return 0;
    return (todayPnL / baseValue) * 100;
  }, [todayPnL, totalNetWorth]);

  return (
    <div className="min-h-screen bg-zinc-950 w-full text-white">
      {/* Error toast */}
      {error && (
        <div className="fixed top-4 right-4 z-[100] animate-in slide-in-from-top-4 duration-300">
          <div className="bg-red-500 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10">
            <AlertCircle size={18} />
            <span className="text-sm font-bold">{error}</span>
            <button onClick={clearError} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        {/* ── Header ── */}
        <header className="flex items-center justify-between gap-4 mb-10">
          <div className="flex items-center gap-4">
            {user?.avatar ? (
              <img src={user.avatar} alt="Avatar" className="w-12 h-12 rounded-2xl border border-zinc-800 bg-zinc-800" />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center">
                <LayoutDashboard size={24} />
              </div>
            )}
            <div>
              <h1 className="text-xl font-black tracking-tight text-white">
                你好，{user?.username} 👋
              </h1>
              <p className="text-xs text-zinc-500 font-medium">
                {investmentAssets.length > 0 && (
                  <span className={todayPnL >= 0 ? 'text-rose-400' : 'text-emerald-400'}>
                    今日浮动 {todayPnL >= 0 ? '+' : ''}
                    {showBalances ? `${todayPnL.toFixed(2)} (${todayPnLPct.toFixed(2)}%)` : '***'} ·{' '}
                  </span>
                )}
                个人资产管理中枢
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => updateValuations()}
              className="p-2.5 bg-zinc-900 text-indigo-400 hover:bg-zinc-800 rounded-xl border border-zinc-800 transition-all"
              title="刷新估值"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all text-sm font-bold shadow-lg shadow-indigo-500/20 active:scale-95"
            >
              <Plus size={18} /> 新建资产
            </button>
            <button
              onClick={handleLogout}
              className="p-2.5 bg-zinc-900 text-zinc-500 hover:text-red-400 rounded-xl border border-zinc-800 transition-all"
              title="退出登录"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* ── Total Net Worth ── */}
        <div className="mb-8">
          <TotalNetWorth
            total={totalNetWorth}
            show={showBalances}
            onToggle={toggleBalances}
            liquidTotal={liquidAssets.reduce((s, a) => s + a.balance, 0)}
            investmentTotal={investmentAssets.reduce((s, a) => s + a.balance, 0)}
            todayPnL={todayPnL}
            todayPnLPct={todayPnLPct}
          />
        </div>

        {/* ── Asset Lists ── */}
        {isLoading && accounts.length === 0 ? (
          <div className="flex flex-col justify-center items-center py-24 text-zinc-600">
            <Loader2 size={36} className="animate-spin text-indigo-500 mb-4" />
            <p className="font-bold uppercase tracking-widest text-xs">加载资产数据...</p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <AssetList title="流动资产" accounts={liquidAssets} onAccountClick={setSelectedAccount} />
            <AssetList title="投资资产" accounts={investmentAssets} onAccountClick={setSelectedAccount} />
            <WatchlistPanel />
          </div>
        )}
      </div>

      <AddAssetModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      <AssetDetailModal account={selectedAccount} onClose={() => setSelectedAccount(null)} />
    </div>
  );
};
