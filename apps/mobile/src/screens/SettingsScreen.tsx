import { View, Text, StyleSheet, Button, Alert, ScrollView } from 'react-native';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useConfigStore } from '@brick/core-api';
import type { SettingsStackParamList } from '../navigation/types';
import { SafeAreaView } from 'react-native-safe-area-context';

export const SettingsScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList, 'SettingsMain'>>();
  const clearServers = useConfigStore((state) => state.clearServers);

  const handleClear = () => {
    Alert.alert('Clear all servers', 'Remove all saved servers and config?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearServers },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.item}>
          <Text style={styles.label}>App version</Text>
          <Text style={styles.value}>{Constants.expoConfig?.version ?? '1.0.0'}</Text>
        </View>
        <Button title="Clear all servers" onPress={handleClear} />
        <Button title="View debug logs" onPress={() => navigation.navigate('Debug')} />
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.aboutText}>Brick VPN Bridge uses Expo with native VPN listeners and modern app state management.</Text>
        </View>
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
    backgroundColor: '#000000',
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    marginBottom: 12,
  },
  item: {
    marginBottom: 16,
  },
  label: {
    color: '#c7c7c7',
  },
  value: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 4,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    color: '#ffffff',
    fontWeight: '700',
    marginBottom: 8,
  },
  aboutText: {
    color: '#c7c7c7',
  },
});
