import React, { useMemo } from 'react';
import { AssetAccount } from '../types/asset';
import { TotalNetWorth } from './TotalNetWorth';
import { AssetList } from './AssetList';
import { LayoutDashboard } from 'lucide-react';

// Mock Data
const MOCK_ACCOUNTS: AssetAccount[] = [
  { id: '1', name: '现金钱包', type: 'cash', balance: 2500, currency: 'CNY' },
  { id: '2', name: '招商银行储蓄卡', type: 'bank', balance: 52400.50, currency: 'CNY', accountNumber: '6225888812345678' },
  { id: '3', name: '工商银行', type: 'bank', balance: 15300.00, currency: 'CNY', accountNumber: '6222020211112222' },
  { id: '4', name: '支付宝余额宝', type: 'alipay', balance: 8900.25, currency: 'CNY' },
  { id: '5', name: '微信零钱理财', type: 'wechat', balance: 3200.00, currency: 'CNY' },
  { id: '6', name: '易方达蓝筹精选', type: 'fund', balance: 25000.00, currency: 'CNY' },
];

export const AssetsDashboard: React.FC = () => {
  const totalNetWorth = useMemo(() => {
    return MOCK_ACCOUNTS.reduce((sum, acc) => sum + acc.balance, 0);
  }, []);

  const liquidAssets = useMemo(() => {
    return MOCK_ACCOUNTS.filter(acc => ['cash', 'bank', 'alipay', 'wechat'].includes(acc.type));
  }, []);

  const investmentAssets = useMemo(() => {
    return MOCK_ACCOUNTS.filter(acc => ['fund'].includes(acc.type));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 w-full p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <header className="flex items-center gap-3 mb-8">
          <div className="bg-indigo-600 p-2.5 rounded-xl text-white">
            <LayoutDashboard size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assets Dashboard</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage your wealth overview</p>
          </div>
        </header>

        {/* Top Section */}
        <div className="mb-10">
          <TotalNetWorth total={totalNetWorth} />
        </div>

        {/* Content Section */}
        <div>
          <AssetList title="Liquid Assets (流动资产)" accounts={liquidAssets} />
          <AssetList title="Investments (理财与基金)" accounts={investmentAssets} />
        </div>

      </div>
    </div>
  );
};
