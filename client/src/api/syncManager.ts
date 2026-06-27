export interface QueuedRequest {
  id?: number;
  url: string;
  method: string;
  body: any;
  headers: Record<string, string>;
  timestamp: number;
}

const DB_NAME = 'evolv-offline-db';
const STORE_NAME = 'requests';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

export async function getQueuedRequests(): Promise<QueuedRequest[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteQueuedRequest(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function hasPendingOperations(): Promise<boolean> {
  const requests = await getQueuedRequests();
  return requests.length > 0;
}

// Replays queued mutating API requests in order, then deletes them on success
export async function processQueue(replayFetch: (req: QueuedRequest) => Promise<any>): Promise<{ success: number; failed: number }> {
  const requests = await getQueuedRequests();
  let success = 0;
  let failed = 0;

  for (const req of requests) {
    try {
      await replayFetch(req);
      if (req.id !== undefined) {
        await deleteQueuedRequest(req.id);
        success++;
      }
    } catch (err) {
      console.error(`Failed to replay request ${req.url}:`, err);
      failed++;
      // If a request fails, we stop processing to maintain ordering of dependent requests
      break;
    }
  }

  return { success, failed };
}

// High-level SyncManager interface
export const syncManager = {
  async enqueue<T>(url: string, method: string, parsedBody: any, headers: Record<string, string>): Promise<T> {
    console.warn(`Offline: Queuing mutating request ${method} ${url}`);
    
    // Add request to IndexedDB
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const queuedItem: QueuedRequest = {
        url,
        method,
        body: parsedBody,
        headers,
        timestamp: Date.now()
      };

      const request = store.add(queuedItem);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Dispatch event to notify components that offline mutations are pending
    window.dispatchEvent(new CustomEvent('evolv-offline-mutation', { detail: { url, method } }));

    // Return simulated responses to keep client UI functional
    if (method === 'DELETE') {
      return undefined as T;
    }

    // Generate a mock response
    const id = -Math.floor(Math.random() * 1000000); // negative temporary ID
    const mockObj: any = { id };

    if (parsedBody && typeof parsedBody === 'object') {
      Object.assign(mockObj, parsedBody);
    }

    // Handle specific endpoint fields
    if (url.includes('/complete')) {
      mockObj.is_completed = true;
    }
    if (url.includes('/log')) {
      mockObj.completed_today = true;
      mockObj.streak = (mockObj.streak || 0) + 1;
    }

    return mockObj as T;
  },
  
  hasPending: hasPendingOperations,
  processQueue
};
