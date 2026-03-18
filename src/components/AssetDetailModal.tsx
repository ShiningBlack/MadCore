import React, { useEffect, useState } from 'react';
import { X, Trash2, Calendar, Hash, ArrowUpRight, ArrowDownRight, RefreshCw, Loader2, LineChart as ChartIcon } from 'lucide-react';
import { AssetAccount } from '../types/asset';
import { useAssetStore } from '../store/useAssetStore';
import { useUserStore } from '../store/useUserStore';
import { invoke } from '@tauri-apps/api/core';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useTranslation } from 'react-i18next';

interface AssetDetailModalProps {
  account: AssetAccount | null;
  onClose: () => void;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({ account, onClose }) => {
  const { t } = useTranslation();
  const { user } = useUserStore();
  const deleteAccount = useAssetStore(state => state.deleteAccount);
  const showBalances = useAssetStore(state => state.showBalances);
  
  const [detail, setDetail] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (account?.type === 'fund' && account.fundCode) {
      const fetchDetail = async () => {
        setIsLoading(true);
        try {
          const data = await invoke('fetch_fund_detail', { code: account.fundCode });
          setDetail(data);
        } catch (err) {
          console.error("Failed to fetch fund detail", err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchDetail();
    } else {
      setDetail(null);
    }
  }, [account]);

  if (!account) return null;

  const handleDelete = async () => {
    if (user && window.confirm(t('asset.detail.confirm_delete'))) {
      await deleteAccount(user.username, account.id);
      onClose();
    }
  };

  const isFund = account.type === 'fund';
  const gszzl = account.valuation ? parseFloat(account.valuation.gszzl) : 0;
  const profit = (account.balance * gszzl) / 100;

  const chartData = detail?.netWorthTrend?.slice(-30).map((p: any) => ({
    date: new Date(p.x).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }),
    value: p.y,
    rawDate: p.x
  })) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
        
        <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-800/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{account.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-black bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full uppercase tracking-widest">
                {t(`asset.type.${account.type}`)}
              </span>
              {account.fundCode && (
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">#{account.fundCode}</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-xl transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto max-h-[85vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <div className="space-y-1">
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">{t('asset.detail.current_balance')}</p>
              <h3 className="text-4xl font-black text-gray-900 dark:text-white">
                {showBalances ? `¥${account.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '******'}
              </h3>
            </div>

            {isFund && (
              <div className="p-5 rounded-3xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/20 flex justify-between items-center">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{t('asset.detail.daily_estimate')}</p>
                  <div className={`text-xl font-black flex items-center gap-1 ${gszzl >= 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {gszzl >= 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                    {gszzl.toFixed(2)}%
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{t('asset.detail.est_profit')}</p>
                  <div className={`text-xl font-black ${gszzl >= 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {gszzl >= 0 ? '+' : ''}{profit.toFixed(2)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {isFund && (
            <div className="mb-10 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <ChartIcon size={14} /> {t('asset.detail.trend_title')}
                </h4>
                {isLoading && <Loader2 size={14} className="animate-spin text-indigo-500" />}
              </div>
              
              <div className="h-[240px] w-full bg-gray-50/50 dark:bg-zinc-800/30 rounded-3xl p-4 border border-gray-100 dark:border-zinc-800">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fontBold: true, fill: '#94a3b8'}}
                        minTickGap={20}
                      />
                      <YAxis hide domain={['dataMin - 0.01', 'dataMax + 0.01']} />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '16px', 
                          border: 'none', 
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                          backgroundColor: '#18181b',
                          color: '#fff'
                        }}
                        itemStyle={{ color: '#818cf8', fontBold: true }}
                        labelStyle={{ display: 'none' }}
                      />
                      <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : !isLoading && (
                  <div className="h-full flex items-center justify-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                    {t('asset.detail.no_trend')}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="p-4 rounded-2xl border border-gray-50 dark:border-zinc-800 bg-gray-50/30 dark:bg-zinc-800/20">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('asset.fields.currency')}</p>
              <p className="font-bold dark:text-white">{account.currency}</p>
            </div>
            <div className="p-4 rounded-2xl border border-gray-50 dark:border-zinc-800 bg-gray-50/30 dark:bg-zinc-800/20">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">ID</p>
              <p className="font-mono font-bold text-xs dark:text-white truncate">{account.accountNumber || 'Primary'}</p>
            </div>
          </div>

          <button
            onClick={handleDelete}
            className="w-full flex items-center justify-center gap-2 py-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl transition-all font-black text-xs uppercase tracking-widest border border-transparent hover:border-red-100 dark:hover:border-red-900/20"
          >
            <Trash2 size={16} />
            {t('asset.detail.remove_record')}
          </button>
        </div>
      </div>
    </div>
  );
};
