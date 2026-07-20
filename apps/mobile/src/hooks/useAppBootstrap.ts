import { useEffect, useMemo } from 'react';
import { useVpnConnection } from './useVpnConnection';
import { useTrafficStats } from './useTrafficStats';
import { useLogsStore } from '@brick/core-api';
import { startPollingService } from '../services/polling-service';

export const useAppBootstrap = () => {
  const appendLog = useMemo(
    () => (message: string, level?: 'info' | 'warn' | 'error' | 'debug') =>
      useLogsStore.getState().appendLog(message, level),
    [],
  );

  useVpnConnection(appendLog);
  useTrafficStats();

  useEffect(() => {
    const cleanup = startPollingService();
    return cleanup;
  }, []);
};
