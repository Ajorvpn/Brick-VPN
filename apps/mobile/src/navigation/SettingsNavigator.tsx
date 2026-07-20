import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SettingsScreen } from '../screens/SettingsScreen';
import { DebugScreen } from '../screens/DebugScreen';
import type { SettingsStackParamList } from './types';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export const SettingsNavigator = () => (
  <Stack.Navigator>
    <Stack.Screen name="SettingsMain" component={SettingsScreen} options={{ title: 'Settings' }} />
    <Stack.Screen name="Debug" component={DebugScreen} options={{ title: 'Debug Logs' }} />
  </Stack.Navigator>
);
