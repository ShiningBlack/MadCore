import React, { useState, useEffect, useRef } from 'react';
import { X, Wallet, CreditCard, Smartphone, MessageCircle, TrendingUp, Loader2, Search, Hash } from 'lucide-react';
import { AssetType, AssetAccount } from '../types/asset';
import { useAssetStore } from '../store/useAssetStore';
import { useUserStore } from '../store/useUserStore';
import { invoke } from '@tauri-apps/api/core';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const ASSET_TYPES: { type: AssetType; label: string; icon: any; color: string }[] = [
  { type: 'cash',   label: '现金',   icon: Wallet,         color: 'text-amber-400'   },
  { type: 'bank',   label: '银行卡', icon: CreditCard,     color: 'text-blue-400'    },
  { type: 'alipay', label: '支付宝', icon: Smartphone,     color: 'text-sky-400'     },
  { type: 'wechat', label: '微信',   icon: MessageCircle,  color: 'text-emerald-400' },
  { type: 'fund',   label: '基金',   icon: TrendingUp,     color: 'text-violet-400'  },
];

export const AddAssetModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { addAccount } = useAssetStore();
  const { user } = useUserStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingFund, setIsFetchingFund] = useState(false);
  const [selectedType, setSelectedType] = useState<AssetType>('bank');

  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState('CNY');
  const [accountNumber, setAccountNumber] = useState('');
  const [fundCode, setFundCode] = useState('');
  const [shares, setShares] = useState('');
  const [costPrice, setCostPrice] = useState('');

  const fundCodeRef = useRef('');

  // Auto-fill balance for fund when shares + costPrice change
  useEffect(() => {
    if (selectedType === 'fund') {
      const s = parseFloat(shares);
      const cp = parseFloat(costPrice);
      if (!isNaN(s) && !isNaN(cp) && s > 0 && cp > 0) {
        setBalance((s * cp).toFixed(2));
      }
    }
  }, [shares, costPrice, selectedType]);

  const reset = () => {
    setName(''); setBalance(''); setAccountNumber('');
    setFundCode(''); setShares(''); setCostPrice('');
    setCurrency('CNY'); setSelectedType('bank');
    fundCodeRef.current = '';
  };

  const handleFundCodeChange = async (val: string) => {
    const code = val.replace(/\D/g, '').slice(0, 6);
    setFundCode(code);
    if (code.length === 6 && code !== fundCodeRef.current) {
      fundCodeRef.current = code;
      setIsFetchingFund(true);
      try {
        const data: any = await invoke('fetch_fund_realtime', { code });
        setName(data.name);
        // Pre-fill cost price with current NAV
        if (!costPrice) setCostPrice(data.dwjz);
      } catch { /* ignore */ }
      finally { setIsFetchingFund(false); }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      const account: Omit<AssetAccount, 'id' | 'userId'> = {
        name,
        type: selectedType,
        balance: parseFloat(balance) || 0,
        currency,
        accountNumber: accountNumber || undefined,
        fundCode: fundCode || undefined,
        shares: shares ? parseFloat(shares) : undefined,
        costPrice: costPrice ? parseFloat(costPrice) : undefined,
      };
      await addAccount(user.id, user.username, account);
      reset();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isFund = selectedType === 'fund';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 rounded-3xl w-full max-w-md shadow-2xl border border-zinc-800 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="text-lg font-black text-white">新增资产</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors">
            <X size={18} className="text-zinc-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Asset Type Selector */}
          <div className="grid grid-cols-5 gap-2">
            {ASSET_TYPES.map(({ type, label, icon: Icon, color }) => (
              <button
                key={type}
                type="button"
                onClick={() => { setSelectedType(type); setName(''); }}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all gap-1.5 ${
                  selectedType === type
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-zinc-800 bg-zinc-800/50 hover:border-zinc-700'
                }`}
              >
                <Icon size={20} className={selectedType === type ? color : 'text-zinc-500'} />
                <span className={`text-[10px] font-bold ${selectedType === type ? 'text-white' : 'text-zinc-500'}`}>{label}</span>
              </button>
            ))}
          </div>

          {/* Fund Code */}
          {isFund && (
            <div className="animate-in slide-in-from-top-2 duration-200">
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">基金代码</label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                <input
                  required
                  type="text"
                  placeholder="6位基金代码，如 016185"
                  maxLength={6}
                  className="w-full pl-11 pr-12 py-3 rounded-2xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                  value={fundCode}
                  onChange={e => handleFundCodeChange(e.target.value)}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-violet-400">
                  {isFetchingFund ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                </div>
              </div>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">
              {isFund ? '基金名称' : selectedType === 'bank' ? '银行/卡名称' : '账户名称'}
            </label>
            <input
              required
              type="text"
              placeholder="..."
              className="w-full px-4 py-3 rounded-2xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          {/* Bank account number */}
          {selectedType === 'bank' && (
            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">卡号末四位</label>
              <input
                type="text"
                maxLength={4}
                placeholder="8888"
                className="w-full px-4 py-3 rounded-2xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                value={accountNumber}
                onChange={e => setAccountNumber(e.target.value)}
              />
            </div>
          )}

          {/* Fund: shares + cost price */}
          {isFund && (
            <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-200">
              <div>
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">持有份额</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                  value={shares}
                  onChange={e => setShares(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">成本净值</label>
                <input
                  type="number"
                  step="0.0001"
                  placeholder="1.0000"
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                  value={costPrice}
                  onChange={e => setCostPrice(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Balance + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">
                {isFund ? '市值（自动计算）' : '余额'}
              </label>
              <input
                required
                type="number"
                step="0.01"
                placeholder="0.00"
                className="w-full px-4 py-3 rounded-2xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                value={balance}
                onChange={e => setBalance(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">货币</label>
              <select
                className="w-full px-4 py-3 rounded-2xl bg-zinc-800 border border-zinc-700 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                value={currency}
                onChange={e => setCurrency(e.target.value)}
              >
                <option value="CNY">CNY (¥)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || (isFund && !name)}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : '确认添加'}
          </button>
        </form>
      </div>
    </div>
  );
};
