import * as FileSystem from 'expo-file-system/legacy';
import { FileSystemUploadType, FileSystemSessionType } from 'expo-file-system/legacy';
import { UploadQueue, QueueItem } from './uploadQueue';
import { GoogleDriveService } from './googleDrive';
import { Storage } from './storage';

let isWatcherRunning = false;

export const UploadService = {
  /**
   * Triggers the upload watcher.
   * Grabs the oldest pending file and starts the background transfer.
   */
  triggerUpload: async () => {
    if (isWatcherRunning) {
      console.log('[UploadService] Watcher is already running.');
      return;
    }

    isWatcherRunning = true;

    try {
      // 1. Get the next pending video from MMKV queue
      const nextItem = UploadQueue.getNextPending();
      if (!nextItem) {
        console.log('[UploadService] No pending uploads in the queue.');
        isWatcherRunning = false;
        return;
      }

      // 2. Check if Google Drive is connected
      const isDriveConnected = await Storage.getDriveConnected();
      if (!isDriveConnected) {
        console.log('[UploadService] Google Drive is not connected. Skipping.');
        isWatcherRunning = false;
        return;
      }

      // 3. Retrieve Google access token
      const accessToken = await GoogleDriveService.getAccessToken();
      if (!accessToken) {
        console.log('[UploadService] No Google access token available. Skipping.');
        isWatcherRunning = false;
        return;
      }

      // 4. Start the transfer process
      await UploadService.processUpload(nextItem, accessToken);
    } catch (err) {
      console.error('[UploadService] Watcher error:', err);
    } finally {
      isWatcherRunning = false;
    }
  },

  /**
   * Processes a single queue item upload.
   */
  processUpload: async (item: QueueItem, accessToken: string) => {
    console.log(`[UploadService] Initiating upload for: ${item.fileName}`);

    try {
      // Step 2: Resumable Handshake (Setup)
      const resumableUrl = await GoogleDriveService.createResumableSession(
        accessToken,
        item.fileName,
        item.size
      );

      console.log('[UploadService] Resumable session created. Location:', resumableUrl);

      // Step 3: Queue Lock
      // Immediately before handoff, lock the queue status to "uploading"
      UploadQueue.updateStatus(item.id, 'uploading');

      // Step 3: OS Handoff & Transfer
      const uploadTask = FileSystem.createUploadTask(
        resumableUrl,
        item.videoUri,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'video/mp4',
          },
          httpMethod: 'PUT',
          uploadType: FileSystemUploadType.BINARY_CONTENT,
          sessionType: FileSystemSessionType.BACKGROUND, // Runs in background even when app is closed/suspended
        },
        (progress) => {
          const sent = progress.totalBytesSent;
          const total = progress.totalBytesExpectedToSend;
          const percentage = total > 0 ? Math.round((sent / total) * 100) : 0;
          console.log(`[UploadService] Progress for ${item.fileName}: ${percentage}% (${sent}/${total})`);
        }
      );

      // Start the transfer
      const result = await uploadTask.uploadAsync();

      // Step 4: Resolution (Closing the loop)
      if (result && (result.status === 200 || result.status === 201)) {
        console.log(`[UploadService] Upload completed successfully for: ${item.fileName}`);
        UploadQueue.updateStatus(item.id, 'cloud_synced');
        
        // Loop: Trigger next pending item in the queue
        setTimeout(() => {
          UploadService.triggerUpload();
        }, 1000);
      } else {
        const status = result ? result.status : 'unknown';
        const body = result ? result.body : '';
        console.warn(`[UploadService] Upload failed for ${item.fileName} with status ${status}: ${body}`);
        UploadService.handleFailure(item.id);
      }
    } catch (err) {
      console.error(`[UploadService] Handshake/upload failed for: ${item.fileName}`, err);
      UploadService.handleFailure(item.id);
    }
  },

  /**
   * Step 4: Error Handling & Retry Count
   */
  handleFailure: (id: string) => {
    UploadQueue.incrementRetry(id);
    // Optionally trigger again after a delay or let the next background cycle handle it
    setTimeout(() => {
      UploadService.triggerUpload();
    }, 10000); // Wait 10 seconds before trying next/retrying
  }
};
