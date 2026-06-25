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
