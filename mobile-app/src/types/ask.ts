import type { ReportIndicators } from './report';
import type { NewsItem } from './news';

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
  news?: NewsItem[];
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

export interface AgentEvent {
  type: 'thinking' | 'tool_start' | 'tool_done' | 'text' | 'done';
  step?: number;
  message?: string;
  tool?: string;
  display_name?: string;
  success?: boolean;
  duration?: number;
  content?: string;
  session_id?: string;
  error?: string;
  result_data?: AskResponse;
}

export interface ThinkingStep {
  type: 'thinking' | 'tool_start' | 'tool_done' | 'generating';
  tool?: string;
  display_name?: string;
  success?: boolean;
  duration?: number;
  message?: string;
}
