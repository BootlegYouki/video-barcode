import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Pressable, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Reanimated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { RipplePressable } from '../components/RipplePressable';
import { MagnifyingGlass, X, Trash } from 'phosphor-react-native';
import { BottomNavigator } from '../components/BottomNavigator';
import { useVideoPlayer, VideoView } from 'expo-video';
import { HomeScreen } from './HomeScreen';
import { SettingsScreen } from './SettingsScreen';
import { CameraScreen } from './CameraScreen';

import { Storage } from '../utils/storage';

import * as FileSystem from 'expo-file-system/legacy';
import { Video as VideoCompressor } from 'react-native-compressor';
interface BarcodeRecord {
  id: string;
  code: string;
  type: string;
  timestamp: string;
  duration: string;
  fileName: string;
  videoUri?: string;
  size?: string;
}

const MOCK_RECORDS: BarcodeRecord[] = [];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MainScreenMockProps {
  onResetOnboarding?: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: (val: boolean) => void;
}

export const MainScreenMock: React.FC<MainScreenMockProps> = ({
  onResetOnboarding,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'home' | 'settings'>('home');
  const [showCamera, setShowCamera] = useState(false);
  const [records, setRecords] = useState<BarcodeRecord[]>(MOCK_RECORDS);
  const [activeVideoUri, setActiveVideoUri] = useState<string | null>(null);
  const [activeRecord, setActiveRecord] = useState<BarcodeRecord | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p');
  const [compressionQuality, setCompressionQuality] = useState<'low' | 'medium' | 'high'>('medium');

  const activePlayer = useVideoPlayer(activeVideoUri || '', (p) => {
    p.loop = true;
    p.play();
  });

  // Load history records and settings from AsyncStorage on mount
  useEffect(() => {
    const loadData = async () => {
      const stored = await Storage.getHistoryRecords();
      if (stored && stored.length > 0) {
        setRecords(stored);
      }
      const storedRes = await Storage.getCameraResolution();
      setResolution(storedRes);
      const storedComp = await Storage.getCompressionQuality();
      setCompressionQuality(storedComp);
    };
    loadData();
  }, []);

  const handleSaveSession = async (barcode: string, videoUri: string, duration: string) => {
    const type = barcode.startsWith('http') ? 'QR_CODE' : barcode.length > 10 ? 'EAN-13' : 'CODE-128';

    const timestampStr = 'Just now';
    const fileNameStr = `${barcode}.mp4`;

    let finalVideoUri = videoUri;
    try {
      console.log('Compressing video at:', videoUri);
      let targetBitrate = 2500000; // default medium
      if (compressionQuality === 'low') {
        targetBitrate = 4500000; // high quality
      } else if (compressionQuality === 'high') {
        targetBitrate = 1000000; // low size
      }

      finalVideoUri = await VideoCompressor.compress(
        videoUri,
        {
          compressionMethod: 'manual',
          bitrate: targetBitrate,
        }
      );
      console.log('Compression complete with target bitrate:', targetBitrate, 'Output URI:', finalVideoUri);
    } catch (compressErr) {
      console.error('Failed to compress video, using original:', compressErr);
    }

    // Copy to permanent Documents directory so it persists and is visible in File Manager
    if (FileSystem.documentDirectory) {
      const permanentUri = `${FileSystem.documentDirectory}${barcode}.mp4`;
      try {
        const fileInfo = await FileSystem.getInfoAsync(permanentUri);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(permanentUri);
        }
        await FileSystem.copyAsync({
          from: finalVideoUri,
          to: permanentUri,
        });
        console.log('Saved permanently to:', permanentUri);
        finalVideoUri = permanentUri;
      } catch (copyErr) {
        console.error('Failed to copy to permanent storage, using cache:', copyErr);
      }
    }

    let sizeStr = '0 B';
    try {
      const fileInfo = await FileSystem.getInfoAsync(finalVideoUri);
      console.log('--- Video FileInfo Debug ---');
      console.log('URI:', finalVideoUri);
      console.log('FileInfo:', fileInfo);
      console.log('----------------------------');

      if (fileInfo.exists && fileInfo.size !== undefined) {
        const sizeInBytes = fileInfo.size;
        if (sizeInBytes < 1024 * 1024) {
          sizeStr = `${(sizeInBytes / 1024).toFixed(1)} KB`;
        } else {
          sizeStr = `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
        }
      }
    } catch (err) {
      console.log('Error getting file info', err);
    }

    const newRecord: BarcodeRecord = {
      id: (records.length + 1).toString(),
      code: barcode,
      type: type,
      timestamp: timestampStr,
      duration: duration,
      fileName: fileNameStr,
      videoUri: finalVideoUri,
      size: sizeStr,
    };

    const updatedRecords = [newRecord, ...records];
    setRecords(updatedRecords);
    await Storage.saveHistoryRecords(updatedRecords);

    setShowCamera(false);
    setActiveTab('home');
  };

  const onEnterSelectMode = (initialId: string) => {
    setIsSelectMode(true);
    setSelectedIds([initialId]);
  };

  const onToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(x => x !== id));
    } else {
      setSelectedIds(prev => [...prev, id]);
    }
  };

  const handleDeleteSelected = () => {
    Alert.alert(
      'Delete Selected',
      `Are you sure you want to delete the ${selectedIds.length} selected scans?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = records.filter(r => !selectedIds.includes(r.id));
            setRecords(updated);
            await Storage.saveHistoryRecords(updated);
            setIsSelectMode(false);
            setSelectedIds([]);
          },
        },
      ]
    );
  };

  const handleCancelSelection = () => {
    setIsSelectMode(false);
    setSelectedIds([]);
  };

  const handleResolutionChange = async (newRes: '720p' | '1080p') => {
    setResolution(newRes);
    await Storage.saveCameraResolution(newRes);
  };

  const handleCompressionQualityChange = async (newQuality: 'low' | 'medium' | 'high') => {
    setCompressionQuality(newQuality);
    await Storage.saveCompressionQuality(newQuality);
  };

  if (showCamera) {
    return (
      <CameraScreen
        onClose={() => setShowCamera(false)}
        onSaveSession={handleSaveSession}
        resolution={resolution}
      />
    );
  }

  const isDark = isDarkMode;
  const themeContainer = isDark ? { backgroundColor: '#0F172A' } : { backgroundColor: '#FFFFFF' };
  const themeHeader = isDark ? { backgroundColor: '#0F172A', borderBottomColor: '#334155' } : { backgroundColor: '#FFFFFF', borderBottomColor: '#E2E8F0' };
  const themeSearchBar = isDark ? { backgroundColor: '#1E293B', borderColor: '#334155' } : { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' };
  const themeSearchText = isDark ? { color: '#94A3B8' } : { color: '#64748B' };
  const themeAvatar = isDark ? { backgroundColor: '#334155' } : { backgroundColor: '#0F172A' };

  return (
    <View style={[styles.container, themeContainer]}>
      {/* Dynamic Header */}
      {activeTab !== 'settings' && (
        <View style={[styles.searchHeader, themeHeader]}>
          <View style={[styles.searchBar, themeSearchBar]}>
            <MagnifyingGlass size={22} color={isDark ? '#94A3B8' : '#64748B'} />
            <Text style={[styles.searchText, themeSearchText]}>Search scan history...</Text>
            <View style={[styles.avatar, themeAvatar]}>
              <Text style={styles.avatarText}>U</Text>
            </View>
          </View>
        </View>
      )}

      {/* Screen Render Switcher */}
      {activeTab === 'home' ? (
        <HomeScreen
          records={records}
          onPlayVideo={(uri) => {
            const rec = records.find(r => r.videoUri === uri) ?? null;
            setActiveRecord(rec);
            setActiveVideoUri(uri);
          }}
          isSelectMode={isSelectMode}
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
          onEnterSelectMode={onEnterSelectMode}
          isDarkMode={isDarkMode}
        />
      ) : (
        <SettingsScreen
          onResetOnboarding={onResetOnboarding}
          onClearHistory={async () => {
            await Storage.clearHistoryRecords();
            setRecords([]);
          }}
          resolution={resolution}
          onChangeResolution={handleResolutionChange}
          isDarkMode={isDarkMode}
          onToggleDarkMode={onToggleDarkMode}
          compressionQuality={compressionQuality}
          onChangeCompressionQuality={handleCompressionQualityChange}
        />
      )}

      {/* Bottom Navigation Bar / Selection Bar */}
      {isSelectMode ? (
        <View style={styles.selectionBar}>
          {/* Left: Cancel Button */}
          <RipplePressable
            onPress={handleCancelSelection}
            style={styles.selectionBtnCancel}
            rippleColor="rgba(0, 0, 0, 0.05)"
          >
            <X size={22} color="#000000" weight="bold" />
          </RipplePressable>

          {/* Middle: Selection Label */}
          <Text style={styles.selectionCountText}>
            {selectedIds.length} selected
          </Text>

          {/* Right: Delete Button */}
          <RipplePressable
            onPress={handleDeleteSelected}
            style={styles.selectionBtnDelete}
            rippleColor="rgba(255, 255, 255, 0.2)"
          >
            <Trash size={22} color="#FFFFFF" weight="bold" />
          </RipplePressable>
        </View>
      ) : (
        <BottomNavigator
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onCameraPress={() => setShowCamera(true)}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Full screen Video Player Overlay */}
      {activeVideoUri && (
        <Reanimated.View
          entering={FadeIn.duration(80)}
          exiting={FadeOut.duration(80)}
          style={[StyleSheet.absoluteFillObject, { zIndex: 9999, elevation: 9999 }]}
        >
          <View
            style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]}
          />

          <Pressable
            onPress={() => { setActiveVideoUri(null); setActiveRecord(null); }}
            style={StyleSheet.absoluteFillObject}
          >
            {/* Centered Video Card */}
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingBottom: '10%' }}>

              {/* Name + Date above the card */}
              {activeRecord && (
                <Reanimated.View
                  entering={FadeIn.duration(120)}
                  style={{ marginBottom: 14, alignItems: 'center' }}
                >
                  <Text
                    numberOfLines={1}
                    style={{
                      color: '#FFFFFF',
                      fontSize: 16,
                      fontWeight: '700',
                      fontFamily: 'sans-serif-medium',
                      marginBottom: 4,
                    }}
                  >
                    {activeRecord.fileName}
                  </Text>
                  <Text
                    style={{
                      color: 'rgba(255,255,255,0.55)',
                      fontSize: 13,
                      fontFamily: 'sans-serif',
                    }}
                  >
                    {activeRecord.timestamp}
                  </Text>
                </Reanimated.View>
              )}

              <Reanimated.View
                entering={ZoomIn.duration(100).springify()}
                exiting={ZoomOut.duration(80)}
                style={{
                  borderRadius: 16,
                  overflow: 'hidden',
                  elevation: 8,
                  shadowColor: '#000000',
                  shadowOpacity: 0.3,
                  shadowRadius: 16,
                  shadowOffset: { width: 0, height: 6 },
                  backgroundColor: 'transparent',
                }}
              >
                <Pressable
                  onPress={() => { }} // Empty callback blocks click bubbling to backdrop
                >
                  <VideoView
                    style={styles.videoPlayerModalPlayer}
                    player={activePlayer}
                    allowsPictureInPicture={false}
                    nativeControls={true}
                  />
                </Pressable>
              </Reanimated.View>
            </View>
          </Pressable>
        </Reanimated.View>
      )}
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
    fontSize: 24,
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
  videoPlayerModalContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 40,
    paddingTop: 48,
    zIndex: 99,
  },
  videoPlayerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
  },
  videoPlayerModalCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayerModalCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 24,
  },
  videoPlayerModalPlayer: {
    width: SCREEN_WIDTH * 0.9,
    height: (SCREEN_WIDTH * 0.9) * (16 / 9),
    backgroundColor: 'transparent',
  },
  selectionBar: {
    position: 'absolute',
    bottom: 34,
    left: 20,
    right: 20,
    height: 72,
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    elevation: 5,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  selectionCountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    fontFamily: 'sans-serif-medium',
  },
  selectionBtnDelete: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionBtnCancel: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
