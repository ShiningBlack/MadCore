import React from 'react';
import { Eye, EyeOff, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TotalNetWorthProps {
  total: number;
  show: boolean;
  onToggle: () => void;
}

export const TotalNetWorth: React.FC<TotalNetWorthProps> = ({ total, show, onToggle }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-gradient-to-r from-indigo-600 to-blue-700 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:opacity-10 transition-opacity"></div>
      
      <div className="relative z-10 flex justify-between items-center mb-6">
        <h2 className="text-indigo-100 font-bold text-xs tracking-[0.2em] uppercase opacity-80">{t('dashboard.total_net_worth')} (CNY)</h2>
        <button 
          onClick={onToggle}
          className="text-indigo-200 hover:text-white transition-colors p-2 rounded-xl hover:bg-white/10"
        >
          {show ? <Eye size={20} /> : <EyeOff size={20} />}
        </button>
      </div>
      
      <div className="relative z-10 flex items-baseline gap-3">
        <span className="text-3xl font-black opacity-50">¥</span>
        <span className="text-6xl font-black tracking-tighter">
          {show ? total.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '******'}
        </span>
      </div>

      <div className="relative z-10 mt-8 flex items-center gap-2 text-indigo-100/60">
        <div className="p-1.5 bg-white/10 rounded-lg">
          <TrendingUp size={14} className="text-indigo-200" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest">{t('common.updated')} {new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
};
