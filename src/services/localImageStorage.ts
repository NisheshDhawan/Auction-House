// Local image storage service using IndexedDB

interface StoredImage {
  id: string;
  file: File;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

class LocalImageStorage {
  private dbName = 'AuctionHouseImages';
  private dbVersion = 1;
  private storeName = 'images';
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('filename', 'filename', { unique: false });
        }
      };
    });
  }

  async storeImage(file: File): Promise<string> {
    if (!this.db) await this.init();

    const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const storedImage: StoredImage = {
      id: imageId,
      file: file,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      createdAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(storedImage);

      request.onsuccess = () => resolve(imageId);
      request.onerror = () => reject(request.error);
    });
  }

  async getImage(imageId: string): Promise<File | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(imageId);

      request.onsuccess = () => {
        const result = request.result as StoredImage;
        resolve(result ? result.file : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteImage(imageId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(imageId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllImages(): Promise<StoredImage[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  createObjectURL(file: File): string {
    return URL.createObjectURL(file);
  }

  revokeObjectURL(url: string): void {
    URL.revokeObjectURL(url);
  }
}

// Singleton instance
export const localImageStorage = new LocalImageStorage();

// Image URL cache to avoid recreating object URLs
const imageUrlCache = new Map<string, string>();

/**
 * Get a displayable URL for a stored image
 */
export const getImageUrl = async (imageId: string): Promise<string | null> => {
  if (!imageId) return null;

  // Check cache first
  if (imageUrlCache.has(imageId)) {
    return imageUrlCache.get(imageId)!;
  }

  try {
    const file = await localImageStorage.getImage(imageId);
    if (file) {
      const url = localImageStorage.createObjectURL(file);
      imageUrlCache.set(imageId, url);
      return url;
    }
  } catch (error) {
    console.error('Failed to get image URL:', error);
  }

  return null;
};

/**
 * Store an image and return its ID
 */
export const storeImage = async (file: File): Promise<string> => {
  try {
    return await localImageStorage.storeImage(file);
  } catch (error) {
    console.error('Failed to store image:', error);
    throw new Error('Failed to store image');
  }
};

/**
 * Delete a stored image and clean up its URL
 */
export const deleteStoredImage = async (imageId: string): Promise<void> => {
  try {
    // Clean up cached URL
    if (imageUrlCache.has(imageId)) {
      const url = imageUrlCache.get(imageId)!;
      localImageStorage.revokeObjectURL(url);
      imageUrlCache.delete(imageId);
    }

    // Delete from storage
    await localImageStorage.deleteImage(imageId);
  } catch (error) {
    console.error('Failed to delete image:', error);
    throw new Error('Failed to delete image');
  }
};

/**
 * Clean up all cached URLs (call on app shutdown)
 */
export const cleanupImageUrls = (): void => {
  imageUrlCache.forEach((url) => {
    localImageStorage.revokeObjectURL(url);
  });
  imageUrlCache.clear();
};