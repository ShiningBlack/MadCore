import React, { useState } from 'react';
import { useUserStore } from '../store/useUserStore';
import { ShieldCheck, User, Lock, ArrowRight, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login, register, error, clearError } = useUserStore();
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (!username.trim() || !password.trim()) return;

    if (isRegistering) {
      if (password !== confirmPassword) {
        setLocalError('两次密码输入不一致');
        return;
      }
      if (password.length < 6) {
        setLocalError('密码长度至少 6 位');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (isRegistering) {
        await register(username.trim(), password, email.trim() || undefined);
      } else {
        await login(username.trim(), password);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    clearError();
    setLocalError('');
    setConfirmPassword('');
    setEmail('');
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-indigo-50 flex items-center justify-center p-4">
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-200/40 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-[420px] relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-indigo-500/30 mb-5 rotate-3 hover:rotate-0 transition-transform duration-500">
            <ShieldCheck size={38} strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">MadCore</h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">个人资产管理中枢</p>
        </div>

        <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-slate-200/80">
          <h2 className="text-xl font-bold mb-6 text-slate-900">
            {isRegistering ? '创建账户' : '欢迎回来'}
          </h2>

          {displayError && (
            <div className="mb-5 p-3.5 bg-red-50 text-red-600 text-sm rounded-2xl border border-red-100 font-medium">
              {displayError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">用户名</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input
                  required
                  type="text"
                  placeholder="your_username"
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </div>
            </div>

            {/* Email (register only) */}
            {isRegistering && (
              <div className="animate-in slide-in-from-top-2 duration-200">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">邮箱（可选）</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">密码</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input
                  required
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Confirm Password (register only) */}
            {isRegistering && (
              <div className="animate-in slide-in-from-top-2 duration-200">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">确认密码</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input
                    required
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
              >
                {isSubmitting ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    {isRegistering ? '注册账户' : '登录'}
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={toggleMode}
              disabled={isSubmitting}
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors disabled:opacity-50"
            >
              {isRegistering ? '已有账户？立即登录' : '还没有账户？免费注册'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">数据传输经由安全加密，账户信息存储于服务器端</p>
      </div>
    </div>
  );
};
