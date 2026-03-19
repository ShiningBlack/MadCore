// ── Asset Types ──────────────────────────────────────────────────────────────

export type AssetType = 'cash' | 'bank' | 'alipay' | 'wechat' | 'fund';

export type TransactionType =
  | 'income'
  | 'expense'
  | 'transfer_in'
  | 'transfer_out'
  | 'fund_buy'
  | 'fund_sell'
  | 'fund_dividend';

export interface AssetAccount {
  id: string;
  userId: number;
  name: string;
  type: AssetType;
  balance: number;
  currency: string;
  accountNumber?: string;
  // Fund-specific
  fundCode?: string;
  shares?: number;       // 持有份额
  costPrice?: number;    // 成本净值
  // Runtime (not stored)
  realtime?: FundRealtime;
}

export interface Transaction {
  id: number;
  assetId: string;
  userId: number;
  type: TransactionType;
  amount: number;
  note?: string;
  timestamp: string;
}

// ── Fund Real-time Valuation (fundgz API) ────────────────────────────────────

export interface FundRealtime {
  fundcode: string;
  name: string;
  jzrq: string;   // 净值日期
  dwjz: string;   // 单位净值
  gsz: string;    // 估算净值
  gszzl: string;  // 估算涨跌幅 (%)
  gztime: string; // 估值时间
}

// ── Fund Full Detail (pingzhongdata API) ────────────────────────────────────

export interface NavPoint {
  x: number;          // timestamp ms
  y: number;          // NAV value
  equity_return: number; // daily return %
}

export interface PerformanceEvaluation {
  avr: string;
  categories: string[];
  data: number[];
}

export interface FundManager {
  id: string;
  name: string;
  star?: number;
  work_time: string;
  fund_size: string;
}

export interface FundDetailFull {
  name: string;
  code: string;
  fund_rate: string;
  fund_source_rate: string;
  syl_1n: string;    // 近1年收益率
  syl_6y: string;    // 近6月收益率
  syl_3y: string;    // 近3月收益率
  syl_1y: string;    // 近1月收益率
  net_worth_trend: NavPoint[];
  ac_worth_trend: [number, number][];
  performance: PerformanceEvaluation | null;
  managers: FundManager[];
}
