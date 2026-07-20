import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { HomeScreen } from '../screens/HomeScreen';
import { ServersScreen } from '../screens/ServersScreen';
import { SettingsNavigator } from './SettingsNavigator';
import type { RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();

export const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: { backgroundColor: '#111111' },
      tabBarActiveTintColor: '#4f9cff',
      tabBarInactiveTintColor: '#c7c7c7',
      tabBarIcon: ({ color, size }) => {
        type IoniconName = ComponentProps<typeof Ionicons>['name'];
        const iconName: IoniconName = route.name === 'Home' ? 'home' : route.name === 'Servers' ? 'server' : 'settings';
        return <Ionicons name={iconName} size={size} color={color} />;
      },
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Servers" component={ServersScreen} />
    <Tab.Screen name="Settings" component={SettingsNavigator} />
  </Tab.Navigator>
);
