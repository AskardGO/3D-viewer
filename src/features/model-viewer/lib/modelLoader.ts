import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { type LoaderType, type FileFormat } from '../config/fileFormats';

export interface LoadingProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface LoaderStrategy {
  load(data: string | ArrayBuffer): Promise<THREE.Object3D>;
}

class GLTFLoaderStrategy implements LoaderStrategy {
  private loader = new GLTFLoader();

  async load(data: ArrayBuffer): Promise<THREE.Object3D> {
    return new Promise((resolve, reject) => {
      this.loader.parse(data, '', (gltf) => {
        resolve(gltf.scene);
      }, (error) => {
        reject(new Error(error.message || 'GLTF parsing error'));
      });
    });
  }
}

class OBJLoaderStrategy implements LoaderStrategy {
  private loader = new OBJLoader();

  async load(data: string): Promise<THREE.Object3D> {
    try {
      const obj = this.loader.parse(data);
      return obj;
    } catch (error) {
      throw new Error(`OBJ parsing error: ${(error as Error).message}`);
    }
  }
}

class FBXLoaderStrategy implements LoaderStrategy {
  private loader = new FBXLoader();

  async load(data: ArrayBuffer): Promise<THREE.Object3D> {
    try {
      const fbx = this.loader.parse(data, '');
      return fbx;
    } catch (error) {
      throw new Error(`FBX parsing error: ${(error as Error).message}`);
    }
  }
}

class STLLoaderStrategy implements LoaderStrategy {
  private loader = new STLLoader();

  async load(data: ArrayBuffer): Promise<THREE.Object3D> {
    try {
      const geometry = this.loader.parse(data);
      const material = new THREE.MeshStandardMaterial({ 
        color: 0x5555ff,
        metalness: 0.3,
        roughness: 0.4 
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    } catch (error) {
      throw new Error(`STL parsing error: ${(error as Error).message}`);
    }
  }
}

class PLYLoaderStrategy implements LoaderStrategy {
  private loader = new PLYLoader();

  async load(data: ArrayBuffer): Promise<THREE.Object3D> {
    try {
      const geometry = this.loader.parse(data);
      const material = new THREE.MeshStandardMaterial({ 
        color: 0x5555ff,
        metalness: 0.3,
        roughness: 0.4 
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    } catch (error) {
      throw new Error(`PLY parsing error: ${(error as Error).message}`);
    }
  }
}

class ColladaLoaderStrategy implements LoaderStrategy {
  private loader = new ColladaLoader();

  async load(data: string): Promise<THREE.Object3D> {
    try {
      const collada = this.loader.parse(data, '');
      return collada.scene;
    } catch (error) {
      throw new Error(`Collada parsing error: ${(error as Error).message}`);
    }
  }
}

export class ModelLoaderService {
  private strategies: Map<LoaderType, LoaderStrategy> = new Map();

  constructor() {
    this.strategies.set('gltf', new GLTFLoaderStrategy());
    this.strategies.set('obj', new OBJLoaderStrategy());
    this.strategies.set('fbx', new FBXLoaderStrategy());
    this.strategies.set('stl', new STLLoaderStrategy());
    this.strategies.set('ply', new PLYLoaderStrategy());
    this.strategies.set('collada', new ColladaLoaderStrategy());
  }

  async loadModel(
    data: string | ArrayBuffer,
    format: FileFormat,
    onProgress?: (progress: LoadingProgress) => void
  ): Promise<THREE.Object3D> {
    const strategy = this.strategies.get(format.loader);
    if (!strategy) {
      throw new Error(`Unsupported loader type: ${format.loader}`);
    }

    try {
      const model = await strategy.load(data);
      return model;
    } catch (error) {
      throw new Error(`Failed to load ${format.extension} model: ${(error as Error).message}`);
    }
  }

  async loadFromFile(
    file: File,
    format: FileFormat,
    onProgress?: (progress: LoadingProgress) => void
  ): Promise<THREE.Object3D> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onprogress = (event) => {
        if (onProgress && event.lengthComputable) {
          const progress: LoadingProgress = {
            loaded: event.loaded,
            total: event.total,
            percentage: (event.loaded / event.total) * 100
          };
          onProgress(progress);
        }
      };

      reader.onload = async (event) => {
        try {
          const data = event.target?.result;
          if (!data) {
            throw new Error('Failed to read file data');
          }

          const model = await this.loadModel(data, format, onProgress);
          resolve(model);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('File reading error'));
      };

      if (format.readAs === 'arrayBuffer') {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    });
  }
}

export const createModelLoaderService = (): ModelLoaderService => {
  return new ModelLoaderService();
};
