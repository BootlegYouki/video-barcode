import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { RipplePressable } from '../components/RipplePressable';
import { Play } from 'phosphor-react-native';

interface BarcodeRecord {
  id: string;
  code: string;
  type: string;
  timestamp: string;
  duration: string;
  fileName: string;
}

interface HistoryScreenProps {
  records: BarcodeRecord[];
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ records }) => {
  const renderItem = ({ item }: { item: BarcodeRecord }) => (
    <View style={styles.card}>
      <RipplePressable onPress={() => {}} style={styles.cardPressable}>
        <View style={styles.cardContent}>
          <Text style={styles.timestampText}>{item.timestamp}</Text>
          <Text style={styles.codeText}>{item.code}</Text>
          <Text style={styles.metaText}>{item.fileName} • {item.duration}</Text>
        </View>
        <View style={styles.playIconContainer}>
          <Play size={18} color="#000000" weight="fill" />
        </View>
      </RipplePressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={records}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 120,
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
  cardPressable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
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
});
