import { View, Text, StyleSheet, Button, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { RootTabParamList } from '../navigation/types';
import { useVpnStore, useConfigStore } from '@brick/core-api';
import { StatusPanel } from '../components/StatusPanel';
import { ConnectionControls } from '../components/ConnectionControls';
import { TrafficPanel } from '../components/TrafficPanel';
import { useVpnActions } from '../hooks/useVpnActions';
import { SafeAreaView } from 'react-native-safe-area-context';

export const HomeScreen = () => {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const status = useVpnStore((state) => state.status);
  const busy = useVpnStore((state) => state.busy);
  const traffic = useVpnStore((state) => state.traffic);
  const activeConfig = useConfigStore((state) => state.activeConfig);
  const activeServer = useConfigStore((state) => state.servers.find((server) => server.id === state.activeServerId) ?? null);
  const { handleStart, handleStop } = useVpnActions();

  if (!activeConfig) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Home</Text>
          <Text style={styles.message}>No active VPN config yet.</Text>
          <Button title="Go to Servers" onPress={() => navigation.navigate('Servers')} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Home</Text>
        <StatusPanel status={status} />
        <ConnectionControls status={status} activeConfig={activeConfig} busy={busy} onStart={handleStart} onStop={handleStop} />
        <TrafficPanel traffic={traffic} />
        <Text style={styles.sectionTitle}>Active Server</Text>
        <Text style={styles.serverText}>{activeServer ? `${activeServer.name} (${activeServer.server}:${activeServer.port})` : 'Unknown server'}</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
    padding: 20,
    gap: 12,
    backgroundColor: '#000000',
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    marginBottom: 12,
  },
  message: {
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  serverText: {
    color: '#c7c7c7',
    marginBottom: 12,
  },
});
