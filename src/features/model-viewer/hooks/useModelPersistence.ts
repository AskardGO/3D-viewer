import { useState, useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { 
  FileSystemService, 
  createFileSystemService, 
  SavedModel 
} from '../lib/fileSystemService';

export interface UseModelPersistenceOptions {
  onModelRestored?: (file: File, model: THREE.Object3D) => void;
  onError?: (error: string) => void;
}

export interface UseModelPersistenceReturn {
  isSupported: boolean;
  savedModels: SavedModel[];
  isSaving: boolean;
  isLoading: boolean;
  
  saveCurrentModel: (file: File, model: THREE.Object3D) => Promise<string | null>;
  loadSavedModel: (id: string) => Promise<{ file: File; model: THREE.Object3D } | null>;
  deleteSavedModel: (id: string) => Promise<boolean>;
  clearAllModels: () => Promise<void>;
  refreshSavedModels: () => Promise<void>;
}

export const useModelPersistence = (options: UseModelPersistenceOptions = {}): UseModelPersistenceReturn => {
  const { onModelRestored, onError } = options;
  
  const [savedModels, setSavedModels] = useState<SavedModel[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const fileSystemServiceRef = useRef<FileSystemService | null>(null);
  
  useEffect(() => {
    fileSystemServiceRef.current = createFileSystemService();
    refreshSavedModels();
  }, []);
  
  const isSupported = fileSystemServiceRef.current?.isSupported() ?? false;
  
  const refreshSavedModels = useCallback(async () => {
    if (!fileSystemServiceRef.current) return;
    
    try {
      const models = await fileSystemServiceRef.current.getSavedModels();
      setSavedModels(models);
    } catch (error) {
      console.error('Failed to refresh saved models:', error);
      onError?.('Failed to load saved models');
    }
  }, [onError]);
  
  const saveCurrentModel = useCallback(async (file: File, model: THREE.Object3D): Promise<string | null> => {
    if (!fileSystemServiceRef.current || !isSupported) {
      onError?.('File System Access API is not supported');
      return null;
    }
    
    setIsSaving(true);
    
    try {
      const id = await fileSystemServiceRef.current.saveModel(file, model);
      await refreshSavedModels();
      return id;
    } catch (error) {
      console.error('Failed to save model:', error);
      onError?.('Failed to save model: ' + (error as Error).message);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [isSupported, onError, refreshSavedModels]);
  
  const loadSavedModel = useCallback(async (id: string): Promise<{ file: File; model: THREE.Object3D } | null> => {
    if (!fileSystemServiceRef.current || !isSupported) {
      onError?.('File System Access API is not supported');
      return null;
    }
    
    setIsLoading(true);
    
    try {
      const result = await fileSystemServiceRef.current.loadModel(id);
      if (result) {
        onModelRestored?.(result.file, result.model);
      }
      return result;
    } catch (error) {
      console.error('Failed to load model:', error);
      onError?.('Failed to load model: ' + (error as Error).message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, onError, onModelRestored]);
  
  const deleteSavedModel = useCallback(async (id: string): Promise<boolean> => {
    if (!fileSystemServiceRef.current || !isSupported) {
      onError?.('File System Access API is not supported');
      return false;
    }
    
    try {
      const success = await fileSystemServiceRef.current.deleteModel(id);
      if (success) {
        await refreshSavedModels();
      }
      return success;
    } catch (error) {
      console.error('Failed to delete model:', error);
      onError?.('Failed to delete model: ' + (error as Error).message);
      return false;
    }
  }, [isSupported, onError, refreshSavedModels]);
  
  const clearAllModels = useCallback(async (): Promise<void> => {
    if (!fileSystemServiceRef.current || !isSupported) {
      onError?.('File System Access API is not supported');
      return;
    }
    
    try {
      await fileSystemServiceRef.current.clearAllModels();
      await refreshSavedModels();
    } catch (error) {
      console.error('Failed to clear all models:', error);
      onError?.('Failed to clear all models: ' + (error as Error).message);
    }
  }, [isSupported, onError, refreshSavedModels]);
  
  return {
    isSupported,
    savedModels,
    isSaving,
    isLoading,
    
    saveCurrentModel,
    loadSavedModel,
    deleteSavedModel,
    clearAllModels,
    refreshSavedModels
  };
};
