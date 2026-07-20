import { Button, StyleSheet, View } from 'react-native';
import type { VpnStatusResult } from 'expo-v2ray';

interface ConnectionControlsProps {
  status: VpnStatusResult;
  activeConfig: string | null;
  busy: boolean;
  onStart: () => void;
  onStop: () => void;
}

export const ConnectionControls = ({ status, activeConfig, busy, onStart, onStop }: ConnectionControlsProps) => (
  <View style={styles.buttonRow}>
    <Button
      title="Start"
      onPress={onStart}
      disabled={!activeConfig || busy || status.state === 'connected' || status.state === 'starting'}
    />
    <Button title="Stop" onPress={onStop} disabled={busy || status.state === 'stopped' || status.state === 'idle'} />
  </View>
);

const styles = StyleSheet.create({
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
});
