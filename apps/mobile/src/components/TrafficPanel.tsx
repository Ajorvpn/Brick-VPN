import { StyleSheet, Text, View } from 'react-native';
import type { TrafficStats } from '@brick/core-api';
import { formatBytes } from '../utils/formatters';

interface TrafficPanelProps {
  traffic: TrafficStats;
}

export const TrafficPanel = ({ traffic }: TrafficPanelProps) => (
  <View style={styles.panel}>
    <Text style={styles.label}>Traffic</Text>
    <Text style={styles.statusText}>↑ Speed: {formatBytes(traffic.uploadSpeed)}/s</Text>
    <Text style={styles.statusText}>↓ Speed: {formatBytes(traffic.downloadSpeed)}/s</Text>
    <Text style={styles.statusText}>Total ↑: {formatBytes(traffic.uploadBytes)}</Text>
    <Text style={styles.statusText}>Total ↓: {formatBytes(traffic.downloadBytes)}</Text>
  </View>
);

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderColor: '#2d2d2d',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#111111',
  },
  label: {
    color: '#ffffff',
    fontWeight: '600',
    marginBottom: 8,
  },
  statusText: {
    color: '#ffffff',
    marginBottom: 4,
  },
});
