import React from 'react';
import { AssetAccount } from '../types/asset';
import { Wallet, CreditCard, Smartphone, MessageCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { useAssetStore } from '../store/useAssetStore';

interface AssetCardProps {
  account: AssetAccount;
  onClick: (account: AssetAccount) => void;
}

const getIconForType = (type: AssetAccount['type'], gszzl?: number) => {
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
      if (gszzl !== undefined) {
        return gszzl >= 0
          ? <TrendingUp size={24} className="text-rose-500" />
          : <TrendingDown size={24} className="text-emerald-500" />;
      }
      return <TrendingUp size={24} className="text-rose-500" />;
  }
};

const getBgForType = (type: AssetAccount['type'], gszzl?: number) => {
  if (type === 'fund' && gszzl !== undefined) {
    return gszzl >= 0 ? 'bg-rose-500/10' : 'bg-emerald-500/10';
  }
  switch (type) {
    case 'cash': return 'bg-emerald-500/10';
    case 'bank': return 'bg-blue-500/10';
    case 'alipay': return 'bg-sky-500/10';
    case 'wechat': return 'bg-green-500/10';
    case 'fund': return 'bg-rose-500/10';
  }
};

export const AssetCard: React.FC<AssetCardProps> = ({ account, onClick }) => {
  const showBalances = useAssetStore(state => state.showBalances);
  const gszzl = account.valuation ? parseFloat(account.valuation.gszzl) : undefined;

  return (
    <div
      onClick={() => onClick(account)}
      className="bg-white dark:bg-zinc-900/50 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-zinc-800 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/5 transition-all cursor-pointer flex items-center justify-between group relative overflow-hidden"
    >
      <div className="flex items-center gap-4 relative z-10">
        <div className={`p-3 rounded-2xl transition-colors ${getBgForType(account.type, gszzl)}`}>
          {getIconForType(account.type, gszzl)}
        </div>
        <div>
          <h3 className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {account.name}
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            {account.accountNumber && (
              <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                *{account.accountNumber.slice(-4)}
              </span>
            )}
            {gszzl !== undefined && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${gszzl >= 0 ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                {gszzl >= 0 ? '+' : ''}{gszzl.toFixed(2)}%
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="text-right relative z-10">
        <div className="font-black text-lg text-gray-900 dark:text-gray-100">
          {showBalances
            ? `¥${account.balance.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
            : '******'}
        </div>
        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-0.5">
          {account.currency}
        </div>
      </div>

      {/* Hover decoration */}
      <div className="absolute bottom-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-2xl translate-x-8 translate-y-8 group-hover:bg-indigo-500/10 transition-colors"></div>
    </div>
  );
};
