import React, { useState } from 'react';
import {
  X, ArrowDownLeft, ArrowUpRight, ArrowLeftRight,
  TrendingUp, TrendingDown, Gift, Loader2, Clock, Info
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
  { type: 'income',        label: '收入', icon: ArrowDownLeft,  color: 'text-emerald-400', delta: 1,  nonFundOnly: true },
  { type: 'expense',       label: '支出', icon: ArrowUpRight,   color: 'text-red-400',     delta: -1, nonFundOnly: true },
  { type: 'transfer_in',   label: '转入', icon: ArrowLeftRight, color: 'text-sky-400',     delta: 1  },
  { type: 'transfer_out',  label: '转出', icon: ArrowLeftRight, color: 'text-orange-400',  delta: -1 },
  { type: 'buy',           label: '买入', icon: TrendingUp,     color: 'text-violet-400',  delta: 1,  fundOnly: true },
  { type: 'sell',          label: '卖出', icon: TrendingDown,   color: 'text-rose-400',    delta: -1, fundOnly: true },
  { type: 'dividend',      label: '分红', icon: Gift,           color: 'text-amber-400',   delta: 1,  fundOnly: true },
];

// Date helpers
const todayStr = () => new Date().toISOString().split('T')[0];
const addBusinessDays = (dateStr: string, days: number): string => {
  const d = new Date(dateStr);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d.toISOString().split('T')[0];
};

export const TransactionModal: React.FC<Props> = ({ account, onClose }) => {
  const { addTransaction } = useAssetStore();
  const { user } = useUserStore();

  const isFund = account.type === 'fund' || account.type === 'stock';
  const available = TX_TYPES.filter(t => isFund ? !t.nonFundOnly : !t.fundOnly);
  const settlementDays = account.settlementDays ?? 1;

  const [txType, setTxType] = useState<TransactionType>(available[0].type);
  const [amount, setAmount] = useState('');
  const [buyDate, setBuyDate] = useState(todayStr());
  const [price, setPrice] = useState('');
  const [sharesChange, setSharesChange] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFundBuy = txType === 'buy';
  const isFundSell = txType === 'sell';
  const confirmDate = isFundBuy ? addBusinessDays(buyDate, settlementDays) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    setIsSubmitting(true);
    try {
      if (isFundBuy) {
        // Pending T+N buy: only amount + date known
        await addTransaction({
          asset_id: account.id,
          type: 'buy',
          amount: numAmount,
          note,
          status: 'pending',
          confirm_date: confirmDate || undefined,
        });
      } else if (isFundSell) {
        const numPrice = parseFloat(price);
        const numShares = parseFloat(sharesChange);
        await addTransaction({
          asset_id: account.id,
          type: 'sell',
          amount: numAmount,
          price: isNaN(numPrice) ? undefined : numPrice,
          shares_change: isNaN(numShares) ? undefined : numShares,
          note,
          status: 'confirmed',
        });
      } else {
        await addTransaction({
          asset_id: account.id,
          type: txType,
          amount: numAmount,
          note,
          status: 'confirmed',
        });
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedConfig = TX_TYPES.find(t => t.type === txType)!;

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

          {/* Fund Buy: T+N notice */}
          {isFundBuy && (
            <div className="rounded-2xl bg-violet-500/10 border border-violet-500/30 p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-start gap-3">
                <Info size={16} className="text-violet-400 mt-0.5 shrink-0" />
                <div className="text-xs text-violet-300 leading-relaxed">
                  <span className="font-bold">T+{settlementDays} 制度</span>：申购金额提交后，份额将于 <span className="font-bold text-white">T+{settlementDays} 日收盘后</span>按当日净值确认。届时在交易记录中手动确认份额即可。
                </div>
              </div>
              {/* Buy Date */}
              <div>
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">申购日期</label>
                <input
                  type="date"
                  value={buyDate}
                  max={todayStr()}
                  onChange={e => setBuyDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white focus:ring-2 focus:ring-violet-500 outline-none text-sm"
                />
              </div>
              {/* Confirm date preview */}
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Clock size={12} className="text-violet-400" />
                预计份额确认日：<span className="text-violet-300 font-mono font-bold">{confirmDate}</span>
                （自动跳过节假日）
              </div>
            </div>
          )}

          {/* Fund Sell: Price + Shares */}
          {isFundSell && (
            <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-200">
              <div>
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">赎回净值/成交价</label>
                <input
                  type="number" step="0.0001" placeholder="1.0000"
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 focus:ring-2 focus:ring-rose-500 outline-none font-mono text-sm"
                  value={price}
                  onChange={e => {
                    setPrice(e.target.value);
                    const n = parseFloat(e.target.value), s = parseFloat(sharesChange);
                    if (!isNaN(n) && !isNaN(s)) setAmount((n * s).toFixed(2));
                  }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">赎回份额/卖出数量</label>
                <input
                  type="number" step="0.01" placeholder="0.00"
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 focus:ring-2 focus:ring-rose-500 outline-none font-mono text-sm"
                  value={sharesChange}
                  onChange={e => {
                    setSharesChange(e.target.value);
                    const n = parseFloat(price), s = parseFloat(e.target.value);
                    if (!isNaN(n) && !isNaN(s)) setAmount((n * s).toFixed(2));
                  }}
                />
              </div>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">
              {isFundBuy ? '申购金额' : `金额（${account.currency}）`}
              {!isFundBuy && (
                <span className={`ml-2 normal-case font-bold ${selectedConfig.delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {selectedConfig.delta > 0 ? '余额增加' : '余额减少'}
                </span>
              )}
            </label>
            <input
              required
              type="number" step="0.01" min="0.01"
              placeholder={isFundBuy ? '输入申购金额，份额 T+N 后确认' : '0.00'}
              className="w-full px-4 py-3 rounded-2xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-xl font-bold"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">备注（可选）</label>
            <input
              type="text" placeholder="例如：定期定投、补仓..." maxLength={100}
              className="w-full px-4 py-3 rounded-2xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-3.5 rounded-2xl border border-zinc-700 text-zinc-300 font-bold hover:bg-zinc-800 transition-all text-sm"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !amount}
              className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 text-sm"
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : (isFundBuy ? '提交申购' : '确认记录')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
