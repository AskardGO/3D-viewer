import React from 'react';
import * as THREE from 'three';
import { type ThreeJSConfigOptions } from '../../../shared/config/Three';
import { Loader } from '../../../shared/widget/Loader';
import { type ModelViewerError } from '../lib/fileValidation';
import { type LoadingProgress } from '../lib/modelLoader';
import { useModelViewer } from '../hooks/useModelViewer';
import { useDeviceDetection } from '../../../shared/utils/deviceDetection';
import { ModelHistoryPanel } from './ModelHistoryPanel';
import { TouchGestureOverlay } from '../../../shared/ui/TouchGestureOverlay';
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
  const deviceInfo = useDeviceDetection();
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
    loadModelFromHistory,
    rotateCameraSingleFinger,
    zoomCamera,
    rotateCameraTwoFinger
  } = useModelViewer({
    config,
    maxFileSize,
    onModelLoad,
    onError,
    onProgress
  });

  const wrapperClasses = [
    styles.wrapper,
    className || '',
    deviceInfo.isMobile ? styles.mobile : '',
    deviceInfo.isTablet ? styles.tablet : '',
    deviceInfo.isTouchDevice ? styles.touchDevice : ''
  ].filter(Boolean).join(' ');

  const handleSingleFingerMove = (deltaX: number, deltaY: number) => {
    rotateCameraSingleFinger(deltaX, deltaY);
  };

  const handlePinchZoom = (zoomDelta: number, center: { x: number; y: number }) => {
    zoomCamera(zoomDelta);
  };

  const handleTwoFingerRotate = (angleDelta: number) => {
    rotateCameraTwoFinger(angleDelta);
  };

  return (
    <div className={wrapperClasses}>
      {/* Touch Gesture Overlay - только на мобильных */}
      <TouchGestureOverlay
        onSingleFingerMove={handleSingleFingerMove}
        onPinchZoom={handlePinchZoom}
        onTwoFingerRotate={handleTwoFingerRotate}
      />

      {/* История моделей - адаптивное позиционирование */}
      <ModelHistoryPanel
        history={history}
        onLoadModel={loadModelFromHistory}
        className={`${styles.historyPanel} ${deviceInfo.isMobile ? styles.historyPanelMobile : ''}`}
      />

      {/* 3D Viewport */}
      <div
        ref={mountRef}
        className={styles.viewport}
        onDrop={!deviceInfo.isMobile ? handleFileDrop : undefined}
        onDragOver={!deviceInfo.isMobile ? (e) => e.preventDefault() : undefined}
        onDragEnter={!deviceInfo.isMobile ? (e) => e.preventDefault() : undefined}
      />
      
      {/* Элементы управления - всегда показываем кнопку на мобильных */}
      <div className={`${styles.controls} ${deviceInfo.isMobile ? styles.controlsMobile : ''}`}>
        <input
          type="file"
          accept={Object.keys(FILE_FORMATS).map(ext => `.${ext}`).join(',')}
          onChange={handleFileSelect}
          className={styles.fileInput}
          id="model-file-input"
        />
        <label htmlFor="model-file-input" className={styles.uploadButton}>
          {deviceInfo.isMobile ? '📱' : '📁'} Select 3D Model
        </label>
        
        {/* Инструкции для мобильных устройств */}
        {deviceInfo.isTouchDevice && currentModel && (
          <div className={styles.touchInstructions}>
            <span>👆 Touch to rotate • 🤏 Pinch to zoom • ✌️ Two fingers to pan</span>
          </div>
        )}
      </div>

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
            <h3>
              {deviceInfo.isMobile 
                ? 'Tap "Select 3D Model" to get started' 
                : 'Drag and drop 3D model here'}
            </h3>
            <p>Supported formats: {Object.keys(FILE_FORMATS).join(', ')}</p>
            <p className={styles.persistenceHint}>
              Models will be automatically saved for future sessions
            </p>
            {deviceInfo.isTouchDevice && (
              <div className={styles.mobileHint}>
                <p>🎮 Use touch gestures to interact with 3D models:</p>
                <ul>
                  <li>👆 Single finger: Rotate</li>
                  <li>🤏 Pinch: Zoom in/out</li>
                  <li>✌️ Two fingers: Pan around</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
