export type AssetType = 'cash' | 'bank' | 'alipay' | 'wechat' | 'fund';

export interface FundValuation {
  dwjz: string;   // 单位净值
  gsz: string;    // 估算净值
  gszzl: string;  // 估算涨跌幅 (%)
  gztime: string; // 估值时间
}

export interface AssetAccount {
  id: string;
  name: string;
  type: AssetType;
  balance: number;
  currency: string;
  accountNumber?: string;
  fundCode?: string;
  valuation?: FundValuation; // Real-time valuation for funds
}
