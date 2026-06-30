import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { checkForUpdates } from './src/utils/update-checker';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { MainScreenMock } from './src/screens/MainScreenMock';

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(true);

  useEffect(() => {
    checkForUpdates();
  }, []);

  return (
    <View style={styles.container}>
      {showOnboarding ? (
        <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
      ) : (
        <MainScreenMock onResetOnboarding={() => setShowOnboarding(true)} />
      )}
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
