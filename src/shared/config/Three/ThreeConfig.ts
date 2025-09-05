import * as THREE from 'three';
import { SCENE_CONSTANTS, CAMERA_CONSTANTS } from '../Constants';

export interface RendererConfig {
  antialias?: boolean;
  alpha?: boolean;
  powerPreference?: 'default' | 'high-performance' | 'low-power';
  shadowMapEnabled?: boolean;
  shadowMapType?: THREE.ShadowMapType;
  physicallyCorrectLights?: boolean;
  preserveDrawingBuffer?: boolean;
  logarithmicDepthBuffer?: boolean;
  shadowMap?: {
    enabled: boolean;
    type: THREE.ShadowMapType;
  };
}

export interface CameraConfig {
  fov?: number;
  aspect?: number;
  near?: number;
  far?: number;
  position?: { x: number; y: number; z: number };
  lookAt?: { x: number; y: number; z: number };
}

export interface SceneConfig {
  background?: THREE.ColorRepresentation | null;
  fog?: {
    enabled: boolean;
    color: THREE.ColorRepresentation;
    near: number;
    far: number;
  } | null;
}

export interface LightingConfig {
  ambient?: {
    color: THREE.ColorRepresentation;
    intensity: number;
  };
  directional?: {
    color: THREE.ColorRepresentation;
    intensity: number;
    position: { x: number; y: number; z: number };
    castShadow?: boolean;
    shadowMapSize?: number;
    shadowCameraSize?: number;
  };
  spotlight?: {
    color: THREE.ColorRepresentation;
    intensity: number;
    angle: number;
    penumbra: number;
    decay: number;
    distance: number;
  };
}

interface RequiredLightingConfig {
  ambient: {
    color: THREE.ColorRepresentation;
    intensity: number;
  };
  directional: {
    color: THREE.ColorRepresentation;
    intensity: number;
    position: { x: number; y: number; z: number };
    castShadow?: boolean;
    shadowMapSize?: number;
    shadowCameraSize?: number;
  };
  spotlight: {
    color: THREE.ColorRepresentation;
    intensity: number;
    angle: number;
    penumbra: number;
    decay: number;
    distance: number;
  };
}

export interface ThreeJSConfigOptions {
  renderer?: RendererConfig;
  camera?: CameraConfig;
  scene?: SceneConfig;
  lighting?: LightingConfig;
}

interface FullThreeJSConfig {
  renderer: Required<RendererConfig>;
  camera: Required<CameraConfig>;
  scene: Required<SceneConfig>;
  lighting: RequiredLightingConfig;
}

export const DEFAULT_CONFIG: FullThreeJSConfig = {
  renderer: {
    antialias: SCENE_CONSTANTS.RENDERER.ANTIALIAS,
    alpha: SCENE_CONSTANTS.RENDERER.ALPHA,
    powerPreference: SCENE_CONSTANTS.RENDERER.POWER_PREFERENCE,
    shadowMapEnabled: true,
    shadowMapType: THREE.PCFSoftShadowMap,
    physicallyCorrectLights: false,
    preserveDrawingBuffer: false,
    logarithmicDepthBuffer: false,
    shadowMap: {
      enabled: true,
      type: THREE.PCFSoftShadowMap
    }
  },
  camera: {
    fov: CAMERA_CONSTANTS.FOV,
    aspect: CAMERA_CONSTANTS.ASPECT_RATIO,
    near: CAMERA_CONSTANTS.NEAR_PLANE,
    far: CAMERA_CONSTANTS.FAR_PLANE,
    position: { x: 5, y: 5, z: 5 },
    lookAt: { x: 0, y: 0, z: 0 }
  },
  scene: {
    background: 0x222222,
    fog: {
      enabled: false,
      color: 0x222222,
      near: 1,
      far: 100
    }
  },
  lighting: {
    ambient: {
      color: SCENE_CONSTANTS.LIGHTING.AMBIENT.COLOR,
      intensity: SCENE_CONSTANTS.LIGHTING.AMBIENT.INTENSITY
    },
    directional: {
      color: SCENE_CONSTANTS.LIGHTING.DIRECTIONAL.COLOR,
      intensity: SCENE_CONSTANTS.LIGHTING.DIRECTIONAL.INTENSITY,
      position: SCENE_CONSTANTS.LIGHTING.DIRECTIONAL.POSITION,
      castShadow: true,
      shadowMapSize: SCENE_CONSTANTS.LIGHTING.DIRECTIONAL.SHADOW_MAP_SIZE,
      shadowCameraSize: SCENE_CONSTANTS.LIGHTING.DIRECTIONAL.SHADOW_CAMERA_SIZE
    },
    spotlight: {
      color: SCENE_CONSTANTS.LIGHTING.SPOTLIGHT.COLOR,
      intensity: SCENE_CONSTANTS.LIGHTING.SPOTLIGHT.INTENSITY,
      angle: SCENE_CONSTANTS.LIGHTING.SPOTLIGHT.ANGLE,
      penumbra: SCENE_CONSTANTS.LIGHTING.SPOTLIGHT.PENUMBRA,
      decay: SCENE_CONSTANTS.LIGHTING.SPOTLIGHT.DECAY,
      distance: SCENE_CONSTANTS.LIGHTING.SPOTLIGHT.DISTANCE
    }
  }
};

export class ThreeConfig {
  private static instance: ThreeConfig;
  
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly renderer: THREE.WebGLRenderer;
  public readonly lights: {
    ambient?: THREE.AmbientLight;
    directional?: THREE.DirectionalLight;
    spotlight?: THREE.SpotLight;
  } = {};

  private config: FullThreeJSConfig;

  private constructor(options: ThreeJSConfigOptions = {}) {
    this.config = DEFAULT_CONFIG;
    
    this.scene = this.createScene();
    
    this.camera = this.createCamera();
    
    this.renderer = this.createRenderer();
    
    this.setupLighting();
  }


  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    
    if (this.config.scene.background !== null && this.config.scene.background !== undefined) {
      scene.background = new THREE.Color(this.config.scene.background);
    }
    
    if (this.config.scene.fog) {
      scene.fog = new THREE.Fog(
        this.config.scene.fog.color,
        this.config.scene.fog.near,
        this.config.scene.fog.far
      );
    }
    
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      this.config.camera.fov,
      this.config.camera.aspect,
      this.config.camera.near,
      this.config.camera.far
    );
    
    const pos = this.config.camera.position!;
    camera.position.set(pos.x, pos.y, pos.z);
    
    const lookAt = this.config.camera.lookAt!;
    camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
    
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: this.config.renderer.antialias,
      alpha: this.config.renderer.alpha,
      powerPreference: this.config.renderer.powerPreference,
      preserveDrawingBuffer: this.config.renderer.preserveDrawingBuffer,
      logarithmicDepthBuffer: this.config.renderer.logarithmicDepthBuffer,
    });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    if (this.config.renderer.shadowMapEnabled) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = this.config.renderer.shadowMapType;
    }
    
    return renderer;
  }

  private setupLighting(): void {
    // Минимальный ambient свет для реализма
    const ambientLight = new THREE.AmbientLight(
      this.config.lighting.ambient.color,
      this.config.lighting.ambient.intensity
    );
    this.scene.add(ambientLight);
    this.lights.ambient = ambientLight;

    // Слабый directional свет для общего освещения
    const directionalLight = new THREE.DirectionalLight(
      this.config.lighting.directional.color,
      this.config.lighting.directional.intensity
    );
    
    const pos = this.config.lighting.directional.position;
    directionalLight.position.set(pos.x, pos.y, pos.z);
    
    if (this.config.lighting.directional.castShadow) {
      directionalLight.castShadow = true;
      
      if (this.config.lighting.directional.shadowMapSize) {
        directionalLight.shadow.mapSize.width = this.config.lighting.directional.shadowMapSize;
        directionalLight.shadow.mapSize.height = this.config.lighting.directional.shadowMapSize;
      }
      
      if (this.config.lighting.directional.shadowCameraSize) {
        const size = this.config.lighting.directional.shadowCameraSize;
        directionalLight.shadow.camera.left = -size;
        directionalLight.shadow.camera.right = size;
        directionalLight.shadow.camera.top = size;
        directionalLight.shadow.camera.bottom = -size;
      }
    }
    
    this.scene.add(directionalLight);
    this.lights.directional = directionalLight;

    // Spotlight как "фонарик" от камеры
    const spotlight = new THREE.SpotLight(
      this.config.lighting.spotlight.color,
      this.config.lighting.spotlight.intensity,
      this.config.lighting.spotlight.distance,
      this.config.lighting.spotlight.angle,
      this.config.lighting.spotlight.penumbra,
      this.config.lighting.spotlight.decay
    );
    
    // Позиционируем spotlight в позиции камеры
    spotlight.position.copy(this.camera.position);
    spotlight.target.position.set(0, 0, 0);
    spotlight.castShadow = true;
    
    this.scene.add(spotlight);
    this.scene.add(spotlight.target);
    this.lights.spotlight = spotlight;
  }

  public updateCameraAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  public updateRendererSize(width: number, height: number): void {
    this.renderer.setSize(width, height);
    this.updateCameraAspect(width / height);
  }

  public getConfig(): Readonly<FullThreeJSConfig> {
    return this.config;
  }

  public static getInstance(options?: ThreeJSConfigOptions): ThreeConfig {
    if (!ThreeConfig.instance) {
      ThreeConfig.instance = new ThreeConfig(options);
    }
    return ThreeConfig.instance;
  }

  public static recreateInstance(options: ThreeJSConfigOptions): ThreeConfig {
    if (ThreeConfig.instance) {
      ThreeConfig.instance.dispose();
    }
    ThreeConfig.instance = new ThreeConfig(options);
    return ThreeConfig.instance;
  }

  public static dispose(): void {
    if (ThreeConfig.instance) {
      ThreeConfig.instance.dispose();
      ThreeConfig.instance = null as any;
    }
  }

  public dispose(): void {
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    
    this.renderer.dispose();
    
    while (this.scene.children.length > 0) {
      const child = this.scene.children[0];
      this.scene.remove(child);
      
      if ('dispose' in child && typeof child.dispose === 'function') {
        child.dispose();
      }
    }
  }
}
