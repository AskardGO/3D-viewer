import React, { useCallback } from 'react';
import * as THREE from 'three';
import { ModelViewer, type ModelViewerError, type LoadingProgress } from './features/model-viewer';
import { type ThreeJSConfigOptions } from './shared/config/Three';
import './App.scss';

const threeConfig: ThreeJSConfigOptions = {
  renderer: {
    antialias: true,
    shadowMap: {
      enabled: true,
      type: 2,
    },
  },
  camera: {
    fov: 75,
    position: { x: 0, y: 5, z: 10 },
    lookAt: { x: 0, y: 0, z: 0 },
  },
  scene: {
    background: 0x222222,
  },
  lighting: {
    ambient: {
      color: 0x404040,
      intensity: 0.4,
    },
    directional: {
      color: 0xffffff,
      intensity: 1,
      position: { x: 10, y: 10, z: 5 },
      castShadow: true,
    },
  },
};

const App: React.FC = () => {
  const handleModelLoad = useCallback((model: THREE.Object3D) => {
    console.log('Model loaded:', model);
  }, []);

  const handleError = useCallback((error: ModelViewerError) => {
    console.error('Model loading error:', error);
  }, []);

  const handleProgress = useCallback((progress: LoadingProgress) => {
    console.log(`Loading progress: ${Math.round(progress.percentage)}%`);
  }, []);

  return (
    <div className="App">
      <ModelViewer
        config={threeConfig}
        maxFileSize={100 * 1024 * 1024}
        onModelLoad={handleModelLoad}
        onError={handleError}
        onProgress={handleProgress}
      />
    </div>
  );
};

export default App;
