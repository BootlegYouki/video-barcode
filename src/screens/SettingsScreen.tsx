import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { RipplePressable } from '../components/RipplePressable';
import { MD3Button } from '../components/MD3Button';
import { CaretRight } from 'phosphor-react-native';
import { Storage } from '../utils/storage';

interface SettingsScreenProps {
  onResetOnboarding?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onResetOnboarding }) => {
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Section: Integrations */}
      <Text style={styles.sectionHeader}>Integrations</Text>
      <View style={styles.card}>
        <View style={styles.integrationRow}>
          <View style={styles.rowContent}>
            <Text style={styles.rowTitle}>Google Drive</Text>
            <Text style={styles.rowSubtitle}>
              {isDriveConnected ? 'Connected as backup drive' : 'Automatically sync videos'}
            </Text>
          </View>
          <MD3Button
            title={isDriveConnected ? 'Disconnect' : 'Connect'}
            onPress={handleToggleDrive}
            variant={isDriveConnected ? 'outlined' : 'filled'}
            size="normal"
            style={styles.connectBtn}
          />
        </View>
      </View>

      {/* Section: Hardware Settings */}
      <Text style={styles.sectionHeader}>Hardware Settings</Text>
      <View style={styles.cardList}>
        {/* Resolution Item */}
        <RipplePressable onPress={() => {}} style={styles.rowItemBordered}>
          <View style={styles.rowContent}>
            <Text style={styles.rowTitle}>Camera Resolution</Text>
            <Text style={styles.rowSubtitle}>1080p (Full HD) at 30 fps</Text>
          </View>
          <CaretRight size={20} color="#64748B" />
        </RipplePressable>

        {/* Scan Target formats */}
        <RipplePressable onPress={() => {}} style={styles.rowItem}>
          <View style={styles.rowContent}>
            <Text style={styles.rowTitle}>Barcode Formats</Text>
            <Text style={styles.rowSubtitle}>Auto detect (All barcode types)</Text>
          </View>
          <CaretRight size={20} color="#64748B" />
        </RipplePressable>
      </View>

      {/* Section: System */}
      <Text style={styles.sectionHeader}>System</Text>
      <View style={styles.cardList}>
        {/* Replay Onboarding */}
        <RipplePressable onPress={onResetOnboarding} style={styles.systemRowBordered}>
          <Text style={styles.rowTitle}>Replay Onboarding</Text>
          <Text style={styles.rowSubtitle}>Review the initial setup steps</Text>
        </RipplePressable>

        {/* App Version Info */}
        <View style={styles.systemRow}>
          <Text style={styles.rowTitle}>Version Information</Text>
          <Text style={styles.rowSubtitle}>v1.0.0 (Latest Release)</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 24,
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
  systemRowBordered: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  systemRow: {
    padding: 16,
  },
});
