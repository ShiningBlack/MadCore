import React from 'react';
import { AssetAccount } from '../types/asset';
import { AssetCard } from './AssetCard';

interface AssetListProps {
  title: string;
  accounts: AssetAccount[];
}

export const AssetList: React.FC<AssetListProps> = ({ title, accounts }) => {
  if (accounts.length === 0) return null;

  const total = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <div className="mb-8">
      <div className="flex justify-between items-end mb-4 px-1">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          {title}
        </h3>
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          ¥{total.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map(account => (
          <AssetCard key={account.id} account={account} />
        ))}
      </div>
    </div>
  );
};
