import { StyleSheet, Text, View } from 'react-native';
import type { LogEntry } from '@brick/core-api';

interface LogPanelProps {
  logs: LogEntry[];
}

const levelPrefix = (level: LogEntry['level']) => {
  switch (level) {
    case 'error':
      return '[ERROR]';
    case 'warn':
      return '[WARN]';
    case 'debug':
      return '[DEBUG]';
    default:
      return '[INFO]';
  }
};

export const LogPanel = ({ logs }: LogPanelProps) => (
  <View style={styles.panel}>
    <Text style={styles.label}>Recent events</Text>
    {logs.map((entry, index) => (
      <Text key={`${entry.timestamp}-${index}`} style={styles.logEntry}>
        {`${levelPrefix(entry.level)} ${entry.message}`}
      </Text>
    ))}
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
  logEntry: {
    color: '#d0d0d0',
    fontSize: 12,
    marginTop: 4,
  },
});
