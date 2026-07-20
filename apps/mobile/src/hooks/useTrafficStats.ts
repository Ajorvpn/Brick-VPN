import { useEffect } from 'react';
import expoV2ray from 'expo-v2ray';
import { useVpnStore } from '@brick/core-api';

export const useTrafficStats = () => {
  const traffic = useVpnStore((state) => state.traffic);
  const setTraffic = useVpnStore((state) => state.setTraffic);

  useEffect(() => {
    const trafficSub = expoV2ray.addTrafficListener((payload) => {
      setTraffic(payload);
    });

    return () => {
      trafficSub.remove();
    };
  }, [setTraffic]);

  return traffic;
};
