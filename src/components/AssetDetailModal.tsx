import React, { useEffect, useState, useCallback } from 'react';
import {
  X, Trash2, ArrowUpRight, ArrowDownRight, Loader2, TrendingUp,
  BarChart2, Users, RefreshCw, PlusCircle, Minus, Plus,
  Clock, Hash, Award
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, RadarChart, PolarGrid, PolarAngleAxis, Radar
} from 'recharts';
import { AssetAccount, FundDetailFull, FundRealtime } from '../types/asset';
import { useAssetStore } from '../store/useAssetStore';
import { useUserStore } from '../store/useUserStore';
import { api } from '../lib/api';
import { TransactionModal } from './TransactionModal';

interface Props {
  account: AssetAccount | null;
  onClose: () => void;
}

const PERIODS = [
  { label: '1月', days: 30 },
  { label: '3月', days: 90 },
  { label: '6月', days: 180 },
  { label: '1年', days: 365 },
  { label: '全部', days: 99999 },
];

const fmtMoney = (v: number, show = true) =>
  show ? `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '******';

const fmtPct = (v: string | number) => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (isNaN(n)) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
};

const ReturnBadge: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const n = parseFloat(value);
  const isPos = n >= 0;
  return (
    <div className="bg-zinc-800/60 rounded-2xl p-3 text-center border border-zinc-700/50">
      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-base font-black ${isPos ? 'text-rose-400' : 'text-emerald-400'}`}>
        {isNaN(n) ? '—' : fmtPct(value)}
      </p>
    </div>
  );
};

const TX_LABEL: Record<string, string> = {
  income: '收入', expense: '支出', transfer_in: '转入', transfer_out: '转出',
  buy: '买入', sell: '卖出', dividend: '分红',
};
const TX_COLOR: Record<string, string> = {
  income: 'text-emerald-400', expense: 'text-red-400', transfer_in: 'text-sky-400',
  transfer_out: 'text-orange-400', buy: 'text-violet-400', sell: 'text-rose-400',
  dividend: 'text-amber-400',
};

export const AssetDetailModal: React.FC<Props> = ({ account, onClose }) => {
  const { user } = useUserStore();
  const { deleteAccount, showBalances, fetchTransactions, transactions, confirmPendingTransaction } = useAssetStore();

  const [fundDetail, setFundDetail] = useState<FundDetailFull | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [localRealtime, setLocalRealtime] = useState<FundRealtime | null>(null);
  const [period, setPeriod] = useState(90);
  const [showTxModal, setShowTxModal] = useState(false);
  const [confirmingTxId, setConfirmingTxId] = useState<number | null>(null);
  const [confirmNav, setConfirmNav] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  const isFund = account?.type === 'fund';

  // Fetch NAV history, stage returns, manager info
  const loadFundDetail = useCallback(async () => {
    if (!account?.symbolCode) return;
    setIsLoadingDetail(true);
    try {
      const d = await api<FundDetailFull>(`/api/finance/fund/detail/${account.symbolCode}`);
      setFundDetail(d);
    } catch (e) {
      console.error('fetchFundDetail failed', e);
    } finally {
      setIsLoadingDetail(false);
    }
  }, [account?.symbolCode]);

  // Fetch realtime separately — ensures profit/loss is always fresh
  const loadRealtime = useCallback(async () => {
    if (!account?.symbolCode || account.type !== 'fund') return;
    try {
      const data = await api<any>(`/api/finance/fund/realtime/${account.symbolCode}`);
      const rt = Array.isArray(data) ? data[0] : data;
      if (rt) setLocalRealtime(rt);
    } catch (e) {
      console.error('fetchRealtime failed', e);
    }
  }, [account?.symbolCode]);

  useEffect(() => {
    if (!account) return;

    setLocalRealtime(null);
    setFundDetail(null);
    fetchTransactions();

    if (isFund) {
      loadRealtime();
      loadFundDetail();

      // Poll real-time data every 1 minute
      const intervalId = setInterval(() => {
        loadRealtime();
      }, 60000);

      return () => clearInterval(intervalId);
    }
  }, [account?.id]);

  if (!account) return null;

  const handleDelete = async () => {
    if (!user || !window.confirm(`确认删除「${account.name}」？此操作不可撤销。`)) return;
    await deleteAccount(account.id);
    onClose();
  };

  // --- Fund Valuation Computations ---
  // Prefer locally-fetched realtime (always fresh); fall back to store cached value
  const rt = (localRealtime ?? account.realtime) as FundRealtime | undefined;
  // Use isFinite to reject NaN (empty gszzl for QDII) and Infinity
  const gszzlRaw = rt ? parseFloat(rt.gszzl ?? '') : NaN;
  const gszRaw   = rt ? parseFloat(rt.gsz   ?? '') : NaN;
  const dwjzRaw  = rt ? parseFloat(rt.dwjz  ?? '') : NaN;
  const gszzl = isFinite(gszzlRaw) ? gszzlRaw : NaN;   // NaN = no intraday estimate
  const gsz   = isFinite(gszRaw)   ? gszRaw   : NaN;
  const dwjz  = isFinite(dwjzRaw)  ? dwjzRaw  : NaN;
  const hasEstimate = !isNaN(gszzl);                    // false for QDII
  // Best known current price: intraday estimate → last NAV
  const currentNav = !isNaN(gsz) ? gsz : (!isNaN(dwjz) ? dwjz : 0);
  const shares = account.shares ?? 0;
  const costPrice = account.costPrice ?? 0;
  const costValue = shares * costPrice;
  const marketValue = account.balance;
  const unrealizedPnL = marketValue - costValue;
  const unrealizedPct = costValue > 0 ? (unrealizedPnL / costValue) * 100 : 0;
  const todayEstProfit = hasEstimate && currentNav > 0 ? (shares * currentNav * gszzl) / 100 : 0;

  // --- Chart Data ---
  const now = Date.now();
  const cutoff = now - period * 86400_000;
  const chartData = (fundDetail?.net_worth_trend ?? [])
    .filter(p => p.x >= cutoff)
    .slice(-500)
    .map(p => ({
      date: new Date(p.x).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
      nav: p.y,
      rtn: p.equity_return,
    }));

  // --- Radar Chart ---
  const perfData = fundDetail?.performance
    ? fundDetail.performance.categories.map((cat, i) => ({
      subject: cat,
      score: fundDetail.performance!.data[i],
    }))
    : [];

  const trendUp = chartData.length >= 2
    ? chartData[chartData.length - 1].nav >= chartData[0].nav
    : true;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-zinc-900 rounded-3xl w-full max-w-2xl shadow-2xl border border-zinc-800 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">

          {/* ── Header ── */}
          <div className="px-6 py-5 border-b border-zinc-800 flex justify-between items-center flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isFund ? 'bg-violet-500/15' : 'bg-indigo-500/15'}`}>
                {isFund ? <TrendingUp size={20} className="text-violet-400" /> : <BarChart2 size={20} className="text-indigo-400" />}
              </div>
              <div>
                <h2 className="text-lg font-black text-white">{account.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-bold bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full uppercase tracking-widest">
                    {account.type}
                  </span>
                  {account.symbolCode && (
                    <span className="text-[10px] font-mono text-zinc-500">#{account.symbolCode}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isFund && (
              <button
                onClick={() => { loadRealtime(); loadFundDetail(); }}
                className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400 hover:text-white"
                title="刷新数据"
              >
                <RefreshCw size={16} className={isLoadingDetail ? 'animate-spin' : ''} />
              </button>
            )}
              <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors">
                <X size={18} className="text-zinc-400" />
              </button>
            </div>
          </div>

          {/* ── Scrollable Content ── */}
          <div className="overflow-y-auto flex-1 p-6 space-y-6">

            {/* ── Balance / Market Value Block ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-zinc-800/40 rounded-3xl p-5 border border-zinc-700/50">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">
                  {isFund ? '当前市值' : '当前余额'}
                </p>
                <p className="text-3xl font-black text-white">
                  {fmtMoney(account.balance, showBalances)}
                </p>
                {isFund && shares > 0 && currentNav > 0 && (
                  <p className="text-xs text-zinc-500 mt-2">
                    {shares.toLocaleString('zh-CN', { maximumFractionDigits: 2 })} 份 × {currentNav.toFixed(4)}
                  </p>
                )}
              </div>

              {/* Today's estimate — only when intraday gszzl is available (not for QDII) */}
              {isFund && rt && hasEstimate && (
                <div className={`rounded-3xl p-5 border ${gszzl >= 0 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">今日估算</p>
                  <div className={`flex items-center gap-1.5 text-2xl font-black mb-1 ${gszzl >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {gszzl >= 0 ? <ArrowUpRight size={22} /> : <ArrowDownRight size={22} />}
                    {fmtPct(gszzl)}
                  </div>
                  <p className={`text-sm font-bold ${todayEstProfit >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {todayEstProfit >= 0 ? '+' : ''}{fmtMoney(todayEstProfit, showBalances)}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-1">更新于 {rt.gztime}</p>
                </div>
              )}
              {/* QDII / no-estimate fallback: show last NAV without change rate */}
              {isFund && rt && !hasEstimate && currentNav > 0 && (
                <div className="rounded-3xl p-5 border bg-zinc-800/40 border-zinc-700/50">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">最新净値</p>
                  <div className="flex items-center gap-1.5 text-2xl font-black mb-1 text-white">
                    {currentNav.toFixed(4)}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">净值日期 {rt.jzrq || '—'}（暂无盘中估算）</p>
                </div>
              )}
            </div>

            {/* ── Fund: NAV Info ── */}
            {isFund && rt && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-zinc-800/40 rounded-2xl p-3 border border-zinc-700/50 text-center">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">上一净值</p>
                  <p className="text-base font-black text-white">{rt.dwjz}</p>
                  <p className="text-[10px] text-zinc-600">{rt.jzrq}</p>
                </div>
                <div className="bg-zinc-800/40 rounded-2xl p-3 border border-zinc-700/50 text-center">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">当日估值</p>
                  <p className="text-base font-black text-white">{rt.gsz}</p>
                  <p className="text-[10px] text-zinc-600">实时估算</p>
                </div>
                <div className="bg-zinc-800/40 rounded-2xl p-3 border border-zinc-700/50 text-center">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">管理费率</p>
                  <p className="text-base font-black text-white">{fundDetail?.fund_rate ?? '—'}%</p>
                  <p className="text-[10px] text-zinc-600">原 {fundDetail?.fund_source_rate ?? '—'}%</p>
                </div>
              </div>
            )}

            {/* ── Fund: Holding Summary ── */}
            {isFund && shares > 0 && costPrice > 0 && (
              <div className="bg-zinc-800/40 rounded-3xl p-5 border border-zinc-700/50 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">持有份额</p>
                  <p className="font-black text-white text-sm">{shares.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">成本净值</p>
                  <p className="font-black text-white text-sm">{costPrice.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">持仓成本</p>
                  <p className="font-black text-white text-sm">{fmtMoney(costValue, showBalances)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">浮动盈亏</p>
                  <p className={`font-black text-sm ${unrealizedPnL >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {unrealizedPnL >= 0 ? '+' : ''}{fmtMoney(unrealizedPnL, showBalances)}
                    <span className="text-xs font-bold ml-1">({fmtPct(unrealizedPct)})</span>
                  </p>
                </div>
              </div>
            )}

            {/* ── Fund: Returns Grid ── */}
            {isFund && fundDetail && (
              <div>
                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Award size={12} /> 阶段收益率
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  <ReturnBadge label="近1月" value={fundDetail.syl_1y} />
                  <ReturnBadge label="近3月" value={fundDetail.syl_3y} />
                  <ReturnBadge label="近6月" value={fundDetail.syl_6y} />
                  <ReturnBadge label="近1年" value={fundDetail.syl_1n} />
                </div>
              </div>
            )}

            {/* ── Fund: NAV Chart ── */}
            {isFund && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp size={12} /> 历史净值走势
                  </h4>
                  <div className="flex gap-1">
                    {PERIODS.map(p => (
                      <button
                        key={p.days}
                        onClick={() => setPeriod(p.days)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${period === p.days ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                          }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-52 w-full bg-zinc-800/30 rounded-3xl p-4 border border-zinc-800">
                  {isLoadingDetail ? (
                    <div className="h-full flex items-center justify-center">
                      <Loader2 size={24} className="animate-spin text-indigo-500" />
                    </div>
                  ) : chartData.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="navGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={trendUp ? '#f43f5e' : '#10b981'} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={trendUp ? '#f43f5e' : '#10b981'} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 9, fill: '#52525b' }}
                          minTickGap={30}
                        />
                        <YAxis
                          hide
                          domain={['dataMin - 0.005', 'dataMax + 0.005']}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: '12px', border: 'none',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                            backgroundColor: '#18181b', color: '#fff',
                            fontSize: 12,
                          }}
                          formatter={(v: any) => [typeof v === 'number' ? v.toFixed(4) : v, '净值']}
                          labelStyle={{ color: '#71717a', marginBottom: 4 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="nav"
                          stroke={trendUp ? '#f43f5e' : '#10b981'}
                          strokeWidth={2}
                          fill="url(#navGrad)"
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-zinc-600 text-xs font-bold uppercase tracking-widest">
                      {isLoadingDetail ? '' : '暂无净值数据'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Fund: Performance Radar ── */}
            {isFund && perfData.length > 0 && (
              <div>
                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <BarChart2 size={12} /> 综合评分 {fundDetail?.performance?.avr && (
                    <span className="text-indigo-400 font-black">{fundDetail.performance.avr}</span>
                  )}
                </h4>
                <div className="h-56 bg-zinc-800/30 rounded-3xl border border-zinc-800 p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={perfData}>
                      <PolarGrid stroke="#27272a" />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fontSize: 10, fill: '#71717a' }}
                      />
                      <Radar
                        name="评分"
                        dataKey="score"
                        stroke="#6366f1"
                        fill="#6366f1"
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ── Fund: Manager ── */}
            {isFund && fundDetail?.managers && fundDetail.managers.length > 0 && (
              <div>
                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Users size={12} /> 基金经理
                </h4>
                <div className="space-y-2">
                  {fundDetail.managers.map(mgr => (
                    <div key={mgr.id} className="flex items-center justify-between bg-zinc-800/40 rounded-2xl p-4 border border-zinc-700/50">
                      <div>
                        <p className="font-bold text-white text-sm">{mgr.name}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">任职 {mgr.work_time}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-zinc-500">管理规模</p>
                        <p className="text-xs font-bold text-zinc-300">{mgr.fund_size}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <Clock size={12} /> 交易记录
                </h4>
                <button
                  onClick={() => setShowTxModal(true)}
                  className="flex items-center gap-1.5 text-[10px] font-black text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-wider"
                >
                  <PlusCircle size={13} /> 记录交易
                </button>
              </div>

              {transactions.filter(t => t.assetId === account.id).length === 0 ? (
                <div className="py-8 text-center text-zinc-600 text-xs font-bold uppercase tracking-widest border border-dashed border-zinc-800 rounded-2xl">
                  暂无交易记录
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {transactions.filter(t => t.assetId === account.id).map(tx => {
                    const isPending = tx.status === 'pending';
                    const isConfirmTarget = confirmingTxId === tx.id;
                    return (
                      <div key={tx.id} className={`rounded-2xl px-4 py-3 border transition-all ${isPending
                        ? 'bg-amber-500/5 border-amber-500/30'
                        : 'bg-zinc-800/40 border-zinc-700/40'
                        }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center bg-zinc-800 ${TX_COLOR[tx.type]}`}>
                              {['income', 'transfer_in', 'buy', 'dividend'].includes(tx.type)
                                ? <Plus size={13} /> : <Minus size={13} />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className={`text-xs font-bold ${TX_COLOR[tx.type]}`}>{TX_LABEL[tx.type] || tx.type}</p>
                                {isPending && (
                                  <span className="text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">
                                    待确认
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-zinc-600">
                                {isPending && tx.confirmDate
                                  ? `预计 ${tx.confirmDate} 确认份额`
                                  : tx.note || new Date(tx.timestamp).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-black ${TX_COLOR[tx.type]}`}>
                              {['income', 'transfer_in', 'buy', 'dividend'].includes(tx.type) ? '+' : '-'}
                              {Math.abs(tx.amount).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                            </p>
                            {isPending && (
                              <button
                                onClick={() => {
                                  setConfirmingTxId(isConfirmTarget ? null : tx.id);
                                  setConfirmNav(tx.price?.toString() ?? '');
                                }}
                                className="text-[10px] font-black text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-1 rounded-lg transition-all"
                              >
                                {isConfirmTarget ? '取消' : '确认份额'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Inline confirmation form */}
                        {isConfirmTarget && (
                          <div className="mt-3 pt-3 border-t border-amber-500/20 flex gap-2 items-end animate-in slide-in-from-top-1 duration-150">
                            <div className="flex-1">
                              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">
                                确认当日单位净値/成交均价
                              </label>
                              <input
                                type="number"
                                step="0.0001"
                                placeholder="输入确认价格"
                                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-amber-500/30 text-white placeholder-zinc-600 focus:ring-2 focus:ring-amber-500/50 outline-none font-mono text-sm"
                                value={confirmNav}
                                onChange={e => setConfirmNav(e.target.value)}
                                autoFocus
                              />
                              {confirmNav && !isNaN(parseFloat(confirmNav)) && (
                                <p className="text-[10px] text-zinc-500 mt-1">
                                  份额 = ¥{tx.amount.toFixed(2)} &divide; {parseFloat(confirmNav).toFixed(4)} =
                                  <span className="text-amber-400 font-mono font-bold">
                                    {(tx.amount / parseFloat(confirmNav)).toFixed(2)} 份
                                  </span>
                                </p>
                              )}
                            </div>
                            <button
                              disabled={isConfirming || !confirmNav || isNaN(parseFloat(confirmNav))}
                              onClick={async () => {
                                if (!user) return;
                                setIsConfirming(true);
                                await confirmPendingTransaction(tx.id, parseFloat(confirmNav));
                                setConfirmingTxId(null);
                                setConfirmNav('');
                                setIsConfirming(false);
                              }}
                              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-900 font-black text-xs transition-all disabled:opacity-40 flex items-center gap-1"
                            >
                              {isConfirming ? <Loader2 size={13} className="animate-spin" /> : '写入确认'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Account Info ── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-800/40 rounded-2xl p-3 border border-zinc-700/40">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Hash size={10} /> 货币</p>
                <p className="text-sm font-bold text-white">{account.currency}</p>
              </div>
              {account.accountNumber && (
                <div className="bg-zinc-800/40 rounded-2xl p-3 border border-zinc-700/40">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">卡号尾号</p>
                  <p className="text-sm font-bold text-white font-mono">****{account.accountNumber}</p>
                </div>
              )}
            </div>

            {/* ── Delete ── */}
            <button
              onClick={handleDelete}
              className="w-full flex items-center justify-center gap-2 py-3.5 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all font-black text-xs uppercase tracking-widest border border-transparent hover:border-red-500/20"
            >
              <Trash2 size={14} /> 删除此账户
            </button>
          </div>
        </div>
      </div>

      {/* Transaction Modal */}
      {showTxModal && (
        <TransactionModal
          account={account}
          onClose={() => setShowTxModal(false)}
        />
      )}
    </>
  );
};
