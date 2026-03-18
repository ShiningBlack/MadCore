import React, { useMemo, useEffect, useState } from 'react';
import { AssetAccount } from '../types/asset';
import { TotalNetWorth } from './TotalNetWorth';
import { AssetList } from './AssetList';
import { LayoutDashboard, Plus, Database, LogOut, Loader2, AlertCircle, X, RefreshCw, Languages } from 'lucide-react';
import { useAssetStore } from '../store/useAssetStore';
import { useUserStore } from '../store/useUserStore';
import { AddAssetModal } from './AddAssetModal';
import { AssetDetailModal } from './AssetDetailModal';
import { useTranslation } from 'react-i18next';

export const AssetsDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AssetAccount | null>(null);
  
  const { user, logout: userLogout } = useUserStore();
  const { 
    accounts, 
    fetchAccounts, 
    addAccount, 
    updateValuations,
    isLoading,
    error,
    clearError,
    showBalances,
    toggleBalances,
    clearAssets
  } = useAssetStore();

  useEffect(() => {
    if (user?.username) {
      fetchAccounts(user.username);
    }
  }, [user?.username, fetchAccounts]);

  const handleLogout = () => {
    clearAssets();
    userLogout();
  };

  const toggleLanguage = () => {
    const nextLng = i18n.language.startsWith('zh') ? 'en' : 'zh';
    i18n.changeLanguage(nextLng);
  };

  const totalNetWorth = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + acc.balance, 0);
  }, [accounts]);

  const liquidAssets = useMemo(() => {
    return accounts.filter(acc => ['cash', 'bank', 'alipay', 'wechat'].includes(acc.type));
  }, [accounts]);

  const investmentAssets = useMemo(() => {
    return accounts.filter(acc => ['fund'].includes(acc.type));
  }, [accounts]);

  const seedMockData = async () => {
    if (!user || accounts.length > 0) return;
    try {
      const mockData: Omit<AssetAccount, 'id'>[] = [
        { name: t('asset.type.cash'), type: 'cash', balance: 2500, currency: 'CNY' },
        { name: 'China Merchants Bank', type: 'bank', balance: 52400.50, currency: 'CNY', accountNumber: '5678' },
        { name: t('asset.type.alipay'), type: 'alipay', balance: 8900.25, currency: 'CNY' },
        { name: t('asset.type.wechat'), type: 'wechat', balance: 3200.00, currency: 'CNY' },
        { name: 'Fund A', type: 'fund', balance: 25000.00, currency: 'CNY', fundCode: '001186' },
      ];
      for (const item of mockData) {
        await addAccount(user.username, item);
      }
    } catch (err) {
      console.error("Seed failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 w-full p-6 md:p-8 text-gray-900 dark:text-white">
      {error && (
        <div className="fixed top-6 right-6 z-[100] animate-in slide-in-from-top-4 duration-300">
          <div className="bg-red-500 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/20">
            <AlertCircle size={20} />
            <span className="text-sm font-bold">{error}</span>
            <button onClick={clearError} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div className="flex items-center gap-4">
            {user?.avatar ? (
              <img src={user.avatar} alt="Avatar" className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 p-1 shadow-inner border-2 border-white dark:border-zinc-800" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                <LayoutDashboard size={28} />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                {t('dashboard.hi', { name: user?.username })}
              </h1>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('dashboard.welcome_msg')}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleLanguage}
              className="p-2.5 bg-white dark:bg-zinc-900 text-gray-500 hover:text-indigo-600 rounded-xl border border-gray-100 dark:border-zinc-800 transition-all shadow-sm flex items-center gap-2"
              title="Change Language"
            >
              <Languages size={20} />
              <span className="text-xs font-bold uppercase">{i18n.language.startsWith('zh') ? 'EN' : '中文'}</span>
            </button>

            <button 
              onClick={() => updateValuations()}
              className="p-2.5 bg-white dark:bg-zinc-900 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl border border-gray-100 dark:border-zinc-800 transition-all shadow-sm"
              title={t('dashboard.refresh')}
            >
              <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
            </button>

            {accounts.length === 0 && !isLoading && (
              <button 
                onClick={seedMockData}
                className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-all text-sm font-bold shadow-lg shadow-amber-500/20 active:scale-95"
              >
                <Database size={18} />
                {t('dashboard.demo_data')}
              </button>
            )}
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all text-sm font-bold shadow-lg shadow-indigo-500/20 active:scale-95"
            >
              <Plus size={20} />
              {t('dashboard.new_asset')}
            </button>
            <button 
              onClick={handleLogout}
              className="p-2.5 bg-white dark:bg-zinc-900 text-gray-400 hover:text-red-500 rounded-xl border border-gray-100 dark:border-zinc-800 transition-all shadow-sm hover:shadow-md active:scale-90"
              title={t('dashboard.logout')}
            >
              <LogOut size={22} />
            </button>
          </div>
        </header>

        <AddAssetModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
        <AssetDetailModal account={selectedAccount} onClose={() => setSelectedAccount(null)} />

        <div className="mb-10">
          <TotalNetWorth total={totalNetWorth} show={showBalances} onToggle={toggleBalances} />
        </div>

        {isLoading && accounts.length === 0 ? (
          <div className="flex flex-col justify-center items-center py-24 text-gray-400">
            <Loader2 size={40} className="animate-spin text-indigo-500 mb-4" />
            <p className="font-bold uppercase tracking-widest text-xs">{t('dashboard.securing_data')}</p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <AssetList title={t('dashboard.liquid_assets')} accounts={liquidAssets} onAccountClick={setSelectedAccount} />
            <AssetList title={t('dashboard.investments')} accounts={investmentAssets} onAccountClick={setSelectedAccount} />
          </div>
        )}
      </div>
    </div>
  );
};
