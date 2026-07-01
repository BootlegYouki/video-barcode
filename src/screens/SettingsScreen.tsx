import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Switch, TouchableWithoutFeedback, Animated, LayoutChangeEvent, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import { RipplePressable } from '../components/RipplePressable';
import { MD3Button } from '../components/MD3Button';
import { Storage } from '../utils/storage';

interface SettingsScreenProps {
  onResetOnboarding?: () => void;
  onClearHistory?: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: (val: boolean) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onResetOnboarding,
  onClearHistory,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const insets = useSafeAreaInsets();
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [publicDirUri, setPublicDirUri] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      const connected = await Storage.getDriveConnected();
      setIsDriveConnected(connected);

      const publicDir = await Storage.getPublicDirectoryUri();
      setPublicDirUri(publicDir);
    };
    loadSettings();
  }, []);

  const handleToggleDrive = async () => {
    if (isDriveConnected) {
      Alert.alert(
        'Disconnect Google Drive',
        'Are you sure you want to disconnect Google Drive? Videos will no longer be automatically backed up.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disconnect',
            style: 'destructive',
            onPress: async () => {
              setIsDriveConnected(false);
              await Storage.saveDriveConnected(false);
            }
          }
        ]
      );
    } else {
      setIsDriveConnected(true);
      await Storage.saveDriveConnected(true);
    }
  };

  const handleSelectPublicDir = async () => {
    try {
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (permissions.granted) {
        await Storage.savePublicDirectoryUri(permissions.directoryUri);
        setPublicDirUri(permissions.directoryUri);
        Alert.alert('Folder Connected', 'Videos will now be exported to the selected folder and will be accessible in your Android Files manager.');
      }
    } catch (err) {
      console.error('Failed to select public folder', err);
      Alert.alert('Selection Failed', 'Failed to request folder permissions.');
    }
  };

  const handleClearPublicDir = async () => {
    Alert.alert(
      'Disconnect Export Folder',
      'Are you sure you want to disconnect the export folder? Newly processed videos will no longer be copied to your Files manager.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await Storage.savePublicDirectoryUri(null);
            setPublicDirUri(null);
          }
        }
      ]
    );
  };

  const getReadablePath = (uri: string) => {
    try {
      const decoded = decodeURIComponent(uri);
      if (decoded.includes('primary:')) {
        const parts = decoded.split('primary:');
        if (parts.length > 1) {
          const folderPath = parts[1].replace(/\//g, ' > ');
          return `Internal Storage > ${folderPath}`;
        }
      }
      const lastSlash = decoded.lastIndexOf('/');
      if (lastSlash !== -1) {
        const folderName = decoded.substring(lastSlash + 1).replace(/:/g, ' > ').replace(/\//g, ' > ');
        return folderName || 'Connected Folder';
      }
      return 'Connected Folder';
    } catch (err) {
      return 'Connected Folder';
    }
  };



  const handleClearHistoryPress = () => {
    Alert.alert(
      'Clear Scan History',
      'Are you sure you want to permanently delete all scan records and recorded videos? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: onClearHistory,
        },
      ]
    );
  };

  const isDark = isDarkMode;
  const themeContainer = isDark ? { backgroundColor: '#0F172A' } : { backgroundColor: '#FFFFFF' };
  const themeSectionHeader = isDark ? { color: '#64748B' } : { color: '#94A3B8' };
  const themeCard = isDark ? { backgroundColor: '#1E293B', borderColor: '#334155' } : { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' };
  const themeText = isDark ? { color: '#FFFFFF' } : { color: '#000000' };
  const themeSubText = isDark ? { color: '#94A3B8' } : { color: '#64748B' };
  const themeBorderColor = isDark ? '#334155' : '#E2E8F0';

  return (
    <ScrollView style={[styles.container, themeContainer, { paddingTop: insets.top + 16 }]} contentContainerStyle={styles.scrollContent}>
      {/* Section: Integrations */}
      <Text style={[styles.sectionHeader, themeSectionHeader]}>Integrations</Text>
      <View style={[styles.card, themeCard]}>
        <View style={styles.integrationRow}>
          <View style={styles.rowContent}>
            <Text style={[styles.rowTitle, themeText]}>Google Drive</Text>
            <Text style={[styles.rowSubtitle, themeSubText]}>
              {isDriveConnected ? 'Connected as backup drive' : 'Automatically sync videos'}
            </Text>
          </View>
          <MD3Button
            title={isDriveConnected ? 'Disconnect' : 'Connect'}
            onPress={handleToggleDrive}
            variant={isDriveConnected ? 'outlined' : 'filled'}
            size="normal"
            style={styles.connectBtn}
            isDarkMode={isDarkMode}
          />
        </View>
      </View>

      {/* Section: Video Settings (Android Only) */}
      {Platform.OS === 'android' && (
        <>
          <Text style={[styles.sectionHeader, themeSectionHeader]}>Video Settings</Text>
          <View style={[styles.cardList, themeCard]}>
            <View style={styles.systemRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={styles.rowContent}>
                  <Text style={[styles.rowTitle, themeText]}>Export to File Manager</Text>
                  <Text style={[styles.rowSubtitle, themeSubText]}>
                    {publicDirUri 
                      ? 'Videos will save to public Files app' 
                      : 'Choose a folder in your Files app'}
                  </Text>
                </View>
                <MD3Button
                  title={publicDirUri ? 'Disconnect' : 'Connect Folder'}
                  onPress={publicDirUri ? handleClearPublicDir : handleSelectPublicDir}
                  variant={publicDirUri ? 'outlined' : 'filled'}
                  size="normal"
                  isDarkMode={isDarkMode}
                />
              </View>
              {publicDirUri && (
                <Text style={[styles.compressionDesc, themeSubText, { marginTop: 8 }]} numberOfLines={1} ellipsizeMode="middle">
                  Connected: {getReadablePath(publicDirUri)}
                </Text>
              )}
            </View>
          </View>
        </>
      )}

      {/* Section: System */}
      <Text style={[styles.sectionHeader, themeSectionHeader]}>System</Text>
      <View style={[styles.cardList, themeCard]}>
        {/* Dark Theme Toggle */}
        <View style={[styles.systemRowBordered, { borderBottomColor: themeBorderColor, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
          <View style={styles.rowContent}>
            <Text style={[styles.rowTitle, themeText]}>Dark Theme</Text>
            <Text style={[styles.rowSubtitle, themeSubText]}>Switch between light and dark UI themes</Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={onToggleDarkMode}
            trackColor={{ false: '#CBD5E1', true: '#10B981' }}
            thumbColor={isDarkMode ? '#FFFFFF' : '#F1F5F9'}
          />
        </View>

        {/* Replay Onboarding */}
        <RipplePressable onPress={onResetOnboarding} style={[styles.systemRowBordered, { borderBottomColor: themeBorderColor }]}>
          <Text style={[styles.rowTitle, themeText]}>Replay Onboarding</Text>
          <Text style={[styles.rowSubtitle, themeSubText]}>Review the initial setup steps</Text>
        </RipplePressable>

        {/* Clear Scan History */}
        <RipplePressable onPress={handleClearHistoryPress} style={[styles.systemRowBordered, { borderBottomColor: themeBorderColor }]}>
          <Text style={[styles.rowTitle, { color: '#EF4444' }]}>Clear Scan History</Text>
          <Text style={[styles.rowSubtitle, themeSubText]}>Permanently delete all scanned records and recorded videos</Text>
        </RipplePressable>

        {/* App Version Info */}
        <View style={styles.systemRow}>
          <Text style={[styles.rowTitle, themeText]}>Version Information</Text>
          <Text style={[styles.rowSubtitle, themeSubText]}>v1.0.0 (Latest Release)</Text>
        </View>
      </View>

      <Text style={[styles.authorText, themeSubText]}>Created by BootlegYouki</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  sectionHeader: {
    fontFamily: 'sans-serif-medium',
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  cardList: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
  },
  integrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: 'sans-serif-medium',
    fontSize: 18,
    fontWeight: '500',
    color: '#000000',
  },
  rowSubtitle: {
    fontFamily: 'sans-serif',
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  connectBtn: {
    marginLeft: 16,
  },
  rowItemBordered: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  compressionRow: {
    padding: 16,
    gap: 16,
  },
  compressionHeader: {
    gap: 3,
  },
  compressionDesc: {
    fontSize: 13,
    marginTop: 2,
    fontFamily: 'sans-serif',
  },
  tabTrack: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    position: 'relative',
  },
  tabTrackLight: {
    backgroundColor: '#E2E8F0',
  },
  tabTrackDark: {
    backgroundColor: '#0F172A',
  },
  tabPill: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    borderRadius: 8,
  },
  tabPillLight: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabPillDark: {
    backgroundColor: '#1E293B',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
    zIndex: 1,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'sans-serif-medium',
  },
  systemRowBordered: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  systemRow: {
    padding: 16,
  },
  authorText: {
    textAlign: 'center',
    fontSize: 12,
    marginBottom: 32,
    fontFamily: 'sans-serif',
  },
});
