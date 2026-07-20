import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { initStores } from './src/storage/init-stores';
import { useAppBootstrap } from './src/hooks/useAppBootstrap';
import { RootNavigator } from './src/navigation/RootNavigator';

enableScreens();
initStores();

export default function App() {
  useAppBootstrap();

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#050505" />
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
