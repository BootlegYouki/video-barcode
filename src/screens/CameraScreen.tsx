import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { RipplePressable } from '../components/RipplePressable';
import { X, Check, ArrowCounterClockwise, Lightning } from 'phosphor-react-native';
import Animated, { ZoomIn, SlideInUp, useSharedValue, useAnimatedStyle, withTiming, interpolate } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useVideoPlayer, VideoView } from 'expo-video';

interface CameraScreenProps {
  onClose: () => void;
  onSaveSession: (barcode: string, videoUri: string, duration: string) => void;
  resolution: '720p' | '1080p';
}

export const CameraScreen: React.FC<CameraScreenProps> = ({ onClose, onSaveSession, resolution }) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = screenWidth > screenHeight;
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // Responsive viewfinder sizes
  const viewfinderWidth = Math.min(screenWidth * 0.75, 550);
  const viewfinderHeight = Math.min(screenHeight * 0.35, 220);
  const laserLineWidth = viewfinderWidth - 48;

  const [scanState, setScanState] = useState<'scanning' | 'scanned_confirm' | 'ready_to_record' | 'recording' | 'review' | 'saving'>('scanning');
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [recordedVideoUri, setRecordedVideoUri] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState<string | null>(null);
  const [recordTimer, setRecordTimer] = useState(0);
  const [flashOn, setFlashOn] = useState(false);

  const cameraRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timerValRef = useRef<number>(0);
  const recordingPromiseRef = useRef<Promise<any> | null>(null);

  // Handle recording timer
  useEffect(() => {
    if (scanState === 'recording') {
      timerValRef.current = 0;
      setRecordTimer(0);
      timerRef.current = setInterval(() => {
        timerValRef.current += 1;
        setRecordTimer(timerValRef.current);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setRecordTimer(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [scanState]);

  const isScanningRef = useRef(true);

  const player = useVideoPlayer(recordedVideoUri || '', (p) => {
    p.loop = true;
    p.play();
  });

  const innerButtonAnim = useSharedValue(0);

  useEffect(() => {
    if (scanState === 'recording') {
      innerButtonAnim.value = withTiming(1, { duration: 250 });
    } else {
      innerButtonAnim.value = withTiming(0, { duration: 250 });
    }
  }, [scanState]);

  const animatedInnerStyle = useAnimatedStyle(() => {
    const size = interpolate(innerButtonAnim.value, [0, 1], [62, 28]);
    const borderRadius = interpolate(innerButtonAnim.value, [0, 1], [31, 8]);
    
    return {
      width: size,
      height: size,
      borderRadius: borderRadius,
      backgroundColor: '#FF3B30',
    };
  });

  // Format timer seconds to mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Request permissions if not determined
  if (!cameraPermission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  if (!cameraPermission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Camera Permission Needed</Text>
        <Text style={styles.permissionSubtitle}>
          We need access to your camera to scan parcel barcodes and record packing videos.
        </Text>
        <RipplePressable
          onPress={async () => {
            await requestCameraPermission();
          }}
          style={styles.grantButton}
        >
          <Text style={styles.grantButtonText}>Grant Permission</Text>
        </RipplePressable>
        <RipplePressable onPress={onClose} style={styles.cancelPressable}>
          <Text style={styles.cancelText}>Cancel</Text>
        </RipplePressable>
      </View>
    );
  }

  // Handle barcode scanned callback
  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (!isScanningRef.current || scanState !== 'scanning') return;
    isScanningRef.current = false; // Lock scanning immediately
    setScannedBarcode(data);
    setScanState('scanned_confirm');
  };

  // Start recording manually after confirmation
  const handleStartRecording = async () => {
    if (!scannedBarcode) return;
    setScanState('recording');

    // Trigger video recording
    if (cameraRef.current) {
      try {
        const recordingPromise = cameraRef.current.recordAsync({
          maxDuration: 60,
          quality: resolution,
          mute: true,
        });
        recordingPromiseRef.current = recordingPromise;

        const video = await recordingPromise;
        if (video && video.uri) {
          const durationStr = `0:${timerValRef.current.toString().padStart(2, '0')}s`;
          setRecordedVideoUri(video.uri);
          setRecordedDuration(durationStr);
          setScanState('review');
        }
      } catch (error) {
        console.error('Failed to record video', error);
        isScanningRef.current = true; // Unlock if error occurs
        setScanState('scanning');
      }
    }
  };

  // Stop recording manually
  const handleStopRecording = () => {
    if (scanState === 'recording' && cameraRef.current) {
      setScanState('saving');
      cameraRef.current.stopRecording();
    }
  };

  // Calculate aspect ratio 9:16 bounding box to completely eliminate letterboxing
  const maxAvailableHeight = screenHeight - 130 - insets.top - insets.bottom;
  const maxAvailableWidth = screenWidth * 0.92;

  let previewVideoHeight = maxAvailableHeight;
  let previewVideoWidth = previewVideoHeight * (9 / 16);

  if (previewVideoWidth > maxAvailableWidth) {
    previewVideoWidth = maxAvailableWidth;
    previewVideoHeight = previewVideoWidth * (16 / 9);
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        mode="video"
        ref={cameraRef}
        enableTorch={flashOn}
        onBarcodeScanned={handleBarcodeScanned}
      />

      {/* If we are in review state, we cover the camera with a full-screen BlurView! */}
      {scanState === 'review' && (
        <BlurView
          intensity={65}
          tint="default"
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFillObject}
        />
      )}

      {scanState === 'review' ? (
        <View style={[
          StyleSheet.absoluteFillObject,
          {
            justifyContent: 'space-between',
            paddingBottom: Math.max(insets.bottom, 24),
            paddingTop: Math.max(insets.top, 12),
          }
        ]}>
          {/* Spacer to keep top padding clean */}
          <View style={{ height: 4 }} />

          {/* Massive Video Player */}
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
            <View style={{
              borderRadius: 16,
              overflow: 'hidden',
              elevation: 8,
              shadowColor: '#000000',
              shadowOpacity: 0.15,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 6 },
              backgroundColor: '#000000',
            }}>
              {recordedVideoUri ? (
                <VideoView
                  style={{
                    width: previewVideoWidth,
                    height: previewVideoHeight,
                    backgroundColor: '#000000',
                  }}
                  player={player}
                  allowsFullscreen={false}
                  allowsPictureInPicture={false}
                  nativeControls={true}
                />
              ) : (
                <ActivityIndicator size="large" color="#FFFFFF" style={{ padding: 40 }} />
              )}
            </View>
          </View>

          {/* Footer with RETAKE and SAVE buttons */}
          <View style={[styles.footer, { paddingHorizontal: 24, marginTop: 12, zIndex: 1 }]}>
            <Animated.View
              entering={SlideInUp.springify().damping(15).stiffness(120).mass(0.8)}
              style={styles.reviewActionsRowOnly}
            >
              <RipplePressable
                onPress={() => {
                  setRecordedVideoUri(null);
                  setRecordedDuration(null);
                  setScanState('ready_to_record'); // Go back to record mode
                }}
                style={styles.retakeBtnOnly}
              >
                <ArrowCounterClockwise size={26} color="#475569" weight="bold" />
              </RipplePressable>
              <RipplePressable
                onPress={() => {
                  if (scannedBarcode && recordedVideoUri && recordedDuration) {
                    setScanState('saving');
                    onSaveSession(scannedBarcode, recordedVideoUri, recordedDuration);
                  }
                }}
                style={styles.saveBtnOnly}
              >
                <Check size={30} color="#FFFFFF" weight="bold" />
              </RipplePressable>
            </Animated.View>
          </View>
        </View>
      ) : (
        <View style={[StyleSheet.absoluteFillObject, styles.overlay]}>
          {/* Header row */}
          <View style={[styles.header, isLandscape && styles.headerLandscape]}>
            {/* Left: Close button */}
            <View style={styles.headerColumnLeft}>
              <RipplePressable
                onPress={onClose}
                disabled={scanState === 'saving'}
                style={styles.closeBtn}
              >
                <X size={26} color="#FFFFFF" weight="bold" />
              </RipplePressable>
            </View>

            {/* Center: Timer badge */}
            <View style={styles.headerColumnCenter}>
              {(scanState === 'recording' || scanState === 'ready_to_record') && (
                <View style={styles.timerBadge}>
                  <Text style={styles.timerText}>{formatTime(recordTimer)}</Text>
                </View>
              )}
            </View>

            {/* Right: Flash button */}
            <View style={styles.headerColumnRight}>
              {scanState !== 'saving' && (
                <RipplePressable
                  onPress={() => setFlashOn(prev => !prev)}
                  style={styles.flashBtn}
                >
                  <Lightning
                    size={24}
                    color={flashOn ? '#FFD60A' : '#FFFFFF'}
                    weight={flashOn ? 'fill' : 'bold'}
                  />
                </RipplePressable>
              )}
            </View>
          </View>

        {/* Viewfinder Target (Only show during scanning) */}
        {scanState === 'scanning' || scanState === 'scanned_confirm' ? (
          <View style={styles.targetContainer}>
            <View style={[styles.viewfinderContainer, { width: viewfinderWidth, height: viewfinderHeight }]}>
              {/* Custom Corner Brackets */}
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              {/* Center laser scanning line */}
              {scanState === 'scanning' && (
                <View style={[styles.laserLine, { width: laserLineWidth }]} />
              )}
            </View>
            <Text style={[styles.instructionText, scanState === 'scanned_confirm' && { opacity: 0 }]}>
              Align barcode within target frame
            </Text>
          </View>
        ) : scanState === 'recording' || scanState === 'ready_to_record' ? (
          null
        ) : (
          <View style={styles.targetContainer}>
            <View style={styles.savingCard}>
              <ActivityIndicator size="large" color="#FFFFFF" style={{ marginBottom: 16 }} />
              <Text style={styles.savingText}>Saving video session...</Text>
            </View>
          </View>
        )}

        {/* Footer Action Buttons */}
        <View style={styles.footer}>
          {scanState === 'recording' || scanState === 'ready_to_record' ? (
            <RipplePressable
              onPress={scanState === 'recording' ? handleStopRecording : handleStartRecording}
              style={styles.iosRecordOuter}
            >
              <Animated.View style={animatedInnerStyle} />
            </RipplePressable>
          ) : (
            <View style={{ height: 76 }} />
          )}
        </View>

        {/* Floating Confirm Card */}
        {scanState === 'scanned_confirm' && (
          <Animated.View
            entering={ZoomIn.springify().damping(15).stiffness(120).mass(0.8)}
            style={styles.confirmCardCompressed}
          >
            <BlurView
              intensity={50}
              tint="default"
              experimentalBlurMethod="dimezisBlurView"
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.confirmTextRowStacked}>
              <Text style={styles.confirmBarcodeLabel}>SCANNED VALUE</Text>
              <Text style={styles.confirmBarcodeTextStacked} numberOfLines={1} ellipsizeMode="tail">
                {scannedBarcode}
              </Text>
            </View>
            <View style={styles.confirmActionsRowStacked}>
              <RipplePressable
                onPress={() => {
                  isScanningRef.current = true; // Unlock scanning
                  setScannedBarcode(null);
                  setScanState('scanning');
                }}
                style={styles.rescanBtnCompressed}
              >
                <Text style={styles.rescanBtnTextCompressed}>RESCAN</Text>
              </RipplePressable>
              <RipplePressable
                onPress={() => setScanState('ready_to_record')}
                style={styles.startRecBtnCompressed}
              >
                <Text style={styles.startRecBtnTextCompressed}>START</Text>
              </RipplePressable>
            </View>
          </Animated.View>
        )}
      </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionTitle: {
    fontFamily: 'sans-serif-medium',
    fontSize: 24,
    fontWeight: '500',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 16,
  },
  permissionSubtitle: {
    fontFamily: 'sans-serif',
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  grantButton: {
    width: '100%',
    maxWidth: 320,
    height: 50,
    backgroundColor: '#000000',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grantButtonText: {
    fontFamily: 'sans-serif-medium',
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  cancelPressable: {
    marginTop: 16,
    paddingVertical: 8,
  },
  cancelText: {
    fontFamily: 'sans-serif',
    fontSize: 14,
    color: '#000000',
    textDecorationLine: 'underline',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 32,
  },
  headerLandscape: {
    paddingTop: 12,
  },
  headerColumnLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerColumnCenter: {
    flex: 2,
    alignItems: 'center',
  },
  headerColumnRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  closeBtn: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashBtn: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  timerText: {
    fontFamily: 'monospace',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  targetContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinderContainer: {
    width: 256,
    height: 180,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#FFFFFF',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 12,
  },
  laserLine: {
    width: 208,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  instructionText: {
    fontFamily: 'sans-serif',
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  confirmCardCompressed: {
    position: 'absolute',
    bottom: 200,
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    width: '100%',
    maxWidth: 340,
    alignSelf: 'center',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  confirmTextRowStacked: {
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmBarcodeLabel: {
    fontFamily: 'sans-serif-medium',
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  confirmBarcodeTextStacked: {
    fontFamily: 'monospace',
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  confirmActionsRowStacked: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  startRecBtnCompressed: {
    flex: 1,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  startRecBtnTextCompressed: {
    fontFamily: 'sans-serif-medium',
    fontSize: 13,
    color: '#000000',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  rescanBtnCompressed: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  rescanBtnTextCompressed: {
    fontFamily: 'sans-serif-medium',
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  recordButton: {
    width: '100%',
    maxWidth: 320,
    height: 56,
    backgroundColor: '#FF3B30',
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  recordButtonText: {
    fontFamily: 'sans-serif-medium',
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  recordCircle: {
    width: 14,
    height: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 7,
    marginRight: 10,
  },
  iosRecordOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    alignSelf: 'center',
  },
  iosRecordInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FF3B30',
  },
  reviewDurationText: {
    fontFamily: 'sans-serif',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 6,
  },
  reviewActionsRowOnly: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
  },
  saveBtnOnly: {
    width: 64,
    height: 64,
    backgroundColor: '#0F172A',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
  },
  retakeBtnOnly: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
  },
  reviewTopHeaderBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 90,
  },
  reviewTopHeaderBtnText: {
    fontFamily: 'sans-serif-medium',
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  reviewTopHeaderBtnPrimary: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  reviewTopHeaderBtnTextPrimary: {
    fontFamily: 'sans-serif-medium',
    fontSize: 14,
    color: '#000000',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  recordingCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    elevation: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  recordingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  activeRecDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#000000',
    marginRight: 6,
  },
  recLabel: {
    fontFamily: 'sans-serif-medium',
    fontSize: 11,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: 1,
  },
  barcodeLabel: {
    fontFamily: 'sans-serif-medium',
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  barcodeText: {
    fontFamily: 'monospace',
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  recordingInfo: {
    fontFamily: 'sans-serif',
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  savingCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 28,
    paddingVertical: 24,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  savingText: {
    fontFamily: 'sans-serif',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  stopButton: {
    width: '100%',
    maxWidth: 320,
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  stopSquare: {
    width: 14,
    height: 14,
    backgroundColor: '#000000',
    borderRadius: 2,
    marginRight: 10,
  },
  stopButtonText: {
    fontFamily: 'sans-serif-medium',
    fontSize: 16,
    color: '#000000',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
