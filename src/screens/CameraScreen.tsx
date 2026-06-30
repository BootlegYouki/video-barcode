import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { RipplePressable } from '../components/RipplePressable';
import { X, Check } from 'phosphor-react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useVideoPlayer, VideoView } from 'expo-video';

interface CameraScreenProps {
  onClose: () => void;
  onSaveSession: (barcode: string, videoUri: string, duration: string) => void;
}

export const CameraScreen: React.FC<CameraScreenProps> = ({ onClose, onSaveSession }) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isLandscape = screenWidth > screenHeight;
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();

  // Responsive viewfinder sizes
  const viewfinderWidth = Math.min(screenWidth * 0.75, 550);
  const viewfinderHeight = Math.min(screenHeight * 0.35, 220);
  const laserLineWidth = viewfinderWidth - 48;

  const [scanState, setScanState] = useState<'scanning' | 'scanned_confirm' | 'ready_to_record' | 'recording' | 'review' | 'saving'>('scanning');
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [recordedVideoUri, setRecordedVideoUri] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState<string | null>(null);
  const [recordTimer, setRecordTimer] = useState(0);

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

  // Format timer seconds to mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Request permissions if not determined
  if (!cameraPermission || !microphonePermission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  if (!cameraPermission.granted || !microphonePermission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Permissions Needed</Text>
        <Text style={styles.permissionSubtitle}>
          We need access to your camera and microphone to scan parcel barcodes and record packing videos.
        </Text>
        <RipplePressable
          onPress={async () => {
            await requestCameraPermission();
            await requestMicrophonePermission();
          }}
          style={styles.grantButton}
        >
          <Text style={styles.grantButtonText}>Grant Permissions</Text>
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
          quality: '720p',
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

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        mode="video"
        ref={cameraRef}
        onBarcodeScanned={handleBarcodeScanned}
      />
      {/* Transparent UI Overlay */}
      <View style={[StyleSheet.absoluteFillObject, styles.overlay]}>
        {/* Header row */}
        <View style={[styles.header, isLandscape && styles.headerLandscape]}>
          <RipplePressable
            onPress={onClose}
            disabled={scanState === 'saving'}
            style={styles.closeBtn}
          >
            <X size={20} color="#FFFFFF" weight="bold" />
          </RipplePressable>
          {scanState === 'recording' && (
            <View style={styles.timerBadge}>
              <View style={styles.blinkDot} />
              <Text style={styles.timerText}>{formatTime(recordTimer)}</Text>
            </View>
          )}
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
        ) : scanState === 'review' ? (
          <View style={styles.targetContainer}>
            {recordedVideoUri ? (
              <VideoView
                style={{ width: viewfinderWidth, height: viewfinderHeight, borderRadius: 12, overflow: 'hidden' }}
                player={player}
                allowsFullscreen={false}
                allowsPictureInPicture={false}
                nativeControls={true}
              />
            ) : (
              <ActivityIndicator size="large" color="#FFFFFF" />
            )}
          </View>
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
          {scanState === 'recording' ? (
            <RipplePressable
              onPress={handleStopRecording}
              rippleColor="rgba(0, 0, 0, 0.15)"
              style={styles.stopButton}
            >
              <View style={styles.stopSquare} />
              <Text style={styles.stopButtonText}>STOP RECORDING</Text>
            </RipplePressable>
          ) : scanState === 'ready_to_record' ? (
            <RipplePressable
              onPress={handleStartRecording}
              style={styles.recordButton}
            >
              <View style={styles.recordCircle} />
              <Text style={styles.recordButtonText}>RECORD</Text>
            </RipplePressable>
          ) : scanState === 'review' ? (
            <Animated.View
              entering={ZoomIn.springify().damping(15).stiffness(120).mass(0.8)}
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
                <Text style={styles.retakeBtnTextOnly}>RETAKE</Text>
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
                <Text style={styles.saveBtnTextOnly}>SAVE</Text>
              </RipplePressable>
            </Animated.View>
          ) : (
            <View style={{ height: 56 }} />
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
              tint="dark"
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
  blinkDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    marginRight: 8,
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
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
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
    fontSize: 22,
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
  reviewDurationText: {
    fontFamily: 'sans-serif',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 6,
  },
  reviewActionsRowOnly: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
  },
  saveBtnOnly: {
    flex: 1,
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    elevation: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  saveBtnTextOnly: {
    fontFamily: 'sans-serif-medium',
    fontSize: 16,
    color: '#000000',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  retakeBtnOnly: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    elevation: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  retakeBtnTextOnly: {
    fontFamily: 'sans-serif-medium',
    fontSize: 16,
    color: '#FFFFFF',
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
