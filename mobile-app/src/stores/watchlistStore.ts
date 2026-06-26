import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiGet, apiPost, apiDelete } from '../api/client';
import type { Stock } from '../types';

const TASK_IDS_KEY = 'stockTaskIds';

async function readTaskIds(): Promise<Record<string, string>> {
  const saved = await AsyncStorage.getItem(TASK_IDS_KEY);
  if (!saved) return {};
  try {
    return JSON.parse(saved) as Record<string, string>;
  } catch {
    await AsyncStorage.removeItem(TASK_IDS_KEY);
    return {};
  }
}

interface WatchlistState {
  stocks: Stock[];
  taskStatuses: Record<string, string>;
  isLoading: boolean;
  loadError: string;
  searchQuery: string;
}

interface WatchlistActions {
  loadStocks: () => Promise<void>;
  loadTaskStatuses: () => Promise<void>;
  addStock: (code: string, name: string) => Promise<boolean>;
  deleteStock: (code: string) => Promise<boolean>;
  createAnalysis: (stockCode: string) => Promise<string | null>;
  updateTaskStatus: (code: string, status: string) => void;
  setSearchQuery: (query: string) => void;
  getFilteredStocks: (query: string) => Stock[];
  reset: () => void;
}

const initialState: WatchlistState = {
  stocks: [],
  taskStatuses: {},
  isLoading: false,
  loadError: '',
  searchQuery: '',
};

export const useWatchlistStore = create<WatchlistState & WatchlistActions>((set, get) => ({
  ...initialState,

  loadStocks: async () => {
    set({ isLoading: true, loadError: '' });
    try {
      const data = await apiGet('/api/stocks');
      set({ stocks: data.items ?? [], isLoading: false });
    } catch {
      set({ loadError: '加载自选股失败，请检查后端服务', stocks: [], isLoading: false });
    }
  },

  loadTaskStatuses: async () => {
    const taskIds = await readTaskIds();
    const newStatuses: Record<string, string> = {};
    for (const [stockCode, taskId] of Object.entries(taskIds)) {
      try {
        const data = await apiGet(`/api/analysis/${taskId}`);
        if (data.status) {
          newStatuses[stockCode] = data.status;
        }
      } catch {
        // ignore
      }
    }
    set({ taskStatuses: newStatuses });
  },

  addStock: async (code: string, name: string) => {
    try {
      const data = await apiPost('/api/stocks', { code, name });
      if (data.message === 'stock added' || data.message === 'stock already exists') {
        await get().loadStocks();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  deleteStock: async (code: string) => {
    try {
      const data = await apiDelete(`/api/stocks/${code}`);
      if (data.message === 'stock deleted') {
        const taskIds = await readTaskIds();
        delete taskIds[code];
        await AsyncStorage.setItem(TASK_IDS_KEY, JSON.stringify(taskIds));
        set((state) => {
          const next = { ...state.taskStatuses };
          delete next[code];
          return { taskStatuses: next };
        });
        await get().loadStocks();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  createAnalysis: async (stockCode: string) => {
    try {
      const data = await apiPost('/api/analysis', { stock_code: stockCode });
      if (data.task_id) {
        const taskIds = await readTaskIds();
        taskIds[stockCode] = data.task_id;
        await AsyncStorage.setItem(TASK_IDS_KEY, JSON.stringify(taskIds));
        set((state) => ({
          taskStatuses: { ...state.taskStatuses, [stockCode]: data.status },
        }));
        return data.task_id;
      }
      return null;
    } catch {
      return null;
    }
  },

  updateTaskStatus: (code: string, status: string) => {
    set((state) => ({
      taskStatuses: { ...state.taskStatuses, [code]: status },
    }));
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  getFilteredStocks: (query: string) => {
    const { stocks } = get();
    if (!query.trim()) return stocks;
    const lower = query.trim().toLowerCase();
    return stocks.filter(
      (s) => s.code.toLowerCase().includes(lower) || s.name.toLowerCase().includes(lower),
    );
  },

  reset: () => set(initialState),
}));
