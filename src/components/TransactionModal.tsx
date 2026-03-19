import React, { useState } from 'react';
import {
  X, ArrowDownLeft, ArrowUpRight, ArrowLeftRight,
  TrendingUp, TrendingDown, Gift, Loader2
} from 'lucide-react';
import { AssetAccount, TransactionType } from '../types/asset';
import { useAssetStore } from '../store/useAssetStore';
import { useUserStore } from '../store/useUserStore';

interface Props {
  account: AssetAccount;
  onClose: () => void;
}

interface TxConfig {
  type: TransactionType;
  label: string;
  icon: any;
  color: string;
  delta: 1 | -1;
  fundOnly?: boolean;
  nonFundOnly?: boolean;
}

const TX_TYPES: TxConfig[] = [
  { type: 'income',       label: '收入',   icon: ArrowDownLeft,  color: 'text-emerald-400', delta: 1,  nonFundOnly: true },
  { type: 'expense',      label: '支出',   icon: ArrowUpRight,   color: 'text-red-400',     delta: -1, nonFundOnly: true },
  { type: 'transfer_in',  label: '转入',   icon: ArrowLeftRight, color: 'text-sky-400',     delta: 1  },
  { type: 'transfer_out', label: '转出',   icon: ArrowLeftRight, color: 'text-orange-400',  delta: -1 },
  { type: 'fund_buy',     label: '买入',   icon: TrendingUp,     color: 'text-violet-400',  delta: 1,  fundOnly: true },
  { type: 'fund_sell',    label: '卖出',   icon: TrendingDown,   color: 'text-rose-400',    delta: -1, fundOnly: true },
  { type: 'fund_dividend',label: '分红',   icon: Gift,           color: 'text-amber-400',   delta: 1,  fundOnly: true },
];

export const TransactionModal: React.FC<Props> = ({ account, onClose }) => {
  const { addTransaction } = useAssetStore();
  const { user } = useUserStore();

  const isFund = account.type === 'fund';
  const available = TX_TYPES.filter(t =>
    isFund ? !t.nonFundOnly : !t.fundOnly
  );

  const [txType, setTxType] = useState<TransactionType>(available[0].type);
  const [amount, setAmount] = useState('');
  const [sharesChange, setSharesChange] = useState('');
  const [nav, setNav] = useState('');    // NAV price for fund buy/sell
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-calculate amount for fund transactions
  const handleNavOrSharesChange = (newNav: string, newShares: string) => {
    const n = parseFloat(newNav);
    const s = parseFloat(newShares);
    if (!isNaN(n) && !isNaN(s)) {
      setAmount((n * s).toFixed(2));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    setIsSubmitting(true);
    try {
      await addTransaction(
        account.id,
        user.id,
        txType,
        numAmount,
        note,
        sharesChange ? parseFloat(sharesChange) : undefined
      );
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedConfig = TX_TYPES.find(t => t.type === txType)!;
  const isFundBuySell = txType === 'fund_buy' || txType === 'fund_sell';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 rounded-3xl w-full max-w-md shadow-2xl border border-zinc-800 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-800 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black text-white">记录交易</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{account.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors">
            <X size={18} className="text-zinc-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Transaction Type */}
          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">交易类型</label>
            <div className="flex flex-wrap gap-2">
              {available.map(({ type, label, icon: Icon, color }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTxType(type)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all text-sm font-semibold ${
                    txType === type
                      ? 'border-indigo-500 bg-indigo-500/15 text-white'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  <Icon size={14} className={txType === type ? color : ''} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Fund Buy/Sell: NAV + Shares */}
          {isFundBuySell && (
            <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-200">
              <div>
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">净值/价格</label>
                <input
                  type="number"
                  step="0.0001"
                  placeholder="1.0000"
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                  value={nav}
                  onChange={e => {
                    setNav(e.target.value);
                    handleNavOrSharesChange(e.target.value, sharesChange);
                  }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">份额</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                  value={sharesChange}
                  onChange={e => {
                    setSharesChange(e.target.value);
                    handleNavOrSharesChange(nav, e.target.value);
                  }}
                />
              </div>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">
              金额（{account.currency}）
              <span className={`ml-2 normal-case font-bold ${selectedConfig.delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {selectedConfig.delta > 0 ? '余额增加' : '余额减少'}
              </span>
            </label>
            <input
              required
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              className="w-full px-4 py-3 rounded-2xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-xl font-bold"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">备注（可选）</label>
            <input
              type="text"
              placeholder="例如：工资、餐饮、转账..."
              maxLength={100}
              className="w-full px-4 py-3 rounded-2xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 rounded-2xl border border-zinc-700 text-zinc-300 font-bold hover:bg-zinc-800 transition-all text-sm"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !amount}
              className="flex-2 flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 text-sm"
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : '确认记录'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
