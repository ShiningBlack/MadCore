import React from 'react';
import { AssetAccount } from '../types/asset';
import { Wallet, CreditCard, Smartphone, MessageCircle, TrendingUp } from 'lucide-react';

interface AssetCardProps {
  account: AssetAccount;
}

const getIconForType = (type: AssetAccount['type']) => {
  switch (type) {
    case 'cash':
      return <Wallet size={24} className="text-emerald-500" />;
    case 'bank':
      return <CreditCard size={24} className="text-blue-500" />;
    case 'alipay':
      return <Smartphone size={24} className="text-sky-500" />;
    case 'wechat':
      return <MessageCircle size={24} className="text-green-500" />;
    case 'fund':
      return <TrendingUp size={24} className="text-rose-500" />;
  }
};

const getBgForType = (type: AssetAccount['type']) => {
  switch (type) {
    case 'cash':
      return 'bg-emerald-500/10';
    case 'bank':
      return 'bg-blue-500/10';
    case 'alipay':
      return 'bg-sky-500/10';
    case 'wechat':
      return 'bg-green-500/10';
    case 'fund':
      return 'bg-rose-500/10';
  }
};

export const AssetCard: React.FC<AssetCardProps> = ({ account }) => {
  return (
    <div className="bg-white dark:bg-zinc-800/80 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-zinc-700/50 hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between group">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${getBgForType(account.type)}`}>
          {getIconForType(account.type)}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{account.name}</h3>
          {account.accountNumber && (
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
              **** {account.accountNumber.slice(-4)}
            </p>
          )}
        </div>
      </div>
      
      <div className="text-right">
        <div className="font-bold text-lg text-gray-900 dark:text-gray-100">
          ¥{account.balance.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
        </div>
        <div className="text-xs text-gray-400 uppercase tracking-wider mt-0.5">
          {account.currency}
        </div>
      </div>
    </div>
  );
};
