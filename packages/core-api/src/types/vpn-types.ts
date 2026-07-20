export type VpnState = 'idle' | 'preparing' | 'starting' | 'connected' | 'stopping' | 'stopped' | 'error' | 'ready';

export interface VpnStatus {
  state: VpnState;
  connected: boolean;
  message: string;
}

export interface TrafficStats {
  uploadBytes: number;
  downloadBytes: number;
  uploadSpeed: number;
  downloadSpeed: number;
}
