import { useCallback } from 'react';
import { Alert } from 'react-native';
import expoV2ray from 'expo-v2ray';
import { useConfigStore, useVpnStore, useLogsStore } from '@brick/core-api';

export const useVpnActions = () => {
  const activeConfig = useConfigStore((state) => state.activeConfig);
  const setBusy = useVpnStore((state) => state.setBusy);
  const setStatus = useVpnStore((state) => state.setStatus);

  const appendLog = (message: string, level: 'info' | 'warn' | 'error' | 'debug' = 'info') =>
    useLogsStore.getState().appendLog(message, level);

  const handleStart = useCallback(async () => {
    if (!activeConfig) {
      Alert.alert('No config', 'Import a config first');
      appendLog('start:error no config', 'warn');
      return;
    }

    setBusy(true);
    try {
      const prepareResult = await expoV2ray.prepareVpn();
      if (!prepareResult.ready) {
        setStatus((current) => ({
          ...current,
          message: prepareResult.message,
        }));
        appendLog(`prepare:not-ready ${prepareResult.message}`, 'warn');
        return;
      }
      const result = await expoV2ray.startVpn(activeConfig);
      setStatus((current) => ({ ...current, ...result }));
      appendLog(`start:${result.message}`, 'info');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus((current) => ({
        ...current,
        state: 'error',
        message,
      }));
      appendLog(`start:error ${message}`, 'error');
    } finally {
      setBusy(false);
    }
  }, [activeConfig, setBusy, setStatus]);

  const handleStop = useCallback(async () => {
    setBusy(true);
    try {
      const result = await expoV2ray.stopVpn();
      setStatus((current) => ({ ...current, ...result }));
      appendLog(`stop:${result.message}`, 'info');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus((current) => ({
        ...current,
        state: 'error',
        message,
      }));
      appendLog(`stop:error ${message}`, 'error');
    } finally {
      setBusy(false);
    }
  }, [setBusy, setStatus]);

  return { handleStart, handleStop };
};
