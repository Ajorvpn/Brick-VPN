import { SafeAreaView, StyleSheet, Text } from 'react-native';
import { theme } from '@brick/ui-theme';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.text}>Brick Mobile</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: theme.text,
    fontSize: 24,
  },
});
