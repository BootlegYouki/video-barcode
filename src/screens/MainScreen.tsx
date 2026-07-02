import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, Alert, TouchableWithoutFeedback, TextInput, Keyboard, ActivityIndicator, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Reanimated, { FadeIn, FadeOut, ZoomIn, ZoomOut, useSharedValue, useAnimatedStyle, withTiming, interpolate } from 'react-native-reanimated';
import { RipplePressable } from '../components/RipplePressable';
import { MagnifyingGlass, X, Trash, Barcode } from 'phosphor-react-native';
import { BottomNavigator } from '../components/BottomNavigator';
import { useVideoPlayer, VideoView } from 'expo-video';
import { HomeScreen } from './HomeScreen';
import { SettingsScreen } from './SettingsScreen';
import { CameraScreen } from './CameraScreen';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { FFmpegKit, FFmpegKitConfig, ReturnCode } from 'ffmpeg-kit-react-native';

import { Storage } from '../utils/storage';
import { UploadQueue } from '../utils/uploadQueue';
import { UploadService } from '../utils/uploadService';

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
  rawVideoUri?: string;
  size?: string;
  thumbnailUri?: string;
  processingState?: 'idle' | 'processing' | 'paused' | 'completed' | 'failed';
  processingProgress?: number;
  startEpoch?: number;
}

interface HistoryPlayerProps {
  videoUri: string;
}

const HistoryPlayer: React.FC<HistoryPlayerProps> = ({ videoUri }) => {
  const player = useVideoPlayer(videoUri, (p) => {
    p.loop = true;
    p.play();
  });

  return (
    <VideoView
      style={styles.videoPlayerModalPlayer}
      player={player}
      allowsPictureInPicture={false}
      nativeControls={true}
      surfaceType="textureView"
    />
  );
};

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

  const [searchQuery, setSearchQuery] = useState('');
  const [showInlineScanner, setShowInlineScanner] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [inlineScannedBarcode, setInlineScannedBarcode] = useState<string | null>(null);
  const [allowInlineScan, setAllowInlineScan] = useState(false);

  useEffect(() => {
    if (showInlineScanner) {
      setAllowInlineScan(false);
      const timer = setTimeout(() => {
        setAllowInlineScan(true);
      }, 1200);
      return () => clearTimeout(timer);
    } else {
      setAllowInlineScan(false);
    }
  }, [showInlineScanner]);

  const inlineScannerHeight = useSharedValue(0);

  useEffect(() => {
    inlineScannerHeight.value = withTiming(showInlineScanner ? 130 : 0, { duration: 250 });
  }, [showInlineScanner]);

  const animatedInlineScannerStyle = useAnimatedStyle(() => ({
    height: inlineScannerHeight.value,
    opacity: interpolate(inlineScannerHeight.value, [0, 130], [0, 1]),
    marginTop: interpolate(inlineScannerHeight.value, [0, 130], [0, 12]),
  }));

  const filteredRecords = records.filter(record => {
    // Search Query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        record.code.toLowerCase().includes(query) ||
        record.fileName.toLowerCase().includes(query)
      );
    }
    return true;
  });



  const activeSessions = useRef<Map<string, any>>(new Map());

  // Statistics callback to calculate progress percentage dynamically in background
  useEffect(() => {
    FFmpegKitConfig.enableStatisticsCallback((statistics) => {
      const timeMs = statistics.getTime();
      const sessionId = statistics.getSessionId();

      let matchingRecordId: string | null = null;
      for (const [recId, session] of activeSessions.current.entries()) {
        if (session && String(session.getSessionId()) === String(sessionId)) {
          matchingRecordId = recId;
          break;
        }
      }

      if (matchingRecordId) {
        setRecords(prevRecords => {
          const rec = prevRecords.find(r => r.id === matchingRecordId);
          if (!rec) return prevRecords;

          let totalMs = 10000;
          if (rec.duration) {
            const match = rec.duration.match(/^(\d+):(\d+)s$/);
            if (match) {
              const mins = parseInt(match[1], 10);
              const secs = parseInt(match[2], 10);
              totalMs = (mins * 60 + secs) * 1000;
            } else {
              const matchSec = rec.duration.match(/^(\d+)s$/);
              if (matchSec) {
                totalMs = parseInt(matchSec[1], 10) * 1000;
              }
            }
          }

          const pct = Math.min(99, Math.max(0, Math.round((timeMs / totalMs) * 100)));
          if (rec.processingProgress === pct) return prevRecords;

          const updated = prevRecords.map(r => {
            if (r.id === matchingRecordId) {
              return { ...r, processingProgress: pct };
            }
            return r;
          });

          Storage.saveHistoryRecords(updated);
          return updated;
        });
      }
    });

    return () => {
      FFmpegKitConfig.disableStatistics();
    };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const stored = await Storage.getHistoryRecords();
      if (stored && stored.length > 0) {
        // Map records that were left 'processing' back to 'paused' on app start
        const cleaned = stored.map(r => {
          if (r.processingState === 'processing') {
            return { ...r, processingState: 'paused' };
          }
          return r;
        });
        setRecords(cleaned);
      }

      // Trigger the background upload queue watcher on startup
      UploadService.triggerUpload();
    };
    loadData();
  }, []);

  const startFFmpegProcessing = async (record: BarcodeRecord) => {
    try {
      const startEpoch = record.startEpoch || Math.floor(Date.now() / 1000);
      const inputPath = record.rawVideoUri!.replace('file://', '');
      
      const publicDirUri = await Storage.getPublicDirectoryUri();
      const isPublicExportEnabled = !!(publicDirUri && Platform.OS === 'android');

      let outputUri = FileSystem.documentDirectory + 'videos/' + record.fileName;
      let outputPath = outputUri.replace('file://', '');

      if (isPublicExportEnabled && publicDirUri) {
        try {
          // Pre-create the file in the SAF directory to get a content:// URI
          const safFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
            publicDirUri,
            record.fileName,
            'video/mp4'
          );
          // Convert the content URI into an FFmpeg SAF writable path parameter
          outputPath = await FFmpegKitConfig.getSafParameterForWrite(safFileUri);
          outputUri = safFileUri;
          console.log('FFmpeg SAF Output URL configured:', outputPath);
        } catch (safErr) {
          console.error('Failed to pre-create SAF file, falling back to local storage:', safErr);
          outputUri = FileSystem.documentDirectory + 'videos/' + record.fileName;
          outputPath = outputUri.replace('file://', '');
        }
      }

      const fontParam = Platform.OS === 'ios' ? 'font=Helvetica' : 'font=sans';
      const videoCodec = Platform.OS === 'ios' ? 'h264_videotoolbox' : 'mpeg4';

      const scaleFilter = 'scale=-2:720,'; // Scale to 720p height, keep aspect ratio
      const targetBitrate = '2M';          // Medium: 720p target @ 2Mbps
      const fontSize = 24;                 // Calibrated smaller size for 720p
      const padding = 20;

      const filterScriptUri = FileSystem.cacheDirectory + 'filter_script_' + record.id + '.txt';
      const filterScriptPath = filterScriptUri.replace('file://', '');
      const filterText = `fps=15,${scaleFilter}drawtext=text='%{pts\\:localtime\\:${startEpoch}\\:%B %d\\\\,\\\\ %Y %r}':x=${padding}:y=${padding}:fontsize=${fontSize}:fontcolor=white:box=1:boxcolor=black@0.4:${fontParam}`;

      await FileSystem.writeAsStringAsync(filterScriptUri, filterText);

      const ffmpegArgs = [
        '-y',
        ...(Platform.OS === 'ios' ? ['-hwaccel', 'videotoolbox'] : []),
        '-threads', '0',
        '-i', inputPath,
        '-filter_script:v', filterScriptPath,
        '-c:v', videoCodec,
        ...(Platform.OS === 'ios' ? ['-realtime', '1'] : []),
        '-b:v', targetBitrate,
        '-c:a', 'copy',
        outputPath
      ];

      const session = await FFmpegKit.executeWithArgumentsAsync(ffmpegArgs, async (finishedSession) => {
        const returnCode = await finishedSession.getReturnCode();
        activeSessions.current.delete(record.id);

        if (returnCode.isValueSuccess()) {
          // Calculate the correct file size
          let sizeStr = '0 B';
          let sizeInBytes = 0;
          try {
            const fileInfo = await FileSystem.getInfoAsync(outputUri);
            if (fileInfo.exists && fileInfo.size !== undefined) {
              sizeInBytes = fileInfo.size;
              if (sizeInBytes < 1024 * 1024) {
                sizeStr = `${(sizeInBytes / 1024).toFixed(1)} KB`;
              } else {
                sizeStr = `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
              }
            }
          } catch (_) {}

          // Enqueue video for background upload to Google Drive
          UploadQueue.enqueue(record.id, record.fileName, outputUri, sizeInBytes);
          UploadService.triggerUpload();

          // Clean up the temporary raw video from disk
          if (record.rawVideoUri) {
            try {
              await FileSystem.deleteAsync(record.rawVideoUri, { idempotent: true });
              console.log('Cleaned up temporary raw video:', record.rawVideoUri);
            } catch (_) {}
          }

          setRecords(prev => {
            const updated = prev.map(r => {
              if (r.id === record.id) {
                return {
                  ...r,
                  videoUri: outputUri,
                  rawVideoUri: undefined,
                  size: sizeStr,
                  processingState: 'completed' as const,
                  processingProgress: 100,
                };
              }
              return r;
            });
            Storage.saveHistoryRecords(updated);
            return updated;
          });
        } else if (ReturnCode.isCancel(returnCode)) {
          console.log(`FFmpeg Session cancelled for record: ${record.id}`);
        } else {
          const logs = await finishedSession.getLogs();
          console.warn('FFmpeg background failed:', logs.map(l => l.getMessage()).join('\n'));
          setRecords(prev => {
            const updated = prev.map(r => {
              if (r.id === record.id) {
                return { ...r, processingState: 'failed' as const };
              }
              return r;
            });
            Storage.saveHistoryRecords(updated);
            return updated;
          });
        }

        try {
          await FileSystem.deleteAsync(filterScriptUri, { idempotent: true });
        } catch (_) {}
      });

      activeSessions.current.set(record.id, session);
    } catch (err) {
      console.error('Error in background FFmpeg init:', err);
      setRecords(prev => {
        const updated = prev.map(r => {
          if (r.id === record.id) {
            return { ...r, processingState: 'failed' as const };
          }
          return r;
        });
        Storage.saveHistoryRecords(updated);
        return updated;
      });
    }
  };



  const handleSaveSession = async (barcode: string, videoUri: string, duration: string, thumbnailUri?: string, startEpoch?: number) => {
    const type = barcode.startsWith('http') ? 'QR_CODE' : barcode.length > 10 ? 'EAN-13' : 'CODE-128';

    // 1. Determine unique barcode display code for duplicate prevention in list
    let displayBarcode = barcode;
    const sameBaseCount = records.filter(r => {
      const baseOfRecord = r.code.replace(/\s\(\d+\)$/, '');
      return baseOfRecord === barcode;
    }).length;

    if (sameBaseCount > 0) {
      displayBarcode = `${barcode} (${sameBaseCount})`;
    }

    const newRecordId = Math.random().toString(36).substring(2, 9);

    const timestampStr = new Date().toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    const now = new Date();
    const pad = (num: number) => String(num).padStart(2, '0');
    const dateStr = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;
    const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    
    const baseName = `${dateStr}_${timeStr}_${displayBarcode}`;
    const fileNameStr = `${baseName}.mp4`;

    // Copy raw video temporarily to cache directory instead of documentDirectory
    let tempRawUri = videoUri;
    if (FileSystem.cacheDirectory) {
      try {
        const targetDir = `${FileSystem.cacheDirectory}raw_videos/`;
        const dirInfo = await FileSystem.getInfoAsync(targetDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
        }

        const candidate = `${targetDir}raw_${newRecordId}.mp4`;
        await FileSystem.copyAsync({
          from: videoUri,
          to: candidate,
        });
        console.log('Saved raw video temporarily to cache:', candidate);
        tempRawUri = candidate;
      } catch (copyErr) {
        console.error('Failed to copy to temporary cache, using original:', copyErr);
      }
    }

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
      const fileInfo = await FileSystem.getInfoAsync(tempRawUri);
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
      id: newRecordId,
      code: displayBarcode,
      type: type,
      timestamp: timestampStr,
      duration: duration,
      fileName: fileNameStr,
      videoUri: tempRawUri,
      rawVideoUri: tempRawUri,
      size: sizeStr,
      thumbnailUri: finalThumbnailUri,
      processingState: 'processing' as const,
      processingProgress: 0,
      startEpoch: startEpoch || Math.floor(Date.now() / 1000),
    };

    const updatedRecords = [newRecord, ...records];
    setRecords(updatedRecords);
    await Storage.saveHistoryRecords(updatedRecords);

    // Trigger FFmpeg in background
    startFFmpegProcessing(newRecord);

    setShowCamera(false);
    setActiveTab('home');
    setInlineScannedBarcode(null);
    setShowInlineScanner(false);
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

  const deleteFilesForRecords = async (recordsToDelete: BarcodeRecord[]) => {
    for (const r of recordsToDelete) {
      if (r.videoUri) {
        try {
          const info = await FileSystem.getInfoAsync(r.videoUri);
          if (info.exists) {
            await FileSystem.deleteAsync(r.videoUri, { idempotent: true });
            console.log('Deleted video file:', r.videoUri);
          }
        } catch (err) {
          console.error('Error deleting video file:', r.videoUri, err);
        }
      }
      if (r.rawVideoUri) {
        try {
          const info = await FileSystem.getInfoAsync(r.rawVideoUri);
          if (info.exists) {
            await FileSystem.deleteAsync(r.rawVideoUri, { idempotent: true });
            console.log('Deleted raw video file:', r.rawVideoUri);
          }
        } catch (err) {
          console.error('Error deleting raw video file:', r.rawVideoUri, err);
        }
      }
      if (r.thumbnailUri) {
        try {
          const info = await FileSystem.getInfoAsync(r.thumbnailUri);
          if (info.exists) {
            await FileSystem.deleteAsync(r.thumbnailUri, { idempotent: true });
            console.log('Deleted thumbnail file:', r.thumbnailUri);
          }
        } catch (err) {
          console.error('Error deleting thumbnail file:', r.thumbnailUri, err);
        }
      }
    }
  };

  const clearAllPhysicalFiles = async () => {
    // 1. Clear internal sandbox videos
    try {
      const videosDir = `${FileSystem.documentDirectory}videos/`;
      const videosDirInfo = await FileSystem.getInfoAsync(videosDir);
      if (videosDirInfo.exists) {
        await FileSystem.deleteAsync(videosDir, { idempotent: true });
        await FileSystem.makeDirectoryAsync(videosDir, { intermediates: true });
        console.log('Cleared local videos directory');
      }
    } catch (err) {
      console.error('Error clearing local videos directory:', err);
    }

    // 2. Clear internal sandbox thumbnails
    try {
      const thumbsDir = `${FileSystem.documentDirectory}thumbnails/`;
      const thumbsDirInfo = await FileSystem.getInfoAsync(thumbsDir);
      if (thumbsDirInfo.exists) {
        await FileSystem.deleteAsync(thumbsDir, { idempotent: true });
        await FileSystem.makeDirectoryAsync(thumbsDir, { intermediates: true });
        console.log('Cleared local thumbnails directory');
      }
    } catch (err) {
      console.error('Error clearing local thumbnails directory:', err);
    }

    // 3. Clear public SAF folder if configured on Android
    try {
      const publicDirUri = await Storage.getPublicDirectoryUri();
      if (publicDirUri && Platform.OS === 'android') {
        const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(publicDirUri);
        for (const fileUri of files) {
          const decoded = decodeURIComponent(fileUri);
          if (decoded.endsWith('.mp4') || decoded.endsWith('.jpg') || decoded.includes('_')) {
            try {
              await FileSystem.deleteAsync(fileUri, { idempotent: true });
              console.log('Deleted public file via SAF:', fileUri);
            } catch (delErr) {
              console.error('Failed to delete public file:', fileUri, delErr);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error clearing public SAF folder:', err);
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
            const toDelete = records.filter(r => selectedIds.includes(r.id));
            await deleteFilesForRecords(toDelete);
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





  if (showCamera) {
    return (
      <CameraScreen
        onClose={() => {
          setShowCamera(false);
          setInlineScannedBarcode(null);
        }}
        onSaveSession={handleSaveSession}
        initialBarcode={inlineScannedBarcode || undefined}
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
            <TextInput
              style={[styles.searchInput, themeSearchText]}
              placeholder="Search scan history..."
              placeholderTextColor={isDark ? '#94A3B8' : '#64748B'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <RipplePressable
                onPress={() => setSearchQuery('')}
                style={styles.clearSearchButton}
                rippleColor="rgba(0, 0, 0, 0.1)"
              >
                <X size={20} color={isDark ? '#94A3B8' : '#64748B'} weight="bold" />
              </RipplePressable>
            )}
            <RipplePressable
              onPress={async () => {
                if (!cameraPermission || !cameraPermission.granted) {
                  const res = await requestCameraPermission();
                  if (!res.granted) {
                    Alert.alert('Camera Permission', 'We need camera permission to scan barcodes.');
                    return;
                  }
                }
                setShowInlineScanner(prev => !prev);
              }}
              style={[
                styles.scannerButton,
                showInlineScanner
                  ? { backgroundColor: '#10B981' }
                  : (isDark ? { backgroundColor: '#334155' } : { backgroundColor: '#0F172A' })
              ]}
              rippleColor="rgba(255, 255, 255, 0.2)"
            >
              <Barcode size={22} color="#FFFFFF" weight="bold" />
            </RipplePressable>
          </View>



          {cameraPermission?.granted && (
            <Reanimated.View
              style={[styles.inlineScannerContainer, animatedInlineScannerStyle]}
            >
              {showInlineScanner && (
                <CameraView
                  style={StyleSheet.absoluteFillObject}
                  mode="picture"
                  onBarcodeScanned={({ data, bounds }) => {
                    if (allowInlineScan && data && data.trim() !== '' && data !== searchQuery) {
                      if (bounds) {
                        const cy = bounds.origin.y + bounds.size.height / 2;
                        // Restrict to visible area of the 130px tall inline camera card
                        if (cy < 15 || cy > 115) {
                          return;
                        }
                      }
                      setSearchQuery(data);
                      setShowInlineScanner(false);
                    }
                  }}
                />
              )}
            </Reanimated.View>
          )}
        </View>
      )}

      {/* Screen Render Switcher */}
      <TouchableWithoutFeedback
        onPress={() => {
          Keyboard.dismiss();
        }}
        accessible={false}
      >
        <View style={{ flex: 1 }}>
          {activeTab === 'home' ? (
            <HomeScreen
              records={filteredRecords}
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
              searchQuery={searchQuery}
            />
          ) : (
            <SettingsScreen
              onResetOnboarding={onResetOnboarding}
              onClearHistory={async () => {
                await clearAllPhysicalFiles();
                await Storage.clearHistoryRecords();
                setRecords([]);
              }}
              isDarkMode={isDarkMode}
              onToggleDarkMode={onToggleDarkMode}
            />
          )}
        </View>
      </TouchableWithoutFeedback>

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
          onCameraPress={async () => {
            try {
              const free = await FileSystem.getFreeDiskStorageAsync();
              const minRequiredSpace = 200 * 1024 * 1024; // 200 MB threshold
              if (free < minRequiredSpace) {
                Alert.alert(
                  'Local Storage Full',
                  'Your local storage is almost full (less than 200 MB remaining). Please free up space before recording new videos.',
                  [{ text: 'OK' }]
                );
                return;
              }
            } catch (err) {
              console.error('Failed to check storage space:', err);
            }
            setShowCamera(true);
          }}
          isDarkMode={isDarkMode}
        />
      )}



      {/* Full screen Video Player Overlay */}
      {activeVideoUri && (
        <Reanimated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={[StyleSheet.absoluteFillObject, { zIndex: 9999, elevation: 9999 }]}
        >
          {/* Backdrop Dismiss Button (Strictly underneath the card) */}
          <Pressable
            onPress={() => { setActiveVideoUri(null); setActiveRecord(null); }}
            style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]}
          />

          {/* Centered Video Card Container (Sits on top, does not intercept close taps) */}
          <View 
            pointerEvents="box-none"
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingBottom: '10%' }}
          >
            {/* Name + Date above the card */}
            {activeRecord && (
              <Reanimated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(150)}
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
                backgroundColor: '#000000',
              }}
            >
              <View style={{ position: 'relative' }}>
                {activeVideoUri ? (
                  <HistoryPlayer videoUri={activeVideoUri} />
                ) : (
                  <ActivityIndicator size="large" color="#FFFFFF" style={{ padding: 40 }} />
                )}
              </View>
            </Reanimated.View>
          </View>
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
    paddingBottom: 8,
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
  searchInput: {
    fontFamily: 'sans-serif',
    fontSize: 16,
    flex: 1,
    marginLeft: 12,
    paddingVertical: 8,
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
  scannerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearSearchButton: {
    padding: 8,
    marginRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },

  inlineScannerContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000000',
  },
  inlineViewfinder: {
    position: 'absolute',
    top: '20%',
    left: '15%',
    right: '15%',
    bottom: '20%',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderRadius: 8,
  },
  inlineCorner: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderColor: '#10B981',
  },
  inlineTopLeft: {
    top: -1,
    left: -1,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 4,
  },
  inlineTopRight: {
    top: -1,
    right: -1,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 4,
  },
  inlineBottomLeft: {
    bottom: -1,
    left: -1,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 4,
  },
  inlineBottomRight: {
    bottom: -1,
    right: -1,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 4,
  },
  inlineScanOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  inlineScanOverlayText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'sans-serif-medium',
    textAlign: 'center',
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
  timestampOverlayPlayback: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    zIndex: 99,
  },
  timestampOverlayText: {
    color: '#FFFFFF',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
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
