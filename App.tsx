import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { checkForUpdates } from './src/utils/update-checker';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { MainScreenMock } from './src/screens/MainScreenMock';
import { Storage } from './src/utils/storage';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(true);

  useEffect(() => {
    checkForUpdates();
    
    // Load onboarding state from storage
    const loadState = async () => {
      const completed = await Storage.getOnboardingCompleted();
      setShowOnboarding(!completed);
      setLoading(false);
    };

    loadState();
  }, []);

  const handleCompleteOnboarding = async () => {
    await Storage.saveOnboardingCompleted(true);
    setShowOnboarding(false);
  };

  const handleResetOnboarding = async () => {
    await Storage.saveOnboardingCompleted(false);
    setShowOnboarding(true);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showOnboarding ? (
        <OnboardingScreen onComplete={handleCompleteOnboarding} />
      ) : (
        <MainScreenMock onResetOnboarding={handleResetOnboarding} />
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
  centerContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
