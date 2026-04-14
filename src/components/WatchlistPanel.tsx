import React, { useState } from 'react';
import {
  Eye, Plus, Trash2, RefreshCw, TrendingUp, TrendingDown,
  BarChart2, Minus, AlertCircle
} from 'lucide-react';
import { useWatchlistStore } from '../store/useWatchlistStore';
import { AddWatchlistModal } from './AddWatchlistModal';
import { WatchlistItem } from '../types/asset';

const fmt = (n: number, d = 2) => n.toLocaleString('zh-CN', { minimumFractionDigits: d, maximumFractionDigits: d });

const WatchCard: React.FC<{ item: WatchlistItem; onRemove: () => void }> = ({ item, onRemove }) => {
  const { realtime } = item;
  
  let changeRate: number | null = null;
  let currentNav: number | null = null;
  let dwjzOrDate: string | undefined;
  let gztimeOrName: string | undefined;

  if (realtime) {
    if ('gszzl' in realtime) {
      const parsedCr = parseFloat(realtime.gszzl ?? '');
      changeRate = isFinite(parsedCr) ? parsedCr : null;
      const parsedNav = parseFloat(realtime.gsz ?? realtime.dwjz ?? '');
      currentNav = isFinite(parsedNav) ? parsedNav : null;
      dwjzOrDate = realtime.dwjz;
      gztimeOrName = realtime.gztime;
    } else {
      const cr = (realtime as any).change_rate ?? (realtime as any).change_percent;
      const parsedCr = parseFloat(String(cr ?? ''));
      changeRate = isFinite(parsedCr) ? parsedCr : null;
      const parsedNav = parseFloat(String((realtime as any).price ?? ''));
      currentNav = isFinite(parsedNav) ? parsedNav : null;
      dwjzOrDate = realtime.jzrq ?? (realtime as any).date;
      gztimeOrName = (realtime as any).name;
    }
  }

  const isUp = changeRate !== null && changeRate > 0;
  const isDown = changeRate !== null && changeRate < 0;

  // Simulation PnL
  let simPnl: number | null = null;
  let simPnlPct: number | null = null;
  if (item.simShares && currentNav && item.simPrice) {
    const currentValue = item.simShares * currentNav;
    const costValue = item.simShares * item.simPrice;
    simPnl = currentValue - costValue;
    simPnlPct = costValue > 0 ? (simPnl / costValue) * 100 : 0;
  }

  return (
    <div className="relative flex-shrink-0 w-52 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 transition-all group overflow-hidden shadow-sm">
      {/* Color bar */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${isUp ? 'bg-emerald-500' : isDown ? 'bg-red-500' : 'bg-slate-300'}`} />

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1 pr-2">
            <p className="text-xs font-mono text-slate-500">{item.symbolCode}</p>
            <p className="text-sm font-bold text-slate-900 truncate">{item.name || realtime?.name || '—'}</p>
          </div>
          <button
            onClick={onRemove}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500"
          >
            <Trash2 size={12} />
          </button>
        </div>

        {/* Real-time NAV */}
        {realtime && currentNav !== null ? (
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-mono font-black text-slate-900">{currentNav.toFixed(4)}</span>
              <div className={`flex items-center gap-1 text-sm font-bold ${isUp ? 'text-emerald-500' : isDown ? 'text-red-500' : 'text-slate-400'}`}>
                {isUp ? <TrendingUp size={13} /> : isDown ? <TrendingDown size={13} /> : <Minus size={13} />}
                {changeRate !== null ? `${isUp ? '+' : ''}${changeRate}%` : '—'}
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">净值 {dwjzOrDate ?? '—'} · {gztimeOrName ?? '—'}</p>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <AlertCircle size={12} />
            暂无数据
          </div>
        )}

        {/* Simulation PnL */}
        {item.simAmount && (
          <div className={`rounded-xl px-3 py-2 text-xs ${simPnl !== null && simPnl >= 0 ? 'bg-emerald-50 text-emerald-600' : simPnl !== null ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold">模拟持仓</span>
              <span className="font-mono font-bold">
                {simPnl !== null ? `${simPnl >= 0 ? '+' : ''}¥${fmt(simPnl)}` : '计算中...'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">¥{fmt(item.simAmount)} 买入</span>
              {simPnlPct !== null && (
                <span className="font-mono text-[10px] font-bold">
                  {simPnlPct >= 0 ? '+' : ''}{simPnlPct.toFixed(2)}%
                </span>
              )}
            </div>
            {item.simShares && (
              <p className="text-slate-400 text-[10px] mt-0.5">{fmt(item.simShares)} 份 · 成本 {item.simPrice?.toFixed(4)}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const WatchlistPanel: React.FC = () => {
  const { items, isLoading, updateWatchlistValuations, removeFromWatchlist } = useWatchlistStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await updateWatchlistValuations();
    setIsRefreshing(false);
  };

  return (
    <>
      <div className="space-y-3">
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye size={15} className="text-indigo-500" />
            <h3 className="text-sm font-black text-slate-700">自选监控</h3>
            {items.length > 0 && (
              <span className="text-[10px] font-bold bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full">
                {items.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
              >
                <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-600 text-xs font-bold transition-all"
            >
              <Plus size={13} />
              添加
            </button>
          </div>
        </div>

        {/* Cards horizontal scroll */}
        {isLoading ? (
          <div className="flex gap-3 overflow-hidden">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-52 h-36 rounded-2xl bg-slate-200 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center">
            <BarChart2 size={28} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-slate-500 font-semibold">暂无监控基金</p>
            <p className="text-xs text-slate-400 mt-1">添加基金代码，实时追踪净值与模拟盈亏</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-3 px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-600 text-xs font-bold transition-all"
            >
              + 添加第一个基金
            </button>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {items.map((item) => (
              <WatchCard
                key={item.id}
                item={item}
                onRemove={() => removeFromWatchlist(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {showAddModal && <AddWatchlistModal onClose={() => setShowAddModal(false)} />}
    </>
  );
};
