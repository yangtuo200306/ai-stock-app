export interface Stock {
  code: string;
  name: string;
}

export interface AnalysisTask {
  task_id: string;
  stock_code: string;
  status: string;
  progress: number;
  message: string;
  report_id: number | null;
  created_at?: string;
  updated_at?: string;
}

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

export interface AskResponse {
  stock_code: string;
  stock_name: string;
  price: number;
  change_pct: number;
  trend: string;
  action: string;
  score: number;
  answer: string;
  risks: string[];
  indicators: ReportIndicators;
}

export type RootTabParamList = {
  自选: undefined;
  问股: undefined;
  报告: undefined;
  我的: undefined;
};

export type WatchlistStackParamList = {
  Watchlist: undefined;
  TaskStatus: { taskId: string; stockCode: string };
  ReportDetail: { reportId: number };
};

export type ReportStackParamList = {
  ReportHistory: undefined;
  ReportDetail: { reportId: number };
};
