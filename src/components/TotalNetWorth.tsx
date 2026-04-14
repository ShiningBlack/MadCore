import React from 'react';
import { Eye, EyeOff, ArrowUpRight, ArrowDownRight, Wallet, TrendingUp } from 'lucide-react';

interface Props {
  total: number;
  show: boolean;
  onToggle: () => void;
  liquidTotal: number;
  investmentTotal: number;
  todayPnL: number;
  todayPnLPct?: number;
}

const fmt = (v: number, show: boolean) =>
  show
    ? v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '******';

export const TotalNetWorth: React.FC<Props> = ({
  total, show, onToggle, liquidTotal, investmentTotal, todayPnL, todayPnLPct,
}) => {
  const isPnLPos = todayPnL >= 0;
  const hasFund = investmentTotal > 0;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-8 text-white shadow-xl shadow-indigo-200/30">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-16 -right-16 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-white/70 font-bold text-xs tracking-[0.25em] uppercase">总净资产 (CNY)</p>
          <button
            onClick={onToggle}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors text-white/70 hover:text-white"
          >
            {show ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </div>

        {/* Total */}
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-black opacity-60">¥</span>
          <span className="text-5xl font-black tracking-tighter">
            {fmt(total, show)}
          </span>
        </div>

        {/* Today PnL (funds) */}
        {hasFund && (
          <div className={`flex items-center gap-1.5 mb-6 text-sm font-bold ${isPnLPos ? 'text-rose-200' : 'text-emerald-200'}`}>
            {isPnLPos ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            <span>今日浮动</span>
            <span className="font-black">
              {isPnLPos ? '+' : ''}{show ? todayPnL.toFixed(2) : '***'}
            </span>
            {todayPnLPct !== undefined && (
              <span className="ml-1 px-1.5 py-0.5 rounded text-[11px] bg-white/20">
                {isPnLPos ? '+' : ''}{todayPnLPct.toFixed(2)}%
              </span>
            )}
          </div>
        )}

        {/* Breakdown */}
        <div className="flex gap-4 mt-auto pt-6 border-t border-white/10">
          <div className="flex items-center gap-2.5 flex-1">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <Wallet size={15} className="text-white/80" />
            </div>
            <div>
              <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider">流动资产</p>
              <p className="text-sm font-black">¥{fmt(liquidTotal, show)}</p>
            </div>
          </div>
          <div className="w-px bg-white/10" />
          <div className="flex items-center gap-2.5 flex-1">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={15} className="text-white/80" />
            </div>
            <div>
              <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider">投资资产</p>
              <p className="text-sm font-black">¥{fmt(investmentTotal, show)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
