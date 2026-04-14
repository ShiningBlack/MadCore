import React from 'react';
import { AssetAccount } from '../types/asset';
import { AssetCard } from './AssetCard';
import { useAssetStore } from '../store/useAssetStore';

interface AssetListProps {
  title: string;
  accounts: AssetAccount[];
  onAccountClick: (account: AssetAccount) => void;
}

export const AssetList: React.FC<AssetListProps> = ({ title, accounts, onAccountClick }) => {
  const showBalances = useAssetStore(state => state.showBalances);
  if (accounts.length === 0) return null;

  const total = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <div className="mb-8">
      <div className="flex justify-between items-end mb-4 px-1">
        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
          {title}
        </h3>
        <span className="text-sm font-bold text-slate-400">
          {showBalances
            ? `¥${total.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
            : '******'}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {accounts.map(account => (
          <AssetCard key={account.id} account={account} onClick={onAccountClick} />
        ))}
      </div>
    </div>
  );
};
