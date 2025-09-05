import { useState, useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { 
  ModelHistoryService, 
  createModelHistoryService, 
  HistoryItem 
} from '../lib/modelHistoryService';

export interface UseModelHistoryOptions {
  maxHistoryItems?: number;
  onModelRestored?: (file: File, model: THREE.Object3D) => void;
  onError?: (error: string) => void;
}

export interface UseModelHistoryReturn {
  isSupported: boolean;
  history: HistoryItem[];
  isLoading: boolean;
  
  addToHistory: (file: File, model: THREE.Object3D) => Promise<string | null>;
  loadFromHistory: (id: string) => Promise<{ file: File; model: THREE.Object3D } | null>;
  deleteFromHistory: (id: string) => Promise<boolean>;
  clearHistory: () => Promise<void>;
  refreshHistory: () => Promise<void>;
}

export const useModelHistory = (options: UseModelHistoryOptions = {}): UseModelHistoryReturn => {
  const { maxHistoryItems = 20, onModelRestored, onError } = options;
  
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  
  const historyServiceRef = useRef<ModelHistoryService | null>(null);
  
  useEffect(() => {
    const initializeService = async () => {
      historyServiceRef.current = createModelHistoryService({ maxHistoryItems });
      const supported = await historyServiceRef.current.isSupported();
      setIsSupported(supported);
      refreshHistory();
    };
    
    initializeService();
  }, [maxHistoryItems]);
  
  const refreshHistory = useCallback(async () => {
    if (!historyServiceRef.current) return;
    
    try {
      const items = await historyServiceRef.current.getHistory();
      setHistory(items);
    } catch (error) {
      console.error('Failed to refresh history:', error);
      onError?.('Failed to load model history');
    }
  }, [onError]);
  
  const addToHistory = useCallback(async (file: File, model: THREE.Object3D): Promise<string | null> => {
    if (!historyServiceRef.current) {
      onError?.('History service not initialized');
      return null;
    }
    
    try {
      const supported = await historyServiceRef.current.isSupported();
      if (!supported) {
        onError?.('History storage is not supported');
        return null;
      }
      
      const id = await historyServiceRef.current.addToHistory(file, model);
      await refreshHistory();
      return id;
    } catch (error) {
      console.error('Failed to add to history:', error);
      onError?.('Failed to save model to history: ' + (error as Error).message);
      return null;
    }
  }, [onError, refreshHistory]);
  
  const loadFromHistory = useCallback(async (id: string): Promise<{ file: File; model: THREE.Object3D } | null> => {
    if (!historyServiceRef.current) {
      onError?.('History service not initialized');
      return null;
    }
    
    setIsLoading(true);
    
    try {
      const supported = await historyServiceRef.current.isSupported();
      if (!supported) {
        onError?.('History storage is not supported');
        return null;
      }
      
      const historyItem = await historyServiceRef.current.getHistoryItem(id);
      if (!historyItem) {
        throw new Error('History item not found');
      }
      
      const file = new File([historyItem.data], historyItem.name);
      
      const { ModelLoaderService } = await import('../lib/modelLoader');
      const { getFileFormat } = await import('../config/fileFormats');
      
      const modelLoader = new ModelLoaderService();
      const format = getFileFormat(historyItem.format);
      
      if (!format) {
        throw new Error(`Unsupported file format: ${historyItem.format}`);
      }
      
      const model = await modelLoader.loadModel(historyItem.data, format);
      
      if (onModelRestored) {
        onModelRestored(file, model);
      }
      
      return { file, model };
      
    } catch (error) {
      console.error('Failed to load from history:', error);
      onError?.('Failed to load model from history: ' + (error as Error).message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [onError, onModelRestored]);
  
  const deleteFromHistory = useCallback(async (id: string): Promise<boolean> => {
    if (!historyServiceRef.current) {
      onError?.('History service not initialized');
      return false;
    }
    
    try {
      const supported = await historyServiceRef.current.isSupported();
      if (!supported) {
        onError?.('History storage is not supported');
        return false;
      }
      
      const success = await historyServiceRef.current.deleteHistoryItem(id);
      if (success) {
        await refreshHistory();
      }
      return success;
    } catch (error) {
      console.error('Failed to delete from history:', error);
      onError?.('Failed to delete model from history: ' + (error as Error).message);
      return false;
    }
  }, [onError, refreshHistory]);
  
  const clearHistory = useCallback(async (): Promise<void> => {
    if (!historyServiceRef.current) {
      onError?.('History service not initialized');
      return;
    }
    
    try {
      const supported = await historyServiceRef.current.isSupported();
      if (!supported) {
        onError?.('History storage is not supported');
        return;
      }
      
      await historyServiceRef.current.clearHistory();
      await refreshHistory();
    } catch (error) {
      console.error('Failed to clear history:', error);
      onError?.('Failed to clear model history: ' + (error as Error).message);
    }
  }, [onError, refreshHistory]);

  const getMimeType = useCallback((extension: string): string => {
    const mimeTypes: Record<string, string> = {
      'obj': 'model/obj',
      'fbx': 'model/fbx',
      'stl': 'model/stl',
      'ply': 'model/ply',
      'dae': 'model/vnd.collada+xml',
      'gltf': 'model/gltf+json',
      'glb': 'model/gltf-binary',
      '3ds': 'model/3ds',
      '3mf': 'model/3mf'
    };
    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }, []);
  
  return {
    isSupported,
    history,
    isLoading,
    
    addToHistory,
    loadFromHistory,
    deleteFromHistory,
    clearHistory,
    refreshHistory
  };
};
