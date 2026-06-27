import type { AskMessage } from './ask';
import type { ReportIndicators } from './report';

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
    indicators?: ReportIndicators;
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
    indicators?: ReportIndicators;
    model?: string | null;
    task_id?: string;
  };
  created_at: string;
  updated_at?: string;
  session_id?: string | null;
  messages?: AskMessage[] | null;
}
