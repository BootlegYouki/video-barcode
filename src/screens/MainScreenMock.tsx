import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { RipplePressable } from '../components/RipplePressable';
import { Camera, House, Clock, Gear, MagnifyingGlass } from 'phosphor-react-native';
import { HomeScreen } from './HomeScreen';
import { HistoryScreen } from './HistoryScreen';
import { SettingsScreen } from './SettingsScreen';
import { CameraScreen } from './CameraScreen';

import { Storage } from '../utils/storage';

interface BarcodeRecord {
  id: string;
  code: string;
  type: string;
  timestamp: string;
  duration: string;
  fileName: string;
}

const MOCK_RECORDS: BarcodeRecord[] = [
  {
    id: '1',
    code: '9780201379624',
    type: 'EAN-13',
    timestamp: 'Today, 2:14 PM',
    duration: '0:12s',
    fileName: 'VID_20260630_141402.mp4',
  },
  {
    id: '2',
    code: '049000028904',
    type: 'UPC-A',
    timestamp: 'Today, 11:05 AM',
    duration: '0:08s',
    fileName: 'VID_20260630_110445.mp4',
  },
  {
    id: '3',
    code: 'https://expo.dev',
    type: 'QR_CODE',
    timestamp: 'Yesterday, 4:50 PM',
    duration: '0:24s',
    fileName: 'VID_20260629_164910.mp4',
  },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_WIDTH = SCREEN_WIDTH / 3;
const INDICATOR_WIDTH = 64;

const getIndicatorPosition = (index: number) => {
  return index * TAB_WIDTH + (TAB_WIDTH - INDICATOR_WIDTH) / 2;
};

interface MainScreenMockProps {
  onResetOnboarding?: () => void;
}

export const MainScreenMock: React.FC<MainScreenMockProps> = ({ onResetOnboarding }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'settings'>('home');
  const [showCamera, setShowCamera] = useState(false);
  const [records, setRecords] = useState<BarcodeRecord[]>(MOCK_RECORDS);

  const tabIndex = activeTab === 'home' ? 0 : activeTab === 'history' ? 1 : 2;
  const animatedX = useRef(new Animated.Value(getIndicatorPosition(0))).current;

  // Load history records from AsyncStorage on mount
  useEffect(() => {
    const loadRecords = async () => {
      const stored = await Storage.getHistoryRecords();
      if (stored && stored.length > 0) {
        setRecords(stored);
      }
    };
    loadRecords();
  }, []);

  useEffect(() => {
    Animated.spring(animatedX, {
      toValue: getIndicatorPosition(tabIndex),
      useNativeDriver: true,
      tension: 68,
      friction: 10,
    }).start();
  }, [tabIndex]);

  const handleSaveSession = async (barcode: string, videoUri: string, duration: string) => {
    const type = barcode.startsWith('http') ? 'QR_CODE' : barcode.length > 10 ? 'EAN-13' : 'CODE-128';
    
    const timestampStr = 'Just now';
    const cleanDateStr = new Date().getTime().toString();
    const fileNameStr = `VID_${cleanDateStr}.mp4`;

    const newRecord: BarcodeRecord = {
      id: (records.length + 1).toString(),
      code: barcode,
      type: type,
      timestamp: timestampStr,
      duration: duration,
      fileName: fileNameStr,
    };

    const updatedRecords = [newRecord, ...records];
    setRecords(updatedRecords);
    await Storage.saveHistoryRecords(updatedRecords);
    
    setShowCamera(false);
    setActiveTab('home');
  };

  if (showCamera) {
    return <CameraScreen onClose={() => setShowCamera(false)} onSaveSession={handleSaveSession} />;
  }

  return (
    <View style={styles.container}>
      {/* Dynamic Header */}
      {activeTab !== 'settings' ? (
        <View style={styles.searchHeader}>
          <View style={styles.searchBar}>
            <MagnifyingGlass size={22} color="#64748B" />
            <Text style={styles.searchText}>Search scan history...</Text>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>U</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.settingsHeader}>
          <Text style={styles.settingsHeaderText}>Settings</Text>
        </View>
      )}

      {/* Screen Render Switcher */}
      {activeTab === 'home' ? (
        <HomeScreen
          records={records}
          onSeeAll={() => setActiveTab('history')}
        />
      ) : activeTab === 'history' ? (
        <HistoryScreen records={records} />
      ) : (
        <SettingsScreen onResetOnboarding={onResetOnboarding} />
      )}

      {/* Floating Action Button (FAB) */}
      {activeTab !== 'settings' && (
        <View style={styles.fabContainer}>
          <RipplePressable
            onPress={() => setShowCamera(true)}
            rippleColor="rgba(255, 255, 255, 0.2)"
            style={styles.fab}
          >
            <Camera size={26} color="#FFFFFF" weight="bold" />
          </RipplePressable>
        </View>
      )}

      {/* Bottom Navigation Bar */}
      <View style={styles.tabBar}>
        {/* Sliding Active State Indicator Background */}
        <Animated.View
          style={[
            styles.slidingIndicator,
            {
              transform: [{ translateX: animatedX }],
            },
          ]}
        />

        <RipplePressable
          onPress={() => setActiveTab('home')}
          style={styles.tabItem}
        >
          <View style={styles.tabIconBg}>
            <House
              size={24}
              color={activeTab === 'home' ? '#000000' : '#94A3B8'}
              weight={activeTab === 'home' ? 'fill' : 'regular'}
            />
          </View>
          <Text style={[styles.tabText, activeTab === 'home' && styles.tabActiveText]}>
            Home
          </Text>
        </RipplePressable>

        <RipplePressable
          onPress={() => setActiveTab('history')}
          style={styles.tabItem}
        >
          <View style={styles.tabIconBg}>
            <Clock
              size={24}
              color={activeTab === 'history' ? '#000000' : '#94A3B8'}
              weight={activeTab === 'history' ? 'fill' : 'regular'}
            />
          </View>
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabActiveText]}>
            History
          </Text>
        </RipplePressable>

        <RipplePressable
          onPress={() => setActiveTab('settings')}
          style={styles.tabItem}
        >
          <View style={styles.tabIconBg}>
            <Gear
              size={24}
              color={activeTab === 'settings' ? '#000000' : '#94A3B8'}
              weight={activeTab === 'settings' ? 'fill' : 'regular'}
            />
          </View>
          <Text style={[styles.tabText, activeTab === 'settings' && styles.tabActiveText]}>
            Settings
          </Text>
        </RipplePressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  searchHeader: {
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchBar: {
    height: 56,
    backgroundColor: '#F8FAFC',
    borderRadius: 28,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchText: {
    fontFamily: 'sans-serif',
    color: '#64748B',
    fontSize: 18,
    flex: 1,
    marginLeft: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  settingsHeader: {
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  settingsHeaderText: {
    fontFamily: 'sans-serif-medium',
    fontSize: 36,
    fontWeight: 'bold',
    color: '#000000',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 112,
    right: 24,
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#000000',
    elevation: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fab: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    height: 96,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 24,
  },
  tabItem: {
    alignItems: 'center',
    paddingVertical: 8,
    flex: 1,
    zIndex: 2,
  },
  slidingIndicator: {
    position: 'absolute',
    top: 9,
    left: 0,
    width: INDICATOR_WIDTH,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    zIndex: 1,
  },
  tabIconBg: {
    width: INDICATOR_WIDTH,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tabText: {
    fontFamily: 'sans-serif',
    fontSize: 14,
    color: '#94A3B8',
  },
  tabActiveText: {
    fontWeight: 'bold',
    color: '#000000',
  },
});
