import { useState, useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { type ThreeJSConfigOptions } from '../../../shared/config/Three';
import { type ModelViewerError } from '../lib/fileValidation';
import { type LoadingProgress } from '../lib/modelLoader';
import { FileHandlingService, createFileHandlingService } from '../lib/fileHandlingService';
import { SceneService, createSceneService } from '../lib/sceneService';
import { ModelLoaderService, createModelLoaderService } from '../lib/modelLoader';

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface UseModelViewerLogicOptions {
  config?: ThreeJSConfigOptions;
  maxFileSize?: number;
  onModelLoad?: (model: THREE.Object3D) => void;
  onError?: (error: ModelViewerError) => void;
  onProgress?: (progress: LoadingProgress) => void;
}

export const useModelViewerLogic = (
  mountRef: React.RefObject<HTMLDivElement | null>,
  options: UseModelViewerLogicOptions
) => {
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [currentModel, setCurrentModel] = useState<THREE.Object3D | null>(null);
  const [progress, setProgress] = useState<LoadingProgress>({ loaded: 0, total: 0, percentage: 0 });

  const sceneServiceRef = useRef<SceneService | null>(null);
  const fileHandlingServiceRef = useRef<FileHandlingService | null>(null);
  const modelLoaderServiceRef = useRef<ModelLoaderService | null>(null);

  useEffect(() => {
    modelLoaderServiceRef.current = createModelLoaderService();

    fileHandlingServiceRef.current = createFileHandlingService({
      maxFileSize: options.maxFileSize || 50 * 1024 * 1024,
      onProgress: (progress) => {
        setProgress(progress);
        options.onProgress?.(progress);
      },
      onError: (error) => {
        setLoadingState('error');
        options.onError?.(error);
      }
    });
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;

    sceneServiceRef.current = createSceneService({
      config: options.config,
      mountElement: mountRef.current
    });

    return () => {
      sceneServiceRef.current?.dispose();
    };
  }, [options.config]);

  useEffect(() => {
    if (currentModel && sceneServiceRef.current) {
      sceneServiceRef.current.addModel(currentModel);
      setLoadingState('success');
      options.onModelLoad?.(currentModel);
    }
  }, [currentModel, options.onModelLoad]);

  const handleFileLoad = useCallback(async (file: File) => {
    if (!fileHandlingServiceRef.current || !modelLoaderServiceRef.current) return;

    try {
      setLoadingState('loading');
      setProgress({ loaded: 0, total: file.size, percentage: 0 });

      const { data, format } = await fileHandlingServiceRef.current.readFile(file);

      const model = await modelLoaderServiceRef.current.loadModel(data, format);
      
      setCurrentModel(model);
    } catch (error) {
      const modelError: ModelViewerError = {
        message: 'Model loading failed',
        code: 'LOAD_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
      setLoadingState('error');
      options.onError?.(modelError);
    }
  }, [options.onError]);

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!fileHandlingServiceRef.current) return;
    
    const file = fileHandlingServiceRef.current.handleFileDrop(e);
    if (file) {
      handleFileLoad(file);
    }
  }, [handleFileLoad]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!fileHandlingServiceRef.current) return;
    
    const file = fileHandlingServiceRef.current.handleFileSelect(e);
    if (file) {
      handleFileLoad(file);
    }
  }, [handleFileLoad]);

  return {
    loadingState,
    currentModel,
    progress,
    handleFileDrop,
    handleFileSelect
  };
};
