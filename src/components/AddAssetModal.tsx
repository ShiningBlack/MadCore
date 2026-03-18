import React, { useState, useEffect, useRef } from 'react';
import { X, Wallet, CreditCard, Smartphone, MessageCircle, TrendingUp, Loader2, Search } from 'lucide-react';
import { AssetType, AssetAccount } from '../types/asset';
import { useAssetStore } from '../store/useAssetStore';
import { useUserStore } from '../store/useUserStore';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddAssetModal: React.FC<AddAssetModalProps> = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation(); // Added i18n here
  const addAccount = useAssetStore(state => state.addAccount);
  const currentUser = useUserStore(state => state.user);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingFund, setIsFetchingFund] = useState(false);
  const [selectedType, setSelectedType] = useState<AssetType>('bank');
  
  const [formData, setFormData] = useState<Omit<AssetAccount, 'id'>>({
    name: '',
    type: 'bank',
    balance: 0,
    currency: 'CNY',
    accountNumber: '',
    fundCode: '',
  });

  const ASSET_TYPES: { type: AssetType; label: string; icon: any; defaultName: string }[] = [
    { type: 'cash', label: t('asset.type.cash'), icon: Wallet, defaultName: t('asset.type.cash') },
    { type: 'bank', label: t('asset.type.bank'), icon: CreditCard, defaultName: '' },
    { type: 'alipay', label: t('asset.type.alipay'), icon: Smartphone, defaultName: t('asset.type.alipay') },
    { type: 'wechat', label: t('asset.type.wechat'), icon: MessageCircle, defaultName: t('asset.type.wechat') },
    { type: 'fund', label: t('asset.type.fund'), icon: TrendingUp, defaultName: '' },
  ];

  const fundCodeRef = useRef<string>('');

  useEffect(() => {
    const typeConfig = ASSET_TYPES.find(t => t.type === selectedType);
    if (typeConfig) {
      setFormData(prev => ({
        ...prev,
        type: selectedType,
        name: typeConfig.defaultName || (selectedType === prev.type ? prev.name : '')
      }));
    }
  }, [selectedType, i18n.language]); // i18n is now defined

  const handleFetchFund = async (code: string) => {
    if (!code || code.length !== 6) return;
    setIsFetchingFund(true);
    try {
      const data: any = await invoke('fetch_fund_data', { code });
      setFormData(prev => ({ ...prev, name: data.name, fundCode: code }));
    } catch (err) {
      console.error("Fund fetch failed", err);
    } finally {
      setIsFetchingFund(false);
    }
  };

  const handleFundCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, fundCode: val }));
    if (val.length === 6 && val !== fundCodeRef.current) {
      fundCodeRef.current = val;
      handleFetchFund(val);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSubmitting(true);
    try {
      await addAccount(currentUser.username, { ...formData, balance: Number(formData.balance) });
      onClose();
      setSelectedType('bank');
      setFormData({ name: '', type: 'bank', balance: 0, currency: 'CNY', accountNumber: '', fundCode: '' });
      fundCodeRef.current = '';
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-800/50">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('dashboard.new_asset')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-xl transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-5 gap-2">
            {ASSET_TYPES.map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all ${
                  selectedType === type
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600'
                    : 'border-transparent bg-gray-50 dark:bg-zinc-800 text-gray-500 hover:bg-gray-100'
                }`}
              >
                <Icon size={20} className="mb-1" />
                <span className="text-[10px] font-bold tracking-tighter">{label}</span>
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {selectedType === 'fund' && (
              <div className="animate-in slide-in-from-top-2 duration-200">
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">{t('asset.fields.fund_code')}</label>
                <div className="relative">
                  <input
                    required
                    type="text"
                    placeholder="001186"
                    maxLength={6}
                    className="w-full pl-4 pr-12 py-3 rounded-2xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                    value={formData.fundCode}
                    onChange={handleFundCodeChange}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-600">
                    {isFetchingFund ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                  </div>
                </div>
              </div>
            )}

            <div className="animate-in slide-in-from-top-2 duration-200">
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
                {selectedType === 'bank' ? t('asset.fields.bank_name') : selectedType === 'fund' ? t('asset.fields.fund_name') : t('asset.fields.name')}
              </label>
              <input
                required
                type="text"
                placeholder="..."
                className="w-full px-4 py-3 rounded-2xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {selectedType === 'bank' && (
              <div className="animate-in slide-in-from-top-2 duration-200">
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">{t('asset.fields.account_number')}</label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="8888"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  value={formData.accountNumber}
                  onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">{t('asset.fields.balance')}</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-lg"
                  value={formData.balance || ''}
                  onChange={e => setFormData({ ...formData, balance: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">{t('asset.fields.currency')}</label>
                <select
                  className="w-full px-4 py-3 rounded-2xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.currency}
                  onChange={e => setFormData({ ...formData, currency: e.target.value })}
                >
                  <option value="CNY">CNY (¥)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || (selectedType === 'fund' && !formData.name)}
              className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'active:scale-95'}`}
            >
              {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : t('common.confirm')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
