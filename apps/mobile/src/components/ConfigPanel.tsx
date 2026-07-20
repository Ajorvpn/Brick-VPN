import { ActivityIndicator, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ParsedServer } from '@brick/core-api';

interface ConfigPanelProps {
  inputText: string;
  setInputText: (value: string) => void;
  importing: boolean;
  activeServer: ParsedServer | null;
  onImport: () => void;
}

export const ConfigPanel = ({
  inputText,
  setInputText,
  importing,
  activeServer,
  onImport,
}: ConfigPanelProps) => (
  <View style={styles.panel}>
    <Text style={styles.label}>Config</Text>
    <TextInput
      style={styles.input}
      value={inputText}
      onChangeText={setInputText}
      placeholder="Paste a vless:// / vmess:// / trojan:// / ss:// / hysteria2:// / tuic:// link, a subscription URL (https://...), or full sing-box JSON. Multiple URIs on separate lines also work."
      placeholderTextColor="#7a7a7a"
      multiline
      textAlignVertical="top"
    />
    {importing ? <ActivityIndicator color="#ffffff" /> : null}
    <Button title={importing ? 'Importing…' : 'Import'} onPress={onImport} disabled={importing || inputText.trim() === ''} />
    <Text style={styles.statusMessage}>
      {activeServer
        ? `Active: ${activeServer.name} (${activeServer.protocol.toUpperCase()} · ${activeServer.server}:${activeServer.port})`
        : 'No config loaded'}
    </Text>
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
  input: {
    borderWidth: 1,
    borderColor: '#3a3a3a',
    borderRadius: 8,
    color: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    minHeight: 140,
  },
  statusMessage: {
    color: '#c7c7c7',
    marginTop: 4,
  },
});
