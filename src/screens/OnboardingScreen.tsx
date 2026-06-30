import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, Dimensions, NativeSyntheticEvent, NativeScrollEvent, StyleSheet } from 'react-native';
import { MD3Button } from '../components/MD3Button';
import { Barcode, VideoCamera, FloppyDisk, GoogleDriveLogo, Package } from 'phosphor-react-native';

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
    if (activeIndex < 4) {
      scrollViewRef.current?.scrollTo({
        x: (activeIndex + 1) * SCREEN_WIDTH,
        animated: true,
      });
      setActiveIndex(activeIndex + 1);
    } else {
      onComplete();
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>VIDEO BARCODE</Text>
      </View>

      {/* Slide Content Pager */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.pager}
      >
        {/* Step 1: Welcome */}
        <View style={{ width: SCREEN_WIDTH, ...styles.slide }}>
          <View style={styles.iconContainer}>
            <Package size={136} color="#000000" weight="bold" />
          </View>
          <Text style={styles.title}>Welcome</Text>
          <Text style={styles.description}>
            Verify and track your parcels seamlessly with automated video recording and barcode logging.
          </Text>
        </View>

        {/* Step 2: Scan */}
        <View style={{ width: SCREEN_WIDTH, ...styles.slide }}>
          <View style={styles.iconContainer}>
            <Barcode size={136} color="#000000" weight="bold" />
          </View>
          <Text style={styles.title}>Scan Parcel</Text>
          <Text style={styles.description}>
            Scan the barcode of the parcel to identify and register it in the system.
          </Text>
        </View>

        {/* Step 3: Record */}
        <View style={{ width: SCREEN_WIDTH, ...styles.slide }}>
          <View style={styles.iconContainer}>
            <VideoCamera size={136} color="#000000" weight="bold" />
          </View>
          <Text style={styles.title}>Record Video</Text>
          <Text style={styles.description}>
            Once the barcode is scanned, the app automatically starts recording the handling process.
          </Text>
        </View>

        {/* Step 4: Save */}
        <View style={{ width: SCREEN_WIDTH, ...styles.slide }}>
          <View style={styles.iconContainer}>
            <FloppyDisk size={136} color="#000000" weight="bold" />
          </View>
          <Text style={styles.title}>Save Video</Text>
          <Text style={styles.description}>
            After the recording is stopped, the video is saved and linked directly to the parcel's barcode.
          </Text>
        </View>

        {/* Step 5: Google Drive Sync */}
        <View style={{ width: SCREEN_WIDTH, ...styles.slide }}>
          <View style={styles.iconContainer}>
            <GoogleDriveLogo size={136} color="#000000" weight="bold" />
          </View>
          <Text style={styles.title}>Cloud Sync</Text>
          <Text style={styles.description}>
            Optionally connect your account to automatically upload and back up parcel videos to Google Drive.
          </Text>
        </View>
      </ScrollView>

      {/* Progress Dots */}
      <View style={styles.dotsContainer}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: activeIndex === i ? '#000000' : '#E2E8F0' }
            ]}
          />
        ))}
      </View>

      {/* Action Button */}
      <View style={styles.footer}>
        <MD3Button
          title={activeIndex === 4 ? 'Get Started' : 'Next'}
          onPress={handleNext}
          variant="filled"
          size="large"
          style={styles.button}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
  },
  header: {
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    fontFamily: 'sans-serif-medium',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 1,
    color: '#000000',
  },
  pager: {
    flex: 1,
  },
  slide: {
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    height: 192,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'sans-serif-medium',
    fontSize: 36,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontFamily: 'sans-serif',
    fontSize: 18,
    color: '#475569',
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 26,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 24,
  },
  dot: {
    height: 10,
    width: 10,
    marginHorizontal: 8,
    borderRadius: 5,
  },
  footer: {
    paddingBottom: 56,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  button: {
    width: '100%',
    maxWidth: 320,
  },
});
