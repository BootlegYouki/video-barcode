import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_COMPLETED_KEY = '@onboarding_completed';
const DRIVE_CONNECTED_KEY = '@drive_connected';
const HISTORY_RECORDS_KEY = '@history_records';

export const Storage = {
  saveOnboardingCompleted: async (completed: boolean) => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, JSON.stringify(completed));
    } catch (e) {
      console.error('Failed to save onboarding state', e);
    }
  },

  getOnboardingCompleted: async (): Promise<boolean> => {
    try {
      const val = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
      return val ? JSON.parse(val) : false;
    } catch (e) {
      return false;
    }
  },

  saveDriveConnected: async (connected: boolean) => {
    try {
      await AsyncStorage.setItem(DRIVE_CONNECTED_KEY, JSON.stringify(connected));
    } catch (e) {
      console.error('Failed to save Drive connection state', e);
    }
  },

  getDriveConnected: async (): Promise<boolean> => {
    try {
      const val = await AsyncStorage.getItem(DRIVE_CONNECTED_KEY);
      return val ? JSON.parse(val) : false;
    } catch (e) {
      return false;
    }
  },

  saveHistoryRecords: async (records: any[]) => {
    try {
      await AsyncStorage.setItem(HISTORY_RECORDS_KEY, JSON.stringify(records));
    } catch (e) {
      console.error('Failed to save history records', e);
    }
  },

  getHistoryRecords: async (): Promise<any[]> => {
    try {
      const val = await AsyncStorage.getItem(HISTORY_RECORDS_KEY);
      return val ? JSON.parse(val) : [];
    } catch (e) {
      return [];
    }
  },

  clearHistoryRecords: async () => {
    try {
      await AsyncStorage.removeItem(HISTORY_RECORDS_KEY);
    } catch (e) {
      console.error('Failed to clear history records', e);
    }
  },
  saveCameraResolution: async (res: '720p' | '1080p') => {
    try {
      await AsyncStorage.setItem('@camera_resolution', res);
    } catch (e) {
      console.error('Failed to save resolution', e);
    }
  },

  getCameraResolution: async (): Promise<'720p' | '1080p'> => {
    try {
      const val = await AsyncStorage.getItem('@camera_resolution');
      return (val === '1080p' || val === '720p') ? val : '720p';
    } catch (e) {
      return '720p';
    }
  },

  saveDarkMode: async (enabled: boolean) => {
    try {
      await AsyncStorage.setItem('@dark_mode', JSON.stringify(enabled));
    } catch (e) {
      console.error('Failed to save dark mode setting', e);
    }
  },

  getDarkMode: async (): Promise<boolean> => {
    try {
      const val = await AsyncStorage.getItem('@dark_mode');
      return val ? JSON.parse(val) : false;
    } catch (e) {
      return false;
    }
  },

  saveCompressionQuality: async (level: 'low' | 'medium' | 'high') => {
    try {
      await AsyncStorage.setItem('@compression_quality', level);
    } catch (e) {
      console.error('Failed to save compression quality setting', e);
    }
  },

  getCompressionQuality: async (): Promise<'low' | 'medium' | 'high'> => {
    try {
      const val = await AsyncStorage.getItem('@compression_quality');
      return (val === 'low' || val === 'medium' || val === 'high') ? val : 'medium';
    } catch (e) {
      return 'medium';
    }
  },

  clearAll: async () => {
    try {
      await AsyncStorage.clear();
    } catch (e) {
      console.error('Failed to clear storage', e);
    }
  },
};
