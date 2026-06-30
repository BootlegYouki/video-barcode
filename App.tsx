import "./global.css";
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { checkForUpdates } from './src/utils/update-checker';

export default function App() {
  useEffect(() => {
    checkForUpdates();
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-slate-950 px-6">
      <View className="items-center">
        <Text className="text-3xl font-extrabold text-white text-center tracking-tight">
          Tailwind CSS + Expo
        </Text>
        <Text className="text-lg text-slate-400 text-center max-w-sm mt-3">
          Your styling system is now fully configured with NativeWind v4. Edit <Text className="font-mono text-indigo-400">App.tsx</Text> to start building!
        </Text>
      </View>
      <StatusBar style="light" />
    </View>
  );
}

