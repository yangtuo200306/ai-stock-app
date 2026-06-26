import { create } from 'zustand';
import { apiPost } from '../api/client';
import type { AskMessage, AskResponse } from '../types';
import { useWatchlistStore } from './watchlistStore';
import { useRecordsStore } from './recordsStore';

interface AskState {
  sessionId: string | null;
  messages: AskMessage[];
  question: string;
  isLoading: boolean;
  error: string;
  latestResult: AskResponse | null;
}

interface AskActions {
  setQuestion: (text: string) => void;
  handleAsk: (stockCode?: string) => Promise<void>;
  handleNewSession: () => void;
  handleAddToWatchlist: () => Promise<boolean>;
  restoreSession: (sessionId: string, messages: AskMessage[]) => void;
  reset: () => void;
}

const initialState: AskState = {
  sessionId: null,
  messages: [],
  question: '',
  isLoading: false,
  error: '',
  latestResult: null,
};

export const useAskStore = create<AskState & AskActions>((set, get) => ({
  ...initialState,

  setQuestion: (text: string) => set({ question: text }),

  handleAsk: async (stockCode?: string) => {
    const { question, sessionId, messages } = get();
    if (!question.trim()) {
      set({ error: '请先输入股票问题' });
      return;
    }

    set({ isLoading: true, error: '' });

    try {
      const body: Record<string, unknown> = { question: question.trim() };
      if (sessionId) {
        body.session_id = sessionId;
      }
      if (stockCode) {
        body.stock_code = stockCode;
      }

      const data = await apiPost('/api/ask', body);

      if (data.stock_code) {
        const result = data as AskResponse;

        const newMessages: AskMessage[] = [
          ...messages,
          {
            id: Date.now(),
            role: 'user',
            content: question.trim(),
            created_at: new Date().toISOString(),
          },
          {
            id: result.message_id ?? Date.now() + 1,
            role: 'assistant',
            content: result.answer,
            answer_type: result.answer_type,
            ai_status: result.ai_status,
            model: result.model,
            created_at: new Date().toISOString(),
          },
        ];

        set({
          messages: newMessages,
          latestResult: result,
          sessionId: result.session_id ?? null,
          question: '',
          isLoading: false,
        });

        // 刷新自选列表摘要和记录列表
        useWatchlistStore.getState().loadStocks();
        useRecordsStore.getState().fetchRecords();
      } else {
        set({
          error: data.message || data.detail || '问股失败，请稍后重试',
          isLoading: false,
        });
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : '问股失败，请检查后端地址或服务是否启动';
      set({ error: message, isLoading: false });
    }
  },

  handleNewSession: () => {
    set({
      sessionId: null,
      messages: [],
      latestResult: null,
      question: '',
      error: '',
    });
  },

  handleAddToWatchlist: async () => {
    const { latestResult } = get();
    if (!latestResult) return false;

    try {
      const data = await apiPost('/api/stocks', {
        code: latestResult.stock_code,
        name: latestResult.stock_name,
      });

      if (data.message === 'stock added' || data.message === 'stock already exists') {
        useWatchlistStore.getState().loadStocks();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  restoreSession: (sessionId: string, messages: AskMessage[]) => {
    set({ sessionId, messages });
  },

  reset: () => set(initialState),
}));
