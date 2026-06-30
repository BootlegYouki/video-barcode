import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { checkForUpdates } from './src/utils/update-checker';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { MainScreen } from './src/screens/MainScreen';
import { Storage } from './src/utils/storage';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    checkForUpdates();
    
    // Load onboarding and theme states from storage
    const loadState = async () => {
      const completed = await Storage.getOnboardingCompleted();
      const themeVal = await Storage.getDarkMode();
      setShowOnboarding(!completed);
      setIsDarkMode(themeVal);
      setLoading(false);
    };

    loadState();
  }, []);

  const handleToggleTheme = async (val: boolean) => {
    setIsDarkMode(val);
    await Storage.saveDarkMode(val);
  };

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
      <SafeAreaProvider>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#000000" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={[styles.container, isDarkMode && { backgroundColor: '#0F172A' }]}>
        {showOnboarding ? (
          <OnboardingScreen onComplete={handleCompleteOnboarding} />
        ) : (
          <MainScreen
            onResetOnboarding={handleResetOnboarding}
            isDarkMode={isDarkMode}
            onToggleDarkMode={handleToggleTheme}
          />
        )}
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      </View>
    </SafeAreaProvider>
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
