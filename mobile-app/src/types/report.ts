import type { NewsItem } from './news';

export interface ReportIndicators {
  change_pct?: number;
  source?: string;
  fetched_at?: string;
  ma5?: number;
  ma10?: number;
  ma20?: number;
  bias_ma5?: number;
  bias_ma10?: number;
  bias_ma20?: number;
  ma_trend?: string;
  score_reasons?: string[];
  rsi6?: number;
  rsi12?: number;
  volume_ratio?: number;
  volume_signal?: string;
  turnover_rate?: number;
  amplitude?: number;
}

export interface Report {
  id: number;
  stock_code: string;
  stock_name: string;
  price: number;
  score: number;
  action: string;
  trend: string;
  summary: string;
  risks: string[];
  indicators: ReportIndicators;
  created_at: string;
  news?: NewsItem[];
}

export interface ReportHistoryItem {
  id: number;
  stock_code: string;
  stock_name: string;
  price?: number;
  score: number;
  action: string;
  trend: string;
  change_pct?: number;
  trend_summary?: string;
  created_at: string;
}
