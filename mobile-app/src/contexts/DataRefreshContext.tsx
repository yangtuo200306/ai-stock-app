import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type DataRefreshContextValue = {
  watchlistVersion: number;
  recordsVersion: number;
  tasksVersion: number;
  notifyWatchlistChanged: () => void;
  notifyRecordsChanged: () => void;
  notifyTasksChanged: () => void;
  notifyAllDataChanged: () => void;
};

const DataRefreshContext = createContext<DataRefreshContextValue>({
  watchlistVersion: 0,
  recordsVersion: 0,
  tasksVersion: 0,
  notifyWatchlistChanged: () => {},
  notifyRecordsChanged: () => {},
  notifyTasksChanged: () => {},
  notifyAllDataChanged: () => {},
});

export function DataRefreshProvider({ children }: { children: React.ReactNode }) {
  const [watchlistVersion, setWatchlistVersion] = useState(0);
  const [recordsVersion, setRecordsVersion] = useState(0);
  const [tasksVersion, setTasksVersion] = useState(0);

  const notifyWatchlistChanged = useCallback(() => {
    setWatchlistVersion((v) => v + 1);
  }, []);

  const notifyRecordsChanged = useCallback(() => {
    setRecordsVersion((v) => v + 1);
  }, []);

  const notifyTasksChanged = useCallback(() => {
    setTasksVersion((v) => v + 1);
  }, []);

  const notifyAllDataChanged = useCallback(() => {
    setWatchlistVersion((v) => v + 1);
    setRecordsVersion((v) => v + 1);
    setTasksVersion((v) => v + 1);
  }, []);

  const value = useMemo(
    () => ({
      watchlistVersion,
      recordsVersion,
      tasksVersion,
      notifyWatchlistChanged,
      notifyRecordsChanged,
      notifyTasksChanged,
      notifyAllDataChanged,
    }),
    [
      watchlistVersion,
      recordsVersion,
      tasksVersion,
      notifyWatchlistChanged,
      notifyRecordsChanged,
      notifyTasksChanged,
      notifyAllDataChanged,
    ],
  );

  return (
    <DataRefreshContext.Provider value={value}>
      {children}
    </DataRefreshContext.Provider>
  );
}

export function useDataRefresh() {
  return useContext(DataRefreshContext);
}

export default DataRefreshContext;
