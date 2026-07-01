# Project TODOs & Next Steps

## High Priority

- [x] **Rebuild App with Native modules**: Trigger the **Build Unsigned iOS Dev Client IPA** workflow via GitHub Actions to compile a new build containing the newly installed `expo-blur` and `expo-video` native libraries.
  - Once the new Dev Client IPA is built, sideload it onto your device.
  - This enables real background glassmorphism blur on the scanned barcode container and the video preview player inside the camera review phase.

## Future Backlog

- [x] **Bake Timestamp into Recorded Video (FFmpeg)**: Install `ffmpeg-kit-react-native` and post-process the recorded `.mp4` video after recording stops. Use FFmpeg's `drawtext` video filter to overlay the session date and time directly onto the video frames (pixels) so the timestamp is permanently burned into the exported file.
