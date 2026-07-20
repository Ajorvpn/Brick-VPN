import { create } from 'zustand';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
}

interface LogsState {
  logs: LogEntry[];
  appendLog: (message: string, level?: LogLevel) => void;
  clearLogs: () => void;
}

export const useLogsStore = create<LogsState>((set) => ({
  logs: [{ level: 'info', message: 'App booted', timestamp: Date.now() }],
  appendLog: (message, level = 'info') =>
    set((state) => ({
      logs: [{ level, message, timestamp: Date.now() }, ...state.logs].slice(0, 50),
    })),
  clearLogs: () => set({ logs: [] }),
}));
