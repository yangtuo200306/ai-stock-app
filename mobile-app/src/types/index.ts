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
  indicators: Record<string, unknown>;
  created_at: string;
}

export interface ReportHistoryItem {
  id: number;
  stock_code: string;
  stock_name: string;
  score: number;
  action: string;
  trend: string;
  created_at: string;
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
