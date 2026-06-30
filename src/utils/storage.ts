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
};
