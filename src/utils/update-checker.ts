import { Alert, Linking, Platform } from 'react-native';
import appJson from '../../app.json';

const REPO_OWNER = 'BootlegYouki';
const REPO_NAME = 'video-barcode';
const CURRENT_VERSION = appJson.expo.version || '1.0.0';

export function isNewerVersion(current: string, latest: string): boolean {
  const cParts = current.replace(/^v/, '').split('.').map(Number);
  const lParts = latest.replace(/^v/, '').split('.').map(Number);
  
  for (let i = 0; i < Math.max(cParts.length, lParts.length); i++) {
    const cVal = cParts[i] || 0;
    const lVal = lParts[i] || 0;
    if (lVal > cVal) return true;
    if (cVal > lVal) return false;
  }
  return false;
}

export async function checkForUpdates(manual: boolean = false) {
  if (Platform.OS !== 'android') {
    if (manual) {
      Alert.alert('Not Supported', 'Auto-updates are only supported on Android devices.');
    }
    return;
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Video-Barcode-App'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API returned status ${response.status}`);
    }

    const releases = await response.json();
    if (!Array.isArray(releases) || releases.length === 0) {
      if (manual) {
        Alert.alert('No Updates', 'No releases found on GitHub.');
      }
      return;
    }

    // Find the latest release with a tag ending with -android
    const androidRelease = releases.find(r => r.tag_name && r.tag_name.endsWith('-android'));
    if (!androidRelease) {
      if (manual) {
        Alert.alert('No Updates', 'No Android releases found.');
      }
      return;
    }

    // Tag name e.g. v1.0.12-android
    const latestVersion = androidRelease.tag_name.replace('-android', ''); // -> v1.0.12 or 1.0.12
    const cleanLatest = latestVersion.replace(/^v/, ''); // -> 1.0.12

    if (isNewerVersion(CURRENT_VERSION, cleanLatest)) {
      // Find the APK asset
      const apkAsset = androidRelease.assets?.find((a: any) => a.name && a.name.endsWith('.apk'));
      const downloadUrl = apkAsset ? apkAsset.browser_download_url : androidRelease.html_url;

      Alert.alert(
        'Update Available',
        `A new version (${latestVersion}) is available. Would you like to download and install it?`,
        [
          { text: 'Later', style: 'cancel' },
          { 
            text: 'Update Now', 
            onPress: () => {
              Linking.openURL(downloadUrl).catch(err => {
                Alert.alert('Error', 'Failed to open download link.');
              });
            }
          }
        ]
      );
    } else {
      if (manual) {
        Alert.alert('Up to Date', `Marigold is already running the latest version (${CURRENT_VERSION}).`);
      }
    }
  } catch (error: any) {
    console.error('Failed to check for updates:', error);
    if (manual) {
      Alert.alert('Check Failed', 'Unable to check for updates at this time. Please check your network connection.');
    }
  }
}
