import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Pressable, Alert, TouchableWithoutFeedback, LayoutChangeEvent, PanResponder } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Reanimated, { FadeIn, FadeOut, ZoomIn, ZoomOut, SlideInDown, SlideOutDown, useSharedValue, useAnimatedStyle, withTiming, runOnJS, interpolate } from 'react-native-reanimated';
import { RipplePressable } from '../components/RipplePressable';
import { MagnifyingGlass, X, Trash } from 'phosphor-react-native';
import { BottomNavigator } from '../components/BottomNavigator';
import { useVideoPlayer, VideoView } from 'expo-video';
import { HomeScreen } from './HomeScreen';
import { SettingsScreen } from './SettingsScreen';
import { CameraScreen } from './CameraScreen';
import { MD3Button } from '../components/MD3Button';

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
  mode?: 'packing' | 'unboxing';
  brand?: 'Marigold Philippines' | 'Marigold Collab';
  thumbnailUri?: string;
}

const MOCK_RECORDS: BarcodeRecord[] = [];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MainScreenProps {
  onResetOnboarding?: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: (val: boolean) => void;
}

export const MainScreen: React.FC<MainScreenProps> = ({
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

  // Scan Setup Bottom Sheet choice states
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [scanMode, setScanMode] = useState<'packing' | 'unboxing'>('packing');
  const [scanBrand, setScanBrand] = useState<'Marigold Philippines' | 'Marigold Collab'>('Marigold Philippines');

  const modeLevels: { value: 'packing' | 'unboxing'; label: string }[] = [
    { value: 'packing', label: 'Packing' },
    { value: 'unboxing', label: 'Unboxing' },
  ];
  const modeTabIndex = modeLevels.findIndex(l => l.value === scanMode);
  const modeTabAnim = useRef(new Animated.Value(modeTabIndex)).current;
  const [modeTabWidth, setModeTabWidth] = useState(0);

  const handleModeChange = (val: 'packing' | 'unboxing') => {
    setScanMode(val);
    Animated.spring(modeTabAnim, {
      toValue: modeLevels.findIndex(l => l.value === val),
      useNativeDriver: true,
      tension: 70,
      friction: 12,
    }).start();
  };

  const brandLevels: { value: 'Marigold Philippines' | 'Marigold Collab'; label: string }[] = [
    { value: 'Marigold Philippines', label: 'Marigold Philippines' },
    { value: 'Marigold Collab', label: 'Marigold Collab' },
  ];
  const brandTabIndex = brandLevels.findIndex(l => l.value === scanBrand);
  const brandTabAnim = useRef(new Animated.Value(brandTabIndex)).current;
  const [brandTabWidth, setBrandTabWidth] = useState(0);

  const handleBrandChange = (val: 'Marigold Philippines' | 'Marigold Collab') => {
    setScanBrand(val);
    Animated.spring(brandTabAnim, {
      toValue: brandLevels.findIndex(l => l.value === val),
      useNativeDriver: true,
      tension: 70,
      friction: 12,
    }).start();
  };

  // Dragging translation for sheet
  const translateY = useSharedValue(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5 && gestureState.dy > 0;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.value = gestureState.dy;
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.5) {
          translateY.value = withTiming(500, { duration: 200 }, (finished) => {
            if (finished) {
              runOnJS(setShowBottomSheet)(false);
            }
          });
        } else {
          translateY.value = withTiming(0, { duration: 180 });
        }
      },
    })
  ).current;

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [0, 500],
      [0.5, 0],
      'clamp'
    );
    return {
      backgroundColor: 'rgba(0, 0, 0, 1)',
      opacity: opacity,
    };
  });

  const openBottomSheet = () => {
    setShowBottomSheet(true);
    translateY.value = 500;
    translateY.value = withTiming(0, { duration: 250 });
  };

  const closeBottomSheet = () => {
    translateY.value = withTiming(500, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(setShowBottomSheet)(false);
      }
    });
  };

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

  const handleSaveSession = async (barcode: string, videoUri: string, duration: string, thumbnailUri?: string) => {
    const type = barcode.startsWith('http') ? 'QR_CODE' : barcode.length > 10 ? 'EAN-13' : 'CODE-128';

    const timestampStr = new Date().toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    const prefix = scanMode === 'packing' ? 'pack' : 'unbox';
    const brandSuffix = scanBrand === 'Marigold Philippines' ? 'MarigoldPH' : 'MarigoldClb';
    const baseName = `${prefix}_${barcode}_${brandSuffix}`;
    let fileNameStr = `${baseName}.mp4`;

    let finalVideoUri = videoUri;
    try {
      if (compressionQuality === 'high') {
        // Skip compression entirely — preserve the raw camera output for best quality
        console.log('High quality selected, skipping compression.');
      } else {
        console.log('Compressing video at:', videoUri);
        const targetBitrate = compressionQuality === 'medium' ? 2500000 : 1000000;

        finalVideoUri = await VideoCompressor.compress(
          videoUri,
          {
            compressionMethod: 'manual',
            bitrate: targetBitrate,
          }
        );
        console.log('Compression complete with target bitrate:', targetBitrate, 'Output URI:', finalVideoUri);
      }
    } catch (compressErr) {
      console.error('Failed to compress video, using original:', compressErr);
    }

    // Copy to permanent Documents/videos/ directory so it persists in its own clean folder
    if (FileSystem.documentDirectory) {
      try {
        const targetDir = `${FileSystem.documentDirectory}videos/`;
        // Ensure the directory exists
        const dirInfo = await FileSystem.getInfoAsync(targetDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
        }

        // Find a unique filename — never overwrite existing files
        let uniqueName = `${baseName}.mp4`;
        let candidate = `${targetDir}${uniqueName}`;
        let counter = 1;
        while ((await FileSystem.getInfoAsync(candidate)).exists) {
          uniqueName = `${baseName} (${counter}).mp4`;
          candidate = `${targetDir}${uniqueName}`;
          counter++;
        }

        await FileSystem.copyAsync({
          from: finalVideoUri,
          to: candidate,
        });
        console.log('Saved permanently to:', candidate);
        finalVideoUri = candidate;
        fileNameStr = uniqueName;
      } catch (copyErr) {
        console.error('Failed to copy to permanent storage, using cache:', copyErr);
      }
    }

    // Copy thumbnail to permanent Documents/thumbnails/ directory
    let finalThumbnailUri = thumbnailUri;
    if (thumbnailUri && FileSystem.documentDirectory) {
      try {
        const targetDir = `${FileSystem.documentDirectory}thumbnails/`;
        const dirInfo = await FileSystem.getInfoAsync(targetDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
        }

        const uniqueName = `thumb_${baseName}.jpg`;
        const candidate = `${targetDir}${uniqueName}`;

        await FileSystem.copyAsync({
          from: thumbnailUri,
          to: candidate,
        });
        console.log('Saved thumbnail permanently to:', candidate);
        finalThumbnailUri = candidate;
      } catch (copyErr) {
        console.error('Failed to copy thumbnail to permanent storage, using cache:', copyErr);
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
      mode: scanMode,
      brand: scanBrand,
      thumbnailUri: finalThumbnailUri,
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
          onCameraPress={openBottomSheet}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Setup Scan Bottom Sheet */}
      {showBottomSheet && (
        <Reanimated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(150)}
          style={[StyleSheet.absoluteFillObject, { zIndex: 9998, elevation: 9998 }]}
        >
          {/* Backdrop Dimming */}
          <Pressable
            onPress={closeBottomSheet}
            style={StyleSheet.absoluteFillObject}
          >
            <Reanimated.View
              style={[StyleSheet.absoluteFillObject, animatedBackdropStyle]}
            />
          </Pressable>

          {/* Bottom Sheet Container */}
          <Reanimated.View
            entering={SlideInDown.duration(250)}
            exiting={SlideOutDown.duration(150)}
            style={[
              styles.bottomSheetContainer,
              isDark ? styles.bottomSheetDark : styles.bottomSheetLight,
              { paddingBottom: insets.bottom + 24 },
              animatedSheetStyle
            ]}
          >
            {/* Header Drag area */}
            <View {...panResponder.panHandlers} style={styles.dragArea}>
              <View style={[styles.dragHandle, isDark ? { backgroundColor: '#475569' } : { backgroundColor: '#CBD5E1' }]} />
            </View>

            <Text style={[styles.bottomSheetTitle, isDark ? { color: '#FFFFFF' } : { color: '#0F172A' }]}>
              Scan Settings
            </Text>

            {/* Selector 1: Scan Mode */}
            <View style={styles.sheetSelectorGroup}>
              <Text style={[styles.sheetSelectorLabel, isDark ? { color: '#94A3B8' } : { color: '#64748B' }]}>
                Scan Activity
              </Text>
              <View
                style={[styles.tabTrack, isDark ? styles.tabTrackDark : styles.tabTrackLight]}
                onLayout={(e: LayoutChangeEvent) => setModeTabWidth(e.nativeEvent.layout.width / 2)}
              >
                {modeTabWidth > 0 && (
                  <Animated.View
                    style={[
                      styles.tabPill,
                      isDark ? styles.tabPillDark : styles.tabPillLight,
                      {
                        width: modeTabWidth - 6,
                        transform: [{
                          translateX: modeTabAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [3, modeTabWidth + 3],
                          }),
                        }],
                      },
                    ]}
                  />
                )}
                {modeLevels.map((level) => {
                  const isActive = scanMode === level.value;
                  return (
                    <TouchableWithoutFeedback
                      key={level.value}
                      onPress={() => handleModeChange(level.value)}
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

            {/* Selector 2: Brand / Company */}
            <View style={styles.sheetSelectorGroup}>
              <Text style={[styles.sheetSelectorLabel, isDark ? { color: '#94A3B8' } : { color: '#64748B' }]}>
                Page
              </Text>
              <View
                style={[styles.tabTrack, isDark ? styles.tabTrackDark : styles.tabTrackLight]}
                onLayout={(e: LayoutChangeEvent) => setBrandTabWidth(e.nativeEvent.layout.width / 2)}
              >
                {brandTabWidth > 0 && (
                  <Animated.View
                    style={[
                      styles.tabPill,
                      isDark ? styles.tabPillDark : styles.tabPillLight,
                      {
                        width: brandTabWidth - 6,
                        transform: [{
                          translateX: brandTabAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [3, brandTabWidth + 3],
                          }),
                        }],
                      },
                    ]}
                  />
                )}
                {brandLevels.map((level) => {
                  const isActive = scanBrand === level.value;
                  return (
                    <TouchableWithoutFeedback
                      key={level.value}
                      onPress={() => handleBrandChange(level.value)}
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

            {/* Start Scanning Button */}
            <MD3Button
              title="Start Scanning"
              onPress={() => {
                closeBottomSheet();
                setTimeout(() => {
                  setShowCamera(true);
                }, 250);
              }}
              variant="filled"
              size="large"
              style={styles.startScanBtn}
              isDarkMode={isDark}
            />
          </Reanimated.View>
        </Reanimated.View>
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
                  
                  {/* Badges row */}
                  {(activeRecord.mode || activeRecord.brand) && (
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                      {activeRecord.mode && (
                        <View style={{
                          backgroundColor: activeRecord.mode === 'packing' ? '#F59E0B' : '#3B82F6',
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8,
                        }}>
                          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' }}>
                            {activeRecord.mode === 'packing' ? 'Packing' : 'Unboxing'}
                          </Text>
                        </View>
                      )}
                      {activeRecord.brand && (
                        <View style={{
                          backgroundColor: activeRecord.brand === 'Marigold Philippines' ? '#FFFFFF' : '#EF4444',
                          borderWidth: activeRecord.brand === 'Marigold Philippines' ? 1 : 0,
                          borderColor: '#000000',
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8,
                        }}>
                          <Text style={{ color: activeRecord.brand === 'Marigold Philippines' ? '#000000' : '#FFFFFF', fontSize: 13, fontWeight: 'bold' }}>
                            {activeRecord.brand}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

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
  bottomSheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 16,
    elevation: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
  },
  bottomSheetLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bottomSheetDark: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  dragArea: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  bottomSheetTitle: {
    fontFamily: 'sans-serif-medium',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  sheetSelectorGroup: {
    marginBottom: 20,
    gap: 8,
  },
  sheetSelectorLabel: {
    fontFamily: 'sans-serif-medium',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    zIndex: 1,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'sans-serif-medium',
  },
  startScanBtn: {
    marginTop: 12,
    marginBottom: 8,
  },
});
