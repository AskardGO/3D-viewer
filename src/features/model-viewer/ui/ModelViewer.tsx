import React from 'react';
import * as THREE from 'three';
import { type ThreeJSConfigOptions } from '../../../shared/config/Three';
import { Loader } from '../../../shared/widget/Loader';
import { type ModelViewerError } from '../lib/fileValidation';
import { type LoadingProgress } from '../lib/modelLoader';
import { useModelViewer } from '../hooks/useModelViewer';
import { ModelHistoryPanel } from './ModelHistoryPanel';
import { FILE_FORMATS } from '../config/fileFormats';
import styles from './ModelViewer.module.scss';

export interface ModelViewerProps {
  className?: string;
  config?: ThreeJSConfigOptions;
  maxFileSize?: number;
  onModelLoad?: (model: THREE.Object3D) => void;
  onError?: (error: ModelViewerError) => void;
  onProgress?: (progress: LoadingProgress) => void;
}

export const ModelViewer: React.FC<ModelViewerProps> = ({
  className,
  config,
  maxFileSize = 50 * 1024 * 1024,
  onModelLoad,
  onError,
  onProgress,
}) => {
  const {
    loadingState,
    currentModel,
    currentFile,
    progress,
    error,
    handleFileDrop,
    handleFileSelect,
    mountRef,
    clearError,
    history,
    loadModelFromHistory
  } = useModelViewer({
    config,
    maxFileSize,
    onModelLoad,
    onError,
    onProgress
  });

  return (
    <div className={`${styles.wrapper} ${className || ''}`}>
      {/* History Panel */}
      <ModelHistoryPanel
        history={history}
        onLoadModel={loadModelFromHistory}
        className={styles.historyPanel}
      />

      <div
        ref={mountRef}
        className={styles.viewport}
        onDrop={handleFileDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={(e) => e.preventDefault()}
      />
      
      <div className={styles.controls}>
        <input
          type="file"
          accept={Object.keys(FILE_FORMATS).map(ext => `.${ext}`).join(',')}
          onChange={handleFileSelect}
          className={styles.fileInput}
          id="model-file-input"
        />
        <label htmlFor="model-file-input" className={styles.uploadButton}>
          Select 3D model
        </label>
      </div>

      {/* Error Display */}
      {error && (
        <div className={styles.errorOverlay}>
          <div className={styles.errorContent}>
            <h4>Error</h4>
            <p>{error.message}</p>
            {error.details && <p className={styles.errorDetails}>{error.details}</p>}
            <button onClick={clearError} className={styles.errorCloseButton}>
              Close
            </button>
          </div>
        </div>
      )}

      {loadingState === 'loading' && (
        <div className={styles.loadingOverlay}>
          <Loader />
          <div className={styles.progress}>
            <div 
              className={styles.progressBar}
              style={{ width: `${progress.percentage}%` }}
            />
            <span className={styles.progressText}>
              {Math.round(progress.percentage)}%
            </span>
          </div>
        </div>
      )}

      {loadingState === 'idle' && !currentModel && (
        <div className={styles.placeholder}>
          <div className={styles.placeholderContent}>
            <h3>Drag and drop 3D model here</h3>
            <p>Supported formats: {Object.keys(FILE_FORMATS).join(', ')}</p>
            <p className={styles.persistenceHint}>
              Models will be automatically saved for future sessions
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
