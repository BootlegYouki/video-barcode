import React, { useRef, useState, useEffect } from 'react';
import { View, Text, ScrollView, Dimensions, NativeSyntheticEvent, NativeScrollEvent, StyleSheet, Platform, Alert } from 'react-native';
import { MD3Button } from '../components/MD3Button';
import { Barcode, VideoCamera, FloppyDisk, GoogleDriveLogo, Package, Folder } from 'phosphor-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { Storage } from '../utils/storage';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [folderUri, setFolderUri] = useState<string | null>(null);

  useEffect(() => {
    const loadFolder = async () => {
      if (Platform.OS === 'android') {
        const storedUri = await Storage.getPublicDirectoryUri();
        setFolderUri(storedUri);
      }
    };
    loadFolder();
  }, []);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollOffset / SCREEN_WIDTH);
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const handleNext = () => {
    if (activeIndex < slides.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: (activeIndex + 1) * SCREEN_WIDTH,
        animated: true,
      });
      setActiveIndex(activeIndex + 1);
    } else {
      onComplete();
    }
  };

  const handleSelectFolder = async () => {
    try {
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (permissions.granted) {
        await Storage.savePublicDirectoryUri(permissions.directoryUri);
        setFolderUri(permissions.directoryUri);
        Alert.alert('Folder Connected', 'Videos will now be exported to the selected folder and will be accessible in your Android Files manager.');
      }
    } catch (err) {
      console.error('Failed to select public folder', err);
      Alert.alert('Selection Failed', 'Failed to request folder permissions.');
    }
  };

  const getReadablePath = (uri: string) => {
    try {
      const decoded = decodeURIComponent(uri);
      if (decoded.includes('primary:')) {
        const parts = decoded.split('primary:');
        if (parts.length > 1) {
          const folderPath = parts[1].replace(/\//g, ' > ');
          return `Internal Storage > ${folderPath}`;
        }
      }
      const lastSlash = decoded.lastIndexOf('/');
      if (lastSlash !== -1) {
        const folderName = decoded.substring(lastSlash + 1).replace(/:/g, ' > ').replace(/\//g, ' > ');
        return folderName || 'Connected Folder';
      }
      return 'Connected Folder';
    } catch (err) {
      return 'Connected Folder';
    }
  };

  const slides = [
    {
      key: 'welcome',
      icon: <Package size={136} color="#000000" weight="bold" />,
      title: 'Welcome',
      desc: 'Verify and track your parcels seamlessly with automated video recording and barcode logging.',
    },
    {
      key: 'scan',
      icon: <Barcode size={136} color="#000000" weight="bold" />,
      title: 'Scan Parcel',
      desc: 'Scan the barcode of the parcel to identify and register it in the system.',
    },
    {
      key: 'record',
      icon: <VideoCamera size={136} color="#000000" weight="bold" />,
      title: 'Record Video',
      desc: 'Once the barcode is scanned, the app automatically starts recording the handling process.',
    },
    {
      key: 'save',
      icon: <FloppyDisk size={136} color="#000000" weight="bold" />,
      title: 'Save Video',
      desc: 'After the recording is stopped, the video is saved and linked directly to the parcel\'s barcode.',
    },
    {
      key: 'cloud',
      icon: <GoogleDriveLogo size={136} color="#000000" weight="bold" />,
      title: 'Cloud Sync',
      desc: 'Optionally connect your account to automatically upload and back up parcel videos to Google Drive.',
    },
    ...(Platform.OS === 'android' ? [{
      key: 'folder',
      icon: <Folder size={136} color="#000000" weight="bold" />,
      title: 'Choose Export Folder',
      desc: 'Choose a folder in your Files app to export and access your video recordings.',
      isFolderSetup: true,
    }] : []),
  ];

  const isFolderSlide = slides[activeIndex]?.isFolderSetup;

  let buttonTitle = 'Next';
  let buttonPress = handleNext;

  if (isFolderSlide) {
    if (!folderUri) {
      buttonTitle = 'Connect Folder';
      buttonPress = handleSelectFolder;
    } else {
      buttonTitle = 'Get Started';
      buttonPress = onComplete;
    }
  } else if (activeIndex === slides.length - 1) {
    buttonTitle = 'Get Started';
    buttonPress = onComplete;
  }

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
        {slides.map((slide) => (
          <View key={slide.key} style={{ width: SCREEN_WIDTH, ...styles.slide }}>
            <View style={styles.iconContainer}>
              {slide.icon}
            </View>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.description}>{slide.desc}</Text>
            
            {slide.isFolderSetup && folderUri && (
              <View style={styles.folderSetupContainer}>
                <Text style={styles.connectedText} numberOfLines={1} ellipsizeMode="middle">
                  Connected: {getReadablePath(folderUri)}
                </Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Progress Dots */}
      <View style={styles.dotsContainer}>
        {slides.map((_, i) => (
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
          title={buttonTitle}
          onPress={buttonPress}
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
    marginBottom: 12,
  },
  folderSetupContainer: {
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
    marginTop: 16,
  },
  connectedBox: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  connectedText: {
    fontFamily: 'sans-serif',
    fontSize: 14,
    color: '#1E293B',
    textAlign: 'center',
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
