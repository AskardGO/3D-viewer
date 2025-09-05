import * as THREE from 'three';
import {
  ThreeConfig,
  DEFAULT_CONFIG,
  type RendererConfig,
  type CameraConfig,
  type SceneConfig,
  type LightingConfig,
  type ThreeJSConfigOptions,
} from './ThreeConfig';

export type { RendererConfig, CameraConfig, SceneConfig, LightingConfig, ThreeJSConfigOptions };

export { ThreeConfig, DEFAULT_CONFIG };

export type ThreeConfigInstance = ThreeConfig;

export const createThreeConfig = (options?: ThreeJSConfigOptions): ThreeConfig => {
  return ThreeConfig.getInstance(options);
};

export const recreateThreeConfig = (options: ThreeJSConfigOptions): ThreeConfig => {
  return ThreeConfig.recreateInstance(options);
};

export type ThreeScene = THREE.Scene;
export type ThreeCamera = THREE.PerspectiveCamera;
export type ThreeRenderer = THREE.WebGLRenderer;
export type ThreeLights = {
  ambient?: THREE.AmbientLight;
  directional?: THREE.DirectionalLight;
};

export { THREE };