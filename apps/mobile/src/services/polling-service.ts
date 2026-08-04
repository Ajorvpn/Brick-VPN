import { AppState, type AppStateStatus } from 'react-native';
import expoV2ray from 'expo-v2ray';
import { useLogsStore, useVpnStore, type TrafficStats, type VpnStatus } from '@brick/core-api';

const POLLING_INTERVAL_MS = 2000;

const logError = (msg: string) =>
  useLogsStore.getState().appendLog(msg, 'warn');

const refreshStatus = async () => {
  try {
    const raw = await expoV2ray.getStatus();
    if (typeof raw !== 'object' || raw === null) {
      logError('polling:status-invalid');
      return;
    }
    const r = (raw as unknown) as Record<string, unknown>;
    const validStates = ['idle', 'preparing', 'ready', 'starting', 'connected', 'stopping', 'stopped', 'error'];
    if (typeof r.state !== 'string' || !validStates.includes(r.state)) {
      logError('polling:status-invalid-state');
      return;
    }
    const result: VpnStatus = {
      state: r.state as VpnStatus['state'],
      connected: typeof r.connected === 'boolean' ? r.connected : false,
      message: typeof r.message === 'string' ? r.message : '',
    };
    const currentState = useVpnStore.getState().status.state;
    if ((currentState === 'stopped' || currentState === 'idle') && result.state === 'stopping') {
      return;
    }
    useVpnStore.getState().setStatus(result);
  } catch (error) {
    logError(`polling:status-error ${error instanceof Error ? error.message : String(error)}`);
  }
};

const refreshTraffic = async () => {
  try {
    const stats = await expoV2ray.getTrafficStats();
    useVpnStore.getState().setTraffic(stats as TrafficStats);
  } catch (error) {
    logError(`polling:traffic-error ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const startPollingService = () => {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let active = true;

  const poll = () => {
    if (!active) return;
    void refreshStatus();
    if (useVpnStore.getState().status.state === 'connected') {
      void refreshTraffic();
    }
  };

  const start = () => {
    if (intervalId) return;
    poll();
    intervalId = setInterval(poll, POLLING_INTERVAL_MS);
  };

  const stop = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
    active = state === 'active';
    if (active) start();
    else stop();
  });

  start();

  return () => {
    stop();
    sub.remove();
  };
};
