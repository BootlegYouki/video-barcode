import React from 'react';
import { View, Text, FlatList, StyleSheet, Image } from 'react-native';
import { RipplePressable } from '../components/RipplePressable';
import { Play, CheckCircle, Barcode, QrCode } from 'phosphor-react-native';

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

  const renderItem = ({ item }: { item: BarcodeRecord }) => {
    const selected = isSelected(item.id);

    return (
      <View style={[styles.card, themeCard, selected && (isDark ? { borderColor: '#10B981', backgroundColor: '#0B2D20' } : styles.cardSelected)]}>
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
              {selected ? (
                <CheckCircle size={24} color={isDark ? '#10B981' : '#000000'} weight="fill" />
              ) : (
                <View style={[styles.uncheckedCircle, { borderColor: themeUncheckedCircleBorderColor }]} />
              )}
            </View>
          )}

          {/* Icon Thumbnail */}
          <View style={[styles.thumbnailContainer, isDark ? styles.thumbnailContainerDark : styles.thumbnailContainerLight]}>
            {item.thumbnailUri ? (
              <Image source={{ uri: item.thumbnailUri }} style={styles.thumbnailImage} resizeMode="cover" />
            ) : item.type === 'QR_CODE' ? (
              <QrCode size={44} color={isDark ? '#FFFFFF' : '#0F172A'} weight="thin" />
            ) : (
              <Barcode size={44} color={isDark ? '#FFFFFF' : '#0F172A'} weight="thin" />
            )}
          </View>

          <View style={styles.cardContent}>
            <Text style={[styles.timestampText, themeSubText]}>{item.timestamp}</Text>
            <Text style={[styles.codeText, themeText]}>{item.code}</Text>

            {(item.mode || item.brand) && (
              <View style={styles.tagRow}>
                {item.mode && (
                  <View style={[styles.tag, item.mode === 'packing' ? styles.tagPacking : styles.tagUnboxing]}>
                    <Text style={[styles.tagText, { color: '#FFFFFF' }]}>
                      {item.mode === 'packing' ? 'Packing' : 'Unboxing'}
                    </Text>
                  </View>
                )}
                {item.brand && (
                  <View style={[styles.tag, item.brand === 'Marigold Philippines' ? styles.tagBrandPH : styles.tagBrandCollab]}>
                    <Text style={[styles.tagText, { color: item.brand === 'Marigold Philippines' ? '#000000' : '#FFFFFF' }]}>
                      {item.brand}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <Text style={[styles.metaText, themeSubText]}>{item.size ? `${item.size} • ` : ''}{item.duration}</Text>
          </View>
        </RipplePressable>
      </View>
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
          keyExtractor={(item) => item.id}
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
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagPacking: {
    backgroundColor: '#F59E0B',
  },
  tagUnboxing: {
    backgroundColor: '#3B82F6',
  },
  tagBrandPH: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#000000',
  },
  tagBrandCollab: {
    backgroundColor: '#EF4444',
  },
  tagText: {
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'sans-serif-medium',
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
});
