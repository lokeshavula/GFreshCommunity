import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppStatusBar } from './src/components/AppStatusBar';
import { SplashScreen } from './src/components/SplashScreen';
import { AppNavigator } from './src/navigation/AppNavigator';
import { colors } from './src/theme/colors';

function App() {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AppStatusBar lightContent={showSplash} />
        {showSplash ? (
          <SplashScreen onFinish={handleSplashFinish} />
        ) : (
          <AppNavigator />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.surface,
    flex: 1,
  },
});

export default App;
