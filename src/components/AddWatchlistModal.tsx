import React, { useState } from 'react';
import { X, Search, TrendingUp, DollarSign, Calendar, StickyNote, Loader2 } from 'lucide-react';
import { useWatchlistStore } from '../store/useWatchlistStore';
import { useUserStore } from '../store/useUserStore';
import { api } from '../lib/api';
import { FundRealtime } from '../types/asset';

interface Props {
  onClose: () => void;
}

const todayStr = () => new Date().toISOString().split('T')[0];

export const AddWatchlistModal: React.FC<Props> = ({ onClose }) => {
  const { addToWatchlist } = useWatchlistStore();
  const { user } = useUserStore();

  const [fundCode, setFundCode] = useState('');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [simEnabled, setSimEnabled] = useState(false);
  const [simAmount, setSimAmount] = useState('');
  const [simDate, setSimDate] = useState(todayStr());
  const [isLooking, setIsLooking] = useState(false);
  const [preview, setPreview] = useState<FundRealtime | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLookup = async () => {
    if (!fundCode.trim()) return;
    setIsLooking(true);
    setLookupError('');
    setPreview(null);
    try {
      const dataList = await api<any[]>(`/api/finance/fund/realtime/${fundCode.trim()}`);
      const rt = Array.isArray(dataList) ? dataList[0] : dataList;
      setPreview(rt);
      if (!name) setName(rt.name || rt.fund_name || rt['基金名称'] || '');
    } catch (e: any) {
      setLookupError('找不到该基金，请确认代码是否正确');
    } finally {
      setIsLooking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !fundCode.trim()) return;
    setIsSubmitting(true);
    try {
      const simAmountNum = simEnabled ? parseFloat(simAmount) : undefined;
      const simPrice = simEnabled && preview ? parseFloat(preview.dwjz || preview.gsz || preview.current_price || '0') : undefined;
      const simShares = simEnabled && simAmountNum && simPrice ? parseFloat((simAmountNum / simPrice).toFixed(2)) : undefined;

      await addToWatchlist({
        symbolCode: fundCode.trim(),
        symbolType: 'fund',
        name: name || preview?.name || preview?.fund_name,
        note: note || undefined,
        simAmount: simAmountNum,
        simPrice,
        simDate: simEnabled ? simDate : undefined,
        simShares,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 rounded-3xl w-full max-w-md shadow-2xl border border-zinc-800 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
        <div className="px-6 py-5 border-b border-zinc-800 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black text-white">添加监控基金</h2>
            <p className="text-xs text-zinc-500 mt-0.5">自选 · 模拟持仓</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors">
            <X size={18} className="text-zinc-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Fund Code Search */}
          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">基金代码</label>
            <div className="flex gap-2">
              <input
                required
                type="text"
                placeholder="例如：016185"
                maxLength={10}
                className="flex-1 px-4 py-3 rounded-2xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-lg"
                value={fundCode}
                onChange={e => setFundCode(e.target.value.replace(/[^0-9]/g, ''))}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleLookup())}
              />
              <button
                type="button"
                onClick={handleLookup}
                disabled={isLooking || !fundCode}
                className="px-4 py-3 rounded-2xl bg-zinc-700 hover:bg-zinc-600 text-white font-bold text-sm transition-all disabled:opacity-40 flex items-center gap-2"
              >
                {isLooking ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                查询
              </button>
            </div>
            {lookupError && <p className="text-xs text-red-400 mt-2">{lookupError}</p>}
          </div>

          {/* Preview card */}
          {preview && (
            <div className="rounded-2xl bg-zinc-800/70 border border-zinc-700 p-4 space-y-1 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{preview.name}</span>
                <span className={`text-sm font-mono font-bold ${parseFloat(preview.gszzl) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {parseFloat(preview.gszzl) >= 0 ? '+' : ''}{preview.gszzl}%
                </span>
              </div>
              <div className="flex gap-4 text-xs text-zinc-400">
                <span>单位净值 <span className="text-white font-mono">{preview.dwjz}</span></span>
                <span>估算 <span className="text-white font-mono">{preview.gsz}</span></span>
              </div>
              <p className="text-[10px] text-zinc-600">更新于 {preview.gztime}</p>
            </div>
          )}

          {/* Custom Name */}
          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">
              <StickyNote size={10} className="inline mr-1" />备注名称（可选）
            </label>
            <input
              type="text"
              placeholder={preview?.name ?? '自定义显示名称'}
              maxLength={30}
              className="w-full px-4 py-2.5 rounded-2xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">
              备注（可选）
            </label>
            <input
              type="text"
              placeholder="为什么关注？例如：看好新能源赛道"
              maxLength={60}
              className="w-full px-4 py-2.5 rounded-2xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          {/* Simulation toggle */}
          <div className="border border-zinc-700 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setSimEnabled(!simEnabled)}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm font-bold transition-colors ${simEnabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-300'}`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp size={15} />
                模拟盈亏计算
              </div>
              <div className={`w-9 h-5 rounded-full transition-colors relative ${simEnabled ? 'bg-emerald-500' : 'bg-zinc-600'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${simEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
            </button>

            {simEnabled && (
              <div className="p-4 space-y-3 border-t border-zinc-700 animate-in slide-in-from-top-1 duration-150">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">
                      <DollarSign size={9} className="inline" />模拟买入金额
                    </label>
                    <input
                      type="number" step="100" min="1" placeholder="10000"
                      className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-600 focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-sm"
                      value={simAmount}
                      onChange={e => setSimAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">
                      <Calendar size={9} className="inline" />模拟买入日期
                    </label>
                    <input
                      type="date"
                      value={simDate}
                      max={todayStr()}
                      className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                      onChange={e => setSimDate(e.target.value)}
                    />
                  </div>
                </div>
                {preview && simAmount && (
                  <div className="text-xs text-zinc-400 bg-zinc-900 rounded-xl px-3 py-2">
                    按当前净值 <span className="font-mono text-white">{preview.dwjz}</span> 估算份额：
                    <span className="font-mono text-emerald-400 font-bold ml-1">
                      {(parseFloat(simAmount) / parseFloat(preview.dwjz)).toFixed(2)} 份
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3.5 rounded-2xl border border-zinc-700 text-zinc-300 font-bold hover:bg-zinc-800 transition-all text-sm">
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !fundCode}
              className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 text-sm"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : '添加监控'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
