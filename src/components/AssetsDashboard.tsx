import React, { useMemo, useEffect, useState } from 'react';
import { AssetAccount } from '../types/asset';
import { TotalNetWorth } from './TotalNetWorth';
import { AssetList } from './AssetList';
import { AssetDetailModal } from './AssetDetailModal';
import { AddAssetModal } from './AddAssetModal';
import {
  LayoutDashboard, Plus, LogOut, Loader2, AlertCircle, X, RefreshCw
} from 'lucide-react';
import { useAssetStore } from '../store/useAssetStore';
import { useUserStore } from '../store/useUserStore';

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

  useEffect(() => {
    if (user) {
      fetchAccounts(user.id, user.username);
    }
  }, [user?.id]);

  const handleLogout = () => {
    clearAssets();
    userLogout();
  };

  const totalNetWorth = useMemo(() => accounts.reduce((s, a) => s + a.balance, 0), [accounts]);

  const liquidAssets = useMemo(
    () => accounts.filter(a => ['cash', 'bank', 'alipay', 'wechat'].includes(a.type)),
    [accounts]
  );
  const investmentAssets = useMemo(
    () => accounts.filter(a => a.type === 'fund'),
    [accounts]
  );

  // Today's estimated fund PnL
  const todayFundPnL = useMemo(() => {
    return accounts
      .filter(a => a.type === 'fund' && a.realtime && a.shares && a.shares > 0)
      .reduce((sum, a) => {
        const gszzl = parseFloat(a.realtime!.gszzl);
        const gsz = parseFloat(a.realtime!.gsz);
        if (!isNaN(gszzl) && !isNaN(gsz)) {
          return sum + (a.shares! * gsz * gszzl) / 100;
        }
        return sum;
      }, 0);
  }, [accounts]);




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
                {todayFundPnL !== 0 && (
                  <span className={todayFundPnL >= 0 ? 'text-rose-400' : 'text-emerald-400'}>
                    今日基金估算{todayFundPnL >= 0 ? ' +' : ' '}
                    {showBalances ? todayFundPnL.toFixed(2) : '***'} ·{' '}
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
            todayPnL={todayFundPnL}
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
          </div>
        )}
      </div>

      <AddAssetModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      <AssetDetailModal account={selectedAccount} onClose={() => setSelectedAccount(null)} />
    </div>
  );
};
