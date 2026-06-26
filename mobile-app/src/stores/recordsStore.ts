import { create } from 'zustand';
import { apiDelete, apiGet } from '../api/client';
import type { RecordItem } from '../types';

interface RecordsState {
  items: RecordItem[];
  isLoading: boolean;
  loadError: string;
  searchQuery: string;
}

interface RecordsActions {
  fetchRecords: () => Promise<void>;
  deleteRecord: (id: number) => Promise<boolean>;
  setSearchQuery: (query: string) => void;
  getFilteredRecords: (query: string) => RecordItem[];
  reset: () => void;
}

const initialState: RecordsState = {
  items: [],
  isLoading: false,
  loadError: '',
  searchQuery: '',
};

export const useRecordsStore = create<RecordsState & RecordsActions>((set, get) => ({
  ...initialState,

  fetchRecords: async () => {
    set({ isLoading: true, loadError: '' });
    try {
      const data = await apiGet('/api/records');
      set({ items: data.items ?? [], isLoading: false });
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : '加载记录失败';
      set({ loadError: message, isLoading: false });
    }
  },

  deleteRecord: async (id: number) => {
    try {
      const data = await apiDelete(`/api/records/${id}`);
      if (data.message === 'record deleted') {
        await get().fetchRecords();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  getFilteredRecords: (query: string) => {
    const { items } = get();
    if (!query.trim()) return items;
    const lower = query.trim().toLowerCase();
    return items.filter(
      (item) =>
        item.stock_code.toLowerCase().includes(lower) ||
        item.stock_name.toLowerCase().includes(lower) ||
        (item.title && item.title.toLowerCase().includes(lower)) ||
        (item.summary && item.summary.toLowerCase().includes(lower)),
    );
  },

  reset: () => set(initialState),
}));
