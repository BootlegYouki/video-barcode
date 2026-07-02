import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Google Drive Scopes
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
];

// Configure Google Signin
// Developers will specify their webClientId in configuration. 
// If not configured, we'll try to use a default or prompt.
try {
  GoogleSignin.configure({
    scopes: SCOPES,
    webClientId: process.env.EXPO_PUBLIC_WEB_CLIENT,
    iosClientId: process.env.EXPO_PUBLIC_IOS_CLIENT,
    offlineAccess: true,
  });
} catch (e) {
  console.warn('GoogleSignin configure failed', e);
}

export const GoogleDriveService = {
  signIn: async (): Promise<boolean> => {
    try {
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signIn();
      return true;
    } catch (error) {
      console.error('Google Sign-in Error:', error);
      return false;
    }
  },

  signOut: async (): Promise<void> => {
    try {
      await GoogleSignin.signOut();
    } catch (error) {
      console.error('Google Sign-out Error:', error);
    }
  },

  getAccessToken: async (): Promise<string | null> => {
    try {
      // Check if signed in
      const currentUser = GoogleSignin.getCurrentUser();
      const hasPrevious = GoogleSignin.hasPreviousSignIn();
      if (!currentUser && !hasPrevious) {
        return null;
      }
      const tokens = await GoogleSignin.getTokens();
      return tokens.accessToken;
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  },

  /**
   * Step 2: Google Drive Handshake (The Setup)
   * Initiates a resumable upload session on Google Drive.
   * Returns the unique resumable location URI.
   */
  createResumableSession: async (
    accessToken: string,
    fileName: string,
    fileSize: number
  ): Promise<string> => {
    const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': 'video/mp4',
        'X-Upload-Content-Length': fileSize.toString(),
      },
      body: JSON.stringify({
        name: fileName,
        mimeType: 'video/mp4',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to initiate resumable session: ${response.status} ${errText}`);
    }

    const locationUri = response.headers.get('Location');
    if (!locationUri) {
      throw new Error('Google Drive API did not return Location header for resumable upload');
    }

    return locationUri;
  },

  /**
   * Fetches the user's Google Drive storage quota info.
   */
  getStorageQuota: async (accessToken: string): Promise<{ used: number; total: number } | null> => {
    try {
      const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) return null;
      const data = await response.json();
      if (data.storageQuota) {
        return {
          used: parseInt(data.storageQuota.usage, 10) || 0,
          total: parseInt(data.storageQuota.limit, 10) || 15 * 1024 * 1024 * 1024, // Fallback to 15GB
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch Google Drive storage quota:', error);
      return null;
    }
  },
};
