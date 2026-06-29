import { create } from 'zustand';
import { apiPost, apiPostAgentStream, apiPostStream } from '../api/client';
import type { AskMessage, AskResponse, ThinkingStep } from '../types';
import { useWatchlistStore } from './watchlistStore';
import { useRecordsStore } from './recordsStore';

interface AskState {
  sessionId: string | null;
  messages: AskMessage[];
  question: string;
  isLoading: boolean;
  isStreaming: boolean;
  error: string;
  latestResult: AskResponse | null;
  thinkingSteps: ThinkingStep[];
}

interface AskActions {
  setQuestion: (text: string) => void;
  handleAsk: (stockCode?: string) => Promise<void>;
  handleAskStream: (stockCode?: string) => Promise<void>;
  handleAskAgentStream: (stockCode?: string) => Promise<void>;
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
  isStreaming: false,
  error: '',
  latestResult: null,
  thinkingSteps: [],
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

  handleAskStream: async (stockCode?: string) => {
    const { question, sessionId } = get();
    if (!question.trim()) {
      set({ error: '请先输入股票问题' });
      return;
    }

    set({ isLoading: true, isStreaming: true, error: '' });

    // 添加用户消息
    const userMsg: AskMessage = {
      id: Date.now(),
      role: 'user',
      content: question.trim(),
      created_at: new Date().toISOString(),
    };

    // 添加占位 assistant 消息
    const assistantMsg: AskMessage = {
      id: Date.now() + 1,
      role: 'assistant',
      content: '',
      answer_type: 'ai',
      created_at: new Date().toISOString(),
    };

    set(state => ({
      messages: [...state.messages, userMsg, assistantMsg],
      question: '',
    }));

    try {
      const body: Record<string, unknown> = { question: question.trim() };
      if (sessionId) {
        body.session_id = sessionId;
      }
      if (stockCode) {
        body.stock_code = stockCode;
      }

      await apiPostStream(
        '/api/ask/stream',
        body,
        (chunk) => {
          // 逐 chunk 追加到最后一条消息
          set(state => {
            const msgs = [...state.messages];
            const last = msgs[msgs.length - 1];
            msgs[msgs.length - 1] = { ...last, content: last.content + chunk };
            return { messages: msgs };
          });
        },
        (headers) => {
          // 流结束，解析 X-Result-Data
          const resultData = headers.get('X-Result-Data');
          if (resultData) {
            try {
              const result = JSON.parse(resultData) as AskResponse;
              set({
                latestResult: result,
                sessionId: result.session_id ?? null,
                isStreaming: false,
                isLoading: false,
              });
            } catch {
              set({ isStreaming: false, isLoading: false });
            }
          } else {
            set({ isStreaming: false, isLoading: false });
          }
          // 刷新自选列表摘要和记录列表
          useWatchlistStore.getState().loadStocks();
          useRecordsStore.getState().fetchRecords();
        },
        (error) => {
          // 流式失败，降级到非流式
          set({ isStreaming: false });
          get().handleAsk(stockCode);
        },
      );
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : '问股失败，请检查后端地址或服务是否启动';
      set({ error: message, isStreaming: false, isLoading: false });
    }
  },

  handleAskAgentStream: async (stockCode?: string) => {
    const { question, sessionId } = get();
    if (!question.trim()) {
      set({ error: '请先输入股票问题' });
      return;
    }

    set({ isLoading: true, isStreaming: true, error: '', thinkingSteps: [] });

    // 添加用户消息
    const userMsg: AskMessage = {
      id: Date.now(),
      role: 'user',
      content: question.trim(),
      created_at: new Date().toISOString(),
    };

    // 添加占位 assistant 消息
    const assistantMsg: AskMessage = {
      id: Date.now() + 1,
      role: 'assistant',
      content: '',
      answer_type: 'ai',
      created_at: new Date().toISOString(),
    };

    set(state => ({
      messages: [...state.messages, userMsg, assistantMsg],
      question: '',
    }));

    try {
      const body: Record<string, unknown> = { question: question.trim() };
      if (sessionId) {
        body.session_id = sessionId;
      }
      if (stockCode) {
        body.stock_code = stockCode;
      }

      let accumulatedContent = '';
      let shouldFallback = false;
      let sessionIdFromDone = '';

      await apiPostAgentStream(
        '/api/ask/agent/stream',
        body,
        (event) => {
          switch (event.type) {
            case 'thinking':
              set(state => ({
                thinkingSteps: [
                  ...state.thinkingSteps,
                  { type: 'thinking', message: event.message as string },
                ],
              }));
              break;

            case 'tool_start':
              set(state => ({
                thinkingSteps: [
                  ...state.thinkingSteps,
                  {
                    type: 'tool_start',
                    tool: event.tool as string,
                    display_name: event.display_name as string,
                  },
                ],
              }));
              break;

            case 'tool_done':
              set(state => {
                const steps = [...state.thinkingSteps];
                // 更新最后一个 tool_start 为 tool_done
                for (let i = steps.length - 1; i >= 0; i--) {
                  if (steps[i].type === 'tool_start' && steps[i].tool === event.tool) {
                    steps[i] = {
                      type: 'tool_done',
                      tool: event.tool as string,
                      display_name: event.display_name as string,
                      success: event.success as boolean,
                      duration: event.duration as number,
                    };
                    break;
                  }
                }
                return { thinkingSteps: steps };
              });
              break;

            case 'text':
              accumulatedContent += (event.content as string) || '';
              set(state => {
                const msgs = [...state.messages];
                const last = msgs[msgs.length - 1];
                msgs[msgs.length - 1] = { ...last, content: accumulatedContent };
                return { messages: msgs };
              });
              break;

            case 'done':
              if (event.session_id) {
                sessionIdFromDone = event.session_id as string;
              }
              if (event.success === false) {
                shouldFallback = true;
              }
              break;
          }
        },
        () => {
          // onDone
          if (shouldFallback) {
            // Agent 内部失败，降级到传统流式
            set({ isStreaming: false, thinkingSteps: [] });
            get().handleAskStream(stockCode);
            return;
          }
          set({
            isStreaming: false,
            isLoading: false,
            sessionId: sessionIdFromDone || undefined,
          });
          // 刷新自选列表摘要和记录列表
          useWatchlistStore.getState().loadStocks();
          useRecordsStore.getState().fetchRecords();
        },
        (error) => {
          // onError - 降级到传统流式
          set({ isStreaming: false, thinkingSteps: [] });
          get().handleAskStream(stockCode);
        },
      );
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : '问股失败，请检查后端地址或服务是否启动';
      set({ error: message, isStreaming: false, isLoading: false, thinkingSteps: [] });
    }
  },

  handleNewSession: () => {
    set({
      sessionId: null,
      messages: [],
      latestResult: null,
      question: '',
      error: '',
      thinkingSteps: [],
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
