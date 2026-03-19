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

export type TransactionStatus = 'pending' | 'confirmed';

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
  shares?: number;           // 持有份额
  costPrice?: number;        // 成本净值
  settlementDays?: number;   // 1 = T+1, 2 = T+2
  // Runtime (not stored)
  realtime?: FundRealtime;
}

export interface Transaction {
  id: number;
  assetId: string;
  userId: number;
  type: TransactionType;
  amount: number;
  nav?: number;              // 确认净值
  sharesChange?: number;     // 份额变动
  status: TransactionStatus;
  confirmDate?: string;      // 预计份额确认日 (YYYY-MM-DD)
  note?: string;
  timestamp: string;
}

// ── Watchlist ─────────────────────────────────────────────────────────────────

export interface WatchlistItem {
  id: string;
  userId: number;
  fundCode: string;
  name?: string;
  note?: string;
  simAmount?: number;   // 模拟买入金额
  simNav?: number;      // 模拟买入净值
  simDate?: string;     // 模拟买入日期
  simShares?: number;   // 模拟持有份额
  // Runtime
  realtime?: FundRealtime;
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
