export type VpnState = 'idle' | 'preparing' | 'ready' | 'service-started' | 'connected' | 'stopped' | 'error';

export interface VpnPrepareResult {
  ready: boolean;
  requiresUserConsent: boolean;
  state: VpnState;
  message: string;
}

export interface VpnStatusResult {
  state: VpnState;
  connected: boolean;
  message: string;
}

export interface VpnStateChangedPayload {
  state: VpnState;
  message?: string;
}

export type VpnLogLevel = 'info' | 'warn' | 'error';

export interface VpnLogPayload {
  message: string;
  level: VpnLogLevel;
}

export interface VpnTrafficPayload {
  bytesIn: number;
  bytesOut: number;
}

export interface VpnListenerSubscription {
  remove(): void;
}

export type VpnEventName = 'onStateChanged' | 'onLog' | 'onTrafficUpdate';
