import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Switch, TouchableWithoutFeedback, Animated, LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RipplePressable } from '../components/RipplePressable';
import { MD3Button } from '../components/MD3Button';
import { Storage } from '../utils/storage';

interface SettingsScreenProps {
  onResetOnboarding?: () => void;
  onClearHistory?: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: (val: boolean) => void;
  compressionQuality: 'low' | 'medium' | 'high';
  onChangeCompressionQuality: (val: 'low' | 'medium' | 'high') => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onResetOnboarding,
  onClearHistory,
  isDarkMode,
  onToggleDarkMode,
  compressionQuality,
  onChangeCompressionQuality,
}) => {
  const insets = useSafeAreaInsets();
  const [isDriveConnected, setIsDriveConnected] = useState(false);

  useEffect(() => {
    const loadDriveState = async () => {
      const connected = await Storage.getDriveConnected();
      setIsDriveConnected(connected);
    };
    loadDriveState();
  }, []);

  const handleToggleDrive = async () => {
    const nextState = !isDriveConnected;
    setIsDriveConnected(nextState);
    await Storage.saveDriveConnected(nextState);
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

  type CompressionLevel = 'low' | 'medium' | 'high';

  const COMPRESSION_LEVELS: { value: CompressionLevel; label: string }[] = [
    { value: 'low',    label: 'Low'    },
    { value: 'medium', label: 'Medium' },
    { value: 'high',   label: 'High'   },
  ];

  const tabIndex = COMPRESSION_LEVELS.findIndex(l => l.value === compressionQuality);
  const tabAnim  = useRef(new Animated.Value(tabIndex)).current;
  const [tabWidth, setTabWidth] = useState(0);

  const handleCompressionChange = (val: 'low' | 'medium' | 'high') => {
    const idx = COMPRESSION_LEVELS.findIndex(l => l.value === val);
    Animated.spring(tabAnim, {
      toValue: idx,
      useNativeDriver: true,
      tension: 70,
      friction: 12,
    }).start();
    onChangeCompressionQuality(val);
  };

  const COMPRESSION_DESCRIPTIONS: Record<CompressionLevel, string> = {
    low:    'Compressed video — noticeably smaller files',
    medium: 'Balanced quality and storage use',
    high:   'Full quality, no compression applied',
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

      {/* Section: Video Settings */}
      <Text style={[styles.sectionHeader, themeSectionHeader]}>Video Settings</Text>
      <View style={[styles.cardList, themeCard]}>


        {/* Video Quality — Tab Selector */}
        <View style={styles.compressionRow}>
          <View style={styles.compressionHeader}>
            <Text style={[styles.rowTitle, themeText]}>Video Quality</Text>
            <Text style={[styles.compressionDesc, themeSubText]}>
              {COMPRESSION_DESCRIPTIONS[compressionQuality]}
            </Text>
          </View>

          <View
            style={[styles.tabTrack, isDark ? styles.tabTrackDark : styles.tabTrackLight]}
            onLayout={(e: LayoutChangeEvent) => setTabWidth(e.nativeEvent.layout.width / 3)}
          >
            {/* Sliding pill — sits behind labels */}
            {tabWidth > 0 && (
              <Animated.View
                style={[
                  styles.tabPill,
                  isDark ? styles.tabPillDark : styles.tabPillLight,
                  {
                    width: tabWidth - 6,
                    transform: [{
                      translateX: tabAnim.interpolate({
                        inputRange: [0, 1, 2],
                        outputRange: [3, tabWidth + 3, tabWidth * 2 + 3],
                      }),
                    }],
                  },
                ]}
              />
            )}

            {/* Labels on top */}
            {COMPRESSION_LEVELS.map((level) => {
              const isActive = compressionQuality === level.value;
              return (
                <TouchableWithoutFeedback
                  key={level.value}
                  onPress={() => handleCompressionChange(level.value)}
                >
                  <View style={styles.tabItem}>
                    <Text style={[
                      styles.tabLabel,
                      isDark
                        ? { color: isActive ? '#FFFFFF' : '#64748B' }
                        : { color: isActive ? '#0F172A' : '#94A3B8' },
                    ]}>
                      {level.label}
                    </Text>
                  </View>
                </TouchableWithoutFeedback>
              );
            })}
          </View>
        </View>
      </View>

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
          <Text style={[styles.rowSubtitle, themeSubText]}>Permanently delete all scanned records and packing videos</Text>
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
