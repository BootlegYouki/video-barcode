import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { RipplePressable } from '../components/RipplePressable';
import { Play, CheckCircle } from 'phosphor-react-native';

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

interface HomeScreenProps {
  records: BarcodeRecord[];
  onPlayVideo: (uri: string) => void;
  isSelectMode: boolean;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onEnterSelectMode: (initialId: string) => void;
  isDarkMode?: boolean;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  records,
  onPlayVideo,
  isSelectMode,
  selectedIds,
  onToggleSelect,
  onEnterSelectMode,
  isDarkMode,
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

          <View style={styles.cardContent}>
            <Text style={[styles.timestampText, themeSubText]}>{item.timestamp}</Text>
            <Text style={[styles.codeText, themeText]}>{item.code}</Text>
            <Text style={[styles.metaText, themeSubText]}>{item.size ? `${item.size} • ` : ''}{item.duration}</Text>
          </View>

          {!isSelectMode && (
            <View style={[styles.playIconContainer, themePlayBtnBg]}>
              <Play size={18} color={isDark ? '#FFFFFF' : '#000000'} weight="fill" />
            </View>
          )}
        </RipplePressable>
      </View>
    );
  };

  return (
    <View style={[styles.container, isDark && { backgroundColor: '#0F172A' }]}>
      {records.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, themeText]}>No scans yet</Text>
          <Text style={[styles.emptySubtext, themeSubText]}>
            Tap the camera button in the center of the navigation bar to start.
          </Text>
        </View>
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
    padding: 20,
  },
  checkboxContainer: {
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
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
});
