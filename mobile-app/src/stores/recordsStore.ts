import { create } from 'zustand';
import { apiGet } from '../api/client';
import type { RecordItem } from '../types';

interface RecordsState {
  items: RecordItem[];
  isLoading: boolean;
  loadError: string;
}

interface RecordsActions {
  fetchRecords: () => Promise<void>;
  reset: () => void;
}

const initialState: RecordsState = {
  items: [],
  isLoading: false,
  loadError: '',
};

export const useRecordsStore = create<RecordsState & RecordsActions>((set) => ({
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

  reset: () => set(initialState),
}));
