import { View, StyleSheet, Button, ScrollView } from 'react-native';
import { useLogsStore } from '@brick/core-api';
import { LogPanel } from '../components/LogPanel';
import { SafeAreaView } from 'react-native-safe-area-context';

export const DebugScreen = () => {
  const logs = useLogsStore((state) => state.logs);
  const clearLogs = useLogsStore((state) => state.clearLogs);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Button title="Clear logs" onPress={clearLogs} />
        <LogPanel logs={logs} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#000000',
  },
  safe: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
