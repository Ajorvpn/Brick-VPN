import { StyleSheet, Text, View } from 'react-native';
import type { VpnStatus } from '@brick/core-api';
import { stateColor } from '../utils/formatters';

interface StatusPanelProps {
  status: VpnStatus;
}

export const StatusPanel = ({ status }: StatusPanelProps) => (
  <View style={styles.panel}>
    <View style={styles.statusHeader}>
      <View style={[styles.statusDot, { backgroundColor: stateColor(status.state) }]} />
      <View style={styles.statusSummary}>
        <Text style={styles.statusText}>State: {status.state}</Text>
        <Text style={styles.statusText}>Connected: {status.connected ? 'yes' : 'no'}</Text>
      </View>
    </View>
    <Text style={styles.statusMessage}>{status.message}</Text>
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
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusSummary: {
    flex: 1,
  },
  statusText: {
    color: '#ffffff',
    marginBottom: 4,
  },
  statusMessage: {
    color: '#c7c7c7',
    marginTop: 4,
  },
});
