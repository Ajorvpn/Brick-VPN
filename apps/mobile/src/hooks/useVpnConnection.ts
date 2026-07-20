import { useEffect } from 'react';
import expoV2ray from 'expo-v2ray';
import { useVpnStore, type LogLevel } from '@brick/core-api';

const normalizeLevel = (level: string): LogLevel => {
  switch (level) {
    case 'error':
      return 'error';
    case 'warn':
    case 'warning':
      return 'warn';
    case 'debug':
      return 'debug';
    default:
      return 'info';
  }
};

export const useVpnConnection = (appendLog: (message: string, level?: LogLevel) => void) => {
  const setStatus = useVpnStore((state) => state.setStatus);

  useEffect(() => {
    const stateSub = expoV2ray.addStateListener((payload) => {
      setStatus((current) => ({
        ...current,
        state: payload.state,
        message: payload.message ?? current.message,
      }));
      appendLog(`state:${payload.state} ${payload.message ?? ''}`.trim(), 'info');
    });

    const logSub = expoV2ray.addLogListener((payload) => {
      appendLog(`log:${payload.level} ${payload.message}`, normalizeLevel(payload.level));
    });

    return () => {
      stateSub.remove();
      logSub.remove();
    };
  }, [appendLog, setStatus]);
};
