export type AssetType = 'cash' | 'bank' | 'alipay' | 'wechat' | 'fund';

export interface AssetAccount {
  id: string;
  name: string;
  type: AssetType;
  balance: number;
  currency: string;
  accountNumber?: string;
  icon?: string;
}
