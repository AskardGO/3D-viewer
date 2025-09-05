import * as THREE from 'three';
import { createDexieConfig, type HistoryItem } from '../../../shared/config/Database';

export type { HistoryItem };

export interface ModelHistoryServiceOptions {
  maxHistoryItems?: number;
  storageKey?: string;
}

export interface ModelHistoryService {
  addToHistory: (file: File, model: THREE.Object3D) => Promise<string>;
  getHistory: () => Promise<HistoryItem[]>;
  getHistoryItem: (id: string) => Promise<HistoryItem | null>;
  deleteHistoryItem: (id: string) => Promise<boolean>;
  clearHistory: () => Promise<void>;
  isSupported: () => Promise<boolean>;
}

class ModelHistoryServiceImpl implements ModelHistoryService {
  private maxHistoryItems: number;
  private storageKey: string;
  private dexieConfig = createDexieConfig();
  private useDexie: boolean = true;

  constructor(options: ModelHistoryServiceOptions = {}) {
    this.maxHistoryItems = options.maxHistoryItems || 20;
    this.storageKey = options.storageKey || '3d-viewer-history';
  }

  async isSupported(): Promise<boolean> {
    if (typeof window === 'undefined') {
      return false;
    }

    const dexieSupported = await this.dexieConfig.isSupported();
    if (dexieSupported) {
      this.useDexie = true;
      return true;
    }

    const hasLocalStorage = 'localStorage' in window && !!window.localStorage;
    if (hasLocalStorage) {
      this.useDexie = false;
      return true;
    }

    return false;
  }

  async addToHistory(file: File, model: THREE.Object3D): Promise<string> {
    const supported = await this.isSupported();
    if (!supported) {
      throw new Error('Storage is not supported');
    }

    const id = this.generateId();
    const thumbnail = await this.generateThumbnail(model);
    
    const historyItem: HistoryItem = {
      id,
      name: file.name,
      data: await file.arrayBuffer(),
      format: this.getFileFormat(file.name),
      size: file.size,
      timestamp: Date.now(),
      thumbnail
    };

    if (this.useDexie) {
      try {
        const db = this.dexieConfig.getDatabase();
        await db.history.add(historyItem);
        await this.cleanupOldItemsDexie();
        return id;
      } catch (error) {
        this.useDexie = false;
        return this.saveToLocalStorage(historyItem);
      }
    } else {
      return this.saveToLocalStorage(historyItem);
    }
  }

  private saveToLocalStorage(historyItem: HistoryItem): string {
    try {
      const existingHistory = this.getLocalStorageHistory();
      
      const lightItem = {
        ...historyItem,
        data: new ArrayBuffer(0),
        thumbnail: ''
      };
      
      existingHistory.unshift(lightItem);
      
      if (existingHistory.length > this.maxHistoryItems) {
        existingHistory.splice(this.maxHistoryItems);
      }
      
      localStorage.setItem(this.storageKey, JSON.stringify(existingHistory));
      return historyItem.id;
      
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      throw new Error('Failed to save model to history');
    }
  }

  private getLocalStorageHistory(): HistoryItem[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return [];
      
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('Failed to parse localStorage history:', error);
      return [];
    }
  }

  async getHistory(): Promise<HistoryItem[]> {
    const supported = await this.isSupported();
    if (!supported) {
      return [];
    }

    if (this.useDexie) {
      try {
        const db = this.dexieConfig.getDatabase();
        return await db.history.orderBy('timestamp').reverse().toArray();
      } catch (error) {
        this.useDexie = false;
        return this.getLocalStorageHistory().sort((a, b) => b.timestamp - a.timestamp);
      }
    } else {
      return this.getLocalStorageHistory().sort((a, b) => b.timestamp - a.timestamp);
    }
  }

  async getHistoryItem(id: string): Promise<HistoryItem | null> {
    if (!this.isSupported()) {
      return null;
    }

    if (this.useIndexedDB) {
      try {
        const db = await this.openIndexedDB();
        const transaction = db.transaction(['history'], 'readonly');
        const store = transaction.objectStore('history');
        
        const item = await new Promise<HistoryItem | null>((resolve, reject) => {
          const request = store.get(id);
          request.onsuccess = () => resolve(request.result || null);
          request.onerror = () => reject(request.error);
        });
        
        db.close();
        return item;

      } catch (error) {
        console.warn('IndexedDB failed, falling back to localStorage:', error);
        this.useIndexedDB = false;
        return this.getLocalStorageHistory().find(item => item.id === id) || null;
      }
    } else {
      return this.getLocalStorageHistory().find(item => item.id === id) || null;
    }
  }

  async deleteHistoryItem(id: string): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    if (this.useIndexedDB) {
      try {
        const db = await this.openIndexedDB();
        const transaction = db.transaction(['history'], 'readwrite');
        const store = transaction.objectStore('history');
        
        await new Promise<void>((resolve, reject) => {
          const request = store.delete(id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
        
        db.close();
        return true;

      } catch (error) {
        console.warn('IndexedDB failed, falling back to localStorage:', error);
        this.useIndexedDB = false;
        return this.deleteFromLocalStorage(id);
      }
    } else {
      return this.deleteFromLocalStorage(id);
    }
  }

  private deleteFromLocalStorage(id: string): boolean {
    try {
      const history = this.getLocalStorageHistory();
      const filteredHistory = history.filter(item => item.id !== id);
      localStorage.setItem(this.storageKey, JSON.stringify(filteredHistory));
      return true;
    } catch (error) {
      console.error('Failed to delete from localStorage:', error);
      return false;
    }
  }

  async clearHistory(): Promise<void> {
    if (!this.isSupported()) {
      return;
    }

    if (this.useIndexedDB) {
      try {
        const db = await this.openIndexedDB();
        const transaction = db.transaction(['history'], 'readwrite');
        const store = transaction.objectStore('history');
        
        await new Promise<void>((resolve, reject) => {
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
        
        db.close();

      } catch (error) {
        console.warn('IndexedDB failed, falling back to localStorage:', error);
        this.useIndexedDB = false;
        this.clearLocalStorage();
      }
    } else {
      this.clearLocalStorage();
    }
  }

  private clearLocalStorage(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
      throw error;
    }
  }

  private async cleanupOldItems(db: IDBDatabase): Promise<void> {
    const transaction = db.transaction(['history'], 'readwrite');
    const store = transaction.objectStore('history');
    const index = store.index('timestamp');
    
    const items = await new Promise<HistoryItem[]>((resolve, reject) => {
      const request = index.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    if (items.length > this.maxHistoryItems) {
      const sortedItems = items.sort((a, b) => a.timestamp - b.timestamp);
      const itemsToDelete = sortedItems.slice(0, items.length - this.maxHistoryItems);
      
      for (const item of itemsToDelete) {
        await new Promise<void>((resolve, reject) => {
          const request = store.delete(item.id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
    }
  }

  private async generateThumbnail(model: THREE.Object3D): Promise<string> {
    try {
      const renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        preserveDrawingBuffer: true
      });
      renderer.setSize(128, 128);
      renderer.setClearColor(0x000000, 0);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
      
      const modelClone = model.clone();
      scene.add(modelClone);

      const box = new THREE.Box3().setFromObject(modelClone);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      
      camera.position.copy(center);
      camera.position.z += maxDim * 2;
      camera.lookAt(center);

      const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(1, 1, 1);
      scene.add(ambientLight);
      scene.add(directionalLight);

      renderer.render(scene, camera);
      const dataURL = renderer.domElement.toDataURL('image/png');

      renderer.dispose();
      scene.clear();

      return dataURL;

    } catch (error) {
      console.warn('Failed to generate thumbnail:', error);
      return '';
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private getFileFormat(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension || 'unknown';
  }

  private getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
  }
}

export const createModelHistoryService = (options?: ModelHistoryServiceOptions): ModelHistoryService => {
  return new ModelHistoryServiceImpl(options);
};
