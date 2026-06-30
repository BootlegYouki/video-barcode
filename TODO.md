# Project TODOs & Next Steps

## High Priority

- [ ] **Rebuild App with Native modules**: Trigger the **Build Unsigned iOS Dev Client IPA** workflow via GitHub Actions to compile a new build containing the newly installed `expo-blur` and `expo-video` native libraries.
  - Once the new Dev Client IPA is built, sideload it onto your device.
  - This enables real background glassmorphism blur on the scanned barcode container and the video preview player inside the camera review phase.
