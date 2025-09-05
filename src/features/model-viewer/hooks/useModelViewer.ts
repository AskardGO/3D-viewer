import { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { 
  FileValidationService, 
  createFileValidationService,
  type ModelViewerError 
} from '../lib/fileValidation';
import { 
  ModelLoaderService, 
  createModelLoaderService,
  type LoadingProgress 
} from '../lib/modelLoader';
import { 
  SceneService, 
  createSceneService,
  type SceneServiceOptions 
} from '../lib/sceneService';
import { getFileExtension, FILE_FORMATS } from '../config/fileFormats';
import { 
  useModelHistory,
  type UseModelHistoryReturn 
} from './useModelHistory';

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface UseModelViewerOptions {
  maxFileSize?: number;
  config?: SceneServiceOptions['config'];
  onModelLoad?: (model: THREE.Object3D) => void;
  onError?: (error: ModelViewerError) => void;
  onProgress?: (progress: LoadingProgress) => void;
}

export interface UseModelViewerReturn {
  loadingState: LoadingState
  currentModel: THREE.Object3D | null;
  currentFile: File | null;
  progress: LoadingProgress;
  error: ModelViewerError | null
  
  handleFileLoad: (file: File) => void
  handleFileDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  
  mountRef: React.RefObject<HTMLDivElement | null>
  
  clearError: () => void
  
  history: UseModelHistoryReturn
  loadModelFromHistory: (id: string) => Promise<void>
  
  rotateCameraSingleFinger: (deltaX: number, deltaY: number) => void
  zoomCamera: (zoomDelta: number) => void;
  rotateCameraTwoFinger: (angleDelta: number) => void;
}

export const useModelViewer = (options: UseModelViewerOptions = {}): UseModelViewerReturn => {
  const {
    maxFileSize = 50 * 1024 * 1024,
    config,
    onModelLoad,
    onError,
    onProgress
  } = options;

  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [currentModel, setCurrentModel] = useState<THREE.Object3D | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<LoadingProgress>({ loaded: 0, total: 0, percentage: 0 });
  const [error, setError] = useState<ModelViewerError | null>(null);

  const mountRef = useRef<HTMLDivElement>(null);
  const sceneServiceRef = useRef<SceneService | null>(null);
  const fileValidationRef = useRef<FileValidationService | null>(null);
  const modelLoaderRef = useRef<ModelLoaderService | null>(null);

  const history = useModelHistory({
    onModelRestored: (file: File, model: THREE.Object3D) => {
      setCurrentFile(file);
      setCurrentModel(model);
      setLoadingState('success');
      onModelLoad?.(model);
    },
    onError: (errorMessage: string) => {
      const historyError: ModelViewerError = {
        message: errorMessage,
        code: 'PERSISTENCE_ERROR',
        details: errorMessage,
      };
      setError(historyError);
      onError?.(historyError);
    }
  });

  useEffect(() => {
    fileValidationRef.current = createFileValidationService({ maxFileSize });
    modelLoaderRef.current = createModelLoaderService();
  }, [maxFileSize]);

  useEffect(() => {
    if (!mountRef.current) return;

    sceneServiceRef.current = createSceneService({
      mountElement: mountRef.current,
      config
    });

    const handleResize = () => {
      sceneServiceRef.current?.handleResize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      sceneServiceRef.current?.dispose();
    };
  }, [config]);

  const handleProgress = useCallback((progressEvent: LoadingProgress) => {
    setProgress(progressEvent);
    onProgress?.(progressEvent);
  }, [onProgress]);

  const handleFileLoad = useCallback(async (file: File) => {
    if (!fileValidationRef.current || !modelLoaderRef.current || !sceneServiceRef.current) {
      return;
    }

    setError(null);

    const validationError = fileValidationRef.current.validateFile(file);
    if (validationError) {
      setError(validationError);
      onError?.(validationError);
      return;
    }

    const extension = getFileExtension(file.name);
    if (!extension) return;

    const format = FILE_FORMATS[extension];

    try {
      setLoadingState('loading');
      setProgress({ loaded: 0, total: file.size, percentage: 0 });

      const model = await modelLoaderRef.current.loadFromFile(
        file,
        format,
        handleProgress
      );

      sceneServiceRef.current.addModel(model);
      
      setCurrentModel(model);
      setCurrentFile(file);
      setLoadingState('success');
      
      await history.addToHistory(file, model);
      
      onModelLoad?.(model);

    } catch (error) {
      const modelError: ModelViewerError = {
        message: 'Model loading failed',
        code: 'LOAD_ERROR',
        details: (error as Error).message,
      };
      
      setError(modelError);
      setLoadingState('error');
      onError?.(modelError);
    }
  }, [handleProgress, onModelLoad, onError]);

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileLoad(files[0]);
    }
  }, [handleFileLoad]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileLoad(files[0]);
    }
  }, [handleFileLoad]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const loadModelFromHistory = useCallback(async (id: string): Promise<void> => {
    const result = await history.loadFromHistory(id);
    if (result && sceneServiceRef.current) {
      await handleFileLoad(result.file);
    }
  }, [history, handleFileLoad]);

  const rotateCameraSingleFinger = useCallback((deltaX: number, deltaY: number) => {
    if (sceneServiceRef.current) {
      sceneServiceRef.current.rotateCameraSingleFinger(deltaX, deltaY);
    }
  }, []);

  const zoomCamera = useCallback((zoomDelta: number) => {
    if (sceneServiceRef.current) {
      sceneServiceRef.current.zoomCamera(zoomDelta);
    }
  }, []);

  const rotateCameraTwoFinger = useCallback((angleDelta: number) => {
    if (sceneServiceRef.current) {
      sceneServiceRef.current.rotateCameraTwoFinger(angleDelta);
    }
  }, []);

  return {
    loadingState,
    currentModel,
    currentFile,
    progress,
    error,
    
    handleFileLoad,
    handleFileDrop,
    handleFileSelect,
    
    mountRef,
    
    clearError,
    
    history,
    loadModelFromHistory,
    
    rotateCameraSingleFinger,
    zoomCamera,
    rotateCameraTwoFinger
  };
};
