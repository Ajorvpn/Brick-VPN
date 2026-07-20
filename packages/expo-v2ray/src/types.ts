export type VpnState =
  | 'idle'
  | 'preparing'
  | 'ready'
  | 'starting'
  | 'connected'
  | 'stopping'
  | 'stopped'
  | 'error';

export interface VpnTrafficStats {
  uploadBytes: number;
  downloadBytes: number;
  uploadSpeed: number;
  downloadSpeed: number;
}

export interface VpnStatusResult {
  state: VpnState;
  connected: boolean;
  message: string;
}

export interface VpnPrepareResult {
  ready: boolean;
  requiresUserConsent: boolean;
  state: VpnState;
  message: string;
}

export interface VpnStateEvent {
  state: VpnState;
  message: string;
}

export interface VpnLogEvent {
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface VpnTrafficEvent {
  uploadBytes: number;
  downloadBytes: number;
  uploadSpeed: number;
  downloadSpeed: number;
}

export interface VpnListenerSubscription {
  remove(): void;
}

export type VpnEventName = 'onStateChanged' | 'onLog' | 'onTrafficUpdate';
