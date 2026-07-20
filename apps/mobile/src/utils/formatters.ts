import type { VpnStatusResult } from 'expo-v2ray';

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

export const stateColor = (state: VpnStatusResult['state']): string => {
  switch (state) {
    case 'connected':
    case 'ready':
      return '#10b981';
    case 'starting':
    case 'preparing':
    case 'stopping':
      return '#f59e0b';
    case 'error':
      return '#ef4444';
    default:
      return '#9ca3af';
  }
};
