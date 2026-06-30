# Project TODOs & Next Steps

## High Priority

- [ ] **Rebuild App with Native Blur**: Recompile the application bundle to enable support for `expo-blur` in the barcode scan confirmation container.
  - Run `npm run ios` or `npm run android` depending on your active platform/device.
  - Once the native app is rebuilt, you can restore `BlurView` from `expo-blur` in `CameraScreen.tsx` for real glassmorphism blur.
