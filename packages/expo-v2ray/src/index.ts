import { EventEmitter, requireNativeModule } from 'expo-modules-core';
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

const nativeModule = requireNativeModule<NativeVpnModule>('ExpoV2ray');
const emitter = new EventEmitter(nativeModule as never);

export const expoV2ray = {
  prepareVpn(): Promise<VpnPrepareResult> {
    return nativeModule.prepareVpn();
  },
  startVpn(config: string): Promise<VpnStatusResult> {
    return nativeModule.startVpn(config);
  },
  stopVpn(): Promise<VpnStatusResult> {
    return nativeModule.stopVpn();
  },
  getStatus(): Promise<VpnStatusResult> {
    return nativeModule.getStatus();
  },
  addStateListener(listener: (payload: VpnStateChangedPayload) => void): VpnListenerSubscription {
    const sub = emitter.addListener('onStateChanged', listener);
    return { remove: () => sub.remove() };
  },
  addLogListener(listener: (payload: VpnLogPayload) => void): VpnListenerSubscription {
    const sub = emitter.addListener('onLog', listener);
    return { remove: () => sub.remove() };
  },
  addTrafficListener(listener: (payload: VpnTrafficPayload) => void): VpnListenerSubscription {
    const sub = emitter.addListener('onTrafficUpdate', listener);
    return { remove: () => sub.remove() };
  },
  addListener<T>(eventName: VpnEventName, listener: (payload: T) => void): VpnListenerSubscription {
    const sub = emitter.addListener(eventName, listener as never);
    return { remove: () => sub.remove() };
  },
  removeAllListeners(eventName?: VpnEventName) {
    if (eventName) {
      emitter.removeAllListeners(eventName);
    }
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
