import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { MD3Button } from '../components/MD3Button';
import { RipplePressable } from '../components/RipplePressable';
import { QrCode, VideoCamera, FloppyDisk } from 'phosphor-react-native';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollOffset / SCREEN_WIDTH);
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const handleNext = () => {
    if (activeIndex < 2) {
      scrollViewRef.current?.scrollTo({
        x: (activeIndex + 1) * SCREEN_WIDTH,
        animated: true,
      });
      setActiveIndex(activeIndex + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <View className="flex-1 bg-[#FEF7FF] justify-between">
      {/* Top Header */}
      <View className="pt-14 pb-4 px-6 flex-row justify-between items-center">
        <Text className="font-sans text-xs font-bold tracking-widest text-[#6750A4] uppercase">
          Video Barcode
        </Text>
        {activeIndex < 2 && (
          <RipplePressable onPress={handleSkip} className="px-3 py-1 rounded-full">
            <Text className="font-sans text-sm font-semibold text-[#6750A4]">Skip</Text>
          </RipplePressable>
        )}
      </View>

      {/* Slide Content Pager */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        className="flex-1"
      >
        {/* Step 1: Scan */}
        <View style={{ width: SCREEN_WIDTH }} className="px-6 justify-center items-center">
          {/* Card Mockup */}
          <View className="w-full max-w-sm aspect-square bg-[#F3EDF7] rounded-3xl p-6 items-center justify-center border border-[#E8DEF8] shadow-sm mb-8">
            <View className="w-32 h-32 rounded-full bg-[#E8DEF8] justify-center items-center">
              <QrCode size={64} color="#6750A4" weight="bold" />
            </View>
          </View>
          <Text className="font-sans text-2xl font-bold text-[#1D192B] text-center mb-3">
            Scan Barcodes
          </Text>
          <Text className="font-sans text-sm text-[#49454F] text-center max-w-xs leading-relaxed">
            Position any barcode inside the scanner frame to auto-detect and read the code in real-time.
          </Text>
        </View>

        {/* Step 2: Record */}
        <View style={{ width: SCREEN_WIDTH }} className="px-6 justify-center items-center">
          {/* Card Mockup */}
          <View className="w-full max-w-sm aspect-square bg-[#F3EDF7] rounded-3xl p-6 items-center justify-center border border-[#E8DEF8] shadow-sm mb-8">
            <View className="w-32 h-32 rounded-full bg-[#EADDFF] justify-center items-center">
              <VideoCamera size={64} color="#21005D" weight="bold" />
            </View>
          </View>
          <Text className="font-sans text-2xl font-bold text-[#1D192B] text-center mb-3">
            Record Videos
          </Text>
          <Text className="font-sans text-sm text-[#49454F] text-center max-w-xs leading-relaxed">
            Capture videos while detecting barcodes dynamically to keep timestamped visual logs of all scans.
          </Text>
        </View>

        {/* Step 3: Save */}
        <View style={{ width: SCREEN_WIDTH }} className="px-6 justify-center items-center">
          {/* Card Mockup */}
          <View className="w-full max-w-sm aspect-square bg-[#F3EDF7] rounded-3xl p-6 items-center justify-center border border-[#E8DEF8] shadow-sm mb-8">
            <View className="w-32 h-32 rounded-full bg-[#E8F5E9] justify-center items-center">
              <FloppyDisk size={64} color="#388E3C" weight="bold" />
            </View>
          </View>
          <Text className="font-sans text-2xl font-bold text-[#1D192B] text-center mb-3">
            Save & Export
          </Text>
          <Text className="font-sans text-sm text-[#49454F] text-center max-w-xs leading-relaxed">
            Export scans, metadata logs, and cropped video sessions to local storage or share them instantly.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom controls */}
      <View className="pb-12 pt-4 px-6 flex-row justify-between items-center">
        {/* Dot Indicators */}
        <View className="flex-row space-x-2">
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              className={`h-2.5 rounded-full transition-all duration-200 ${
                activeIndex === i ? 'w-6 bg-[#6750A4]' : 'w-2.5 bg-[#E8DEF8]'
              }`}
            />
          ))}
        </View>

        {/* Action Button */}
        <MD3Button
          title={activeIndex === 2 ? 'Get Started' : 'Next'}
          onPress={handleNext}
          variant="filled"
        />
      </View>
    </View>
  );
};
