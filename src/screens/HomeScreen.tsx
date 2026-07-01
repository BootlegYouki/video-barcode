import React, { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { RipplePressable } from '../components/RipplePressable';
import { Play, CheckCircle, Barcode, QrCode, Pause, XCircle } from 'phosphor-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';

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

interface BarcodeCardItemProps {
  item: BarcodeRecord;
  isSelected: boolean;
  isSelectMode: boolean;
  onToggleSelect: (id: string) => void;
  onEnterSelectMode: (id: string) => void;
  onPlayVideo: (uri: string) => void;
  isDark: boolean;
  themeCard: any;
  themeText: any;
  themeSubText: any;
  themeUncheckedCircleBorderColor: string;
  pulseAnim: any;
}

const BarcodeCardItem: React.FC<BarcodeCardItemProps> = ({
  item,
  isSelected,
  isSelectMode,
  onToggleSelect,
  onEnterSelectMode,
  onPlayVideo,
  isDark,
  themeCard,
  themeText,
  themeSubText,
  themeUncheckedCircleBorderColor,
  pulseAnim,
}) => {
  const animatedPulseStyle = useAnimatedStyle(() => {
    if (item.processingState === 'processing') {
      return { opacity: pulseAnim.value };
    }
    return { opacity: 1 };
  });

  return (
    <View style={[styles.card, themeCard, isSelected && (isDark ? { borderColor: '#10B981', backgroundColor: '#0B2D20' } : styles.cardSelected)]}>
      <RipplePressable 
        onPress={() => {
          if (isSelectMode) {
            onToggleSelect(item.id);
          } else if (item.videoUri) {
            onPlayVideo(item.videoUri);
          }
        }} 
        onLongPress={() => {
          if (!isSelectMode) {
            onEnterSelectMode(item.id);
          }
        }}
        style={styles.cardPressable}
        delayLongPress={400}
      >
        {isSelectMode && (
          <View style={styles.checkboxContainer}>
            {isSelected ? (
              <CheckCircle size={24} color={isDark ? '#10B981' : '#000000'} weight="fill" />
            ) : (
              <View style={[styles.uncheckedCircle, { borderColor: themeUncheckedCircleBorderColor }]} />
            )}
          </View>
        )}

        {/* Icon/Image Thumbnail with Loading Overlay */}
        <View style={[styles.thumbnailContainer, isDark ? styles.thumbnailContainerDark : styles.thumbnailContainerLight]}>
          {item.thumbnailUri ? (
            <View style={{ width: '100%', height: '100%', position: 'relative' }}>
              <Image source={{ uri: item.thumbnailUri }} style={styles.thumbnailImage} resizeMode="cover" />
              {item.processingState === 'processing' && (
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' }]}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              )}
            </View>
          ) : item.type === 'QR_CODE' ? (
            <QrCode size={44} color={isDark ? '#FFFFFF' : '#0F172A'} weight="thin" />
          ) : (
            <Barcode size={44} color={isDark ? '#FFFFFF' : '#0F172A'} weight="thin" />
          )}
        </View>

        <View style={styles.cardContent}>
          <Animated.View style={animatedPulseStyle}>
            <Text style={[styles.timestampText, themeSubText]}>{item.timestamp}</Text>
            <Text style={[styles.codeText, themeText]}>{item.code}</Text>
          </Animated.View>

          {/* If background processing, render progress bar */}
          {(item.processingState === 'processing' || item.processingState === 'paused') ? (
            <View style={styles.progressSection}>
              <View style={styles.progressRow}>
                <Text style={[styles.progressLabel, themeSubText]}>
                  {item.processingState === 'processing' ? 'Adding timestamp...' : 'Paused'} {item.processingProgress || 0}%
                </Text>
              </View>
              
              {/* Progress Track */}
              <View style={[styles.progressTrack, isDark ? styles.progressTrackDark : styles.progressTrackLight]}>
                <View 
                  style={[
                    styles.progressIndicator, 
                    { 
                      width: `${item.processingProgress || 0}%`,
                      backgroundColor: item.processingState === 'processing' ? '#10B981' : '#64748B'
                    }
                  ]} 
                />
              </View>
            </View>
          ) : (
            <Text style={[styles.metaText, themeSubText]}>
              {item.size ? `${item.size} • ` : ''}
              {(() => {
                if (!item.duration) return '';
                const match = item.duration.match(/^0:(\d+)s$/);
                if (match) {
                  const totalSecs = parseInt(match[1], 10);
                  const mins = Math.floor(totalSecs / 60);
                  const secs = totalSecs % 60;
                  return `${mins}:${secs.toString().padStart(2, '0')}s`;
                }
                return item.duration;
              })()}
            </Text>
          )}
        </View>
      </RipplePressable>
    </View>
  );
};

interface HomeScreenProps {
  records: BarcodeRecord[];
  onPlayVideo: (uri: string) => void;
  isSelectMode: boolean;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onEnterSelectMode: (initialId: string) => void;
  isDarkMode?: boolean;
  searchQuery?: string;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  records,
  onPlayVideo,
  isSelectMode,
  selectedIds,
  onToggleSelect,
  onEnterSelectMode,
  isDarkMode,
  searchQuery,
}) => {
  const isSelected = (id: string) => selectedIds.includes(id);

  const isDark = !!isDarkMode;
  const themeCard = isDark ? { backgroundColor: '#1E293B', borderColor: '#334155' } : { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' };
  const themeText = isDark ? { color: '#FFFFFF' } : { color: '#000000' };
  const themeSubText = isDark ? { color: '#94A3B8' } : { color: '#64748B' };
  const themePlayBtnBg = isDark ? { backgroundColor: '#334155', borderColor: '#475569' } : { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' };
  const themeUncheckedCircleBorderColor = isDark ? '#475569' : '#CBD5E1';

  // Pulsing animation for processing/loading cards
  const pulseAnim = useSharedValue(0.4);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900 }),
        withTiming(0.4, { duration: 900 })
      ),
      -1,
      true
    );
  }, []);

  const renderItem = ({ item }: { item: BarcodeRecord }) => {
    return (
      <BarcodeCardItem
        item={item}
        isSelected={isSelected(item.id)}
        isSelectMode={isSelectMode}
        onToggleSelect={onToggleSelect}
        onEnterSelectMode={onEnterSelectMode}
        onPlayVideo={onPlayVideo}
        isDark={isDark}
        themeCard={themeCard}
        themeText={themeText}
        themeSubText={themeSubText}
        themeUncheckedCircleBorderColor={themeUncheckedCircleBorderColor}
        pulseAnim={pulseAnim}
      />
    );
  };

  return (
    <View style={[styles.container, isDark && { backgroundColor: '#0F172A' }]}>
      {records.length === 0 ? (
        searchQuery ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, themeText]}>No matching records found</Text>
            <Text style={[styles.emptySubtext, themeSubText]}>
              Try searching for a different barcode, name, or metadata.
            </Text>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, themeText]}>No scans yet</Text>
            <Text style={[styles.emptySubtext, themeSubText]}>
              Tap the camera button in the center of the navigation bar to start.
            </Text>
          </View>
        )
      ) : (
        <FlatList
          data={records}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 140, // More bottom padding to clear the floating action menu in select mode!
    paddingTop: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    marginBottom: 16,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  cardSelected: {
    borderColor: '#000000',
    backgroundColor: '#F8FAFC',
  },
  cardPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  checkboxContainer: {
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailContainer: {
    width: 100,
    height: 100,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  thumbnailContainerLight: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  thumbnailContainerDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
  },
  cardContent: {
    flex: 1,
  },
  timestampText: {
    fontFamily: 'sans-serif',
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 6,
  },
  metaText: {
    fontFamily: 'sans-serif',
    fontSize: 14,
    color: '#94A3B8',
  },

  playIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginLeft: 8,
  },
  emptyContainer: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: 'sans-serif-medium',
    fontSize: 16,
    fontWeight: '500',
    color: '#475569',
    marginBottom: 8,
  },
  emptySubtext: {
    fontFamily: 'sans-serif',
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  uncheckedCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#94A3B8',
    backgroundColor: 'transparent',
  },
  progressSection: {
    marginTop: 6,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 13,
    fontFamily: 'sans-serif-medium',
    fontWeight: '500',
  },
  progressControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconControlBtn: {
    padding: 4,
    borderRadius: 4,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  progressTrackLight: {
    backgroundColor: '#E2E8F0',
  },
  progressTrackDark: {
    backgroundColor: '#334155',
  },
  progressIndicator: {
    height: '100%',
    borderRadius: 3,
  },
});
