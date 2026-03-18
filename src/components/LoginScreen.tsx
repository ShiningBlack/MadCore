import React, { useState } from 'react';
import { useUserStore } from '../store/useUserStore';
import { ShieldCheck, User, Lock, ArrowRight, UserPlus, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const LoginScreen: React.FC = () => {
  const { t } = useTranslation();
  const { login, register, error, clearError } = useUserStore();
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && password.trim()) {
      setIsSubmitting(true);
      try {
        if (isRegistering) {
          await register(username, password);
        } else {
          await login(username, password);
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    clearError();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-[420px] animate-in fade-in zoom-in duration-500">
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 mb-4">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">MadCore</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Your Personal Life OS</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-zinc-800">
          <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">
            {isRegistering ? t('login.create_account') : t('login.welcome')}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-900/30">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('login.username')}</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  required
                  type="text"
                  placeholder={t('login.username')}
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('login.password')}</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  required
                  type="password"
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 group ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'active:scale-95'}`}
            >
              {isSubmitting ? (
                 <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  {isRegistering ? t('login.register') : t('login.sign_in')}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={toggleMode}
              disabled={isSubmitting}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center justify-center gap-1.5 mx-auto disabled:opacity-50"
            >
              {isRegistering ? t('login.have_account') : t('login.new_here')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
