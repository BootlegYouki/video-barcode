import "./global.css";
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { checkForUpdates } from './src/utils/update-checker';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { MainScreenMock } from './src/screens/MainScreenMock';

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(true);

  useEffect(() => {
    checkForUpdates();
  }, []);

  return (
    <View className="flex-1 bg-[#FEF7FF]">
      {showOnboarding ? (
        <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
      ) : (
        <MainScreenMock />
      )}
      <StatusBar style="dark" />
    </View>
  );
}

