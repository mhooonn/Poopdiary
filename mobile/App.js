import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from './src/design-system';
import { ComponentsScreen } from './src/screens/ComponentsScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ComponentsScreen />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
