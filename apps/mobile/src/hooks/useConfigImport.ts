import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { buildSingBoxConfig, detectAndImport, type ParsedServer, useConfigStore } from '@brick/core-api';

export const useConfigImport = (appendLog: (entry: string) => void) => {
  const [inputText, setInputText] = useState('');
  const [importing, setImporting] = useState(false);
  const activeServer = useConfigStore((state) => state.servers.find((server) => server.id === state.activeServerId) ?? null);
  const activeConfig = useConfigStore((state) => state.activeConfig);
  const addServers = useConfigStore((state) => state.addServers);
  const setActiveServer = useConfigStore((state) => state.setActiveServer);
  const setActiveConfig = useConfigStore((state) => state.setActiveConfig);

  const handleImport = useCallback(async () => {
    setImporting(true);
    try {
      const result = await detectAndImport(inputText.trim(), fetch);
      if (result.errors.length > 0 && result.servers.length === 0) {
        Alert.alert('Import failed', result.errors[0]);
        return;
      }

      const server = result.servers[0];
      if (!server) {
        Alert.alert('Import failed', 'No usable server was found.');
        return;
      }

      const configJson = buildSingBoxConfig(server, { enableTun: true });
      addServers(result.servers);
      setActiveServer(server.id);
      setActiveConfig(configJson);
      appendLog(`import:success from=${result.source} count=${result.servers.length} using="${server.name}"`);
      if (result.errors.length > 0) {
        appendLog(`import:warnings ${result.errors.length}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      appendLog(`import:error ${message}`);
      Alert.alert('Import error', message);
    } finally {
      setImporting(false);
    }
  }, [appendLog, addServers, inputText, setActiveConfig, setActiveServer]);

  return {
    inputText,
    setInputText,
    importing,
    activeServer,
    activeConfig,
    handleImport,
  };
};
