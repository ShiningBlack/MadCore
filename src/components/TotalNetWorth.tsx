import React from 'react';
import { Eye, EyeOff, TrendingUp } from 'lucide-react';

interface TotalNetWorthProps {
  total: number;
}

export const TotalNetWorth: React.FC<TotalNetWorthProps> = ({ total }) => {
  const [show, setShow] = React.useState(true);

  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
      
      <div className="relative z-10 flex justify-between items-center mb-4">
        <h2 className="text-blue-100 font-medium text-sm tracking-wide uppercase">Total Net Worth (CNY)</h2>
        <button 
          onClick={() => setShow(!show)}
          className="text-blue-200 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
          aria-label={show ? "Hide Balance" : "Show Balance"}
        >
          {show ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
      </div>
      
      <div className="relative z-10 flex items-end gap-3">
        <span className="text-3xl font-semibold">¥</span>
        <span className="text-5xl font-bold tracking-tight">
          {show ? total.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '******'}
        </span>
      </div>

      <div className="relative z-10 mt-6 inline-flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-xs font-medium">
        <TrendingUp size={14} />
        <span>Updated just now</span>
      </div>
    </div>
  );
};
