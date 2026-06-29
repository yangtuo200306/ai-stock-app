import { create } from 'zustand';
import { apiGet } from '../api/client';
import type { SessionItem } from '../types';

interface SessionState {
  sessions: SessionItem[];
  isLoading: boolean;
  fetchSessions: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessions: [],
  isLoading: false,

  fetchSessions: async () => {
    set({ isLoading: true });
    try {
      const data = await apiGet('/api/sessions');
      set({ sessions: data as SessionItem[], isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));
