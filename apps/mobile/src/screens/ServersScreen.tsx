import { View, Text, StyleSheet, FlatList, TouchableOpacity, Button, Alert } from 'react-native';
import { buildSingBoxConfig, useConfigStore, useLogsStore } from '@brick/core-api';
import { ConfigPanel } from '../components/ConfigPanel';
import { useConfigImport } from '../hooks/useConfigImport';
import { SafeAreaView } from 'react-native-safe-area-context';

export const ServersScreen = () => {
  const appendLog = useLogsStore.getState().appendLog;
  const {
    inputText,
    setInputText,
    importing,
    activeServer,
    activeConfig,
    handleImport,
  } = useConfigImport(appendLog);

  const servers = useConfigStore((state) => state.servers);
  const setActiveServer = useConfigStore((state) => state.setActiveServer);
  const setActiveConfig = useConfigStore((state) => state.setActiveConfig);
  const removeServer = useConfigStore((state) => state.removeServer);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.title}>Servers</Text>
        <ConfigPanel inputText={inputText} setInputText={setInputText} importing={importing} activeServer={activeServer} onImport={handleImport} />
      <FlatList
        data={servers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.serverRow, item.id === activeServer?.id ? styles.activeServer : null]}>
            <TouchableOpacity
              style={styles.serverInfo}
              onPress={() => {
                const config = buildSingBoxConfig(item, { enableTun: true });
                setActiveServer(item.id);
                setActiveConfig(config);
              }}
            >
              <Text style={styles.serverName}>{item.name}</Text>
              <Text style={styles.serverMeta}>{`${item.protocol.toUpperCase()} • ${item.server}:${item.port}`}</Text>
            </TouchableOpacity>
            <Button
              title="Delete"
              onPress={() => {
                Alert.alert('Delete server', `Remove ${item.name}?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => removeServer(item.id) },
                ]);
              }}
            />
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No servers imported yet.</Text>}
      />
      </View>
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
    backgroundColor: '#000000',
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    marginBottom: 12,
  },
  serverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2d2d2d',
    borderRadius: 12,
    backgroundColor: '#111111',
  },
  activeServer: {
    borderColor: '#4f9cff',
  },
  serverInfo: {
    flex: 1,
    marginRight: 12,
  },
  serverName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  serverMeta: {
    color: '#c7c7c7',
    marginTop: 4,
  },
  emptyText: {
    color: '#c7c7c7',
    marginTop: 24,
    textAlign: 'center',
  },
});
