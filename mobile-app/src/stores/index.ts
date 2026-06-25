import { useWatchlistStore } from './watchlistStore';
import { useRecordsStore } from './recordsStore';
import { useAskStore } from './askStore';

export function resetAllStores() {
  useWatchlistStore.getState().reset();
  useRecordsStore.getState().reset();
  useAskStore.getState().reset();
}

export { useWatchlistStore } from './watchlistStore';
export { useRecordsStore } from './recordsStore';
export { useAskStore } from './askStore';
