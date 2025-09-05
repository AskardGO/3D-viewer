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
    console.log('ModelHistoryService: Checking storage support...');
    
    if (typeof window === 'undefined') {
      console.log('ModelHistoryService: Window is undefined (SSR)');
      return false;
    }

    console.log('ModelHistoryService: Testing Dexie support...');
    const dexieSupported = await this.dexieConfig.isSupported();
    console.log('ModelHistoryService: Dexie supported:', dexieSupported);
    
    if (dexieSupported) {
      this.useDexie = true;
      console.log('ModelHistoryService: Using Dexie/IndexedDB');
      return true;
    }

    console.log('ModelHistoryService: Testing localStorage support...');
    const hasLocalStorage = 'localStorage' in window && !!window.localStorage;
    console.log('ModelHistoryService: localStorage available:', hasLocalStorage);
    
    if (hasLocalStorage) {
      this.useDexie = false;
      console.log('ModelHistoryService: Using localStorage fallback');
      return true;
    }

    console.log('ModelHistoryService: No storage method available');
    return false;
  }

  async addToHistory(file: File, model: THREE.Object3D): Promise<string> {
    const supported = await this.isSupported();
    if (!supported) {
      throw new Error('Storage is not supported');
    }

    const existingItem = await this.findExistingItem(file.name, file.size);
    
    if (existingItem) {
      return this.moveToTop(existingItem.id);
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

  async getHistory(): Promise<HistoryItem[]> {
    const supported = await this.isSupported();
    if (!supported) {
      return [];
    }

    if (this.useDexie) {
      try {
        const db = this.dexieConfig.getDatabase();
        
        if (!db.isOpen()) {
          await db.open();
        }
        
        return await db.history.orderBy('timestamp').reverse().toArray();
      } catch (error) {
        console.warn('Dexie getHistory failed, falling back to localStorage:', error);
        this.useDexie = false;
        return this.getLocalStorageHistory().sort((a, b) => b.timestamp - a.timestamp);
      }
    } else {
      return this.getLocalStorageHistory().sort((a, b) => b.timestamp - a.timestamp);
    }
  }

  async getHistoryItem(id: string): Promise<HistoryItem | null> {
    const supported = await this.isSupported();
    if (!supported) {
      return null;
    }

    if (this.useDexie) {
      try {
        const db = this.dexieConfig.getDatabase();
        
        if (!db.isOpen()) {
          await db.open();
        }
        
        return (await db.history.get(id)) || null;
      } catch (error) {
        console.warn('Dexie getHistoryItem failed, falling back to localStorage:', error);
        this.useDexie = false;
        return this.getLocalStorageHistory().find(item => item.id === id) || null;
      }
    } else {
      return this.getLocalStorageHistory().find(item => item.id === id) || null;
    }
  }

  async deleteHistoryItem(id: string): Promise<boolean> {
    const supported = await this.isSupported();
    if (!supported) {
      return false;
    }

    if (this.useDexie) {
      try {
        const db = this.dexieConfig.getDatabase();
        
        if (!db.isOpen()) {
          await db.open();
        }
        
        await db.history.delete(id);
        return true;
      } catch (error) {
        console.warn('Dexie deleteHistoryItem failed, falling back to localStorage:', error);
        this.useDexie = false;
        return this.deleteFromLocalStorage(id);
      }
    } else {
      return this.deleteFromLocalStorage(id);
    }
  }

  async clearHistory(): Promise<void> {
    const supported = await this.isSupported();
    if (!supported) {
      return;
    }

    if (this.useDexie) {
      try {
        const db = this.dexieConfig.getDatabase();
        
        if (!db.isOpen()) {
          await db.open();
        }
        
        await db.history.clear();
      } catch (error) {
        console.warn('Dexie clearHistory failed, falling back to localStorage:', error);
        this.useDexie = false;
        this.clearLocalStorage();
      }
    } else {
      this.clearLocalStorage();
    }
  }

  private async cleanupOldItemsDexie(): Promise<void> {
    const db = this.dexieConfig.getDatabase();
    
    if (!db.isOpen()) {
      await db.open();
    }
    
    const count = await db.history.count();
    
    if (count > this.maxHistoryItems) {
      const oldestItems = await db.history
        .orderBy('timestamp')
        .limit(count - this.maxHistoryItems)
        .toArray();
      
      const idsToDelete = oldestItems.map(item => item.id);
      await db.history.bulkDelete(idsToDelete);
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
      
      const updatedHistory = [lightItem, ...existingHistory];
      const limitedHistory = updatedHistory.slice(0, this.maxHistoryItems);
      
      localStorage.setItem(this.storageKey, JSON.stringify(limitedHistory));
      return historyItem.id;
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      throw error;
    }
  }

  private getLocalStorageHistory(): HistoryItem[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return [];
      }
      
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('Failed to parse localStorage history:', error);
      return [];
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

  private clearLocalStorage(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
      throw error;
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private getFileFormat(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension || 'unknown';
  }

  private async generateThumbnail(model: THREE.Object3D): Promise<string> {
    try {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        preserveDrawingBuffer: true 
      });
      
      renderer.setSize(256, 256);
      renderer.setClearColor(0x000000, 0);
      
      const modelClone = model.clone();
      scene.add(modelClone);
      
      const box = new THREE.Box3().setFromObject(modelClone);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      
      const maxDim = Math.max(size.x, size.y, size.z);
      const distance = maxDim * 2;
      
      camera.position.set(
        center.x + distance * 0.5,
        center.y + distance * 0.5,
        center.z + distance * 0.5
      );
      camera.lookAt(center);
      
      const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(1, 1, 1);
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

  private async findExistingItem(name: string, size: number): Promise<HistoryItem | null> {
    if (this.useDexie) {
      try {
        const db = this.dexieConfig.getDatabase();
        const item = await db.history.where({ name, size }).first();
        return item || null;
      } catch (error) {
        console.warn('Failed to find existing item in Dexie:', error);
        this.useDexie = false;
        return this.findExistingItemInLocalStorage(name, size);
      }
    } else {
      return this.findExistingItemInLocalStorage(name, size);
    }
  }

  private findExistingItemInLocalStorage(name: string, size: number): HistoryItem | null {
    try {
      const historyData = localStorage.getItem(this.storageKey);
      if (!historyData) return null;

      const history: HistoryItem[] = JSON.parse(historyData);
      return history.find(item => item.name === name && item.size === size) || null;
    } catch (error) {
      console.warn('Failed to find existing item in localStorage:', error);
      return null;
    }
  }

  private async moveToTop(id: string): Promise<string> {
    if (this.useDexie) {
      try {
        const db = this.dexieConfig.getDatabase();
        const item = await db.history.get(id);
        if (item) {
          item.timestamp = Date.now();
          await db.history.put(item);
          return id;
        }
        throw new Error('Item not found');
      } catch (error) {
        console.warn('Failed to move item to top in Dexie:', error);
        this.useDexie = false;
        return this.moveToTopInLocalStorage(id);
      }
    } else {
      return this.moveToTopInLocalStorage(id);
    }
  }

  private moveToTopInLocalStorage(id: string): string {
    try {
      const historyData = localStorage.getItem(this.storageKey);
      if (!historyData) throw new Error('No history data found');

      const history: HistoryItem[] = JSON.parse(historyData);
      const itemIndex = history.findIndex(item => item.id === id);
      
      if (itemIndex === -1)
        throw new Error('Item not found');

      const [item] = history.splice(itemIndex, 1);
      item.timestamp = Date.now();
      
      history.unshift(item);
      
      localStorage.setItem(this.storageKey, JSON.stringify(history));
      return id;
    } catch (error) {
      console.warn('Failed to move item to top in localStorage:', error);
      throw error;
    }
  }
}

export const createModelHistoryService = (options?: ModelHistoryServiceOptions): ModelHistoryService => {
  return new ModelHistoryServiceImpl(options);
};
