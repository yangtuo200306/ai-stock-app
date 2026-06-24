import type { NavigatorScreenParams } from '@react-navigation/native';

export interface Stock {
  code: string;
  name: string;
  latest_record_id?: number | null;
  latest_record_type?: string | null;
  latest_summary?: string | null;
  latest_updated_at?: string | null;
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
  rsi6?: number;
  rsi12?: number;
  volume_ratio?: number;
  volume_signal?: string;
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
  question?: string;
  answer: string;
  answer_type?: string;
  ai_status?: string;
  risks: string[];
  indicators: ReportIndicators;
  model?: string;
  session_id?: string;
  message_id?: number | null;
  is_new_session?: boolean;
  conversation_title?: string;
}

export interface AskMessage {
  id: number;
  role: string;
  content: string;
  answer_type?: string | null;
  ai_status?: string | null;
  model?: string | null;
  created_at: string;
}

export interface RecordItem {
  id: number;
  record_type: string;
  stock_code: string;
  stock_name: string;
  title: string;
  summary: string;
  question?: string | null;
  answer_type?: string | null;
  report_id?: number | null;
  metadata: {
    price?: number;
    change_pct?: number;
    score?: number;
    action?: string;
    trend?: string;
    model?: string | null;
    task_id?: string;
  };
  created_at: string;
  updated_at?: string;
  session_id?: string | null;
}

export interface RecordDetail {
  id: number;
  record_type: string;
  stock_code: string;
  stock_name: string;
  title: string;
  summary: string;
  question?: string | null;
  answer?: string | null;
  answer_type?: string | null;
  report_id?: number | null;
  metadata: {
    price?: number;
    change_pct?: number;
    score?: number;
    action?: string;
    trend?: string;
    model?: string | null;
    task_id?: string;
  };
  created_at: string;
  updated_at?: string;
  session_id?: string | null;
  messages?: AskMessage[] | null;
}

export type RootTabParamList = {
  自选: undefined;
  问股:
    | {
        sessionId?: string;
        initialQuestion?: string;
        initialMessages?: AskMessage[];
      }
    | undefined;
  记录: undefined;
  我的: NavigatorScreenParams<MineStackParamList> | undefined;
};

export type WatchlistStackParamList = {
  Watchlist: undefined;
  TaskStatus: { taskId: string; stockCode: string };
  ReportDetail: { reportId: number };
};

export type RecordStackParamList = {
  RecordList: undefined;
  RecordDetail: { recordId: number };
  ReportDetail: { reportId: number };
};

export type MineStackParamList = {
  Mine: undefined;
  Login: undefined;
};
