# Project TODOs & Next Steps

## High Priority

- [ ] **Rebuild App with Native Blur**: Trigger the **Build Unsigned iOS Dev Client IPA** workflow via GitHub Actions to compile a new build containing `expo-blur`.
  - Once the new Dev Client IPA is built, sideload it onto your device.
  - You can then restore `BlurView` in `CameraScreen.tsx` for real glassmorphic blur instead of the fallback translucent styling.
