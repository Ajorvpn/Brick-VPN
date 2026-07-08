import { useEffect, useState } from 'react';
import {
  Button,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { theme } from '@brick/ui-theme';
import expoV2ray, { type VpnLogPayload, type VpnStateChangedPayload, type VpnStatusResult } from 'expo-v2ray';

export default function App() {
  const [config, setConfig] = useState('demo-config');
  const [status, setStatus] = useState<VpnStatusResult>({
    state: 'idle',
    connected: false,
    message: 'Ready to test the VPN bridge scaffold.',
  });
  const [logs, setLogs] = useState<string[]>(['App booted']);

  useEffect(() => {
    const stateSub = expoV2ray.addStateListener((payload: VpnStateChangedPayload) => {
      setStatus((current) => ({
        ...current,
        state: payload.state,
        message: payload.message ?? current.message,
      }));
      setLogs((current) => [
        `state:${payload.state} ${payload.message ?? ''}`.trim(),
        ...current,
      ].slice(0, 20));
    });

    const logSub = expoV2ray.addLogListener((payload: VpnLogPayload) => {
      setLogs((current) => [`log:${payload.level} ${payload.message}`, ...current].slice(0, 20));
    });

    return () => {
      stateSub.remove();
      logSub.remove();
    };
  }, []);

  const appendLog = (entry: string) => {
    setLogs((current) => [entry, ...current].slice(0, 20));
  };

  const handlePrepare = async () => {
    const result = await expoV2ray.prepareVpn();
    setStatus((current) => ({
      ...current,
      state: result.state,
      message: result.message,
    }));
    appendLog(`prepare:${result.message}`);
  };

  const handleStart = async () => {
    const result = await expoV2ray.startVpn(config);
    setStatus(result);
    appendLog(`start:${result.message}`);
  };

  const handleStop = async () => {
    const result = await expoV2ray.stopVpn();
    setStatus(result);
    appendLog(`stop:${result.message}`);
  };

  const handleRefreshStatus = async () => {
    const result = await expoV2ray.getStatus();
    setStatus(result);
    appendLog(`status:${result.message}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Brick VPN Bridge</Text>
        <Text style={styles.subtitle}>Native module scaffold for Android testing.</Text>

        <View style={styles.panel}>
          <Text style={styles.label}>Config</Text>
          <TextInput
            style={styles.input}
            value={config}
            onChangeText={setConfig}
            placeholder="VPN config"
            placeholderTextColor="#7a7a7a"
          />

          <Text style={styles.label}>Status</Text>
          <Text style={styles.statusText}>State: {status.state}</Text>
          <Text style={styles.statusText}>Connected: {status.connected ? 'yes' : 'no'}</Text>
          <Text style={styles.statusMessage}>{status.message}</Text>
        </View>

        <View style={styles.buttonRow}>
          <Button title="Prepare" onPress={handlePrepare} />
          <Button title="Start" onPress={handleStart} />
          <Button title="Stop" onPress={handleStop} />
        </View>

        <Button title="Refresh status" onPress={handleRefreshStatus} />

        <View style={styles.panel}>
          <Text style={styles.label}>Recent events</Text>
          {logs.map((entry, index) => (
            <Text key={`${entry}-${index}`} style={styles.logEntry}>
              {entry}
            </Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  title: {
    color: theme.text,
    fontSize: 24,
    fontWeight: '600',
  },
  subtitle: {
    color: '#b5b5b5',
    fontSize: 14,
    marginBottom: 8,
  },
  panel: {
    borderWidth: 1,
    borderColor: '#2d2d2d',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#111111',
  },
  label: {
    color: theme.text,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#3a3a3a',
    borderRadius: 8,
    color: theme.text,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  statusText: {
    color: theme.text,
    marginBottom: 4,
  },
  statusMessage: {
    color: '#c7c7c7',
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  logEntry: {
    color: '#d0d0d0',
    fontSize: 12,
    marginTop: 4,
  },
});
