import React, { useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { RipplePressable } from '../components/RipplePressable';
import { MD3Button } from '../components/MD3Button';
import { Play, MagnifyingGlass, Camera, House, Clock, Gear } from 'phosphor-react-native';

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

export const MainScreenMock: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'settings'>('home');

  const renderItem = ({ item }: { item: BarcodeRecord }) => (
    <View className="bg-white border border-[#E8DEF8] rounded-2xl p-4 mb-3 mx-4 shadow-sm overflow-hidden">
      <RipplePressable onPress={() => {}} className="flex-row justify-between items-center">
        <View className="flex-1">
          <View className="flex-row items-center space-x-2 mb-1">
            <Text className="font-mono text-sm font-bold text-[#1D192B] bg-[#E8DEF8] px-2 py-0.5 rounded">
              {item.type}
            </Text>
            <Text className="font-sans text-xs text-[#49454F]">{item.timestamp}</Text>
          </View>
          <Text className="font-mono text-base font-medium text-[#6750A4] mb-1">{item.code}</Text>
          <Text className="font-sans text-xs text-slate-400">{item.fileName} • {item.duration}</Text>
        </View>
        <View className="w-10 h-10 bg-[#F3EDF7] rounded-full justify-center items-center">
          <Play size={20} color="#6750A4" weight="fill" />
        </View>
      </RipplePressable>
    </View>
  );

  return (
    <View className="flex-1 bg-[#FEF7FF]">
      {/* Search Header */}
      <View className="pt-14 pb-4 px-4 bg-white border-b border-[#E8DEF8]">
        <View className="h-12 bg-[#F3EDF7] rounded-full px-4 flex-row items-center space-x-3">
          <MagnifyingGlass size={20} color="#49454F" />
          <Text className="font-sans text-[#49454F] text-base flex-1">Search scan history...</Text>
          <View className="w-8 h-8 rounded-full bg-[#E8DEF8] justify-center items-center">
            <Text className="font-bold text-xs text-[#1D192B]">U</Text>
          </View>
        </View>
      </View>

      {/* Main Tab Screen Switcher */}
      {activeTab === 'home' ? (
        <View className="flex-1 pt-6">
          {/* Quick Stats Banner */}
          <View className="bg-[#E8DEF8] rounded-3xl p-6 mx-4 mb-6">
            <Text className="font-sans text-base font-bold text-[#1D192B] mb-1">Ready to scan & record</Text>
            <Text className="font-sans text-xs text-[#49454F] mb-4">You have 3 items recorded today. Keep tracking your barcode inventory.</Text>
            <View className="flex-row space-x-3">
              <MD3Button title="Scan Now" onPress={() => {}} variant="filled" className="flex-1" />
              <MD3Button title="View History" onPress={() => setActiveTab('history')} variant="tonal" className="flex-1" />
            </View>
          </View>

          {/* Quick List Header */}
          <View className="flex-row justify-between items-center px-6 mb-3">
            <Text className="font-sans text-sm font-bold text-[#1D192B]">Recent Scans</Text>
            <RipplePressable onPress={() => setActiveTab('history')}>
              <Text className="font-sans text-xs font-semibold text-[#6750A4]">See all</Text>
            </RipplePressable>
          </View>

          <FlatList
            data={MOCK_RECORDS.slice(0, 2)}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>
      ) : activeTab === 'history' ? (
        <FlatList
          data={MOCK_RECORDS}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 80 }}
        />
      ) : (
        <View className="flex-1 justify-center items-center px-6">
          <Text className="font-sans text-lg font-bold text-[#1D192B] mb-2">Settings</Text>
          <Text className="font-sans text-sm text-[#49454F] text-center mb-6">Configure barcode formats, local folders, and capture settings.</Text>
          <MD3Button title="Configure Camera" onPress={() => {}} variant="outlined" className="w-full mb-3" />
          <MD3Button title="Export Formats" onPress={() => {}} variant="outlined" className="w-full" />
        </View>
      )}

      {/* Floating Action Button (FAB) */}
      <View className="absolute bottom-24 right-6 overflow-hidden rounded-2xl shadow-lg bg-[#EADDFF]">
        <RipplePressable
          onPress={() => alert('Start scanning mode')}
          rippleColor="rgba(103, 80, 164, 0.2)"
          className="w-16 h-16 justify-center items-center"
        >
          <Camera size={26} color="#21005D" weight="bold" />
        </RipplePressable>
      </View>

      {/* Bottom MD3 Navigation Bar */}
      <View className="h-20 bg-white border-t border-[#E8DEF8] flex-row justify-around items-center pb-2">
        <RipplePressable
          onPress={() => setActiveTab('home')}
          className="items-center py-2 flex-1"
        >
          <View className={`px-5 py-1 rounded-full items-center justify-center mb-1 ${activeTab === 'home' ? 'bg-[#E8DEF8]' : ''}`}>
            <House size={22} color={activeTab === 'home' ? '#1C1B1F' : '#49454F'} weight={activeTab === 'home' ? 'fill' : 'regular'} />
          </View>
          <Text className={`font-sans text-xs ${activeTab === 'home' ? 'font-bold text-[#1C1B1F]' : 'text-[#49454F]'}`}>
            Home
          </Text>
        </RipplePressable>

        <RipplePressable
          onPress={() => setActiveTab('history')}
          className="items-center py-2 flex-1"
        >
          <View className={`px-5 py-1 rounded-full items-center justify-center mb-1 ${activeTab === 'history' ? 'bg-[#E8DEF8]' : ''}`}>
            <Clock size={22} color={activeTab === 'history' ? '#1C1B1F' : '#49454F'} weight={activeTab === 'history' ? 'fill' : 'regular'} />
          </View>
          <Text className={`font-sans text-xs ${activeTab === 'history' ? 'font-bold text-[#1C1B1F]' : 'text-[#49454F]'}`}>
            History
          </Text>
        </RipplePressable>

        <RipplePressable
          onPress={() => setActiveTab('settings')}
          className="items-center py-2 flex-1"
        >
          <View className={`px-5 py-1 rounded-full items-center justify-center mb-1 ${activeTab === 'settings' ? 'bg-[#E8DEF8]' : ''}`}>
            <Gear size={22} color={activeTab === 'settings' ? '#1C1B1F' : '#49454F'} weight={activeTab === 'settings' ? 'fill' : 'regular'} />
          </View>
          <Text className={`font-sans text-xs ${activeTab === 'settings' ? 'font-bold text-[#1C1B1F]' : 'text-[#49454F]'}`}>
            Settings
          </Text>
        </RipplePressable>
      </View>
    </View>
  );
};
