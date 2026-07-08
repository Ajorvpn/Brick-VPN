import { NativeEventEmitter, NativeModules, type NativeModule } from 'react-native';
import type {
  VpnEventName,
  VpnListenerSubscription,
  VpnLogPayload,
  VpnPrepareResult,
  VpnStateChangedPayload,
  VpnStatusResult,
  VpnTrafficPayload,
} from './types';

type NativeVpnModule = {
  prepareVpn(): Promise<VpnPrepareResult>;
  startVpn(config: string): Promise<VpnStatusResult>;
  stopVpn(): Promise<VpnStatusResult>;
  getStatus(): Promise<VpnStatusResult>;
};

const nativeModule = NativeModules.ExpoV2ray as NativeVpnModule | undefined;
const eventEmitter = nativeModule
  ? new NativeEventEmitter(NativeModules.ExpoV2ray as NativeModule)
  : null;

export const expoV2ray = {
  async prepareVpn(): Promise<VpnPrepareResult> {
    if (!nativeModule?.prepareVpn) {
      return {
        ready: false,
        requiresUserConsent: false,
        state: 'error',
        message: 'Expo V2Ray native module is unavailable.',
      };
    }

    return nativeModule.prepareVpn();
  },

  async startVpn(config: string): Promise<VpnStatusResult> {
    if (!nativeModule?.startVpn) {
      return {
        state: 'error',
        connected: false,
        message: 'Expo V2Ray native module is unavailable.',
      };
    }

    return nativeModule.startVpn(config);
  },

  async stopVpn(): Promise<VpnStatusResult> {
    if (!nativeModule?.stopVpn) {
      return {
        state: 'stopped',
        connected: false,
        message: 'Expo V2Ray native module is unavailable.',
      };
    }

    return nativeModule.stopVpn();
  },

  async getStatus(): Promise<VpnStatusResult> {
    if (!nativeModule?.getStatus) {
      return {
        state: 'idle',
        connected: false,
        message: 'Expo V2Ray native module is unavailable.',
      };
    }

    return nativeModule.getStatus();
  },

  addListener<T extends VpnStateChangedPayload | VpnLogPayload | VpnTrafficPayload>(
    eventName: VpnEventName,
    listener: (payload: T) => void,
  ): VpnListenerSubscription {
    if (!eventEmitter) {
      return { remove: () => undefined };
    }

    const subscription = eventEmitter.addListener(eventName, listener as never);
    return {
      remove: () => subscription.remove(),
    };
  },

  addStateListener(listener: (payload: VpnStateChangedPayload) => void): VpnListenerSubscription {
    return expoV2ray.addListener('onStateChanged', listener);
  },

  addLogListener(listener: (payload: VpnLogPayload) => void): VpnListenerSubscription {
    return expoV2ray.addListener('onLog', listener);
  },

  addTrafficListener(listener: (payload: VpnTrafficPayload) => void): VpnListenerSubscription {
    return expoV2ray.addListener('onTrafficUpdate', listener);
  },

  removeAllListeners(eventName?: VpnEventName) {
    eventEmitter?.removeAllListeners(eventName ?? '');
  },
};

export type {
  VpnEventName,
  VpnListenerSubscription,
  VpnLogPayload,
  VpnPrepareResult,
  VpnStateChangedPayload,
  VpnStatusResult,
  VpnTrafficPayload,
} from './types';

export default expoV2ray;
