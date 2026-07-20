import { create } from 'zustand';
import type { TrafficStats, VpnStatus } from '../types/vpn-types';

interface VpnState {
  status: VpnStatus;
  busy: boolean;
  traffic: TrafficStats;
  setStatus: (status: VpnStatus | ((current: VpnStatus) => VpnStatus)) => void;
  setBusy: (busy: boolean) => void;
  setTraffic: (traffic: TrafficStats) => void;
}

const defaultStatus: VpnStatus = {
  state: 'idle',
  connected: false,
  message: 'Ready to test the VPN bridge.',
};

const defaultTraffic: TrafficStats = {
  uploadBytes: 0,
  downloadBytes: 0,
  uploadSpeed: 0,
  downloadSpeed: 0,
};

export const useVpnStore = create<VpnState>((set) => ({
  status: defaultStatus,
  busy: false,
  traffic: defaultTraffic,
  setStatus: (status) =>
    set((current) => ({
      ...current,
      status: typeof status === 'function' ? status(current.status) : status,
    })),
  setBusy: (busy) => set({ busy }),
  setTraffic: (traffic) => set({ traffic }),
}));
