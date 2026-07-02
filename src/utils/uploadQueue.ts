import { createMMKV } from 'react-native-mmkv';

const mmkv = createMMKV({ id: 'upload-queue-storage' });
const QUEUE_KEY = 'upload_queue';

export interface QueueItem {
  id: string;
  fileName: string;
  videoUri: string;
  size: number;
  status: 'pending' | 'uploading' | 'cloud_synced' | 'failed';
  retryCount: number;
  createdAt: number;
}

export const UploadQueue = {
  getQueue: (): QueueItem[] => {
    try {
      const data = mmkv.getString(QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to get queue', e);
      return [];
    }
  },

  saveQueue: (queue: QueueItem[]) => {
    try {
      mmkv.set(QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error('Failed to save queue', e);
    }
  },

  enqueue: (id: string, fileName: string, videoUri: string, size: number) => {
    const queue = UploadQueue.getQueue();
    // Avoid duplicate
    if (queue.some(item => item.id === id)) return;
    
    const newItem: QueueItem = {
      id,
      fileName,
      videoUri,
      size,
      status: 'pending',
      retryCount: 0,
      createdAt: Date.now(),
    };
    
    queue.push(newItem);
    UploadQueue.saveQueue(queue);
    console.log(`[UploadQueue] Enqueued: ${fileName} (${size} bytes)`);
  },

  updateStatus: (id: string, status: QueueItem['status']) => {
    const queue = UploadQueue.getQueue();
    const item = queue.find(i => i.id === id);
    if (item) {
      item.status = status;
      UploadQueue.saveQueue(queue);
      console.log(`[UploadQueue] Updated ${id} status to ${status}`);
    }
  },

  incrementRetry: (id: string) => {
    const queue = UploadQueue.getQueue();
    const item = queue.find(i => i.id === id);
    if (item) {
      item.retryCount += 1;
      item.status = 'pending'; // Reset back to pending for retry
      UploadQueue.saveQueue(queue);
      console.log(`[UploadQueue] Incremented retry for ${id} (retryCount: ${item.retryCount})`);
    }
  },

  getNextPending: (): QueueItem | null => {
    const queue = UploadQueue.getQueue();
    // If any item is currently uploading, stop and return null to prevent concurrency
    if (queue.some(item => item.status === 'uploading')) {
      console.log('[UploadQueue] An upload is already in progress, skipping trigger.');
      return null;
    }
    // Return the oldest pending item
    const pending = queue.filter(item => item.status === 'pending');
    if (pending.length === 0) return null;
    
    // Sort by createdAt ascending (FIFO)
    pending.sort((a, b) => a.createdAt - b.createdAt);
    return pending[0];
  },

  clearQueue: () => {
    mmkv.remove(QUEUE_KEY);
    console.log('[UploadQueue] Queue cleared.');
  }
};
