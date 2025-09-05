import * as THREE from 'three';

declare global {
  interface Window {
    showDirectoryPicker?: (options?: {
      mode?: 'read' | 'readwrite';
      startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
    }) => Promise<FileSystemDirectoryHandle>;
    showSaveFilePicker?: (options?: any) => Promise<FileSystemFileHandle>;
  }
  
  interface FileSystemDirectoryHandle {
    queryPermission?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<'granted' | 'denied' | 'prompt'>;
    requestPermission?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<'granted' | 'denied'>;
  }
}

export interface SavedModel {
  id: string;
  name: string;
  data: ArrayBuffer;
  format: string;
  timestamp: number;
  size: number;
}

export interface FileSystemServiceOptions {
  storageKey?: string;
}

export interface FileSystemService {
  saveModel: (file: File, model: THREE.Object3D) => Promise<string>;
  loadModel: (id: string) => Promise<{ file: File; model: THREE.Object3D } | null>;
  getSavedModels: () => Promise<SavedModel[]>;
  deleteModel: (id: string) => Promise<boolean>;
  clearAllModels: () => Promise<void>;
  isSupported: () => boolean;
}

class FileSystemServiceImpl implements FileSystemService {
  private storageKey: string;
  private directoryHandle: FileSystemDirectoryHandle | null = null;

  constructor(options: FileSystemServiceOptions = {}) {
    this.storageKey = options.storageKey || '3d-viewer-models';
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && 
           'showDirectoryPicker' in window && 
           'showSaveFilePicker' in window;
  }

  private async getDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
    if (this.directoryHandle) {
      return this.directoryHandle;
    }

    try {
      const storedHandle = await this.getStoredDirectoryHandle();
      if (storedHandle) {
        if (storedHandle.queryPermission) {
          const permission = await storedHandle.queryPermission({ mode: 'readwrite' });
          if (permission === 'granted') {
            this.directoryHandle = storedHandle;
            return storedHandle;
          }
        } else {
          this.directoryHandle = storedHandle;
          return storedHandle;
        }
      }

      if (window.showDirectoryPicker) {
        this.directoryHandle = await window.showDirectoryPicker({
          mode: 'readwrite',
          startIn: 'documents'
        });
      } else {
        throw new Error('File System Access API not supported');
      }

      await this.storeDirectoryHandle(this.directoryHandle);
      return this.directoryHandle;

    } catch (error) {
      console.warn('Failed to get directory handle:', error);
      return null;
    }
  }

  private async getStoredDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['handles'], 'readonly');
      const store = transaction.objectStore('handles');
      const result = await new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
        const request = store.get(this.storageKey);
        request.onsuccess = () => resolve(request.result?.handle || null);
        request.onerror = () => reject(request.error);
      });
      db.close();
      return result;
    } catch (error) {
      console.warn('Failed to get stored directory handle:', error);
      return null;
    }
  }

  private async storeDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['handles'], 'readwrite');
      const store = transaction.objectStore('handles');
      await new Promise<void>((resolve, reject) => {
        const request = store.put({ id: this.storageKey, handle });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      db.close();
    } catch (error) {
      console.warn('Failed to store directory handle:', error);
    }
  }

  private async openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('3d-viewer-fs', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('handles')) {
          db.createObjectStore('handles', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('models')) {
          db.createObjectStore('models', { keyPath: 'id' });
        }
      };
    });
  }

  async saveModel(file: File, model: THREE.Object3D): Promise<string> {
    if (!this.isSupported()) {
      throw new Error('File System Access API is not supported');
    }

    const directoryHandle = await this.getDirectoryHandle();
    if (!directoryHandle) {
      throw new Error('Failed to get directory access');
    }

    const id = this.generateId();
    const fileName = `${id}-${file.name}`;
    
    try {
      const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(file);
      await writable.close();

      const savedModel: SavedModel = {
        id,
        name: file.name,
        data: await file.arrayBuffer(),
        format: this.getFileExtension(file.name),
        timestamp: Date.now(),
        size: file.size
      };

      await this.saveModelMetadata(savedModel);
      return id;

    } catch (error) {
      console.error('Failed to save model:', error);
      throw new Error('Failed to save model to file system');
    }
  }

  async loadModel(id: string): Promise<{ file: File; model: THREE.Object3D } | null> {
    if (!this.isSupported()) {
      return null;
    }

    try {
      const metadata = await this.getModelMetadata(id);
      if (!metadata) {
        return null;
      }

      const directoryHandle = await this.getDirectoryHandle();
      if (!directoryHandle) {
        return null;
      }

      const fileName = `${id}-${metadata.name}`;
      const fileHandle = await directoryHandle.getFileHandle(fileName);
      const file = await fileHandle.getFile();

      const restoredFile = new File([file], metadata.name, {
        type: file.type,
        lastModified: metadata.timestamp
      });

      return { file: restoredFile, model: new THREE.Object3D() };

    } catch (error) {
      console.error('Failed to load model:', error);
      return null;
    }
  }

  async getSavedModels(): Promise<SavedModel[]> {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['models'], 'readonly');
      const store = transaction.objectStore('models');
      
      const models = await new Promise<SavedModel[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
      
      db.close();
      return models.sort((a, b) => b.timestamp - a.timestamp);

    } catch (error) {
      console.error('Failed to get saved models:', error);
      return [];
    }
  }

  async deleteModel(id: string): Promise<boolean> {
    try {
      const metadata = await this.getModelMetadata(id);
      if (!metadata) {
        return false;
      }

      const directoryHandle = await this.getDirectoryHandle();
      if (directoryHandle) {
        try {
          const fileName = `${id}-${metadata.name}`;
          await directoryHandle.removeEntry(fileName);
        } catch (error) {
          console.warn('Failed to delete file from file system:', error);
        }
      }

      await this.deleteModelMetadata(id);
      return true;

    } catch (error) {
      console.error('Failed to delete model:', error);
      return false;
    }
  }

  async clearAllModels(): Promise<void> {
    try {
      const models = await this.getSavedModels();
      
      const directoryHandle = await this.getDirectoryHandle();
      if (directoryHandle) {
        for (const model of models) {
            const fileName = `${model.id}-${model.name}`;
          try {
            await directoryHandle.removeEntry(fileName);
          } catch (error) {
            console.warn(`Failed to delete file ${fileName}:`, error);
          }
        }
      }

      const db = await this.openIndexedDB();
      const transaction = db.transaction(['models'], 'readwrite');
      const store = transaction.objectStore('models');
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      db.close();

    } catch (error) {
      console.error('Failed to clear all models:', error);
      throw error;
    }
  }

  private async saveModelMetadata(model: SavedModel): Promise<void> {
    const db = await this.openIndexedDB();
    const transaction = db.transaction(['models'], 'readwrite');
    const store = transaction.objectStore('models');
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put(model);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    db.close();
  }

  private async getModelMetadata(id: string): Promise<SavedModel | null> {
    const db = await this.openIndexedDB();
    const transaction = db.transaction(['models'], 'readonly');
    const store = transaction.objectStore('models');
    
    const result = await new Promise<SavedModel | null>((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
    
    db.close();
    return result;
  }

  private async deleteModelMetadata(id: string): Promise<void> {
    const db = await this.openIndexedDB();
    const transaction = db.transaction(['models'], 'readwrite');
    const store = transaction.objectStore('models');
    
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    db.close();
  }

  private generateId(): string {
    return `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
  }
}

export const createFileSystemService = (options?: FileSystemServiceOptions): FileSystemService => {
  return new FileSystemServiceImpl(options);
};
